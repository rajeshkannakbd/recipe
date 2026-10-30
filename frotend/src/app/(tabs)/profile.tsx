import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/common/AppText";
const USER_KEY = "recipepro_user";
const TOKEN_KEY = "recipepro_token";
type UserProfile = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};
async function getStoredUser(): Promise<UserProfile | null> {
  try {
    let userJson: string | null;
    if (Platform.OS === "web") {
      userJson =
        sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY);
    } else {
      userJson = await SecureStore.getItemAsync(USER_KEY);
    }
    if (!userJson) return null;
    const parsed = JSON.parse(userJson);
    // Supports either a stored user object or a response
    // containing a nested user object.
    const user = parsed?.user ?? parsed;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
}
async function clearAuthData(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}
export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const entrance = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) return;

    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [loading, entrance]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadProfile = async () => {
        setLoading(true);
        const storedUser = await getStoredUser();
        if (active) {
          setUser(storedUser);
          setLoading(false);
        }
      };
      loadProfile();
      return () => {
        active = false;
      };
    }, []),
  );
  const performLogout = async () => {
    try {
      setLoggingOut(true);
      // Clear authentication data
      await clearAuthData();
      // Navigate to login
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      if (Platform.OS === "web") {
        window.alert("Unable to log out. Please try again.");
      } else {
        Alert.alert("Logout Error", "Unable to log out. Please try again.");
      }
    } finally {
      setLoggingOut(false);
    }
  };
  const handleLogout = () => {
    if (!loggingOut) {
      setLogoutModalVisible(true);
    }
  };
  const menuItems = [
    {
      icon: "heart-outline",
      label: "My Favorites",
      subtitle: "Your favorite recipes",
      route: "/favorites",
    },
    {
      icon: "time-outline",
      label: "Recently Viewed",
      subtitle: "Recipes you explored",
      route: "/all-recipes",
    },
    {
      icon: "restaurant-outline",
      label: "My Recipes",
      subtitle: "Explore your recipes",
      route: "/all-recipes",
    },
    {
      icon: "bookmark-outline",
      label: "Saved Ingredients",
      subtitle: "Your saved ingredients",
      route: "/all-recipes",
    },
    {
      icon: "settings-outline",
      label: "Settings",
      subtitle: "Manage your preferences",
      route: "/profile",
    },
    {
      icon: "help-circle-outline",
      label: "Help & Support",
      subtitle: "Get help with RecipePro",
      route: "/profile",
    },
  ] as const;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* <AppText variant="helper" style={styles.eyebrow}>RECIPEPRO</AppText> */}
            <AppText variant="pageTitle" style={styles.title}>My Profile</AppText>
            <AppText variant="subtitle" style={styles.headerSubtitle}>
              Manage your account and preferences
            </AppText>
          </View>
          {/* <View style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={27} color="#19734F" />
          </View> */}
        </View>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="#19734F" />
            </View>
            <View style={styles.profileInfo}>
              <AppText variant="label" style={styles.welcomeLabel}>WELCOME BACK</AppText>
              <AppText variant="cardTitle" style={styles.userName} numberOfLines={1}>
                {loading
                  ? "Loading profile..."
                  : user?.name?.trim() || "RecipePro User"}
              </AppText>
              <View style={styles.memberBadge}>
                <View style={styles.statusDot} />
                <AppText variant="label" style={styles.memberBadgeText}>
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "Member"}
                </AppText>
              </View>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="mail-outline" size={19} color="#19734F" />
            </View>
            <View style={styles.detailInfo}>
              <AppText variant="label" style={styles.detailLabel}>Email Address</AppText>
              {loading ? (
                <ActivityIndicator size="small" color="#19734F" />
              ) : (
                <AppText variant="body" style={styles.detailValue}>
                  {user?.email || "Email not available"}
                </AppText>
              )}
            </View>
          </View>
        </View>
        {/* Account Menu */}
        <View style={styles.sectionHeader}>
          <AppText variant="sectionTitle" style={styles.sectionTitle}>Your Account</AppText>
          {/* <AppText variant="helper" style={styles.sectionCaption}>Quick access</AppText> */}

        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.menuItem,
                // Explicit native row sizing prevents global styles from
                // collapsing the account items on iOS/Android.
                Platform.OS === "web"
                  ? styles.menuItemWeb
                  : styles.menuItemNative,
                pressed && styles.menuItemPressed,
                index === menuItems.length - 1 && styles.lastMenuItem,
              ]}
              onPress={() => router.push(item.route as any)}
              accessibilityRole="button"
            >
              <View style={styles.menuRowContent}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon as any} size={21} color="#19734F" />
                </View>
                <View style={styles.menuInfo}>
                  <AppText variant="body" style={styles.menuLabel}>{item.label}</AppText>
                  <AppText variant="helper" style={styles.menuSubtitle}>{item.subtitle}</AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#8A948D"
                  style={styles.menuChevron}
                />
              </View>
            </Pressable>
          ))}
        </View>
        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
              width: "100%",
            },
            pressed && styles.logoutPressed,
          ]}
          onPressIn={() =>
            Animated.spring(logoutScale, {
              toValue: 0.97,
              useNativeDriver: true,
              speed: 28,
              bounciness: 4,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(logoutScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 24,
              bounciness: 5,
            }).start()
          }
          onPress={handleLogout}
          disabled={loggingOut}
          accessibilityRole="button"
        >
          {loggingOut ? (
            <ActivityIndicator color="#B33B31" />
          ) : (
            <View style={styles.logoutContent}>
              <Ionicons name="log-out-outline" size={21} color="#B33B31" />
              <AppText variant="button" style={[styles.logoutText, { marginLeft: 9 }]}>Log Out</AppText>
            </View>
          )}
        </Pressable>
        <AppText variant="helper" style={styles.footerText}>Made with care for food lovers</AppText>
        <AppText variant="helper" style={styles.versionText}>RecipePro</AppText>
      </Animated.ScrollView>
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!loggingOut) setLogoutModalVisible(false);
        }}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={28} color="#B33B31" />
            </View>
            <AppText variant="sectionTitle" style={styles.logoutModalTitle}>Log Out?</AppText>
            <AppText variant="body" style={styles.logoutModalMessage}>
              Are you sure you want to log out of your RecipePro account?
            </AppText>
            <View style={styles.logoutModalActions}>
              <Pressable
                style={styles.logoutCancelButton}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <AppText variant="button" style={styles.logoutCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                style={styles.logoutConfirmButton}
                onPress={() => {
                  setLogoutModalVisible(false);
                  void performLogout();
                }}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <AppText variant="button" style={styles.logoutConfirmText}>Log Out</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#19734F",
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#17231E",
    letterSpacing: -0.7,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#68736D",
    marginTop: 6,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E2F0E7",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 21,
    borderWidth: 1,
    borderColor: "#E3E6E0",
    marginBottom: 28,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#E2F0E7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  welcomeLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#68736D",
    marginBottom: 5,
  },
  userName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: "#17231E",
    marginBottom: 8,
  },
  memberBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2F0E7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#19734F",
    marginRight: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#19734F",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E9ECE7",
    marginVertical: 19,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0F5EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: "#68736D",
    marginBottom: 5,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#17231E",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17231E",
  },
  sectionCaption: {
    fontSize: 12,
    color: "#68736D",
  },
  menuContainer: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3E6E0",
    overflow: "hidden",
    marginBottom: 22,
    paddingVertical:12,
  },
  menuRowContent: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    paddingVertical:10,
    paddingHorizontal:20,

  },
  menuItem: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 70,

    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EDF0EA",
  },
  menuItemNative: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 70,
  },
  menuItemWeb: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,

    minHeight: 70,
  },
  menuItemPressed: {
    backgroundColor: "#F4F7F2",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 43,
    height: 43,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: "#EAF3EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  menuInfo: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    justifyContent: "center",
  },
  menuChevron: {
    flexShrink: 0,
    marginLeft: 8,
  },
  menuLabel: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
    color: "#17231E",
  },
  menuSubtitle: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#68736D",
    marginTop: 4,
  },
  logoutButton: {
    width: "100%",
    minHeight: 58,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0D8D3",
    marginTop: 4,
  },

  logoutContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 9,
  },

  logoutPressed: {
    backgroundColor: "#FFF3F1",
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B33B31",
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoutModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  logoutIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    textAlign: "center",
  },
  logoutModalMessage: {
    fontSize: 14,
    lineHeight: 22,
    color: "#68736D",
    textAlign: "center",
    marginTop: 8,
  },
  logoutModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  logoutCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17231E",
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#B33B31",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: "#68736D",
    marginTop: 25,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#929B94",
    marginTop: 5,
  },
});
