import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";

import {
  clearAuthData,
  getAuthToken,
  getAuthUser,
} from "../utils/authStorage";

type AuthGuardProps = {
  children: ReactNode;
};

type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRoute() {
      // Normal user pages should not be blocked by the admin guard.
      if (!isAdminRoute) {
        if (active) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      if (active) {
        setChecking(true);
        setAllowed(false);
      }

      try {
        const token = await getAuthToken();
        const storedUser = await getAuthUser();

        if (!token || !storedUser) {
          if (active) {
            router.replace("/login");
          }
          return;
        }

        let user: AuthUser;

        if (pathname === "/login" && token && storedUser) {
  let user: AuthUser;

  try {
    user =
      typeof storedUser === "string"
        ? (JSON.parse(storedUser) as AuthUser)
        : (storedUser as AuthUser);
  } catch {
    await clearAuthData();
    return;
  }

  const role = user.role?.trim().toLowerCase();

  if (active && role === "admin") {
    router.replace("/admin");
    return;
  }

  if (
    active &&
    ["user", "hotelmess", "hotel/mess", "hotel", "mess"].includes(role)
  ) {
    router.replace("/categories");
    return;
  }
}

        if (typeof storedUser === "string") {
          try {
            user = JSON.parse(storedUser) as AuthUser;
          } catch {
            await clearAuthData();

            if (active) {
              router.replace("/login");
            }
            return;
          }
        } else {
          user = storedUser as AuthUser;
        }

        if (user.role?.trim().toLowerCase() !== "admin") {
          if (active) {
            router.replace("/(tabs)");
          }
          return;
        }

        if (active) {
          setAllowed(true);
        }
      } catch (error) {
        console.error("Admin route check failed:", error);

        if (active) {
          router.replace("/login");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkRoute();

    return () => {
      active = false;
    };
  }, [isAdminRoute, pathname, router]);

  if (isAdminRoute && (checking || !allowed)) {
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