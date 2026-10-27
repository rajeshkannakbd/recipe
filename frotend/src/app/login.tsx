import {
  View,
  TextInput,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../api/client";
import { useEffect, useRef, useState } from "react";
import AppText from "@/components/common/AppText";

const TOKEN_KEY = "recipepro_token";
const USER_KEY = "recipepro_user";

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

type StoredUser = LoginResponse["user"];

async function saveAuthData(token: string, user: StoredUser): Promise<void> {
  const userJson = JSON.stringify(user);

  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, userJson);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

async function clearAuthData(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export default function LoginScreen() {
  const router = useRouter();

  // Entrance animation values: these affect only opacity and transform.
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(16)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(18)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const entranceAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          speed: 16,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(footerTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entranceAnimation.start();

    return () => {
      entranceAnimation.stop();
    };
  }, [
    footerOpacity,
    footerTranslateY,
    formOpacity,
    formTranslateY,
    headerOpacity,
    headerTranslateY,
    logoScale,
  ]);

  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      try {
        let token: string | null = null;
        let userJson: string | null = null;

        if (Platform.OS === "web") {
          token =
            sessionStorage.getItem(TOKEN_KEY) ??
            localStorage.getItem(TOKEN_KEY);

          userJson =
            sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
        } else {
          token = await SecureStore.getItemAsync(TOKEN_KEY);
          userJson = await SecureStore.getItemAsync(USER_KEY);
        }

        if (!active || !token || !userJson) return;

        const user = JSON.parse(userJson) as LoginResponse["user"];
        const role = user.role?.trim().toLowerCase();

        if (role === "admin") {
          router.replace("/admin");
                  } else if (
          ["user", "hotelmess", "hotel/mess", "hotel", "mess"].includes(role)
        ) {
          router.replace("/categories");
                  }
      } catch (error) {
        console.error("Existing session check failed:", error);
      }
    }

    void checkExistingSession();

    return () => {
      active = false;
    };
    // Run ONCE on mount. `router` must not be a dependency: its identity can
    // change on every navigation, which re-ran this check and kept sending
    // logged-in users back to /admin or /categories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { redirectTo } = useLocalSearchParams<{
    redirectTo?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMessage = "";

        // ASP.NET Core validation errors (HTTP 400).
        if (data?.errors && typeof data.errors === "object") {
          errorMessage = Object.values(data.errors)
            .flat()
            .filter((message): message is string => typeof message === "string")
            .join("\n");
        }

        // Use the message returned by the backend.
        if (!errorMessage) {
          errorMessage =
            data?.message ||
            (response.status === 401
              ? "Invalid email or password."
              : `Login failed (${response.status}).`);
        }

        throw new Error(errorMessage);
      }

      const result = data as LoginResponse;

      if (!result?.token || !result.user?.role) {
        throw new Error("Invalid login response from the server.");
      }

      // Make the current token available to existing in-memory API consumers.
      (
        globalThis as typeof globalThis & {
          recipeProAuth?: { token?: string };
        }
      ).recipeProAuth = { token: result.token };

      // Store authentication according to the Remember Me selection.
      if (rememberMe) {
        await saveAuthData(result.token, result.user);
      } else {
        await clearAuthData();

        if (Platform.OS === "web") {
          sessionStorage.setItem(TOKEN_KEY, result.token);
          sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
        } else {
          // SecureStore is used on native devices.
          await SecureStore.setItemAsync(TOKEN_KEY, result.token);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
        }
      }

      const role = result.user.role.trim().toLowerCase();

      // Return to the recipe that prompted the login.
      // Only allow recipe detail redirects from this flow.
      if (
        typeof redirectTo === "string" &&
        redirectTo.startsWith("/recipe/") &&
        !redirectTo.includes("..") &&
        !redirectTo.includes("\\")
      ) {
        router.replace(redirectTo as never);
      } else if (role === "admin") {
        router.replace("/admin");
      } else if (
        role === "user" ||
        role === "hotelmess" ||
        role === "hotel/mess" ||
        role === "hotel" ||
        role === "mess"
      ) {
        router.replace("/categories");
      } else {
        setError(`Unsupported account role: ${result.user.role}`);
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the server. Check your API URL, network and backend."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <Animated.View
              style={[styles.logoIcon, { transform: [{ scale: logoScale }] }]}
            >
              <Ionicons name="restaurant" size={40} color="#1F7655" />
            </Animated.View>

            <AppText variant="pageTitle" style={styles.logoText}>RecipePro</AppText>
            <AppText variant="subtitle" style={styles.tagline}>Plan • Cook • Scale • Manage</AppText>
            <AppText variant="subtitle" style={styles.subText}>Login to continue</AppText>
          </Animated.View>

          <Animated.View
            style={[
              styles.form,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#68736D"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#8A938E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#68736D"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#8A938E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />

              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#68736D"
                />
              </Pressable>
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe((value) => !value)}
                disabled={loading}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>

                <AppText variant="body" style={styles.rememberText}>Remember me</AppText>
              </Pressable>

              {/* <Pressable
                onPress={() =>
                  showNotice(
                    "Forgot Password",
                    "Password reset is not configured yet."
                  )
                }
                disabled={loading}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable> */}
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <AppText variant="body" style={styles.errorText}>{error}</AppText>
              </View>
            )}

            <Pressable
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText variant="button" style={styles.loginButtonText}>Login</AppText>
              )}
            </Pressable>
            {/* 
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                style={styles.socialButton}
                onPress={() =>
                  showNotice(
                    "Google Login",
                    "Google authentication is not configured yet."
                  )
                }
              >
                <Ionicons
                  name="logo-google"
                  size={24}
                  color="#DB4437"
                />
              </Pressable>

              <Pressable
                style={styles.socialButton}
                onPress={() =>
                  showNotice(
                    "Apple Login",
                    "Apple authentication is not configured yet."
                  )
                }
              >
                <Ionicons
                  name="logo-apple"
                  size={24}
                  color="#000"
                />
              </Pressable>

              <Pressable
                style={styles.socialButton}
                onPress={() =>
                  showNotice(
                    "Phone Login",
                    "Phone authentication is not configured yet."
                  )
                }
              >
                <Ionicons
                  name="call-outline"
                  size={24}
                  color="#1F7655"
                />
              </Pressable>
            </View> */}
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              {
                opacity: footerOpacity,
                transform: [{ translateY: footerTranslateY }],
              },
            ]}
          >
            <AppText variant="body" style={styles.footerText}>Don't have an account? </AppText>

            <Pressable
              onPress={() => router.push("/signup")}
              disabled={loading}
            >
              <AppText variant="button" style={styles.signupText}>Sign Up</AppText>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 35,
  },

  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F7655",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#17231E",
  },
  subText: {
    // fontSize: 14,
    color: "#68736D",
    marginTop: 8,
    marginBottom: 5,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#17231E",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E8E3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#1F7655",
    borderColor: "#1F7655",
  },
  rememberText: {
    fontSize: 14,
    color: "#68736D",
  },
  forgotText: {
    fontSize: 14,
    color: "#1F7655",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#1F7655",
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#FCE8E6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B3261E",
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E8E3",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#8A938E",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    marginBottom: 60,
  },
  footerText: {
    fontSize: 14,
    color: "#68736D",
  },
  signupText: {
    fontSize: 14,
    color: "#1F7655",
    fontWeight: "700",
  },
  tagline: {
    // fontSize: 14,
    color: "#68736D",
    // marginTop: 3,
    // fontWeight: "500",
    marginBottom: 6,
  },
});
