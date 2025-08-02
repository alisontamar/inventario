import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import Constants from "expo-constants";

export default function PermissionCamera({ requestPermission }: { requestPermission: () => void }) {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.centered}>
                <Text style={styles.nextText}>Se necesitan permisos para la cámara.</Text>
                <TouchableOpacity style={styles.permissionButton} 
                onPress={requestPermission}>
                    <Text style={styles.nextText}>Conceder permisos</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: "#191a26", flexGrow: 1, marginTop: Constants.statusBarHeight },
    centered: { alignItems: "center", justifyContent: "center", flexGrow: 1 },
    permissionButton: {
        backgroundColor: "#1976D2",
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    nextText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
});