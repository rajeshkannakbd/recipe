import { getAuthToken } from "../utils/authStorage";
import { API_BASE_URL } from "./client";

export interface FavoriteEntry {
  favoriteId: number;
  recipeId: number;
  recipeName: string;
  requiredServings: number;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteIngredientCustomization {
  ingredientId: number;
  quantity: number;
  unit: string;
  ingredientName?: string;
}

export interface FavoriteCustomization {
  favoriteId: number;
  recipeId: number;
  requiredServings: number;
  ingredients: FavoriteIngredientCustomization[];
}

export interface SaveFavoriteCustomizationRequest {
  requiredServings: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
  }[];
}

export interface FavoriteCheckResponse {
  exists: boolean;
}

async function favoriteRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to manage your favorites.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    let message = `Favorites request failed (${response.status}).`;

    if (data && typeof data === "object") {
      const errorData = data as {
        message?: string;
        title?: string;
        detail?: string;
        errors?: Record<string, string[]>;
      };

      message =
        errorData.message ||
        errorData.detail ||
        errorData.title ||
        (errorData.errors
          ? Object.values(errorData.errors).flat().join("\n")
          : message);
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }

    throw new Error(message);
  }

  return data as T;
}

export const favoriteApi = {
  // Get all favorites.
  // Keep this for favorites list screens.
  getMyFavorites: () =>
    favoriteRequest<FavoriteEntry[]>("/favorites"),

  // Fast check for a specific recipe and serving count.
  // Does not download the complete favorites list.
  checkFavorite: (
    recipeId: number,
    requiredServings: number,
  ) =>
    favoriteRequest<FavoriteCheckResponse>(
      `/favorites/check?recipeId=${encodeURIComponent(
        recipeId,
      )}&requiredServings=${encodeURIComponent(requiredServings)}`,
    ),

  // Add a basic favorite.
  add: (recipeId: number) =>
    favoriteRequest<{ message: string; recipeId?: number }>(
      `/favorites/${recipeId}`,
      {
        method: "POST",
      },
    ),

  // Save a customized favorite.
  saveCustomized: (
    recipeId: number,
    request: SaveFavoriteCustomizationRequest,
  ) =>
    favoriteRequest<{
      message: string;
      favoriteId: number;
      recipeId: number;
      requiredServings: number;
    }>(`/favorites/${recipeId}/customize`, {
      method: "POST",
      body: JSON.stringify(request),
    }),

  // Retrieve one specific saved customization.
  getCustomized: (favoriteId: number) =>
    favoriteRequest<FavoriteCustomization>(
      `/favorites/entries/${favoriteId}`,
    ),

  // Delete one specific favorite entry.
  remove: (favoriteId: number) =>
    favoriteRequest<void>(
      `/favorites/entries/${favoriteId}`,
      {
        method: "DELETE",
      },
    ),
};