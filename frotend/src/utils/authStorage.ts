
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "recipepro_token";
const USER_KEY = "recipepro_user";

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return (
      sessionStorage.getItem(TOKEN_KEY) ??
      localStorage.getItem(TOKEN_KEY)
    );
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getAuthUser(): Promise<string | null> {
  if (Platform.OS === "web") {
    return (
      sessionStorage.getItem(USER_KEY) ??
      localStorage.getItem(USER_KEY)
    );
  }

  return SecureStore.getItemAsync(USER_KEY);
}

export async function saveAuthData(
  token: string,
  user: object,
  rememberMe = false
): Promise<void> {
  const userJson = JSON.stringify(user);

  if (Platform.OS === "web") {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, userJson);

      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, userJson);

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userJson);
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
