import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, checkLogin } from "./db";

type AuthContextType = {
  user: User | null;
  login: (login: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const loginFn = (login: string, password: string) => {
    const u = checkLogin(login, password);
    if (!u) return false;
    setUser(u);
    return true;
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login: loginFn, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
