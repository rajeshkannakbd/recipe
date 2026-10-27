import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type UserRole = "user" | "hotel" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, _password: string, role: UserRole = "user") => {
      // TODO: Replace with actual API call to your auth endpoint
      // const response = await post<{ token: string; user: User }>("/auth/login", { email, password });
      // setToken(response.token);
      // setUser(response.user);

      // Temporary mock implementation
      const mockUser: User = {
        id: 1,
        email,
        name: email.split("@")[0],
        role,
      };
      setUser(mockUser);
      setToken("mock-token");
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : null));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        setUserRole,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
