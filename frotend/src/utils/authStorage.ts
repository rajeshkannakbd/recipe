import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "recipepro_token";
const USER_KEY = "recipepro_user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export async function saveAuthData(
  token: string,
  user: AuthUser,
  rememberMe = true,
): Promise<void> {
  const userJson = JSON.stringify(user);

  if (Platform.OS === "web") {
    if (rememberMe) {
      // Remember Me enabled: persist across browser sessions.
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, userJson);

      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } else {
      // Remember Me disabled: keep data only in this browser tab session.
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, userJson);

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    return;
  }

  // SecureStore is used for native Expo applications.
  // SecureStore values remain available to authenticated API requests.
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userJson);
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    // Check sessionStorage first because login may have saved the token there.
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);

    if (sessionToken) {
      return sessionToken;
    }

    // Fall back to persistent storage when Remember Me is enabled.
    return localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getAuthUser(): Promise<string | null> {
  if (Platform.OS === "web") {
    const sessionUser = sessionStorage.getItem(USER_KEY);

    if (sessionUser) {
      return sessionUser;
    }

    return localStorage.getItem(USER_KEY);
  }

  return SecureStore.getItemAsync(USER_KEY);
}

export async function clearAuthData(): Promise<void> {
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
