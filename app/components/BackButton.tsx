import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function BackButton({ path = "/", label = "Volver", onPress }: { path?: string, label?: string, onPress?: () => void }) {
  return (
    <Link href={path} style={styles.button} asChild onPress={onPress}>
      <View style={styles.button}>
        <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
});
