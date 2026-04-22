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
import { apiClient, setUnauthorizedHandler } from "@/lib/apiClient";
import { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
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
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  const persistSession = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const response = await apiClient.get<{ user: AuthUser }>("/api/auth/me/");
        persistSession(response.data.user);
      } catch {
        clearSession();
      } finally {
        setIsHydrating(false);
      }
    };

    void hydrate();
  }, [clearSession, persistSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      router.replace("/login");
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession, router]);

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
        const response = await apiClient.post<{ user: AuthUser }>("/api/auth/login/", {
          email,
          password,
        });

        persistSession(response.data.user ?? { email });
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
    void apiClient.post("/api/auth/logout/", {}).catch(() => null);
    clearSession();
    router.push("/login");
  }, [clearSession, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isHydrating,
      isSubmitting,
      login,
      register,
      logout,
    }),
    [
      isHydrating,
      isSubmitting,
      login,
      logout,
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
