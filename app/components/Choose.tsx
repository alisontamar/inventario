import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BackButton from "@/app/components/BackButton";
import { MaterialCommunityIcons } from "@expo/vector-icons";


export default function Choose({ setType, setStep }: { setType: React.Dispatch<React.SetStateAction<"inventory" | "sale" | null>>, setStep: React.Dispatch<React.SetStateAction<"record" | "choose" | "verify" | "scan">> }) {
    return (
        <>
            <BackButton path="/" label="Volver" />
            <View style={styles.centered}>
                <Text style={styles.title}>¿Qué deseas registrar?</Text>
                <View style={styles.chooseBox}>
                    <TouchableOpacity style={styles.chooseCard}
                        onPress={() => { setType("inventory"); setStep("record"); }}>
                        <MaterialCommunityIcons name="package-variant" size={40} color="#1976D2" />
                        <Text style={styles.chooseText}>Inventario</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chooseCard}
                        onPress={() => { setType("sale"); setStep("record"); }}>
                        <MaterialCommunityIcons name="receipt" size={40} color="#1976D2" />
                        <Text style={styles.chooseText}>Venta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    centered: { alignItems: "center", justifyContent: "center", flexGrow: 1 },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20,
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
});