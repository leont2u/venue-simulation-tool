"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { readStoredAuthSession, writeStoredAuthSession } from "@/lib/authStorage";
import { AuthTokens, AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isSubmitting: boolean;
  login: (input: {
    email: string;
    password: string;
    redirectTo?: string;
  }) => Promise<void>;
  register: (input: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = readStoredAuthSession();

    if (session) {
      setUser(session.user);
      setAccessToken(session.tokens.access);
      setRefreshToken(session.tokens.refresh);
    }

    setIsHydrating(false);
  }, []);

  const persistSession = useCallback((nextUser: AuthUser, tokens: AuthTokens) => {
    setUser(nextUser);
    setAccessToken(tokens.access);
    setRefreshToken(tokens.refresh);
    writeStoredAuthSession({
      user: nextUser,
      tokens,
    });
  }, []);

  const login = useCallback(
    async ({
      email,
      password,
      redirectTo,
    }: {
      email: string;
      password: string;
      redirectTo?: string;
    }) => {
      setIsSubmitting(true);

      try {
        const response = await apiClient.post<AuthTokens>("/api/auth/login/", {
          email,
          password,
        });

        persistSession({ email }, response.data);
        router.push(redirectTo || "/dashboard");
      } finally {
        setIsSubmitting(false);
      }
    },
    [persistSession, router],
  );

  const register = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setIsSubmitting(true);

      try {
        await apiClient.post("/api/auth/register/", {
          email,
          password,
        });

        router.push("/login");
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    writeStoredAuthSession(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken),
      isHydrating,
      isSubmitting,
      login,
      register,
      logout,
    }),
    [
      accessToken,
      isHydrating,
      isSubmitting,
      login,
      logout,
      refreshToken,
      register,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
