export type UserRole = "user" | "hotel" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserPermission {
  id: string;
  name: string;
  description: string;
}

export const ALL_PERMISSIONS: UserPermission[] = [
  { id: "create", name: "Create", description: "Create new items" },
  { id: "read", name: "Read", description: "View items" },
  { id: "update", name: "Update", description: "Edit existing items" },
  { id: "delete", name: "Delete", description: "Remove items" },
  {
    id: "manage_users",
    name: "Manage Users",
    description: "Manage user accounts",
  },
  {
    id: "manage_roles",
    name: "Manage Roles",
    description: "Manage roles & permissions",
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["create", "read", "update", "delete", "manage_users", "manage_roles"],
  hotel: ["create", "read", "update", "delete"],
  user: ["read"],
};
