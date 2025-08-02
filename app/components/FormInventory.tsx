import { TextInput, StyleSheet } from "react-native";
export default function FormInventory({ form, updateField }: { form: any, updateField: (field: keyof typeof form, value: string) => void }) {
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