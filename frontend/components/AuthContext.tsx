"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/types";

const AuthContext = createContext<User | null>(null);

export function AuthProvider({ user, children }: { user: User; children: ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuthUser(): User {
  const user = useContext(AuthContext);
  if (!user) {
    throw new Error("useAuthUser must be used within AuthProvider");
  }
  return user;
}
