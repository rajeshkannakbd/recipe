import { del, get, post, put } from "./client";

export type FunctionPlanRecipeRequest = {
  recipeId: number;
  requiredServings: number;
};

export type FunctionPlanRequest = {
  name: string;
  eventDate?: string | null;
  notes?: string | null;
  recipes: FunctionPlanRecipeRequest[];
};

export type FunctionPlanRecipeResponse = {
  recipeId: number;
  recipeName: string;
  baseServings: number;
  requiredServings: number;
};

export type FunctionPlanResponse = {
  id: number;
  name: string;
  eventDate?: string | null;
  notes?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  recipes: FunctionPlanRecipeResponse[];
};

export type ShoppingListItemResponse = {
  ingredientId: number;
  ingredientName: string;
  photoUrl?: string | null;
  totalQuantity: number;
  unit: string;
  usedInRecipes: string[];
};

export type FunctionPlanShoppingListResponse = {
  functionPlanId: number;
  functionPlanName: string;
  recipeCount: number;
  items: ShoppingListItemResponse[];
};

const base = "function-plans";

export const functionPlanApi = {
  getAll: () => get<FunctionPlanResponse[]>(base),
  getById: (id: number | string) => get<FunctionPlanResponse>(`${base}/${id}`),
  create: (request: FunctionPlanRequest) =>
    post<FunctionPlanResponse>(base, request),
  update: (id: number | string, request: FunctionPlanRequest) =>
    put<FunctionPlanResponse>(`${base}/${id}`, request),
  delete: (id: number | string) => del(`${base}/${id}`),
  getShoppingList: (id: number | string) =>
    get<FunctionPlanShoppingListResponse>(`${base}/${id}/shopping-list`),
};
