import { del, get, post, put } from "./client";
import type { CreateUserRequest, UpdateUserRequest, User } from "../types/user";

export const userApi = {
  getAll: () => get<User[]>("/users"),
  getById: (id: number | string) => get<User>(`/users/${id}`),
  create: (request: CreateUserRequest) => post<User>("/users", request),
  update: (id: number | string, request: UpdateUserRequest) =>
    put<User>(`/users/${id}`, request),
  delete: (id: number | string) => del(`/users/${id}`),
  updateRole: (id: number | string, role: string) =>
    put<User>(`/users/${id}/role`, { role }),
  updatePermissions: (id: number | string, permissions: string[]) =>
    put<User>(`/users/${id}/permissions`, { permissions }),
};
