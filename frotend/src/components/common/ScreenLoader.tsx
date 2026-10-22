import { StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";

export default function ScreenLoader() {
  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <LottieView
          source={require("../../../assets/animations/Walking Avocado.json")}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.animation}
        />
      </View>

      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8F3",
  },

  animationContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  animation: {
    width: "100%",
    height: "100%",
    alignSelf: "center",
  },

  loadingText: {
    marginTop: -30,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#68736D",
    textAlign: "center",
  },
});