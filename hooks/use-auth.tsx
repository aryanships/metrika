"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/middleware/context";
import { client } from "@/lib/orpc.client";

interface AuthContextValue {
  user: AppUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const router = useRouter();
  const logout = useCallback(async () => {
    await client.auth.logout();
    router.push("/login");
    router.refresh();
  }, [router]);

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
