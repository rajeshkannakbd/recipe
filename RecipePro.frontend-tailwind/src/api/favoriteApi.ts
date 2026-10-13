import { API_BASE_URL } from "./client";
import { getAuthToken } from "../utils/authStorage";

export interface FavoriteIngredientCustomization {
  ingredientId: number;
  quantity: number;
  unit: string;
  ingredientName?: string;
}

export interface FavoriteCustomization {
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

async function favoriteRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Please log in to manage your favorites.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
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
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : `Favorites request failed (${response.status}).`;

    throw new Error(message);
  }

  return data as T;
}

export const favoriteApi = {
  getMyFavorites: () =>
    favoriteRequest<number[]>("/favorites"),

  // Keep the original method for existing functionality.
  add: (recipeId: number) =>
    favoriteRequest<{ message: string; recipeId?: number }>(
      `/favorites/${recipeId}`,
      { method: "POST" }
    ),

  // Save this user's servings and customized ingredient quantities.
  saveCustomized: (
    recipeId: number,
    request: SaveFavoriteCustomizationRequest
  ) =>
    favoriteRequest<{ message: string; recipeId?: number }>(
      `/favorites/${recipeId}/customize`,
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    ),

  // Retrieve this user's saved customization.
  getCustomized: (recipeId: number) =>
    favoriteRequest<FavoriteCustomization>(
      `/favorites/${recipeId}/customize`
    ),

  remove: (recipeId: number) =>
    favoriteRequest<void>(`/favorites/${recipeId}`, {
      method: "DELETE",
    }),
};