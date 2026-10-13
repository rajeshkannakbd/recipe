import {
  del,
  get,
  post,
  put,
} from "./client";

import { ENDPOINTS } from "./endpoints";

import type {
  IngredientRequest,
  IngredientResponse,
} from "../types/ingredient";

export const ingredientApi = {
  getAll: () =>
    get<IngredientResponse[]>(
      ENDPOINTS.INGREDIENTS.GET_ALL
    ),

  getById: (
    id: number | string
  ) =>
    get<IngredientResponse>(
      ENDPOINTS.INGREDIENTS.GET_BY_ID(id)
    ),

  create: (
    request: IngredientRequest
  ) =>
    post<IngredientResponse>(
      ENDPOINTS.INGREDIENTS.CREATE,
      request
    ),

  update: (
    id: number | string,
    request: IngredientRequest
  ) =>
    put<IngredientResponse>(
      ENDPOINTS.INGREDIENTS.UPDATE(id),
      request
    ),

  delete: (
    id: number | string
  ) =>
    del(
      ENDPOINTS.INGREDIENTS.DELETE(id)
    ),
};