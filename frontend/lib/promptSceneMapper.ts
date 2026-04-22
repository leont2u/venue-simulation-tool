import { PromptLayoutIntent } from "@/lib/aiSceneSchema";
import { Project, SceneItem } from "@/types/types";

function createItem(
  type: string,
  x: number,
  z: number,
  label: string,
  options?: {
    rotationY?: number;
    scale?: [number, number, number];
    assetUrl?: string;
  },
): SceneItem {
  const defaultVisuals: Record<string, { assetUrl: string; scale: [number, number, number] }> = {
    chair: {
      assetUrl: "/models/chair.glb",
      scale: [0.7, 0.7, 0.7],
    },
    podium: {
      assetUrl: "/models/podium.glb",
      scale: [0.1, 0.1, 0.1],
    },
    screen: {
      assetUrl: "/models/screen.glb",
      scale: [1, 1, 1],
    },
    round_table: {
      assetUrl: "primitive://round_table",
      scale: [1.6, 0.75, 1.6],
    },
    rectangular_table: {
      assetUrl: "primitive://rectangular_table",
      scale: [1.8, 0.75, 0.8],
    },
    stage: {
      assetUrl: "primitive://stage",
      scale: [5, 0.45, 3],
    },
    aisle: {
      assetUrl: "primitive://aisle",
      scale: [1.8, 0.02, 7],
    },
    plant: {
      assetUrl: "primitive://plant",
      scale: [0.6, 1.2, 0.6],
    },
  };

  const visual = defaultVisuals[type];

  return {
    id: crypto.randomUUID(),
    type,
    x,
    y: 0,
    z,
    rotationY: options?.rotationY ?? 0,
    scale: options?.scale ?? visual.scale,
    assetUrl: options?.assetUrl ?? visual.assetUrl,
    label,
  };
}

function addStageCluster(items: SceneItem[], intent: PromptLayoutIntent) {
  if (!intent.layout.stage.enabled) return;

  const stageZ =
    intent.layout.stage.position === "center"
      ? 0
      : -intent.room.depth / 2 + 2.4;

  items.push(createItem("stage", 0, stageZ, "Stage"));

  if (intent.layout.podium.enabled) {
    items.push(createItem("podium", 0, stageZ + 0.8, "Podium"));
  }

  if (intent.layout.screen.enabled) {
    items.push(createItem("screen", 0, stageZ - 0.8, "Screen"));
  }
}

function addPlants(items: SceneItem[], intent: PromptLayoutIntent) {
  if (!intent.layout.decor.plants) return;

  const x = intent.room.width / 2 - 1;
  const z = intent.room.depth / 2 - 1;

  items.push(
    createItem("plant", -x, -z, "Plant 1"),
    createItem("plant", x, -z, "Plant 2"),
    createItem("plant", -x, z, "Plant 3"),
    createItem("plant", x, z, "Plant 4"),
  );
}

function addRowSeating(items: SceneItem[], intent: PromptLayoutIntent) {
  const rows = intent.layout.seating.rows ?? Math.max(4, Math.ceil(intent.capacity / 8));
  const columns = intent.layout.seating.columns ?? 8;
  const spacingX = 0.95;
  const spacingZ = 1.15;
  const halfColumns = Math.floor(columns / 2);
  const hasAisle = intent.layout.seating.hasCentralAisle;
  const aisleWidth = hasAisle ? 1.8 : 0;
  const frontOffset = intent.layout.stage.enabled ? 5.8 : 3.5;
  const startZ = -intent.room.depth / 2 + frontOffset;
  const totalWidth =
    columns * spacingX + (hasAisle ? aisleWidth : 0) - spacingX;
  const startX = -totalWidth / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      let x = startX + col * spacingX;

      if (hasAisle && col >= halfColumns) {
        x += aisleWidth;
      }

      const z = startZ + row * spacingZ;

      items.push(
        createItem("chair", x, z, `Chair ${row + 1}-${col + 1}`),
      );
    }
  }

  if (hasAisle) {
    items.push(
      createItem("aisle", 0, startZ + ((rows - 1) * spacingZ) / 2, "Central Aisle", {
        scale: [1.8, 0.02, Math.max(4, rows * spacingZ)],
      }),
    );
  }
}

