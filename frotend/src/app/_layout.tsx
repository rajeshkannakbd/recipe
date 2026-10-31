
import "../../global.css";

import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import { AppProvider } from "../store/AppContext";
import GlobalAuthGuard from "../components/GlobalAuthGuard";
import {
  SafeAreaProvider,
} from "react-native-safe-area-context";

import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";

import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";

import { PlaywriteARGuides_400Regular } from "@expo-google-fonts/playwrite-ar-guides";

import { Stack } from 'expo-router';
import { KeyboardProvider } from
  'react-native-keyboard-controller';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    PlaywriteARGuides_400Regular,
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });



  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
     <SafeAreaProvider>
    <AppProvider>
      <GlobalAuthGuard>
        <StatusBar style="dark" />
        <NavigationBar style="dark" />
          {/* <KeyboardProvider> */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#F7F8F3",
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="category/[id]" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
        {/* </KeyboardProvider> */}
      </GlobalAuthGuard>
    </AppProvider>
    </SafeAreaProvider>
  );
}
