import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern}>
        {/* Decorative food elements */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
        <View style={[styles.circle, styles.circle4]} />
        <View style={[styles.circle, styles.circle5]} />
        <View style={[styles.circle, styles.circle6]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.chefHat}>
            <Ionicons name="restaurant" size={60} color="#1F7655" />
          </View>
          <Text style={styles.logoText}>RecipePro</Text>
          <Text style={styles.tagline}>Plan • Cook • Scale • Manage</Text>
        </View>
      </View>

      <View style={styles.bottomIndicator}>
        <View style={styles.loadingBar} />
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
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.15,
  },
  circle1: { width: 120, height: 120, backgroundColor: "#E91E63", top: 40, left: -30 },
  circle2: { width: 80, height: 80, backgroundColor: "#FF9800", top: 120, right: 20 },
  circle3: { width: 100, height: 100, backgroundColor: "#4CAF50", bottom: 200, left: 30 },
  circle4: { width: 60, height: 60, backgroundColor: "#2196F3", bottom: 300, right: 40 },
  circle5: { width: 90, height: 90, backgroundColor: "#9C27B0", top: 200, left: 60 },
  circle6: { width: 70, height: 70, backgroundColor: "#FF5722", bottom: 100, right: 60 },
  content: {
    alignItems: "center",
    zIndex: 1,
  },
  logoContainer: {
    alignItems: "center",
  },
  chefHat: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1F7655",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: "#68736D",
    marginTop: 8,
    fontWeight: "500",
  },
  bottomIndicator: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  loadingBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1F7655",
  },
});
