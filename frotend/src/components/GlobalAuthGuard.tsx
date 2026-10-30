
import { useEffect } from "react";
import { usePathname, useRouter, useSegments } from "expo-router";

import {
  getAuthToken,
  getAuthUser,
} from "../utils/authStorage";

type Props = {
  children: React.ReactNode;
};

type AuthUser = {
  role?: string;
};

export default function GlobalAuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    let active = true;

    async function checkGlobalAuthentication() {
      try {
        const token = await getAuthToken();
        const storedUser = await getAuthUser();

        const isPublicRoute = segments.some(
          (segment) =>
            segment === "login" || segment === "signup"
        );

        // No credentials: only login and signup are accessible.
        if (!token || !storedUser) {
          if (!isPublicRoute && active && pathname !== "/login") {
            router.replace("/login");
          }
          return;
        }

        let user: AuthUser;

        try {
          user =
            typeof storedUser === "string"
              ? JSON.parse(storedUser)
              : (storedUser as AuthUser);
        } catch {
          if (active) {
            router.replace("/login");
          }
          return;
        }

        // Invalid user information.
        if (!user?.role) {
          if (active) {
            router.replace("/login");
          }
          return;
        }

        // Authenticated users cannot return to login/signup.
        if (isPublicRoute && active) {
          const role = user.role.trim().toLowerCase();

          if (role === "admin") {
            if (pathname !== "/admin") {
              router.replace("/admin");
            }
          } else if (
            ["user", "hotelmess", "hotel/mess", "hotel", "mess"].includes(role)
          ) {
            if (pathname !== "/categories") {
              router.replace("/categories");
            }
          }
        }
      } catch (error) {
        console.error("Global authentication error:", error);

        if (active && pathname !== "/login") {
          router.replace("/login");
        }
      }
    }

    void checkGlobalAuthentication();

    return () => {
      active = false;
    };
  }, [pathname, segments]);

  return <>{children}</>;
}
