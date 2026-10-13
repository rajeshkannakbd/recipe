import "../../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {AppProvider} from "../store/AppContext"
import AuthGuard from "../components/AuthGuard";
export default function RootLayout() {
  return (
    <AppProvider>
      <AuthGuard>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
      </AuthGuard>
    </AppProvider>
  );
}