function addRoundTables(items: SceneItem[], intent: PromptLayoutIntent) {
  const tableCount =
    intent.layout.seating.tableCount ??
    Math.max(1, Math.ceil(intent.capacity / (intent.layout.seating.seatsPerTable ?? 8)));
  const seatsPerTable = intent.layout.seating.seatsPerTable ?? 8;
  const columns = Math.max(2, Math.ceil(Math.sqrt(tableCount)));
  const spacingX = 4.2;
  const spacingZ = 4.2;
  const totalWidth = (columns - 1) * spacingX;
  const startX = -totalWidth / 2;
  const startZ = intent.layout.stage.enabled ? -1 : -intent.room.depth / 2 + 4.2;

  for (let index = 0; index < tableCount; index++) {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const tableX = startX + col * spacingX;
    const tableZ = startZ + row * spacingZ;

    items.push(
      createItem("round_table", tableX, tableZ, `Table ${index + 1}`),
    );

    const radius = 1.3;

    for (let seat = 0; seat < seatsPerTable; seat++) {
      const angle = (Math.PI * 2 * seat) / seatsPerTable;
      items.push(
        createItem(
          "chair",
          tableX + Math.cos(angle) * radius,
          tableZ + Math.sin(angle) * radius,
          `Table ${index + 1} Seat ${seat + 1}`,
          { rotationY: -angle + Math.PI / 2 },
        ),
      );
    }
  }
}

function addMixedSeating(items: SceneItem[], intent: PromptLayoutIntent) {
  const tableIntent: PromptLayoutIntent = {
    ...intent,
    layout: {
      ...intent.layout,
      seating: {
        ...intent.layout.seating,
        type: "round_tables",
        tableCount:
          intent.layout.seating.tableCount ??
          Math.max(2, Math.ceil(intent.capacity * 0.4 / (intent.layout.seating.seatsPerTable ?? 8))),
        seatsPerTable: intent.layout.seating.seatsPerTable ?? 8,
      },
    },
  };

  addRoundTables(items, tableIntent);

  const rows = intent.layout.seating.rows ?? Math.max(4, Math.ceil(intent.capacity * 0.6 / 8));
  const columns = intent.layout.seating.columns ?? 8;
  const spacingX = 0.95;
  const spacingZ = 1.15;
  const hasAisle = intent.layout.seating.hasCentralAisle;
  const aisleWidth = hasAisle ? 1.8 : 0;
  const halfColumns = Math.floor(columns / 2);
  const startX = -(columns * spacingX + aisleWidth - spacingX) / 2;
  const startZ = intent.room.depth / 2 - rows * spacingZ - 2.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      let x = startX + col * spacingX;
      if (hasAisle && col >= halfColumns) {
        x += aisleWidth;
      }

      items.push(
        createItem(
          "chair",
          x,
          startZ + row * spacingZ,
          `Rear Chair ${row + 1}-${col + 1}`,
        ),
      );
    }
  }

  if (hasAisle) {
    items.push(
      createItem("aisle", 0, startZ + ((rows - 1) * spacingZ) / 2, "Central Aisle", {
        scale: [1.8, 0.02, Math.max(4, rows * spacingZ)],
      }),
    );
  }
}

function buildSeating(items: SceneItem[], intent: PromptLayoutIntent) {
  if (intent.layout.seating.type === "round_tables") {
    addRoundTables(items, intent);
    return;
  }

  if (intent.layout.seating.type === "mixed") {
    addMixedSeating(items, intent);
    return;
  }

  addRowSeating(items, intent);
}

export function promptScenePlanToProject(intent: PromptLayoutIntent): Project {
  const items: SceneItem[] = [];

  addStageCluster(items, intent);
  buildSeating(items, intent);
  addPlants(items, intent);

  return {
    id: crypto.randomUUID(),
    name: `${intent.eventType[0].toUpperCase()}${intent.eventType.slice(1)} Layout`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room: {
      width: intent.room.width,
      depth: intent.room.depth,
      height: intent.room.height,
    },
    items,
  };
}
