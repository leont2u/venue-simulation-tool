const PENDING_PROMPT_KEY = "venue-pending-prompt";

export function savePendingPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
}

export function readPendingPrompt() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PENDING_PROMPT_KEY) || "";
}

export function clearPendingPrompt() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_PROMPT_KEY);
}
