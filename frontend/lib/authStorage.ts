import { StoredAuthSession } from "@/types/auth";

const AUTH_STORAGE_KEY = "venue-auth-session";

export function readStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function writeStoredAuthSession(session: StoredAuthSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}
