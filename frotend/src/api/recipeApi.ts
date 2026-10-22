import { del, get, post, put } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  RecipeCalculationRequest,
  RecipeCalculationResponse,
  RecipeRequest,
  RecipeResponse,
} from "../types/recipe";


export const recipeApi = {
  getAll: () => get<RecipeResponse[]>(ENDPOINTS.RECIPES.GET_ALL),
  getById: (id: number | string) =>
    get<RecipeResponse>(ENDPOINTS.RECIPES.GET_BY_ID(id)),
  create: (request: RecipeRequest) =>
    post<RecipeResponse>(ENDPOINTS.RECIPES.CREATE, request),
  update: (id: number | string, request: RecipeRequest) =>
    put<RecipeResponse>(ENDPOINTS.RECIPES.UPDATE(id), request),
  delete: (id: number | string) =>
    del(ENDPOINTS.RECIPES.DELETE(id)),
  calculate: (id: number | string, request: RecipeCalculationRequest) =>
    post<RecipeCalculationResponse>(
      ENDPOINTS.RECIPES.CALCULATE(id),
      request
    ),
    getCuisines: () => get<string[]>(ENDPOINTS.RECIPES.GET_CUISINES),
};
