import { getAuthToken } from "../utils/authStorage";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;
  url: string;

  constructor(message: string, status = 0, data?: unknown, url = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text || null;
}

function messageFromData(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const value = data as Record<string, unknown>;

    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.title === "string") {
      return value.title;
    }

    if (value.errors && typeof value.errors === "object") {
      const errors = value.errors as Record<string, unknown>;

      const messages = Object.values(errors).flatMap((item) =>
        Array.isArray(item)
          ? item.filter((x): x is string => typeof x === "string")
          : typeof item === "string"
            ? [item]
            : [],
      );

      if (messages.length > 0) {
        return messages.join("\n");
      }
    }
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");

  const endpoint = `${baseUrl}/${path.replace(/^\/+/, "")}`;

  let response: Response;

  try {
    // Read the JWT token saved during login.
    const token = await getAuthToken();

    // Preserve any headers supplied by the caller.
    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (
      options.body !== undefined &&
      options.body !== null &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");

      console.warn("No authentication token found for API request:", endpoint);
    }

    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? `Network request failed: ${error.message}`
        : "Network request failed.",
      0,
      error,
      endpoint,
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = messageFromData(
      data,
      `Request failed with status ${response.status}`,
    );

    console.error("API request failed:", {
      url: endpoint,
      status: response.status,
      responseData: data,
    });

    throw new ApiError(message, response.status, data, endpoint);
  }

  return data as T;
}

export const get = <T>(path: string) => apiRequest<T>(path);

export const post = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const put = <T>(path: string, body: unknown) =>
  apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const del = (path: string) =>
  apiRequest<void>(path, {
    method: "DELETE",
  });
