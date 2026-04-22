const SUPPORTED_EVENT_TYPES = [
  "conference",
  "wedding",
  "funeral",
  "church",
] as const;

const SUPPORTED_SEATING_LAYOUTS = [
  "rows",
  "round_tables",
  "mixed",
] as const;

export type PromptEventType = (typeof SUPPORTED_EVENT_TYPES)[number];
export type SeatingLayoutType = (typeof SUPPORTED_SEATING_LAYOUTS)[number];

export type PromptLayoutIntent = {
  eventType: PromptEventType;
  capacity: number;
  room: {
    width: number;
    depth: number;
    height: number;
  };
  layout: {
    seating: {
      type: SeatingLayoutType;
      rows: number | null;
      columns: number | null;
      tableCount: number | null;
      seatsPerTable: number | null;
      hasCentralAisle: boolean;
    };
    stage: {
      enabled: boolean;
      position: "front" | "center";
    };
    podium: {
      enabled: boolean;
    };
    screen: {
      enabled: boolean;
    };
    decor: {
      plants: boolean;
      lighting: boolean;
    };
  };
};

type RawLayoutIntent = {
  eventType?: unknown;
  capacity?: unknown;
  room?: {
    width?: unknown;
    depth?: unknown;
    height?: unknown;
  };
  layout?: {
    seating?: {
      type?: unknown;
      rows?: unknown;
      columns?: unknown;
      tableCount?: unknown;
      seatsPerTable?: unknown;
      hasCentralAisle?: unknown;
    };
    stage?: {
      enabled?: unknown;
      position?: unknown;
    };
    podium?: {
      enabled?: unknown;
    };
    screen?: {
      enabled?: unknown;
    };
    decor?: {
      plants?: unknown;
      lighting?: unknown;
    };
  };
};

const ROOM_DEFAULTS = {
  conference: { width: 20, depth: 30, height: 4 },
  wedding: { width: 24, depth: 28, height: 4 },
  funeral: { width: 18, depth: 26, height: 4 },
  church: { width: 22, depth: 32, height: 5 },
} satisfies Record<PromptEventType, { width: number; depth: number; height: number }>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function isPromptEventType(value: unknown): value is PromptEventType {
  return (
    typeof value === "string" &&
    (SUPPORTED_EVENT_TYPES as readonly string[]).includes(value)
  );
}

function isSeatingLayoutType(value: unknown): value is SeatingLayoutType {
  return (
    typeof value === "string" &&
    (SUPPORTED_SEATING_LAYOUTS as readonly string[]).includes(value)
  );
}

function inferEventType(rawType: unknown, seatingType: SeatingLayoutType): PromptEventType {
  if (isPromptEventType(rawType)) return rawType;
  if (seatingType === "round_tables") return "wedding";
  return "conference";
}

function normalizeNullableCount(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  return clamp(Math.round(parsed), min, max);
}

function inferSeatingDefaults(
  seatingType: SeatingLayoutType,
  capacity: number,
  eventType: PromptEventType,
) {
  if (seatingType === "round_tables") {
    const seatsPerTable = eventType === "wedding" ? 8 : 6;
    return {
      rows: null,
      columns: null,
      tableCount: Math.max(1, Math.ceil(capacity / seatsPerTable)),
      seatsPerTable,
      hasCentralAisle: false,
    };
  }

  if (seatingType === "mixed") {
    return {
      rows: Math.max(4, Math.ceil(capacity * 0.5 / 6)),
      columns: 6,
      tableCount: Math.max(2, Math.ceil(capacity * 0.5 / 8)),
      seatsPerTable: 8,
      hasCentralAisle: true,
    };
  }

  return {
    rows: Math.max(4, Math.ceil(capacity / 8)),
    columns: 8,
    tableCount: null,
    seatsPerTable: null,
    hasCentralAisle: eventType !== "wedding",
  };
}

function normalizeRoom(
  room: RawLayoutIntent["room"],
  eventType: PromptEventType,
) {
  const defaults = ROOM_DEFAULTS[eventType];

  return {
    width: clamp(toFiniteNumber(room?.width) ?? defaults.width, 10, 60),
    depth: clamp(toFiniteNumber(room?.depth) ?? defaults.depth, 10, 80),
    height: clamp(toFiniteNumber(room?.height) ?? defaults.height, 3, 8),
  };
}

export function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // fall through
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as unknown;
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf("{");
  if (start === -1) {
    throw new Error("The model response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < trimmed.length; index++) {
    const char = trimmed[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(trimmed.slice(start, index + 1)) as unknown;
      }
    }
  }

  throw new Error("Could not extract valid JSON from the model response.");
}

export function validatePromptLayoutIntent(input: unknown): PromptLayoutIntent {
  if (!isObject(input)) {
    throw new Error("The generated layout was not a JSON object.");
  }

  const raw = input as RawLayoutIntent;
  const requestedSeatingType = isSeatingLayoutType(raw.layout?.seating?.type)
    ? raw.layout?.seating?.type
    : "rows";
  const eventType = inferEventType(raw.eventType, requestedSeatingType);
  const capacity = clamp(
    Math.round(toFiniteNumber(raw.capacity) ?? (eventType === "wedding" ? 120 : 80)),
    10,
    500,
  );
  const room = normalizeRoom(raw.room, eventType);
  const defaults = inferSeatingDefaults(requestedSeatingType, capacity, eventType);

  return {
    eventType,
    capacity,
    room,
    layout: {
      seating: {
        type: requestedSeatingType,
        rows: normalizeNullableCount(raw.layout?.seating?.rows, 1, 60) ?? defaults.rows,
        columns:
          normalizeNullableCount(raw.layout?.seating?.columns, 1, 24) ??
          defaults.columns,
        tableCount:
          normalizeNullableCount(raw.layout?.seating?.tableCount, 1, 80) ??
          defaults.tableCount,
        seatsPerTable:
          normalizeNullableCount(raw.layout?.seating?.seatsPerTable, 2, 12) ??
          defaults.seatsPerTable,
        hasCentralAisle: toBoolean(
          raw.layout?.seating?.hasCentralAisle,
          defaults.hasCentralAisle,
        ),
      },
      stage: {
        enabled: toBoolean(
          raw.layout?.stage?.enabled,
          eventType !== "wedding" || requestedSeatingType !== "round_tables",
        ),
        position:
          raw.layout?.stage?.position === "center" ? "center" : "front",
      },
      podium: {
        enabled: toBoolean(
          raw.layout?.podium?.enabled,
          eventType !== "wedding",
        ),
      },
      screen: {
        enabled: toBoolean(
          raw.layout?.screen?.enabled,
          eventType === "conference" || eventType === "church",
        ),
      },
      decor: {
        plants: toBoolean(
          raw.layout?.decor?.plants,
          eventType === "wedding" || eventType === "funeral",
        ),
        lighting: toBoolean(raw.layout?.decor?.lighting, true),
      },
    },
  };
}
