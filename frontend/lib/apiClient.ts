import axios from "axios";
import { readStoredAuthSession, writeStoredAuthSession } from "@/lib/authStorage";
import { AuthTokens } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

type RetryableConfig = {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const session = readStoredAuthSession();

  if (session?.tokens.access) {
    config.headers.Authorization = `Bearer ${session.tokens.access}`;
  }

  return config;
});

async function refreshAccessToken(refresh: string) {
  const response = await axios.post<{ access: string }>(
    `${API_BASE_URL}/api/auth/refresh/`,
    { refresh },
  );

  return response.data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig & {
      headers: Record<string, string>;
    };

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const session = readStoredAuthSession();
    if (!session?.tokens.refresh) {
      writeStoredAuthSession(null);
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken(session.tokens.refresh);

      const nextSession = {
        ...session,
        tokens: {
          ...session.tokens,
          access: nextAccessToken,
        } satisfies AuthTokens,
      };

      writeStoredAuthSession(nextSession);
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      writeStoredAuthSession(null);
      return Promise.reject(refreshError);
    }
  },
);
