const EDITOR_TOUR_KEY = "spaceforge:editor-tour";

export function queueEditorTour() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EDITOR_TOUR_KEY, "pending");
}

export function hasQueuedEditorTour() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(EDITOR_TOUR_KEY) === "pending";
}

export function clearQueuedEditorTour() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(EDITOR_TOUR_KEY);
}
