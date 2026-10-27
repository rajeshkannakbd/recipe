import { get, post, put, del } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { CategoryRequest, CategoryResponse } from "../types/category";

export const categoryApi = {
  getAll: () => get<CategoryResponse[]>(ENDPOINTS.CATEGORIES.GET_ALL),

  getById: (id: number | string) =>
    get<CategoryResponse>(ENDPOINTS.CATEGORIES.GET_BY_ID(id)),

  create: (request: CategoryRequest) =>
    post<CategoryResponse>(ENDPOINTS.CATEGORIES.CREATE, request),

  update: (id: number | string, request: CategoryRequest) =>
    put<CategoryResponse>(ENDPOINTS.CATEGORIES.UPDATE(id), request),

  delete: (id: number | string) => del(`/categories/${id}`),
};
