import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import Toast from 'react-native-toast-message';

import Colors from "@/constants/Colors";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
}) {
  return <MaterialIcons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.white.tint,
          // Disable the static render of the header on web
          // to prevent a hydration error in React Navigation v6.
          headerShown: useClientOnlyValue(false, true),
        }}
      >
        <Tabs.Screen
          name="HomeScreen"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
          
        />
        <Tabs.Screen
          name="InventoryScreen"
          options={{
            title: "Inventario",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="inventory" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="SalesScreen"
          options={{
            title: "Registro de Ventas",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="inventory" color={color} />
            ),
          }}
        />
      </Tabs>
      
      <Toast />
    </>
  );
}