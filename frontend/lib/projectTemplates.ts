import { Project, SceneSettings, VenueArchitecture } from "@/types/types";

export type ProjectTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  avReady?: boolean;
  previewTone: string;
  buildProject: (projectName?: string) => Project;
};

const DEFAULT_SETTINGS: SceneSettings = {
  showGrid: false,
  enableHdri: true,
  ambientLightIntensity: 0.95,
  directionalLightIntensity: 1.5,
  snapToGrid: true,
  livestreamMode: false,
  cameraMode: "orbit",
  presentationMode: false,
  wallThickness: 0.15,
  wallColor: "#F6F2EC",
  floorColor: "#D7B98E",
  floorMaterial: "Wood",
  wallMaterial: "Painted",
  venueEnvironment: "indoor",
  lightingMood: "presentation",
};

function opening(id: string, wall: "north" | "south" | "east" | "west", offset: number, width: number, height: number, sillHeight?: number) {
  return { id, wall, offset, width, height, sillHeight };
}

function baseArchitecture(width: number, depth: number, height: number): VenueArchitecture {
  return {
    shape: "rectangular",
    doors: [opening("door-main", "south", 0, 2.8, 2.35)],
    windows: [
      opening("window-west-a", "west", -depth * 0.24, 2.8, 1.35, 1.1),
      opening("window-west-b", "west", depth * 0.18, 2.8, 1.35, 1.1),
      opening("window-east-a", "east", -depth * 0.24, 2.8, 1.35, 1.1),
      opening("window-east-b", "east", depth * 0.18, 2.8, 1.35, 1.1),
    ],
    columns: [],
    entrances: [],
    exits: [opening("exit-north-east", "north", width * 0.36, 1.45, 2.25)],
    stageAccessRoutes: [
      {
        id: "route-main-aisle",
        label: "Main aisle / stage access",
        width: 1.45,
        points: [
          { x: 0, z: depth / 2 - 1.6 },
          { x: 0, z: -depth / 2 + 3.5 },
        ],
      },
    ],
    hasCeiling: true,
    ceilingHeight: height,
    ceilingDraping: false,
    decorativeLighting: true,
    stageBackdrop: "draping",
  };
}

