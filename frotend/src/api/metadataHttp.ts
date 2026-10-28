import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "recipepro_token";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
).replace(/\/$/, "");

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return (
        globalThis.sessionStorage?.getItem(AUTH_TOKEN_KEY) ??
        globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) ??
        null
      );
    }

    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn("Unable to read the saved authentication token:", error);
    return null;
  }
}

export class MetadataApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MetadataApiError";
    this.status = status;
  }
}

export async function metadataRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers ?? {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let payload: any = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.detail ??
      payload?.title ??
      (typeof payload === "string" ? payload : null) ??
      `Request failed with status ${response.status}.`;
    throw new MetadataApiError(String(message), response.status);
  }

  if (response.status === 204 || !responseText) return undefined as T;
  return payload as T;
}

export function unwrapList<T>(payload: any): T[] {
  const list = Array.isArray(payload)
    ? payload
    : (payload?.items ?? payload?.data ?? payload?.results ?? []);
  if (!Array.isArray(list)) return [];
  return list;
}

export function unwrapItem<T>(payload: any): T {
  return (payload?.data ?? payload?.item ?? payload?.result ?? payload) as T;
}
