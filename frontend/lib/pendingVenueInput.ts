const PENDING_VENUE_INPUT_KEY = "venue-pending-input";

type StoredPendingFile = {
  name: string;
  type: string;
  content: string;
};

export type StoredVenueInput = {
  prompt: string;
  file: StoredPendingFile | null;
};

export async function savePendingVenueInput(prompt: string, file?: File | null) {
  if (typeof window === "undefined") return;

  const stored: StoredVenueInput = {
    prompt,
    file: file
      ? {
          name: file.name,
          type: file.type || "text/plain",
          content: await file.text(),
        }
      : null,
  };

  window.sessionStorage.setItem(PENDING_VENUE_INPUT_KEY, JSON.stringify(stored));
}

export function readPendingVenueInput(): StoredVenueInput | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(PENDING_VENUE_INPUT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredVenueInput;
    return {
      prompt: String(parsed.prompt || ""),
      file: parsed.file
        ? {
            name: String(parsed.file.name || "uploaded-layout.xml"),
            type: String(parsed.file.type || "text/plain"),
            content: String(parsed.file.content || ""),
          }
        : null,
    };
  } catch {
    return null;
  }
}

export function clearPendingVenueInput() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_VENUE_INPUT_KEY);
}

export function pendingStoredFileToFile(stored: StoredPendingFile) {
  return new File([stored.content], stored.name, { type: stored.type });
}
