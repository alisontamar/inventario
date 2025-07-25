import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function BackButton({
  path = "/",
  label = "Volver",
  onPress,
}: {
  path?: string;
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Link href={path} asChild>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 4,
  },
});