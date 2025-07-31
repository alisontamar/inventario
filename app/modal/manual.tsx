import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function Manual({ onClose, isVisible }: { isVisible: boolean, onClose: () => void }) {
    return (
        <Modal animationType="slide" transparent={true} visible={isVisible}>
            <ScrollView style={{ flex: 1, backgroundColor: "#0f171dff", padding: 16 }}>
                <View style={{
                    flexDirection: "row", justifyContent: "flex-end", borderWidth: 1,
                    padding: 10, borderRadius: 10, marginBottom: 10,
                    alignSelf: "flex-end",
                    borderColor: !isVisible ? "#7ec9f4ff" : "#e0e0e0"
                }}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ fontSize: 16, color: "#fff", textAlign: "center" }}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ gap: 24 }}>

                    {/* Título */}
                    <Text style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#fff"
                    }}>
                        🗣️ Manual de ingreso por voz
                    </Text>

                    {/* Sección 1 */}
                    <View style={{
                        backgroundColor: "#e0f2fe",
                        borderColor: "#bae6fd",
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                            <Feather name="mic" size={20} color="#0284c7" />
                            <Text style={{
                                fontSize: 18,
                                fontWeight: "600",
                                color: "#0284c7",
                                marginLeft: 8
                            }}>
                                ¿Cómo ingresar productos por voz?
                            </Text>
                        </View>
                        <Text style={{ color: "#1e3a8a" }}>
                            Para que el sistema entienda correctamente, primero menciona la <Text style={{ fontWeight: "bold" }}>palabra clave</Text>, luego el valor. Por ejemplo:
                        </Text>
                        <View style={{ paddingLeft: 12, marginTop: 8, borderLeftWidth: 3, borderLeftColor: "#38bdf8" }}>
                            <Text style={{ fontStyle: "italic", color: "#1e3a8a" }}>"nombre jabón azul"</Text>
                            <Text style={{ fontStyle: "italic", color: "#1e3a8a" }}>"precio de venta 1500"</Text>
                            <Text style={{ fontStyle: "italic", color: "#1e3a8a" }}>"precio de compra 900"</Text>
                            <Text style={{ fontStyle: "italic", color: "#1e3a8a" }}>"fecha de vencimiento tres de agosto de 2023"</Text>
                            <Text style={{ color: "#7c7c17ff", marginTop: 10 }}>
                                ⚠️ El sistema no reconoce "primero" o "segundo" como fechas. 
                                Usa solo números para días y meses, para esos casos.
                            </Text>
                        </View>
                    </View>

                    {/* Sección 2 */}
                    <View style={{
                        backgroundColor: "#fef9c3",
                        borderColor: "#fde68a",
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                            <Feather name="zap" size={20} color="#ca8a04" />
                            <Text style={{
                                fontSize: 18,
                                fontWeight: "600",
                                color: "#ca8a04",
                                marginLeft: 8
                            }}>
                                ¿Y si no tengo tiempo?
                            </Text>
                        </View>
                        <Text style={{ color: "#78350f" }}>
                            Si vas con prisa, puedes simplemente hablar los datos y presionar <Text style={{ fontWeight: "bold" }}>"Continuar"</Text>.
                        </Text>
                        <Text style={{ color: "#78350f", marginTop: 6 }}>
                            Luego verás un formulario de <Text style={{ fontWeight: "bold" }}>confirmación</Text> con los campos detectados. Allí puedes <Text style={{ fontWeight: "bold" }}>corregir cualquier error</Text> antes de guardar.
                        </Text>
                    </View>

                    {/* Sección 3 */}
                    <View style={{
                        backgroundColor: "#dcfce7",
                        borderColor: "#bbf7d0",
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 10
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                            <Feather name="check-circle" size={20} color="#15803d" />
                            <Text style={{
                                fontSize: 18,
                                fontWeight: "600",
                                color: "#15803d",
                                marginLeft: 8
                            }}>
                                Consejos para una mejor detección
                            </Text>
                        </View>
                        <Text style={{ color: "#064e3b" }}>✅ Habla claro y pausado.</Text>
                        <Text style={{ color: "#064e3b" }}>✅ Usa las palabras clave exactamente como están.</Text>
                    </View>

                </View>
            </ScrollView>
        </Modal>
    );
}
