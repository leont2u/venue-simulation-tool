import { Project } from "@/types/types";

export type ProjectTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  avReady?: boolean;
  previewTone: string;
  buildProject: (projectName?: string) => Project;
};

function createBaseProject(name: string, room: Project["room"]): Project {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    room,
    items: [],
    connections: [],
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "tmpl-conference-av",
    name: "Conference AV Setup",
    category: "Conference",
    description:
      "Rows facing the stage with front speakers, cameras, and a mixing desk already laid out.",
    avReady: true,
    previewTone: "#E8EDF7",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Conference AV Setup", {
        width: 24,
        depth: 34,
        height: 4.5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "podium", x: 0, y: 0, z: -12.5, rotationY: 0, scale: [0.1, 0.1, 0.1], assetUrl: "/models/podium.glb", label: "Podium", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 0, y: 0, z: -15, rotationY: 0, scale: [1, 1, 1], assetUrl: "/models/screen.glb", label: "Screen", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: -4.5, y: 0, z: 10.5, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera A", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 4.5, y: 0, z: 10.5, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera B", layer: "av" },
        { id: crypto.randomUUID(), type: "speaker", x: -6.5, y: 0, z: -11.5, rotationY: 0, scale: [0.9, 1.2, 0.9], assetUrl: "primitive://speaker", label: "PA Speaker L", layer: "av" },
        { id: crypto.randomUUID(), type: "speaker", x: 6.5, y: 0, z: -11.5, rotationY: 0, scale: [0.9, 1.2, 0.9], assetUrl: "primitive://speaker", label: "PA Speaker R", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 12, rotationY: 0, scale: [1.2, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "Mixing Desk", layer: "av" },
      ];

      project.connections = [
        { id: crypto.randomUUID(), fromItemId: project.items[6].id, toItemId: project.items[4].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[6].id, toItemId: project.items[5].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[2].id, toItemId: project.items[1].id, cableType: "video" },
        { id: crypto.randomUUID(), fromItemId: project.items[3].id, toItemId: project.items[1].id, cableType: "video" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-wedding-banquet",
    name: "Wedding Banquet",
    category: "Wedding",
    description:
      "Head table, banquet tables, and a flexible AV overlay starting point for livestream coverage.",
    avReady: true,
    previewTone: "#FBEAF0",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Wedding Banquet", {
        width: 28,
        depth: 30,
        height: 4.5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "banquet_table", x: -5, y: 0, z: -3, rotationY: 0, scale: [0.05, 0.05, 0.05], assetUrl: "/models/banquet_table.glb", label: "Guest Table 1", layer: "layout" },
        { id: crypto.randomUUID(), type: "banquet_table", x: 5, y: 0, z: -3, rotationY: 0, scale: [0.05, 0.05, 0.05], assetUrl: "/models/banquet_table.glb", label: "Guest Table 2", layer: "layout" },
        { id: crypto.randomUUID(), type: "desk", x: 0, y: 0, z: -11, rotationY: 0, scale: [1.2, 1, 1], assetUrl: "/models/desk.glb", label: "Head Table", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: -7, y: 0, z: 10, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Ceremony Camera", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 7, y: 0, z: 10, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Reception Camera", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 12, rotationY: 0, scale: [1.2, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "Streaming Desk", layer: "av" },
      ];

      project.connections = [
        { id: crypto.randomUUID(), fromItemId: project.items[3].id, toItemId: project.items[5].id, cableType: "video" },
        { id: crypto.randomUUID(), fromItemId: project.items[4].id, toItemId: project.items[5].id, cableType: "video" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-church-stream",
    name: "Church Livestream",
    category: "Church",
    description:
      "Church bench layout with altar, cameras, screen, and a central AV control point.",
    avReady: true,
    previewTone: "#E1F5EE",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Church Livestream", {
        width: 22,
        depth: 36,
        height: 5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "altar", x: 0, y: 0, z: -13, rotationY: 0, scale: [1, 1, 1], assetUrl: "/models/altar.glb", label: "Altar", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 0, y: 0, z: -16, rotationY: 0, scale: [1, 1, 1], assetUrl: "/models/screen.glb", label: "LED Screen", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: -5, y: 0, z: 12, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Center Camera", layer: "av" },
        { id: crypto.randomUUID(), type: "speaker", x: -5.5, y: 0, z: -10.5, rotationY: 0, scale: [0.9, 1.2, 0.9], assetUrl: "primitive://speaker", label: "Speaker L", layer: "av" },
        { id: crypto.randomUUID(), type: "speaker", x: 5.5, y: 0, z: -10.5, rotationY: 0, scale: [0.9, 1.2, 0.9], assetUrl: "primitive://speaker", label: "Speaker R", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 13.5, rotationY: 0, scale: [1.2, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "Mixing Desk", layer: "av" },
      ];

      project.connections = [
        { id: crypto.randomUUID(), fromItemId: project.items[5].id, toItemId: project.items[3].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[5].id, toItemId: project.items[4].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[2].id, toItemId: project.items[5].id, cableType: "video" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-concert-main-stage",
    name: "Outdoor Festival",
    category: "Concert",
    description:
      "Large open venue with stage, screens, front speakers, and camera positions.",
    avReady: true,
    previewTone: "#EEF0E8",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Outdoor Festival", {
        width: 44,
        depth: 54,
        height: 6,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "screen", x: -8, y: 0, z: -21, rotationY: 0, scale: [1.2, 1.2, 1.2], assetUrl: "/models/screen.glb", label: "Screen L", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 8, y: 0, z: -21, rotationY: 0, scale: [1.2, 1.2, 1.2], assetUrl: "/models/screen.glb", label: "Screen R", layer: "layout" },
        { id: crypto.randomUUID(), type: "podium", x: 0, y: 0, z: -18, rotationY: 0, scale: [0.2, 0.2, 0.2], assetUrl: "/models/podium.glb", label: "Main Stage", layer: "layout" },
        { id: crypto.randomUUID(), type: "speaker", x: -11, y: 0, z: -17, rotationY: 0, scale: [1.1, 1.4, 1.1], assetUrl: "primitive://speaker", label: "Line Array L", layer: "av" },
        { id: crypto.randomUUID(), type: "speaker", x: 11, y: 0, z: -17, rotationY: 0, scale: [1.1, 1.4, 1.1], assetUrl: "primitive://speaker", label: "Line Array R", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 0, y: 0, z: 14, rotationY: 0, scale: [0.8, 0.8, 0.8], assetUrl: "/models/camera.glb", label: "FOH Camera", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 20, rotationY: 0, scale: [1.4, 0.8, 0.9], assetUrl: "primitive://mixing_desk", label: "FOH Desk", layer: "av" },
      ];

      project.connections = [
        { id: crypto.randomUUID(), fromItemId: project.items[6].id, toItemId: project.items[3].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[6].id, toItemId: project.items[4].id, cableType: "audio" },
        { id: crypto.randomUUID(), fromItemId: project.items[5].id, toItemId: project.items[6].id, cableType: "video" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-memorial-intimate",
    name: "Memorial Service",
    category: "Funeral",
    description:
      "Intimate seating layout with podium, screen, and a small livestream setup.",
    avReady: true,
    previewTone: "#EDF1F0",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Memorial Service", {
        width: 18,
        depth: 24,
        height: 4,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "podium", x: 0, y: 0, z: -8, rotationY: 0, scale: [0.1, 0.1, 0.1], assetUrl: "/models/podium.glb", label: "Podium", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 0, y: 0, z: -10.5, rotationY: 0, scale: [0.8, 0.8, 0.8], assetUrl: "/models/screen.glb", label: "Photo Screen", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: 0, y: 0, z: 8, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Livestream Camera", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 5, y: 0, z: 7, rotationY: 0, scale: [1.1, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "AV Desk", layer: "av" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-corporate-town-hall",
    name: "Corporate Town Hall",
    category: "Corporate",
    description:
      "Hybrid town hall layout with presentation screen, podium, and AV control.",
    avReady: true,
    previewTone: "#E9EEF3",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Corporate Town Hall", {
        width: 26,
        depth: 32,
        height: 4.5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "screen", x: 0, y: 0, z: -13.5, rotationY: 0, scale: [1, 1, 1], assetUrl: "/models/screen.glb", label: "Main Screen", layer: "layout" },
        { id: crypto.randomUUID(), type: "podium", x: -3, y: 0, z: -11.5, rotationY: 0, scale: [0.1, 0.1, 0.1], assetUrl: "/models/podium.glb", label: "Speaker Podium", layer: "layout" },
        { id: crypto.randomUUID(), type: "desk", x: 3, y: 0, z: -10.5, rotationY: 0, scale: [1.1, 1, 1], assetUrl: "/models/desk.glb", label: "Panel Desk", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: -6, y: 0, z: 9, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera L", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 6, y: 0, z: 9, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera R", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 12, rotationY: 0, scale: [1.2, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "Hybrid Control", layer: "av" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-livestream-studio",
    name: "Livestream Studio",
    category: "Livestream",
    description:
      "Compact four-camera studio starter layout for production planning.",
    avReady: true,
    previewTone: "#E8F2F0",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Livestream Studio", {
        width: 16,
        depth: 18,
        height: 3.5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "desk", x: 0, y: 0, z: -4, rotationY: 0, scale: [1.2, 1, 1], assetUrl: "/models/desk.glb", label: "Host Desk", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 0, y: 0, z: -7, rotationY: 0, scale: [0.8, 0.8, 0.8], assetUrl: "/models/screen.glb", label: "Backdrop Screen", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: -5, y: 0, z: 2, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera 1", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 5, y: 0, z: 2, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera 2", layer: "av" },
        { id: crypto.randomUUID(), type: "camera", x: 0, y: 0, z: 6, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Camera 3", layer: "av" },
        { id: crypto.randomUUID(), type: "mixing_desk", x: 0, y: 0, z: 7, rotationY: 0, scale: [1.2, 0.7, 0.8], assetUrl: "primitive://mixing_desk", label: "Control Desk", layer: "av" },
      ];

      return project;
    },
  },
  {
    id: "tmpl-trade-show-booth",
    name: "Trade Show Booth",
    category: "Trade Show",
    description:
      "Small exhibition booth with screens, desk space, and camera-ready product demo area.",
    previewTone: "#F0F1EB",
    buildProject: (projectName) => {
      const project = createBaseProject(projectName || "Trade Show Booth", {
        width: 20,
        depth: 20,
        height: 3.5,
        wallThickness: 0.15,
      });

      project.items = [
        { id: crypto.randomUUID(), type: "screen", x: -4, y: 0, z: -6, rotationY: 0, scale: [0.8, 0.8, 0.8], assetUrl: "/models/screen.glb", label: "Demo Screen L", layer: "layout" },
        { id: crypto.randomUUID(), type: "screen", x: 4, y: 0, z: -6, rotationY: 0, scale: [0.8, 0.8, 0.8], assetUrl: "/models/screen.glb", label: "Demo Screen R", layer: "layout" },
        { id: crypto.randomUUID(), type: "desk", x: 0, y: 0, z: 0, rotationY: 0, scale: [1.2, 1, 1], assetUrl: "/models/desk.glb", label: "Demo Counter", layer: "layout" },
        { id: crypto.randomUUID(), type: "camera", x: 0, y: 0, z: 6, rotationY: 0, scale: [0.7, 0.7, 0.7], assetUrl: "/models/camera.glb", label: "Content Camera", layer: "av" },
      ];

      return project;
    },
  },
];
