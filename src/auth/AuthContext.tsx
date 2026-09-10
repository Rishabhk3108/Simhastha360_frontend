import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface AuthState {
  token: string | null;
  role: string | null;
  name: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("s360_token"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("s360_role"));
  const [name, setName] = useState<string | null>(localStorage.getItem("s360_name"));

  async function login(phone: string, password: string) {
    const { data } = await api.post("/auth/login", { phone, password });
    if (data.role !== "admin" && data.role !== "volunteer_manager") {
      throw new Error("not-admin");
    }
    localStorage.setItem("s360_token", data.access_token);
    localStorage.setItem("s360_role", data.role);
    localStorage.setItem("s360_name", data.name);
    setToken(data.access_token);
    setRole(data.role);
    setName(data.name);
  }

  function logout() {
    localStorage.removeItem("s360_token");
    localStorage.removeItem("s360_role");
    localStorage.removeItem("s360_name");
    setToken(null);
    setRole(null);
    setName(null);
  }

  return <AuthContext.Provider value={{ token, role, name, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
