import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  clearAuthData,
  getAuthToken,
  getAuthUser,
} from "../utils/authStorage";

type AuthGuardProps = {
  children: ReactNode;
};

type AuthUser = {
  role?: string;
};

/**
 * Admin-only guard. Use it ONLY inside app/admin/_layout.tsx.
 *
 * The check runs once when the admin section mounts. It must NOT depend on
 * the pathname, and it must NOT unmount `children` after the first check:
 * unmounting a navigator resets its state, which sent the app back to the
 * index (splash) screen every time a hidden route was opened.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const token = await getAuthToken();
        const storedUser = await getAuthUser();

        if (!token || !storedUser) {
          if (active) router.replace("/login");
          return;
        }

        let user: AuthUser;
        try {
          user =
            typeof storedUser === "string"
              ? (JSON.parse(storedUser) as AuthUser)
              : (storedUser as AuthUser);
        } catch {
          await clearAuthData();
          if (active) router.replace("/login");
          return;
        }

        if (user.role?.trim().toLowerCase() !== "admin") {
          if (active) router.replace("/(tabs)/categories");
          return;
        }

        if (active) setAllowed(true);
      } catch (error) {
        console.error("Admin route check failed:", error);
        if (active) router.replace("/login");
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!allowed) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F7655" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8F3",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#68736D",
  },
});
