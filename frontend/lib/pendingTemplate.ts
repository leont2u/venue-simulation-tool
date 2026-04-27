const PENDING_TEMPLATE_KEY = "venue-pending-template";

export function savePendingTemplate(templateId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_TEMPLATE_KEY, templateId);
}

export function readPendingTemplate() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PENDING_TEMPLATE_KEY) || "";
}

export function clearPendingTemplate() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
}
