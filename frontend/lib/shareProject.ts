import { Project } from "@/types/types";

type SharedProjectPayload = {
  version: 1;
  project: Project;
};

const SHARE_STORAGE_KEY = "venue-shared-projects";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64ToBytes(base64: string) {
  const normalized = base64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(base64.length / 4) * 4, "=");

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getSharedProjectsMap() {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, SharedProjectPayload>;
  } catch {
    return {};
  }
}

function saveSharedProjectsMap(map: Record<string, SharedProjectPayload>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(map));
}

export function createShareToken(project: Project) {
  const token = project.id;
  const map = getSharedProjectsMap();

  map[token] = {
    version: 1,
    project,
  };

  saveSharedProjectsMap(map);
  return token;
}

export function getSharedProjectByToken(token: string): Project | null {
  const map = getSharedProjectsMap();
  const payload = map[token];

  if (!payload || payload.version !== 1 || !payload.project) {
    return null;
  }

  return payload.project;
}

export function encodeProjectForShare(project: Project) {
  const payload: SharedProjectPayload = {
    version: 1,
    project,
  };

  const json = JSON.stringify(payload);
  return bytesToBase64(new TextEncoder().encode(json));
}

export function decodeProjectFromShare(token: string): Project {
  const decoded = new TextDecoder().decode(base64ToBytes(token));
  const payload = JSON.parse(decoded) as Partial<SharedProjectPayload>;

  if (payload.version !== 1 || !payload.project) {
    throw new Error("This shared layout link is invalid or unsupported.");
  }

  return payload.project;
}
