import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../api/client";


type RegisterResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async () => {
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (trimmedName.length > 100) {
      setError("Name must be 100 characters or fewer.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (normalizedEmail.length > 200) {
      setError("Email must be 200 characters or fewer.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password.length > 100) {
      setError("Password must be 100 characters or fewer.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as RegisterResponse | null;
      if (!response.ok) {
        const validationMessages = data?.errors
          ? Object.values(data.errors).flat().join("\n")
          : "";
        throw new Error(
          data?.message ||
            validationMessages ||
            (response.status === 409
              ? "This email is already registered."
              : `Registration failed (${response.status}).`)
        );
      }

      setSuccess(data?.message || "Registration successful. You can now log in.");
      setTimeout(() => router.replace("/categories"), 900);
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err instanceof TypeError
          ? "Cannot connect to the server. Check your API URL, network and backend."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoIcon}>
                <Ionicons name="restaurant" size={36} color="#1F7655" />
              </View>
              <Text style={styles.logoText}>RecipePro</Text>
              <Text style={styles.welcomeText}>Create your account</Text>
              <Text style={styles.subText}>
                Join RecipePro and start cooking smarter
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#68736D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#8A938E"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  maxLength={100}
                  accessibilityLabel="Full name"
                />
              </View>

              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#68736D" style={styles.inputIcon} />
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
                  maxLength={200}
                  accessibilityLabel="Email address"
                />
              </View>

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#68736D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password (min. 8 characters)"
                  placeholderTextColor="#8A938E"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  maxLength={100}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  hitSlop={8}
                >
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#68736D" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Confirm password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#68736D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#8A938E"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="go"
                  maxLength={100}
                  onSubmitEditing={handleSignup}
                  accessibilityLabel="Confirm password"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  hitSlop={8}
                >
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#68736D" />
                </Pressable>
              </View>

              <Text style={styles.passwordHint}>
                Use at least 8 characters for your password.
              </Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={19} color="#B3261E" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {!!success && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#1F7655" />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              <Pressable
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.signupButtonText}>Create account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/login")} disabled={loading} accessibilityRole="button">
                <Text style={styles.loginText}>Login</Text>
              </Pressable>
            </View>
            <Text style={styles.termsText}>
              By creating an account, you agree to use RecipePro responsibly.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 28 },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 30 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: "#E7F1EA",
    alignItems: "center", justifyContent: "center", marginBottom: 13,
  },
  logoText: { fontSize: 27, fontWeight: "800", color: "#1F7655", marginBottom: 10, letterSpacing: 0.2 },
  welcomeText: { fontSize: 24, fontWeight: "700", color: "#17231E", textAlign: "center" },
  subText: { fontSize: 14, color: "#68736D", marginTop: 7, textAlign: "center", lineHeight: 21 },
  form: { width: "100%" },
  fieldLabel: { color: "#34443B", fontSize: 13, fontWeight: "700", marginBottom: 8, marginLeft: 2 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 14, borderWidth: 1, borderColor: "#E1E7E1",
    paddingHorizontal: 15, marginBottom: 17, minHeight: 54,
  },
  inputIcon: { marginRight: 11 },
  input: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 15, color: "#17231E" },
  passwordHint: { color: "#7B857F", fontSize: 12, marginTop: -7, marginBottom: 18, marginLeft: 2 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FCE8E6", borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, color: "#B3261E", fontSize: 13, lineHeight: 19 },
  successBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#E7F1EA", borderRadius: 12, padding: 12, marginBottom: 16 },
  successText: { flex: 1, color: "#1F7655", fontSize: 13, lineHeight: 19 },
signupButton: {
  backgroundColor: "#1F7655",
  borderRadius: 15,
  minHeight: 56,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginTop: 2,
  boxShadow: "0px 5px 10px rgba(31, 118, 85, 0.16)",
  elevation: 3,
},
  signupButtonDisabled: { opacity: 0.65 },
  signupButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
  footerText: { fontSize: 14, color: "#68736D" },
  loginText: { fontSize: 14, color: "#1F7655", fontWeight: "800" },
  termsText: { textAlign: "center", fontSize: 11, color: "#8A938E", lineHeight: 17, marginTop: 20, paddingHorizontal: 12 },
});