function createVenueProject({
  name,
  room,
  settings,
  architecture,
}: {
  name: string;
  room: Project["room"];
  settings: Partial<SceneSettings>;
  architecture: VenueArchitecture;
}): Project {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room,
    sceneSettings: { ...DEFAULT_SETTINGS, ...settings },
    architecture,
    items: [],
    connections: [],
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "tmpl-wedding-ballroom",
    name: "Wedding Ballroom",
    category: "Wedding",
    description: "A warm ballroom shell with draping, windows, columns, main aisle, and wedding uplighting.",
    avReady: true,
    previewTone: "#FBEAF0",
    buildProject: (projectName) => {
      const width = 30;
      const depth = 34;
      const height = 5.2;
      const architecture = baseArchitecture(width, depth, height);
      architecture.columns = [
        { id: "col-1", x: -width * 0.36, z: -depth * 0.22, radius: 0.24 },
        { id: "col-2", x: width * 0.36, z: -depth * 0.22, radius: 0.24 },
        { id: "col-3", x: -width * 0.36, z: depth * 0.22, radius: 0.24 },
        { id: "col-4", x: width * 0.36, z: depth * 0.22, radius: 0.24 },
      ];
      architecture.ceilingDraping = true;
      architecture.stageBackdrop = "draping";
      return createVenueProject({
        name: projectName || "Wedding Ballroom",
        room: { width, depth, height, wallThickness: 0.15 },
        settings: {
          floorMaterial: "Banquet",
          floorColor: "#A88978",
          wallMaterial: "Draping",
          lightingMood: "wedding",
          wallColor: "#F2E7DC",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-church-layout",
    name: "Church Layout",
    category: "Church",
    description: "A chapel-like venue with taller ceiling, central aisle, altar wall, side windows, and softened light.",
    avReady: true,
    previewTone: "#E1F5EE",
    buildProject: (projectName) => {
      const width = 22;
      const depth = 40;
      const height = 6.2;
      const architecture = baseArchitecture(width, depth, height);
      architecture.stageBackdrop = "painted";
      architecture.windows = [
        opening("chapel-window-west-a", "west", -12, 2.2, 1.8, 1.5),
        opening("chapel-window-west-b", "west", -4, 2.2, 1.8, 1.5),
        opening("chapel-window-west-c", "west", 4, 2.2, 1.8, 1.5),
        opening("chapel-window-east-a", "east", -12, 2.2, 1.8, 1.5),
        opening("chapel-window-east-b", "east", -4, 2.2, 1.8, 1.5),
        opening("chapel-window-east-c", "east", 4, 2.2, 1.8, 1.5),
      ];
      return createVenueProject({
        name: projectName || "Church Layout",
        room: { width, depth, height, wallThickness: 0.18 },
        settings: {
          floorMaterial: "Wood",
          wallColor: "#EFEAE1",
          lightingMood: "chapel",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-conference-hall",
    name: "Conference Hall",
    category: "Conference",
    description: "A professional conference shell with LED backdrop, clean circulation, exits, and presentation lighting.",
    avReady: true,
    previewTone: "#E8EDF7",
    buildProject: (projectName) => {
      const width = 28;
      const depth = 36;
      const height = 4.8;
      const architecture = baseArchitecture(width, depth, height);
      architecture.stageBackdrop = "led";
      architecture.windows = [];
      architecture.exits.push(opening("exit-north-west", "north", -width * 0.36, 1.45, 2.25));
      return createVenueProject({
        name: projectName || "Conference Hall",
        room: { width, depth, height, wallThickness: 0.14 },
        settings: {
          floorMaterial: "Carpet",
          floorColor: "#6E7780",
          wallColor: "#E6ECF4",
          wallMaterial: "LED Backdrop",
          lightingMood: "conference",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-outdoor-wedding-tent",
    name: "Outdoor Wedding Tent",
    category: "Wedding",
    description: "A marquee venue with tent canopy, open sides, ceremony aisle, draped ceiling, and warm string lights.",
    avReady: true,
    previewTone: "#EEF0E8",
    buildProject: (projectName) => {
      const width = 26;
      const depth = 32;
      const height = 4.6;
      const architecture = baseArchitecture(width, depth, height);
      architecture.doors = [];
      architecture.windows = [];
      architecture.exits = [];
      architecture.hasCeiling = true;
      architecture.ceilingDraping = true;
      architecture.stageBackdrop = "draping";
      return createVenueProject({
        name: projectName || "Outdoor Wedding Tent",
        room: { width, depth, height, wallThickness: 0.1 },
        settings: {
          floorMaterial: "Wood",
          floorColor: "#CDAF82",
          venueEnvironment: "tent",
          lightingMood: "wedding",
          wallColor: "#F4EFE4",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-funeral-setup",
    name: "Funeral Chapel",
    category: "Funeral",
    description: "An intimate chapel setup with calm materials, central procession route, photo wall, and quiet lighting.",
    avReady: true,
    previewTone: "#EDF1F0",
    buildProject: (projectName) => {
      const width = 20;
      const depth = 28;
      const height = 4.5;
      const architecture = baseArchitecture(width, depth, height);
      architecture.stageBackdrop = "painted";
      architecture.windows = [
        opening("chapel-soft-window-w", "west", -4, 2.4, 1.4, 1.25),
        opening("chapel-soft-window-e", "east", -4, 2.4, 1.4, 1.25),
      ];
      return createVenueProject({
        name: projectName || "Funeral Chapel",
        room: { width, depth, height, wallThickness: 0.16 },
        settings: {
          floorMaterial: "Carpet",
          floorColor: "#7D8582",
          wallColor: "#EDF1F0",
          lightingMood: "chapel",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-concert-venue",
    name: "Concert Venue",
    category: "Concert",
    description: "A larger performance room with LED stage wall, access routes, exits, and concert lighting mood.",
    avReady: true,
    previewTone: "#E9EEF3",
    buildProject: (projectName) => {
      const width = 42;
      const depth = 52;
      const height = 7;
      const architecture = baseArchitecture(width, depth, height);
      architecture.stageBackdrop = "led";
      architecture.windows = [];
      architecture.columns = [
        { id: "truss-left", x: -width * 0.42, z: -depth * 0.34, radius: 0.22 },
        { id: "truss-right", x: width * 0.42, z: -depth * 0.34, radius: 0.22 },
      ];
      architecture.stageAccessRoutes.push({
        id: "route-backstage",
        label: "Backstage access",
        width: 1.2,
        points: [
          { x: -width * 0.42, z: -depth / 2 + 2 },
          { x: -width * 0.14, z: -depth / 2 + 4 },
        ],
      });
      return createVenueProject({
        name: projectName || "Concert Venue",
        room: { width, depth, height, wallThickness: 0.18 },
        settings: {
          floorMaterial: "Concrete",
          floorColor: "#BFC0BA",
          wallColor: "#D8DADE",
          wallMaterial: "LED Backdrop",
          lightingMood: "concert",
        },
        architecture,
      });
    },
  },
  {
    id: "tmpl-hotel-banquet-hall",
    name: "Hotel Banquet Hall",
    category: "Hospitality",
    description: "A polished hotel hall with marble entry, banquet flooring, pillars, service exits, and presentation lighting.",
    avReady: true,
    previewTone: "#F0EDE7",
    buildProject: (projectName) => {
      const width = 34;
      const depth = 38;
      const height = 5;
      const architecture = baseArchitecture(width, depth, height);
      architecture.columns = [
        { id: "hotel-col-1", x: -11, z: -10, radius: 0.28 },
        { id: "hotel-col-2", x: 11, z: -10, radius: 0.28 },
        { id: "hotel-col-3", x: -11, z: 8, radius: 0.28 },
        { id: "hotel-col-4", x: 11, z: 8, radius: 0.28 },
      ];
      architecture.entrances = [opening("hotel-entry-wide", "south", 0, 4.2, 2.5)];
      architecture.exits.push(opening("service-exit-east", "east", depth * 0.32, 1.35, 2.2));
      architecture.ceilingDraping = true;
      return createVenueProject({
        name: projectName || "Hotel Banquet Hall",
        room: { width, depth, height, wallThickness: 0.16 },
        settings: {
          floorMaterial: "Marble",
          floorColor: "#E8E2D6",
          wallColor: "#EFE8DD",
          lightingMood: "presentation",
        },
        architecture,
      });
    },
  },
];
