import { TextInput, StyleSheet } from "react-native";

export default function FormSale({ form, updateField }: { form: any, updateField: (field: keyof typeof form, value: string) => void }) {
    return (
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
    );
}

const styles = StyleSheet.create({
    input: {
        color: "#fff",
        padding: 10,
        fontSize: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#ccc",
    },
});