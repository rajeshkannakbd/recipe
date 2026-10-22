
import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

export default function SplashScreen() {
  const router = useRouter();

  // Logo animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(25)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  // Floating background circles
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const float4 = useRef(new Animated.Value(0)).current;
  const float5 = useRef(new Animated.Value(0)).current;
  const float6 = useRef(new Animated.Value(0)).current;

  // Loading indicator
  const loadingWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatAnimation = (
      value: Animated.Value,
      duration: number,
      delay: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const floatingAnimations = [
      floatAnimation(float1, 2200, 0),
      floatAnimation(float2, 2600, 300),
      floatAnimation(float3, 2400, 150),
      floatAnimation(float4, 2000, 450),
      floatAnimation(float5, 2800, 200),
      floatAnimation(float6, 2300, 500),
    ];

    // Animate logo, title, and tagline in sequence
    const entranceAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          speed: 14,
          bounciness: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const loadingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingWidth, {
          toValue: 100,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(loadingWidth, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    floatingAnimations.forEach((animation) => animation.start());
    entranceAnimation.start();
    loadingAnimation.start();

    // Preserve existing navigation behavior
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2500);

    return () => {
      clearTimeout(timer);
      entranceAnimation.stop();
      loadingAnimation.stop();
      floatingAnimations.forEach((animation) => animation.stop());
    };
  }, [
    router,
    logoOpacity,
    logoScale,
    logoRotation,
    titleOpacity,
    titleTranslateY,
    taglineOpacity,
    taglineTranslateY,
    float1,
    float2,
    float3,
    float4,
    float5,
    float6,
    loadingWidth,
  ]);

  const rotation = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["-12deg", "0deg"],
  });

  const floatingStyle = (
    value: Animated.Value,
    distance: number
  ) => ({
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, distance],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      {/* Animated decorative background */}
      <View
        pointerEvents="none"
        style={styles.backgroundPattern}
      >
        <Animated.View
          style={[
            styles.circle,
            styles.circle1,
            floatingStyle(float1, -18),
          ]}
        />

        <Animated.View
          style={[
            styles.circle,
            styles.circle2,
            floatingStyle(float2, 15),
          ]}
        />

        <Animated.View
          style={[
            styles.circle,
            styles.circle3,
            floatingStyle(float3, -14),
          ]}
        />

        <Animated.View
          style={[
            styles.circle,
            styles.circle4,
            floatingStyle(float4, 12),
          ]}
        />

        <Animated.View
          style={[
            styles.circle,
            styles.circle5,
            floatingStyle(float5, -16),
          ]}
        />

        <Animated.View
          style={[
            styles.circle,
            styles.circle6,
            floatingStyle(float6, 14),
          ]}
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo entrance */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <View style={styles.chefHat}>
            <LottieView
        source={require("../../assets/animations/Food.json")}
        autoPlay
        loop
        resizeMode="contain"
        style={styles.animation}
      />
      </View>
        </Animated.View>

        {/* Title entrance */}
        <Animated.Text
          style={[
            styles.logoText,
            {
              opacity: titleOpacity,
              transform: [
                { translateY: titleTranslateY },
              ],
            },
          ]}
        >
          RecipePro
        </Animated.Text>

        {/* Tagline entrance */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [
                { translateY: taglineTranslateY },
              ],
            },
          ]}
        >
          Plan • Cook • Scale • Manage
        </Animated.Text>
      </View>

      {/* Animated loading indicator */}
      <View style={styles.bottomIndicator}>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingBar,
              { width: loadingWidth },
            ]}
          />
        </View>
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

  circle1: {
    width: 120,
    height: 120,
    backgroundColor: "#E91E63",
    top: 40,
    left: -30,
  },

  circle2: {
    width: 80,
    height: 80,
    backgroundColor: "#FF9800",
    top: 120,
    right: 20,
  },

  circle3: {
    width: 100,
    height: 100,
    backgroundColor: "#4CAF50",
    bottom: 200,
    left: 30,
  },

  circle4: {
    width: 60,
    height: 60,
    backgroundColor: "#2196F3",
    bottom: 300,
    right: 40,
  },

  circle5: {
    width: 90,
    height: 90,
    backgroundColor: "#9C27B0",
    top: 200,
    left: 60,
  },

  circle6: {
    width: 70,
    height: 70,
    backgroundColor: "#FF5722",
    bottom: 100,
    right: 60,
  },

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
    animation: {
    width: 240,
    height: 240,
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

  loadingTrack: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DCE8DF",
    overflow: "hidden",
  },

  loadingBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1F7655",
  },
});
