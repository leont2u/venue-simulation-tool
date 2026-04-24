const STORAGE_PREFIX = "spaceforge-onboarding";

function getStorageKey(email: string) {
  return `${STORAGE_PREFIX}:${email.toLowerCase()}`;
}

export function hasCompletedOnboarding(email: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getStorageKey(email)) === "done";
}

export function markOnboardingComplete(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(email), "done");
}

export function resetOnboarding(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(email));
}
