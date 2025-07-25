import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Alert,
  Pressable
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import {
  CameraView, BarcodeScanningResult, useCameraPermissions
} from "expo-camera";
import { supabase } from "@/constants/supabase";
import * as Notifications from 'expo-notifications';
import Manual from "@/app/modal/manual";
import BackButton from "@/app/components/BackButton";

export default function RegisterModal() {
  const [step, setStep] = useState<"choose" | "record" | "verify" | "scan">("choose");
  const [type, setType] = useState<"inventory" | "sale" | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showManual, setShowManual] = useState(false);
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

  // Función para formatear fecha (YYYY-MM-DD)
  const formatDateForDB = (dateString: string): string | null => {
    if (!dateString) return null;

    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    // Si está en formato DD/MM/YYYY, convertir
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }

    // Si está en formato DD-MM-YYYY, convertir
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('-');
      return `${year}-${month}-${day}`;
    }

    return null;
  };
  useEffect(() => {
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Alert.alert("Permiso requerido", "Necesitas habilitar notificaciones para recibir alertas de stock");
      }
    });
  }, []);

  // Función para formatear fecha para mostrar (DD/MM/YYYY)
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";

    // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }

    return dateString;
  };

  // Funciones para guardar en la base de datos
  const guardarProducto = async () => {
  try {
    setIsLoading(true);

    if (!form.nombre) {
      Alert.alert("Error", "El nombre del producto es requerido");
      return;
    }

    // Validar fecha de vencimiento si se proporcionó
    let fechaVencimientoFormatted = null;
    if (form.fechaVencimiento) {
      fechaVencimientoFormatted = formatDateForDB(form.fechaVencimiento);
      if (!fechaVencimientoFormatted) {
        Alert.alert("Error", "Formato de fecha inválido. Usa DD/MM/YYYY");
        return;
      }
    }

    // Verificar si ya existe un producto similar (por barcode o nombre + empresa)
    // Solo buscar si hay barcode
    let existingProduct = null;
    if (form.barcode) {
      const { data, error: searchError } = await supabase
        .from('productos')
        .select('*')
        .eq('barcode', form.barcode)
        .single(); // Usar .single() para obtener un objeto, no un array

      if (searchError) {
        // Si el error es PGRST116, significa que no se encontró el producto
        if (searchError.code !== 'PGRST116') {
          console.error('Error buscando producto existente:', searchError);
          Alert.alert("Error", "Error al verificar producto existente");
          return;
        }
        // Si es PGRST116, continuamos con existingProduct = null
      } else {
        existingProduct = data;
      }
    }

    if (existingProduct) {
      // El producto existe, actualizar
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
      // El producto no existe, crear uno nuevo
      const { data, error } = await supabase
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
        console.error('Error guardando producto:', error);
        Alert.alert("Error", "No se pudo guardar el producto");
      } else {
        Alert.alert("Éxito", "Producto guardado correctamente");
        reset();
      }
    }
  } catch (error) {
    console.error('Error:', error);
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

      if (nuevoStock < 0) {
        Alert.alert("Stock insuficiente", `Solo hay ${productos.cantidad} unidades disponibles`);
        return;
      }

      // Notificación si el stock baja de 3
      if (nuevoStock < 3) {
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

      // Registrar la venta
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
    setConfirmVisible(false);

    if (type === "inventory") {
      await guardarProducto();
    } else if (type === "sale") {
      await guardarVenta();
    }
  };

  // Función para buscar producto por código de barras
  const buscarProductoPorBarcode = async (barcode: string) => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (data && !error) {
        // Rellenar el formulario con los datos del producto encontrado
        setForm(prev => ({
          ...prev,
          nombre: data.nombre,
          empresa: data.empresa || "",
          grupo: data.grupo || "",
          precioDeVenta: data.precio_venta?.toString() || "",
          precioDeCompra: data.precio_compra?.toString() || "",
          cantidad: data.cantidad?.toString() || "",
          barcode: barcode,
          fechaVencimiento: data.fecha_vencimiento ? formatDateForDisplay(data.fecha_vencimiento) : ""
        }));

        setVoiceData(prev => ({
          ...prev,
          nombre: data.nombre,
          empresa: data.empresa || "",
          grupo: data.grupo || "",
          precioDeVenta: data.precio_venta?.toString() || "",
          precioDeCompra: data.precio_compra?.toString() || "",
          cantidad: data.cantidad?.toString() || "",
          fechaVencimiento: data.fecha_vencimiento ? formatDateForDisplay(data.fecha_vencimiento) : ""
        }));

        Alert.alert("Producto encontrado", `Se encontró: ${data.nombre}`);
      } else {
        Alert.alert("Producto no encontrado", "Este código de barras no está registrado en el inventario");
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      Alert.alert("Error", "Hubo un problema al buscar el producto");
    }
  };

  // Función para resetear el escaneo
  const resetearEscaneo = () => {
    setScanned(false);
    setScannedData(null);
    // Limpiar el código de barras del formulario
    setForm(prev => ({ ...prev, barcode: "" }));
    Alert.alert("Escaneo reiniciado", "Ahora puedes escanear otro código de barras");
  };

  // Escuchar eventos de reconocimiento de voz
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
      console.log("Transcript:", transcript);
      setRecognitionResults(prev => [...prev, transcript]);
      processVoiceInput(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event);
    setIsListening(false);
    setIsRecording(false);

    let errorMessage = "Error en el reconocimiento de voz. Intenta nuevamente.";
    if (event.error) {
      errorMessage = `Error: ${event.error}`;
    }

    Alert.alert("Error de reconocimiento", errorMessage);
  });

  useEffect(() => {
    const setupComponent = async () => {
      try {
        await requestPermission();

        // Verificar si el reconocimiento de voz está disponible
        const available = await ExpoSpeechRecognitionModule.getStateAsync();
        console.log("Speech recognition state:", available);

        // Solicitar permisos de audio
        const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        console.log("Audio permissions:", status);

        if (status !== 'granted') {
          Alert.alert(
            "Permisos necesarios",
            "Se necesitan permisos de micrófono para el reconocimiento de voz"
          );
        }
      } catch (error) {
        console.error("Error setting up component:", error);
      }
    };

    setupComponent();
  }, []);

  const startRecording = async () => {
    try {
      console.log("Starting speech recognition...");

      // Limpiar resultados anteriores
      setRecognitionResults([]);

      // Configurar opciones de reconocimiento
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
      console.log("Stopping speech recognition...");
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
    console.log("Toggle recording called", { isRecording, isListening });

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
      // Procesar campos individuales
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
        // Buscar fechas en formato DD/MM/YYYY o DD-MM-YYYY
        // Regex más flexible para fechas dictadas por voz
        // Mapeo de meses en español
        const mesesMap: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        if (lower.includes("fecha de vencimiento") || lower.includes("vencimiento")) {

          // Opción 1: Formato DD/MM/YYYY o DD-MM-YYYY
          const fechaNumericaMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento)\s+(\d{1,2})\s*[\/\-\s]+(\d{1,2})\s*[\/\-\s]+(\d{4})/i);

          if (fechaNumericaMatch) {
            const dia = fechaNumericaMatch[1].padStart(2, '0');
            const mes = fechaNumericaMatch[2].padStart(2, '0');
            const año = fechaNumericaMatch[3];
            nd.fechaVencimiento = `${dia}/${mes}/${año}`;
          } else {
            // Opción 2: Formato natural "9 de julio de 2027"
            const fechaNaturalMatch = text.match(/(?:fecha\s+de\s+vencimiento|vencimiento)\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);

            if (fechaNaturalMatch) {
              const dia = fechaNaturalMatch[1].padStart(2, '0');
              const mesNombre = fechaNaturalMatch[2].toLowerCase();
              const año = fechaNaturalMatch[3];

              // Convertir nombre del mes a número
              const mesNumero = mesesMap[mesNombre];

              if (mesNumero) {
                nd.fechaVencimiento = `${dia}/${mesNumero}/${año}`;
              }
            } else {
              // Opción 3: Formato "9 julio 2027" (sin "de")
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
      if (lower.includes("nombre")) {
        const nombreMatch = text.match(/nombre\s+(.+?)(?:\s+cantidad|$)/i);
        if (nombreMatch) nd.nombre = nombreMatch[1].trim();
      }
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

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (isRecording || isListening) {
        ExpoSpeechRecognitionModule.stop().catch(console.error);
      }
    };
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.centered}>
        <Text>Se necesitan permisos para la cámara.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.nextText}>Conceder permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (result.data && !scanned) {
      setScannedData(result.data);
      setScanned(true);
      setForm(prev => ({ ...prev, barcode: result.data }));

      // Buscar producto por código de barras
      await buscarProductoPorBarcode(result.data);
    }
  };

  const reset = () => {
    setStep("choose");
    setType(null);
    setConfirmVisible(false);
    setScanned(false);
    setScannedData(null);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {step === "choose" && (
        <>
          <BackButton path="/" label="Volver" />
          <View style={styles.centered}>
            <Text style={styles.title}>¿Qué deseas registrar?</Text>
            <View style={styles.chooseBox}>
              <TouchableOpacity style={styles.chooseCard} onPress={() => { setType("inventory"); setStep("record"); }}>
                <MaterialCommunityIcons name="package-variant" size={40} color="#1976D2" />
                <Text style={styles.chooseText}>Inventario</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chooseCard} onPress={() => { setType("sale"); setStep("record"); }}>
                <MaterialCommunityIcons name="receipt" size={40} color="#1976D2" />
                <Text style={styles.chooseText}>Venta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {step === "record" && (
        <>
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", gap: 10,
            marginBottom: 10,
            alignSelf: "stretch",
          }}>
            <BackButton path="/modal/register" onPress={() => setStep("choose")} label="Volver" />
            <Pressable onPress={() => setShowManual(!showManual)} style={{ borderWidth: 1, padding: 10, borderRadius: 10, borderColor: !isListening ? "#ebf13fff" : "#e0e0e0" }}>
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
            {/*Botones de inicio y pausa de la grabación*/}
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
              {Object.entries(voiceData).map(([key, value]) => {
                if (type === "sale" && !["nombre", "cantidad", "precioDeVenta"].includes(key)) return null;
                return (
                  <View key={key} style={styles.fieldItem}>
                    <Text style={styles.fieldName}>{key}:</Text>
                    <Text style={[styles.fieldValue, value ? styles.detected : styles.notDetected]}>
                      {value || "(pendiente)"}
                    </Text>
                  </View>
                );
              })}
            </View>

            {type === "inventory" && (
              <>
                <TouchableOpacity style={styles.photoButton} onPress={() => { setStep("scan"); setScanned(false); }}>
                  <Text style={styles.optionText}>📎 Escanear código de barras</Text>
                </TouchableOpacity>
              </>
            )}

            {scannedData && (
              <View style={styles.overlay}>
                <Text style={styles.resultText}>📦 Código de barras: {scannedData}</Text>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={resetearEscaneo}
                >
                  <Text style={styles.rescanButtonText}>🔄 Escanear otro código</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep("verify")}
            >
              <Text style={styles.nextText}>Siguiente</Text>
            </TouchableOpacity>

          </View>
        </>
      )}

      {step === "scan" && (
        <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
          <Text style={styles.title}>Escanea el código de barras</Text>

          {scannedData && (
            <View style={styles.scanResultContainer}>
              <Text style={styles.scanResultText}>
                ✅ Código escaneado: {scannedData}
              </Text>
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={resetearEscaneo}
              >
                <Text style={styles.rescanButtonText}>🔄 Escanear otro código</Text>
              </TouchableOpacity>
            </View>
          )}

          <CameraView
            ref={cameraRef}
            style={{ width: "100%", height: "60%" }}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["code128", "ean13", "ean8", "qr"] }}
          />

          <View style={styles.scanControls}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep("record")}
            >
              <Text style={styles.nextText}>Volver</Text>
            </TouchableOpacity>

            {scannedData && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setStep("record")}
              >
                <Text style={styles.nextText}>Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {step === "verify" && (
        <>
          <BackButton path="/modal/register" onPress={() => setStep("record")} label="Volver" />
          <View style={styles.centered}>
            <Text style={styles.title}>Verifica y edita los datos</Text>
            <View style={styles.detectedFields}>
              {type === "sale" ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={form.nombre}
                    onChangeText={(t) => updateField("nombre", t)}
                    placeholder="Nombre del producto"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.cantidad}
                    onChangeText={(t) => updateField("cantidad", t)}
                    placeholder="Cantidad vendida"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.precioDeVenta}
                    onChangeText={(t) => updateField("precioDeVenta", t)}
                    placeholder="Precio de venta"
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={form.nombre}
                    onChangeText={(t) => updateField("nombre", t)}
                    placeholder="Nombre del producto"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.empresa}
                    onChangeText={(t) => updateField("empresa", t)}
                    placeholder="Empresa"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.grupo}
                    onChangeText={(t) => updateField("grupo", t)}
                    placeholder="grupo"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.precioDeVenta}
                    onChangeText={(t) => updateField("precioDeVenta", t)}
                    placeholder="Precio de venta"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.precioDeCompra}
                    onChangeText={(t) => updateField("precioDeCompra", t)}
                    placeholder="Precio de compra"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.cantidad}
                    onChangeText={(t) => updateField("cantidad", t)}
                    placeholder="Cantidad"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.fechaVencimiento}
                    onChangeText={(t) => updateField("fechaVencimiento", t)}
                    placeholder="Fecha de vencimiento (DD/MM/YYYY)"
                  />
                  <TextInput
                    style={styles.input}
                    value={form.barcode}
                    onChangeText={(t) => updateField("barcode", t)}
                    placeholder="Código de barras"
                  />
                </>
              )}
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
  container: { padding: 20, backgroundColor: "#191a26", flexGrow: 1 },
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
  optionText: { color: "#fff", fontSize: 16 },
  nextButton: {
    marginTop: 15,
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
  photoButton: {
    borderColor: "#3dd1c5ff",
    borderWidth:1,
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: "100%",
    alignItems: "center",
  },

  photo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 10,
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

  backButton: {
    backgroundColor: "#666",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
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
    color:"#fff",
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

  scanResultContainer: {
    backgroundColor: "#E8F5E8",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  scanResultText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    textAlign: "center",
  },
  rescanButton: {
    backgroundColor: "#FF9800",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  rescanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scanControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: 15,
    width: "100%",
  },
  continueButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
  },
});