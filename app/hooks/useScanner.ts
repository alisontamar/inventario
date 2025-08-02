import { useState } from "react";
import { Alert } from "react-native";
import { BarcodeScanningResult } from "expo-camera";
import { supabase } from "@/constants/supabase";

export function useScanner() {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedData, setScannedData] = useState<string | null>(null);

    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
        if (!result.data && !isScanning) return;

        setScannedData(result.data);
        setIsScanning(true);
    };

    const searchingProductTypeSale = async (barcode: string) => {
        return await searchProductByBarcode(barcode);
    };

    const resetScanner = () => {
        setIsScanning(false);
        setScannedData(null);
        Alert.alert("Escaneo reiniciado", "Ahora puedes escanear otro código de barras");
    };

    const searchProductByBarcode = async (barcode: string) => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (!data && !error) return null;
            return data;
        } catch (error) {
            Alert.alert("Error", "Hubo un problema al buscar el producto");
        }
    };

    return {
        isScanning,
        scannedData,
        handleBarCodeScanned,
        resetScanner,
        searchProductByBarcode,
        searchingProductTypeSale
    }
}