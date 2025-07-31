import { View } from "@/components/Themed";
import { useScanner } from "@/app/hooks/useScanner";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { BarcodeScanningResult, CameraView } from "expo-camera";
import { useEffect, useRef } from "react";

export default function Scanner({ goPath, typeSection = "inventory" }: { goPath: () => void, typeSection?: string }) {
    const { scannedData, isScanning, searchingProductTypeSale, handleBarCodeScanned,
        resetScanner } = useScanner();
    console.log(typeSection)
    useEffect(() => {
        const searchingPruductsSale = async () => {
            if (typeSection === "sale" && scannedData) {
                await searchingProductTypeSale(scannedData as string);
            }
        }
        searchingPruductsSale();
    }, [scannedData]);
    return (
        <>
            <StartScanner isScanning={isScanning} handleBarCodeScanned={handleBarCodeScanned} />
            <ResultScanner scannedData={scannedData}
                resetScanner={resetScanner}
            />
            <ActionButtonScanner goPath={goPath} scannedData={scannedData} />
        </>
    );
}

export function ButtonScanner({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.initButtonScan} onPress={onPress}>
            <Text style={styles.optionText}>📎 Escanear código de barras</Text>
        </TouchableOpacity>
    )
}

function StartScanner({ isScanning, handleBarCodeScanned }: { isScanning: boolean, handleBarCodeScanned: (result: BarcodeScanningResult) => Promise<void> }) {
    const cameraRef = useRef<CameraView>(null);
    return (
        <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
            <Text style={styles.title}>Escanea el código de barras</Text>
            <CameraView
                ref={cameraRef}
                style={{ width: "100%", height: "100%" }}
                facing="back"
                autofocus="on"
                onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["code128", "ean13", "ean8", "qr"] }}
            />
        </View>
    );
}

function ResultScanner({ scannedData, resetScanner }: { scannedData: any | null, resetScanner: () => void }) {
    return (
        <View style={styles.scanResultContainer}>
            <Text style={styles.scanResultText}>
                ✅ Código escaneado: {scannedData}
            </Text>
            <TouchableOpacity
                style={styles.rescanButton}
                onPress={resetScanner}
            >
                <Text style={styles.rescanButtonText}>🔄 Escanear otro código</Text>
            </TouchableOpacity>
        </View>
    );
}

function ActionButtonScanner({ goPath, scannedData }: { goPath: () => void, scannedData: any | null }) {
    return (
        <View style={styles.scanControls}>
            <TouchableOpacity
                style={styles.actionButton}
                onPress={goPath}
            >
                <Text style={styles.nextText}>{scannedData ? "Continuar" : "Volver"}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#fff",
    },

    nextText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    optionText: { color: "#fff", fontSize: 16 },

    scanResultContainer: {
        backgroundColor: "#E8F5E8",
        padding: 15,
        borderRadius: 10,
        marginVertical: 10,
        width: "100%",
        alignItems: "center",
    },
    scanControls: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginVertical: 15,
        width: "100%",
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
    actionButton: {
        borderColor: "#9fd2f7ff",
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        marginTop: 10,
    },

    initButtonScan: {
        borderColor: "#3dd1c5ff",
        borderWidth: 1,
        padding: 15,
        borderRadius: 10,
        marginVertical: 5,
        width: "100%",
        alignItems: "center",
    },
});
