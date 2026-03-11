import { AssetDefinition } from "@/types/types";

export const ASSET_CATALOG: AssetDefinition[] = [
  {
    type: "chair",
    name: "Chair",
    modelUrl: "/models/chair.glb",
    defaultScale: [1.1, 1.1, 1.1],
    yOffset: 0,
  },
  {
    type: "desk",
    name: "Desk",
    modelUrl: "/models/desk.glb",
    defaultScale: [1, 1, 1],
    yOffset: 0,
  },
  {
    type: "podium",
    name: "Podium",
    modelUrl: "/models/podium.glb",
    defaultScale: [0.1, 0.1, 0.1],
    yOffset: 0,
  },
  {
    type: "piano",
    name: "Piano",
    modelUrl: "/models/piano.glb",
    defaultScale: [1, 1, 1],
    yOffset: 0,
  },
  {
    type: "camera",
    name: "Camera",
    modelUrl: "/models/camera.glb",
    defaultScale: [0.7, 0.7, 0.7],
    yOffset: 0,
  },
  {
    type: "altar",
    name: "Altar",
    modelUrl: "/models/altar.glb",
    defaultScale: [1, 1, 1],
    yOffset: 0,
  },
  {
    type: "banquet_table",
    name: "Banquet Table",
    modelUrl: "/models/banquet_table.glb",
    defaultScale: [0.05, 0.05, 0.05],
    yOffset: 0,
  },
];
