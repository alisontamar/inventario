import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Alert,
  Pressable, Platform, KeyboardAvoidingView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import { useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as Notifications from 'expo-notifications';
import Entypo from '@expo/vector-icons/Entypo';
import Scanner, { ButtonScanner, ResultScanner } from "@/app/components/Scanner";
import BackButton from "@/app/components/BackButton";
import PermissionCamera from "@/app/components/permissions/PermissionCamera";
import FormSale from "@/app/components/FormSale";
import Choose from "@/app/components/Choose";
import FormInventory from "@/app/components/FormInventory";
import { supabase } from "@/constants/supabase";
import { formatDateForDB } from "@/app/utils/formatDate";
import { useScanner } from "@/app/hooks/useScanner";
import Manual from "@/app/modal/manual";

export default function RegisterModal() {
  const [step, setStep] = useState<"choose" | "record" | "verify" | "scan">("choose");
  const [type, setType] = useState<"inventory" | "sale" | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const { scannedData } = useScanner();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  const [voiceData, setVoiceData] = useState({
    nombre: "", empresa: "", grupo: "",
    precioDeVenta: "", precioDeCompra: "",
    cantidad: "", fechaVencimiento: ""
  });
  const [form, setForm] = useState({
    nombre: "", empresa: "", grupo: "",
    precioDeVenta: "", precioDeCompra: "",
    cantidad: "", barcode: "", fechaVencimiento: ""
  });
  const [permission, requestPermission] = useCameraPermissions();

  const getNamesProducts = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('nombre, id')
      .order('nombre', { ascending: true });

    if (error) Alert.alert("Error al obtener productos", "No se pudo obtener los productos");
    const formattedData = data?.map(product => ({
      id: product.id,
      name: product.nombre,
    })) ?? [];
    setProducts(formattedData);
  };

  useEffect(() => {
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Alert.alert("Permiso requerido", "Necesitas habilitar notificaciones para recibir alertas de stock");
      }
    });
    const setupComponent = async () => {
      try {
        await requestPermission();
        await getNamesProducts();
        const available = await ExpoSpeechRecognitionModule.getStateAsync();
        const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert(
            "Permisos necesarios",
            "Se necesitan permisos de micrófono para el reconocimiento de voz"
          );
        }
      } catch (error) {
        Alert.alert(
          "Error",
          "Error en la configuración de la ventana"
        )
      }
    };

    setupComponent();
    return () => {
      if (isRecording || isListening) {
        ExpoSpeechRecognitionModule.stop().catch(console.error);
      }
    };
  }, []);

  // Función para buscar el producto por código de barras (escaneado)
  const searchProductByScan = async (barcode: string) => {
    try {
      const { data: producto, error } = await supabase
        .from('productos')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          Alert.alert(
            "Producto no encontrado",
            `No se encontró un producto con el código ${barcode}`
          );
        } else {
          console.error('Error buscando producto:', error);
          Alert.alert("Error", "Error al buscar el producto");
        }
        return;
      }

      if (producto) {
        // Llenar automáticamente los campos del formulario
        setForm(prev => ({
          ...prev,
          nombre: producto.nombre,
          precioDeVenta: producto.precio_venta?.toString() || "",
          barcode: barcode
        }));

        setVoiceData(prev => ({
          ...prev,
          nombre: producto.nombre,
          precioDeVenta: producto.precio_venta?.toString() || ""
        }));

        Alert.alert(
          "¡Producto encontrado!",
          `${producto.nombre}\nPrecio: ${producto.precio_venta}\nStock disponible: ${producto.cantidad}`,
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      Alert.alert("Error", "Error inesperado al buscar el producto");
    }
  };

  useEffect(() => {
    const loadScannedData = async () => {
      try {
        // Leer los datos almacenados en SecureStore
        const storedScannedData = await SecureStore.getItemAsync('scannedData');

        if (storedScannedData) {
          console.log("Datos escaneados leídos desde SecureStore:", storedScannedData);
          // Si hay datos guardados, actualizamos el estado
          setForm(prev => ({ ...prev, barcode: storedScannedData }));
        } else {
          console.log('No hay datos escaneados guardados en SecureStore');
        }
      } catch (error) {
        console.log('Error al leer los datos de SecureStore:', error);
      }
    };

    if (scannedData) {
      console.log("Scanner data received:", scannedData);
      // Guardamos el nuevo scannedData en SecureStore
      SecureStore.setItemAsync('scannedData', scannedData)
        .then(() => {
          console.log('Datos escaneados guardados en SecureStore');
        })
        .catch((error) => {
          console.log('Error al guardar en SecureStore:', error);
        });

      // Actualizamos el estado local con los datos escaneados
      setForm(prev => ({ ...prev, barcode: scannedData }));

      // Si es venta y hay scannedData, buscar el producto automáticamente
      if (type === "sale" && scannedData) {
        searchProductByScan(scannedData);  // Llamada a la función para buscar el producto
      }
    } else {
      // Si no hay scannedData, intentamos leer desde SecureStore
      loadScannedData();
    }
  }, [scannedData, type]);

  // Funciones para guardar en la base de datos
  const guardarProducto = async () => {
    try {
      setIsLoading(true);

      if (!form.nombre) {
        Alert.alert("Error", "El nombre del producto es requerido");
        return;
      }

      let fechaVencimientoFormatted = null;
      if (form.fechaVencimiento) {
        fechaVencimientoFormatted = formatDateForDB(form.fechaVencimiento);
        if (!fechaVencimientoFormatted) {
          Alert.alert("Error", "Formato de fecha inválido. Usa DD/MM/YYYY");
          return;
        }
      }

      let existingProduct = null;
      if (form.barcode) {
        const { data, error: searchError } = await supabase
          .from('productos')
          .select('*')
          .eq('barcode', form.barcode)
          .single();

        if (searchError) {
          if (searchError.code !== 'PGRST116') {
            console.error('Error buscando producto existente:', searchError);
            Alert.alert("Error", "Error al verificar producto existente");
            return;
          }
        } else {
          existingProduct = data;
        }
      }

      if (existingProduct) {
        const nuevaCantidad = (existingProduct.cantidad || 0) + (form.cantidad ? parseInt(form.cantidad) : 0);

        const updateData = {
          cantidad: nuevaCantidad,
          ...(form.precioDeVenta && { precio_venta: parseFloat(form.precioDeVenta) }),
          ...(form.precioDeCompra && { precio_compra: parseFloat(form.precioDeCompra) }),
          ...(fechaVencimientoFormatted && { fecha_vencimiento: fechaVencimientoFormatted }),
        };

        const { error: updateError } = await supabase
          .from('productos')
          .update(updateData)
          .eq('id', existingProduct.id);

        if (updateError) {
          console.error('Error actualizando producto:', updateError);
          Alert.alert("Error", "No se pudo actualizar el producto");
        } else {
          Alert.alert(
            "Producto Actualizado",
            `Se actualizaron ${form.cantidad || 0} unidades y datos del producto existente.`
          );
          reset();
        }
      } else {
        const {
          nombre, empresa, grupo, precioDeVenta, precioDeCompra, cantidad, barcode, fechaVencimiento
        } = form;
        if (!nombre || !empresa || !grupo || !precioDeVenta || !precioDeCompra || !cantidad || !barcode || !fechaVencimiento) {
          Alert.alert("Error", "Todos los campos son requeridos para guardar el producto");
          return;
        }

        const { error } = await supabase
          .from('productos')
          .insert([{
            nombre: form.nombre,
            empresa: form.empresa || null,
            grupo: form.grupo || null,
            precio_venta: form.precioDeVenta ? parseFloat(form.precioDeVenta) : null,
            precio_compra: form.precioDeCompra ? parseFloat(form.precioDeCompra) : null,
            cantidad: form.cantidad ? parseInt(form.cantidad) : 0,
            barcode: form.barcode || null,
            fecha_vencimiento: fechaVencimientoFormatted
          }]);

        if (error) {
          Alert.alert("Error", "No se pudo guardar el producto");
        } else {
          Alert.alert("Éxito", "Producto guardado correctamente");
          reset();
        }
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const guardarVenta = async () => {
    try {
      setIsLoading(true);
      if (!form.nombre || !form.cantidad || !form.precioDeVenta) {
        Alert.alert("Error", "Todos los campos son requeridos para la venta");
        return;
      }

      const { data: productos, error: searchError } = await supabase
        .from('productos')
        .select('id, cantidad')
        .eq('nombre', form.nombre)
        .single();

      if (!productos || searchError) {
        console.log(searchError)
        Alert.alert("Error", "Producto no encontrado");
        return;
      }

      const cantidadVenta = parseInt(form.cantidad);
      const nuevoStock = productos.cantidad - cantidadVenta;

      if (nuevoStock <= 0) {
        Alert.alert("Stock insuficiente", `Solo hay ${productos.cantidad} unidades disponibles`);
        return;
      }

      if (nuevoStock <= 3) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📦 ¡Stock bajo!",
            body: `Quedan solo ${nuevoStock} unidades del producto "${form.nombre}"`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH
          },
          trigger: null,
        });
      }

      const { error } = await supabase
        .from('ventas')
        .insert([{
          producto_id: productos.id,
          nombre_producto: form.nombre,
          cantidad: cantidadVenta,
          precio_venta: parseFloat(form.precioDeVenta),
        }]);

      if (error) {
        console.error('Error guardando venta:', error);
        Alert.alert("Error", "No se pudo guardar la venta");
      } else {
        Alert.alert("Éxito", "Venta registrada correctamente");
        reset();
      }

    } catch (error) {
      console.error('Error:', error);
      Alert.alert("Error", "Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarGuardado = async () => {
    console.log("Confirmando guardado...", { type, form });
    setConfirmVisible(false);

    if (type === "inventory") {
      console.log("Ejecutando guardarProducto...");
      await guardarProducto();
    } else if (type === "sale") {
      console.log("Ejecutando guardarVenta...");
      await guardarVenta();
    } else {
      console.error("Tipo no válido:", type);
      Alert.alert("Error", "Tipo de operación no válido");
    }
  };

  useSpeechRecognitionEvent("start", () => {
    console.log("Speech recognition started");
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("Speech recognition ended");
    setIsListening(false);
    setIsRecording(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    console.log("Speech recognition result:", event);
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0].transcript;
      setRecognitionResults(prev => [...prev, transcript]);
      processVoiceInput(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    setIsRecording(false);

    let errorMessage = "Error en el reconocimiento de voz. Intenta nuevamente.";
    if (event.error) {
      errorMessage = `Error: ${event.error}`;
    }

    Alert.alert("Error de reconocimiento", errorMessage);
  });

  const startRecording = async () => {
    try {
      setRecognitionResults([]);

      const options = {
        lang: "es-ES",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
      };

      await ExpoSpeechRecognitionModule.start(options);
      setIsRecording(true);
      console.log("Speech recognition started successfully");

    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setIsRecording(false);
      setIsListening(false);

      Alert.alert(
        "Error al iniciar grabación",
        "Verifica los permisos del micrófono y intenta nuevamente."
      );
    }
  };

  const stopRecording = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsRecording(false);
      setIsListening(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording || isListening) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const processVoiceInput = (text: string) => {
    const lower = text.toLowerCase();
    const nd = { ...voiceData };

    if (type === "inventory") {
      if (lower.includes("nombre")) {
        const nombreMatch = text.match(/nombre\s+(.+?)(?:\s+empresa|$)/i);
        if (nombreMatch) nd.nombre = nombreMatch[1].trim();
      }
      if (lower.includes("empresa")) {
        const empresaMatch = text.match(/empresa\s+(.+?)(?:\s+grupo|$)/i);
        if (empresaMatch) nd.empresa = empresaMatch[1].trim();
      }
      if (lower.includes("grupo")) {
        const grupoMatch = text.match(/grupo\s+(.+?)(?:\s+precio|$)/i);
        if (grupoMatch) nd.grupo = grupoMatch[1].trim();
      }
      if (lower.includes("precio de venta")) {
        const precioMatch = text.match(/precio\s+de\s+venta\s+([\d\s.,]+)/i);
        if (precioMatch) nd.precioDeVenta = precioMatch[1];
      }
      if (lower.includes("precio de compra")) {
        const precioMatch = text.match(/precio\s+de\s+compra\s+([\d\s.,]+)/i);
        if (precioMatch) nd.precioDeCompra = precioMatch[1];
      }
      if (lower.includes("cantidad")) {
        const cantidadMatch = text.match(/cantidad\s+([\d\s.,]+)/i);
        if (cantidadMatch) nd.cantidad = cantidadMatch[1];
      }
      if (lower.includes("fecha de vencimiento") || lower.includes("vencimiento")) {
        const mesesMap: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        if (lower.includes("fecha de vencimiento") || lower.includes("vencimiento")) {
          const fechaNumericaMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento)\s+(\d{1,2})\s*[\/\-\s]+(\d{1,2})\s*[\/\-\s]+(\d{4})/i);

          if (fechaNumericaMatch) {
            const dia = fechaNumericaMatch[1].padStart(2, '0');
            const mes = fechaNumericaMatch[2].padStart(2, '0');
            const año = fechaNumericaMatch[3];
            nd.fechaVencimiento = `${dia}/${mes}/${año}`;
          } else {
            const fechaNaturalMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento)\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);

            if (fechaNaturalMatch) {
              const dia = fechaNaturalMatch[1].padStart(2, '0');
              const mesNombre = fechaNaturalMatch[2].toLowerCase();
              const año = fechaNaturalMatch[3];
              const mesNumero = mesesMap[mesNombre];

              if (mesNumero) {
                nd.fechaVencimiento = `${dia}/${mesNumero}/${año}`;
              }
            } else {
              const fechaSimpleMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento)\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);

              if (fechaSimpleMatch) {
                const dia = fechaSimpleMatch[1].padStart(2, '0');
                const mesNombre = fechaSimpleMatch[2].toLowerCase();
                const año = fechaSimpleMatch[3];
                const mesNumero = mesesMap[mesNombre];

                if (mesNumero) {
                  nd.fechaVencimiento = `${dia}/${mesNumero}/${año}`;
                }
              }
            }
          }
        }
      }
    }

    if (type === "sale") {
      if (lower.includes("cantidad")) {
        const cantidadMatch = text.match(/cantidad\s+([\d\s.,]+)/i);
        if (cantidadMatch) nd.cantidad = cantidadMatch[1];
      }
      if (lower.includes("precio de venta") || lower.includes("precio")) {
        const precioMatch = text.match(/precio\s+de\s+venta\s+([\d\s.,]+)/i);
        if (precioMatch) nd.precioDeVenta = precioMatch[1];
      }
    }

    setVoiceData(nd);
  };

  useEffect(() => setForm(prev => ({ ...prev, ...voiceData })), [voiceData]);

  const [isEditing, setIsEditing] = useState({
    isFieldEditing: false,
    key: ""
  });

  const reset = () => {
    setStep("choose");
    setType(null);
    setConfirmVisible(false);
    setIsRecording(false);
    setIsListening(false);
    setRecognitionResults([]);
    setVoiceData({ nombre: "", empresa: "", grupo: "", precioDeVenta: "", precioDeCompra: "", cantidad: "", fechaVencimiento: "" });
    setForm({ nombre: "", empresa: "", grupo: "", precioDeVenta: "", precioDeCompra: "", cantidad: "", barcode: "", fechaVencimiento: "" });
  };

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setVoiceData(prev => ({ ...prev, [field]: value }));
  };

  if (!permission?.granted) return <PermissionCamera requestPermission={requestPermission} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {step === "choose" && <Choose setType={setType} setStep={setStep} />}
      {step === "record" && (
        <>
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10
          }}>
            <BackButton path="/modal/register" onPress={() => setStep("choose")} label="Volver" />
            <Pressable onPress={() => setShowManual(!showManual)} style={{ borderWidth: 1, padding: 10, borderRadius: 10, borderColor: !isListening ? "#a5e8fbff" : "#e0e0e0" }}>
              <Text style={[styles.resultText, { fontSize: 16, textAlign: "center" }]}>Manual</Text>
            </Pressable>
          </View>
          <View style={styles.centered}>
            <Text style={styles.title}>
              {isListening ? "Escuchando..." : `Registro de ${type === "inventory" ? "Inventario" : "Venta"}`}
            </Text>

            <MaterialCommunityIcons
              name={isListening ? "microphone" : "microphone-off"}
              size={100}
              color={isListening ? "#FF3D00" : "#1976D2"}
            />

            <View style={styles.recordingControls}>
              <TouchableOpacity
                onPress={toggleRecording}
                style={[
                  styles.controlButton,
                  isRecording ? styles.pauseButton : styles.recordButton
                ]}
              >
                <Text style={styles.controlButtonText}>
                  {isRecording ? "⏸ Pausar" : "🎤 Grabar voz"}
                </Text>
              </TouchableOpacity>

              {isRecording && (
                <TouchableOpacity
                  onPress={stopRecording}
                  style={[styles.controlButton, styles.stopButton]}
                >
                  <Text style={styles.controlButtonText}>⏹ Finalizar</Text>
                </TouchableOpacity>
              )}
            </View>

            {recognitionResults.length > 0 && (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptText}>
                  Último: "{recognitionResults[recognitionResults.length - 1]}"
                </Text>
              </View>
            )}

            <View style={styles.detectedFields}>
              <Text style={styles.subtitle}>Campos detectados</Text>
              {scannedData && <ResultScanner scannedData={scannedData} />}
              {
                type === "sale" && (
                  <View style={[{
                    flexDirection: "column",
                    marginVertical: 10,
                    paddingHorizontal: 10
                  }, styles.fieldItem]}>
                    <Text style={[styles.fieldName, {
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 10,
                      textTransform: "capitalize"
                    }]}>
                      Producto
                    </Text>

                    {form.nombre ? (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#1a1a1a",
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#2a8fa9ff"
                      }}>
                        <Text style={{ color: "#fff", fontSize: 16, flex: 1 }}>
                          {form.nombre}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setForm({ ...form, nombre: "", precioDeVenta: "" });
                            setVoiceData({ ...voiceData, nombre: "", precioDeVenta: "" });
                          }}
                          style={{ padding: 5 }}
                        >
                          <Text style={{ color: "#1976D2", fontSize: 14 }}>Cambiar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Picker
                        selectedValue={form.nombre}
                        onValueChange={(itemValue) => {
                          setForm({ ...form, nombre: itemValue });
                          setVoiceData({ ...voiceData, nombre: itemValue });
                        }}
                        style={{
                          backgroundColor: "#1a1a1a",
                          color: "#fff",
                          borderWidth: 1,
                          borderColor: "#2a8fa9ff",
                          padding: 10,
                          borderRadius: 8
                        }}
                        itemStyle={{ color: "#fff" }}
                        dropdownIconColor="#fff"
                      >
                        <Picker.Item label="Selecciona tu producto" value="" enabled={false} />
                        {products.length > 0 && products.map((item) => (
                          <Picker.Item key={item.id} label={item.name} value={item.name} />
                        ))}
                      </Picker>
                    )}
                  </View>
                )
              }

              {Object.entries(form).map(([key, value]) => {
                // Para sales, solo mostrar campos relevantes
                if (type === "sale" && !["nombre", "cantidad", "precioDeVenta"].includes(key)) return null;
                // No mostrar barcode en la lista, se maneja por separado
                if (key === "barcode") return null;

                return (
                  <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  >
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                      <View
                        key={key}
                        style={[styles.fieldItem, {
                          borderBottomWidth: 1,
                          borderBottomColor: "#333",
                          paddingVertical: 15,
                          marginBottom: 0,
                          paddingHorizontal: 10
                        }]}
                      >
                        <View style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          width: "100%",
                          maxWidth: "100%"
                        }}>
                          {/* Columna izquierda: Label y valor */}
                          <View style={{ flex: 1, marginRight: 10, maxWidth: "80%" }}>
                            <Text style={[styles.fieldName, {
                              fontSize: 16,
                              fontWeight: "600",
                              marginBottom: 5,
                              textTransform: "capitalize"
                            }]}>
                              {key}
                            </Text>

                            {isEditing.isFieldEditing && key === isEditing.key ? (
                              <TextInput
                                style={[styles.input, {
                                  borderRadius: 8,
                                  borderColor: "#b8d9f9ff",
                                  borderWidth: 1,
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  fontSize: 16,
                                  backgroundColor: "#1a1a1a",
                                  color: "#fff",
                                  marginTop: 5,
                                  width: "100%"
                                }]}
                                value={value}
                                keyboardType={
                                  key === "cantidad" || key === "precioDeVenta" || key === "precioDeCompra"
                                    ? "numeric" : "default"
                                }
                                onChangeText={(t) => updateField(key, t)}
                                autoFocus={true}
                                onBlur={() => setIsEditing({ isFieldEditing: false, key: "" })}
                              />
                            ) : (
                              <Text style={[styles.fieldValue, value ? styles.detected : styles.notDetected, {
                                fontSize: 14,
                                color: value ? "#fff" : "#888"
                              }]}>
                                {value || "(pendiente)"}
                              </Text>
                            )}
                          </View>

                          {/* Columna derecha: Botón de edición */}
                          {key !== "fechaVencimiento" && (
                            <View style={{ width: 48 }}>
                              <TouchableOpacity
                                onPress={() => {
                                  if (isEditing.isFieldEditing && isEditing.key === key) {
                                    setIsEditing({ isFieldEditing: false, key: "" });
                                  } else {
                                    setIsEditing({ isFieldEditing: true, key });
                                  }
                                }}
                                style={{
                                  padding: 10,
                                  borderRadius: 8,
                                  borderColor: "#1976D2",
                                  borderWidth: 1,
                                  backgroundColor: isEditing.isFieldEditing && isEditing.key === key ? "#1976D2" : "transparent",
                                  width: 44,
                                  height: 44,
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                              >
                                <Entypo
                                  name="pencil"
                                  size={16}
                                  color={isEditing.isFieldEditing && isEditing.key === key ? "#fff" : "#1976D2"}
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                );
              })}

              {
                (type === "sale" || type === "inventory") && (
                  <>
                    <Text style={{ color: "#fff", fontSize: 14, marginVertical: 10, textAlign: "center" }}>
                      {!scannedData ? "Escanea el código de barras" : "¿Escanear otro código?"}
                    </Text>
                    <ButtonScanner onPress={() => setStep("scan")} />
                  </>
                )
              }
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep("verify")}
            >
              <Text style={styles.nextText}>Siguiente</Text>
            </TouchableOpacity>

          </View>
        </>
      )}

      {step === "scan" && <Scanner goPath={() => setStep("record")} typeSection={type as string} />}

      {step === "verify" && (
        <>
          <BackButton path="/modal/register" onPress={() => setStep("record")} label="Volver" />
          <View style={styles.centered}>
            <Text style={styles.title}>Verifica y edita los datos</Text>
            <View style={styles.detectedFields}>
              {type === "sale" ? <FormSale form={form} updateField={updateField} />
                : <FormInventory form={form} updateField={updateField} />}
            </View>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={() => setConfirmVisible(true)}
              disabled={isLoading}
            >
              <Text style={styles.nextText}>
                {isLoading ? "Guardando..." : `Guardar ${type === "sale" ? "Venta" : "Inventario"}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal transparent visible={confirmVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>¿Estás seguro de guardar?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarGuardado}>
                <Text style={styles.confirmButton}>Sí, guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Manual isVisible={showManual} onClose={() => setShowManual(!showManual)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#191a26", flexGrow: 1, marginTop: Constants.statusBarHeight },
  centered: { alignItems: "center", justifyContent: "center", flexGrow: 1 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#fff",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
    color: "#fff",
  },
  chooseBox: { flexDirection: "row", gap: 20 },
  chooseCard: {
    backgroundColor: "#191a26",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    borderColor: "blue",
    borderWidth: 2,
    width: 140,
  },
  chooseText: { fontSize: 16, fontWeight: "600", marginTop: 8, color: "#fff" },
  nextButton: {
    marginTop: 15,
    marginBottom: 45,
    width: "100%",
    backgroundColor: "#2a8fa9ff",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  transcriptBox: {
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
  },
  transcriptText: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#1976D2",
    textAlign: "center",
  },
  recordingControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
  },
  recordButton: {
    backgroundColor: "#1976D2",
  },
  pauseButton: {
    backgroundColor: "#FF9800",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  controlButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  detectedFields: {
    backgroundColor: "#1b1728ff",
    padding: 15,
    borderColor: "#29a4e2ff",
    borderWidth: 1,
    borderRadius: 10,
    width: "100%",
    marginVertical: 10,
  },

  fieldItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  fieldName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#81b4fbff",
    flex: 1,
  },
  fieldValue: {
    fontSize: 16,
    flex: 2,
    textAlign: "right",
  },
  detected: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  notDetected: {
    color: "#999",
    fontStyle: "italic",
  },

  overlay: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  resultText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  nextText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "100%",
    marginVertical: 10,
  },
  input: {
    color: "#fff",
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#2e8ea1ff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBox: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
    padding: 10,
  },
  confirmButton: {
    fontSize: 16,
    color: "#1976D2",
    fontWeight: "bold",
    padding: 10,
  },
  permissionButton: {
    backgroundColor: "#1976D2",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },

});