import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

type RetryableConfig = {
  _retry?: boolean;
};

let onUnauthorized: null | (() => void) = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig & {
      url?: string;
    };

    const url = originalRequest?.url || "";
    const isAuthRoute = url.includes("/api/auth/");

    if (error.response?.status !== 401 || originalRequest?._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      await axios.post(
        `${API_BASE_URL}/api/auth/refresh/`,
        {},
        { withCredentials: true },
      );
      return apiClient(originalRequest);
    } catch (refreshError) {
      onUnauthorized?.();
      return Promise.reject(refreshError);
    }
  },
);
