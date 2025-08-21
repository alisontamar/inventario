import { useEffect, useRef, useState } from "react";
import * as SecureStore from 'expo-secure-store';
import { BarcodeScanningResult, CameraView } from "expo-camera";
import { View } from "@/components/Themed";
import { useScanner } from "@/app/hooks/useScanner";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

function StartScanner({ isScanning, onScanned }: { isScanning: boolean, onScanned: (data: string) => void }) {
  const cameraRef = useRef<CameraView>(null);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (!isScanning) return;
    onScanned(result.data); // actualizamos el estado arriba
  };

  return (
    <View style={{ flex: 1, width: "100%", alignItems: "center" }}>
      <Text style={styles.title}>Escanea el código de barras</Text>
      <CameraView
        ref={cameraRef}
        style={{ width: "100%", height: "100%" }}
        facing="back"
        autofocus="on"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["code128", "ean13", "ean8", "qr"] }}
      />
    </View>
  );
}

export default function Scanner({ goPath, typeSection = "inventory" }: { goPath: () => void, typeSection?: string }) {
  const { isScanning, searchingProductTypeSale, resetScanner } = useScanner();
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    const searchingProductsSale = async (barcode: string) => {
      if (typeSection === "sale" && barcode) {
        await searchingProductTypeSale(barcode);
      }
    };

    if (scannedData) {
      SecureStore.setItemAsync("scannedData", scannedData);
      searchingProductsSale(scannedData);
    }
  }, [scannedData]);

  return (
    <>
      {!scannedData ? (
        <StartScanner
          isScanning={isScanning}
          onScanned={(data) => setScannedData(data)}
        />
      ) : (
        <ResultScanner scannedData={scannedData} resetScanner={() => {
          resetScanner?.();
          setScannedData(null);
        }} />
      )}
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

export function ResultScanner({ scannedData, resetScanner }: { scannedData: any | null, resetScanner?: () => void }) {
    useEffect(() => {
        if (scannedData) {
            SecureStore.setItemAsync('scannedData', scannedData)
                .then(() => {
                    console.log('Datos guardados en SecureStore');
                })
                .catch((error) => {
                    console.log('Error al guardar en SecureStore:', error);
                });
        }
    }, [scannedData]);
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