import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Animated,

  Easing,
  KeyboardAvoidingView,

  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";



import { useRouter } from "expo-router";



import { Ionicons } from "@expo/vector-icons";



import { SafeAreaView } from "react-native-safe-area-context";



import AppText from "@/components/common/AppText";
import { API_BASE_URL } from "../api/client";



type RegisterResponse = {

  message?: string;



  errors?: Record<string, string[]>;

};



export default function SignupScreen() {

  const router = useRouter();



  // Subtle entrance animations for the header, form, and footer.

  const headerOpacity = useRef(new Animated.Value(0)).current;

  const headerTranslateY = useRef(new Animated.Value(14)).current;

  const logoScale = useRef(new Animated.Value(0.94)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;

  const formTranslateY = useRef(new Animated.Value(16)).current;

  const footerOpacity = useRef(new Animated.Value(0)).current;

  const footerTranslateY = useRef(new Animated.Value(8)).current;


  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);


  useEffect(() => {

    const entrance = Animated.sequence([

      Animated.parallel([

        Animated.timing(headerOpacity, {

          toValue: 1,

          duration: 380,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

        Animated.timing(headerTranslateY, {

          toValue: 0,

          duration: 380,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

        Animated.spring(logoScale, {

          toValue: 1,

          speed: 16,

          bounciness: 3,

          useNativeDriver: true,

        }),

      ]),

      Animated.parallel([

        Animated.timing(formOpacity, {

          toValue: 1,

          duration: 320,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

        Animated.timing(formTranslateY, {

          toValue: 0,

          duration: 320,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

      ]),

      Animated.parallel([

        Animated.timing(footerOpacity, {

          toValue: 1,

          duration: 240,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

        Animated.timing(footerTranslateY, {

          toValue: 0,

          duration: 240,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

      ]),

    ]);



    entrance.start();

    return () => entrance.stop();

  }, [

    footerOpacity,

    footerTranslateY,

    formOpacity,

    formTranslateY,

    headerOpacity,

    headerTranslateY,

    logoScale,

  ]);



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



      const data = (await response

        .json()

        .catch(() => null)) as RegisterResponse | null;



      if (!response.ok) {

        const validationMessages = data?.errors

          ? Object.values(data.errors).flat().join("\n")

          : "";



        throw new Error(

          data?.message ||

          validationMessages ||

          (response.status === 409

            ? "This email is already registered."

            : `Registration failed (${response.status}).`),

        );

      }



      setSuccess(

        data?.message || "Registration successful. You can now log in.",

      );



      setTimeout(() => router.replace("/login"), 900);

    } catch (err) {

      console.error("Signup error:", err);



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



  return (


    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          nestedScrollEnabled
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

                <Ionicons name="restaurant" size={36} color="#1F7655" />

              </Animated.View>



              <AppText variant="pageTitle" style={styles.logoText}>RecipePro</AppText>



              <AppText variant="pageTitle" style={styles.welcomeText}>Create your account</AppText>



              <AppText variant="subtitle" style={styles.subText}>

                Join RecipePro and start cooking smarter

              </AppText>

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

              <AppText variant="label" style={styles.fieldLabel}>

                Full name <AppText variant="body" style={{ color: "#eb3636" }}>*</AppText>

              </AppText>



              <View style={styles.inputContainer}>

                <Ionicons

                  name="person-outline"

                  size={20}

                  color="#68736D"

                  style={styles.inputIcon}

                />



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

                  ref={nameRef}

                  onSubmitEditing={() => emailRef.current?.focus()}

                />

              </View>



              <AppText variant="label" style={styles.fieldLabel}>

                Email address <AppText variant="body" style={{ color: "#eb3636" }}>*</AppText>

              </AppText>



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

                  maxLength={200}

                  accessibilityLabel="Email address"

                  ref={emailRef}

                  onSubmitEditing={() => passwordRef.current?.focus()}

                />

              </View>



              <AppText variant="label" style={styles.fieldLabel}>

                Password <AppText variant="body" style={{ color: "#eb3636" }}>*</AppText>

              </AppText>



              <View style={styles.inputContainer}>

                <Ionicons

                  name="lock-closed-outline"

                  size={20}

                  color="#68736D"

                  style={styles.inputIcon}

                />



                <TextInput

                  style={styles.input}

                  placeholder="Enter new a password"

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
                  ref={passwordRef}

                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}

                />



                <Pressable

                  onPress={() => setShowPassword((value) => !value)}

                  disabled={loading}

                  accessibilityRole="button"

                  accessibilityLabel={

                    showPassword ? "Hide password" : "Show password"

                  }

                  hitSlop={8}

                >

                  <Ionicons

                    name={showPassword ? "eye-outline" : "eye-off-outline"}

                    size={20}

                    color="#68736D"

                  />

                </Pressable>

              </View>



              <AppText variant="label" style={styles.fieldLabel}>

                Confirm password <AppText variant="body" style={{ color: "#eb3636" }}>*</AppText>

              </AppText>



              <View style={styles.inputContainer}>

                <Ionicons

                  name="shield-checkmark-outline"

                  size={20}

                  color="#68736D"

                  style={styles.inputIcon}

                />



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

                  // onSubmitEditing={handleSignup}

                  accessibilityLabel="Confirm password"

                  ref={confirmPasswordRef}

                  onSubmitEditing={handleSignup}
                  blurOnSubmit

                />



                <Pressable

                  onPress={() => setShowConfirmPassword((value) => !value)}

                  disabled={loading}

                  accessibilityRole="button"

                  accessibilityLabel={

                    showConfirmPassword

                      ? "Hide confirm password"

                      : "Show confirm password"

                  }

                  hitSlop={8}

                >

                  <Ionicons

                    name={

                      showConfirmPassword ? "eye-outline" : "eye-off-outline"

                    }

                    size={20}

                    color="#68736D"

                  />

                </Pressable>

              </View>



              <AppText variant="helper" style={styles.passwordHint}>

                Use at least 8 characters for your password.

              </AppText>



              {!!error && (

                <View style={styles.errorBox}>

                  <Ionicons

                    name="alert-circle-outline"

                    size={19}

                    color="#B3261E"

                  />



                  <AppText variant="body" style={styles.errorText}>{error}</AppText>

                </View>

              )}



              {!!success && (

                <View style={styles.successBox}>

                  <Ionicons

                    name="checkmark-circle-outline"

                    size={19}

                    color="#1F7655"

                  />



                  <AppText variant="body" style={styles.successText}>{success}</AppText>

                </View>

              )}



              <Pressable

                style={[

                  styles.signupButton,

                  loading && styles.signupButtonDisabled,

                ]}

                onPress={handleSignup}

                disabled={loading}

                accessibilityRole="button"

              >

                {loading ? (

                  <ActivityIndicator color="#FFFFFF" />

                ) : (

                  <>

                    <AppText variant="button" style={styles.signupButtonText}>Create account</AppText>



                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />

                  </>

                )}

              </Pressable>

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

              <AppText variant="body" style={styles.footerText}>Already have an account? </AppText>



              <Pressable

                onPress={() => router.replace("/login")}

                disabled={loading}

                accessibilityRole="button"

              >

                <AppText variant="button" style={styles.loginText}>Login</AppText>

              </Pressable>

            </Animated.View>

            <AppText variant="helper" style={styles.termsText}>

              By creating an account, you agree to use RecipePro responsibly.

            </AppText>

          </View>

        </ScrollView>

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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 24,
    paddingBottom: 40,
  },

  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 24,
  },




  header: { alignItems: "center", marginBottom: 28 },



  logoIcon: {

    width: 72,

    height: 72,

    borderRadius: 24,

    backgroundColor: "#E7F1EA",



    alignItems: "center",

    justifyContent: "center",

    marginBottom: 13,

  },



  logoText: {

    fontSize: 28,

    fontWeight: "800",

    color: "#1F7655",

    marginBottom: 8,

    letterSpacing: 0.2,

  },



  welcomeText: {

    fontSize: 24,

    fontWeight: "700",

    color: "#17231E",

    textAlign: "center",

    lineHeight: 30,

  },



  subText: {

    fontSize: 14,

    color: "#68736D",

    marginTop: 8,

    textAlign: "center",

    lineHeight: 21,

  },



  form: { width: "100%" },



  fieldLabel: {

    color: "#34443B",

    fontSize: 14,

    fontWeight: "100",

    marginBottom: 7,

    marginLeft: 2,

    lineHeight: 20,

  },



  inputContainer: {

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",



    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#E1E7E1",



    paddingHorizontal: 15,

    marginBottom: 16,

    minHeight: 54,

  },



  inputIcon: { marginRight: 11 },



  input: {

    flex: 1,

    minWidth: 0,

    paddingVertical: 14,

    fontSize: 16,

    color: "#17231E",

  },



  passwordHint: {

    color: "#7B857F",

    fontSize: 12,

    lineHeight: 17,

    marginTop: -6,

    marginBottom: 16,

    marginLeft: 2,

  },



  errorBox: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#FCE8E6",

    borderRadius: 12,

    padding: 12,

    marginBottom: 16,

  },



  errorText: { flex: 1, color: "#B3261E", fontSize: 14, lineHeight: 20 },



  successBox: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#E7F1EA",

    borderRadius: 12,

    padding: 12,

    marginBottom: 16,

  },



  successText: { flex: 1, color: "#1F7655", fontSize: 14, lineHeight: 20 },



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



  footer: {

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    marginTop: 24,

  },



  footerText: { fontSize: 14, color: "#68736D" },



  loginText: { fontSize: 14, color: "#1F7655", fontWeight: "800" },



  termsText: {

    textAlign: "center",

    fontSize: 12,

    color: "#8A938E",

    lineHeight: 18,

    marginTop: 18,

    paddingHorizontal: 12,

  },

});
