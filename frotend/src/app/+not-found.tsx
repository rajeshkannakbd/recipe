
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";

export default function NotFoundScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const animationSize = Math.min(width * 0.72, height * 0.38, 300);

  const handleGoHome = () => {
    router.replace("/categories");
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/categories");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.animationContainer}>
          <LottieView
            source={require("../../assets/animations/Error 404.json")}
            autoPlay
            loop
            resizeMode="contain"
            style={{
              width: animationSize,
              height: animationSize,
            }}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.errorCode}>404</Text>

          <Text style={styles.title}>
            Oops! Page not found
          </Text>

          <Text style={styles.description}>
            Looks like this recipe took a wrong turn.
            {"\n"}
            Let's get you back to something delicious!
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              styles.homeButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go to home"
          >
            <Text style={styles.homeButtonText}>
              Go to Home
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back to the previous screen"
          >
            <Text style={styles.backButtonText}>
              Go Back
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          RecipePro · Made for food lovers
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
  },

  animationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  textContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },

  errorCode: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#1F7655",
    marginBottom: 8,
  },

  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: "#18392D",
    textAlign: "center",
    letterSpacing: -0.6,
  },

  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400",
    color: "#68736D",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  buttonContainer: {
    width: "100%",
    marginTop: 28,
    gap: 12,
  },

  homeButton: {
    minHeight: 52,
    backgroundColor: "#1F7655",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    elevation: 2,
  },

  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },

  backButton: {
    minHeight: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DE",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  backButtonText: {
    color: "#1F7655",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  footer: {
    marginTop: 28,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: "#98A39B",
    textAlign: "center",
  },
});
