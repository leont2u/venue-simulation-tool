import { AssetDefinition } from "@/types/types";

function makeThumb(label: string, colors: [string, string]) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colors[0]}"/>
          <stop offset="100%" stop-color="${colors[1]}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="120" rx="18" fill="url(#g)"/>
      <circle cx="46" cy="48" r="22" fill="rgba(255,255,255,0.18)"/>
      <rect x="26" y="74" width="108" height="18" rx="9" fill="rgba(255,255,255,0.18)"/>
      <text x="80" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white">${label}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const ASSET_CATALOG: AssetDefinition[] = [
  {
    id: "asset-chair",
    type: "chair",
    name: "Chair",
    category: "Seating",
    thumbnail: makeThumb("Chair", ["#84A98C", "#52796F"]),
    modelUrl: "/models/chair.glb",
    defaultScale: [0.7, 0.7, 0.7],
    boundingBox: { width: 0.55, depth: 0.55, height: 0.9 },
    yOffset: 0,
  },
  {
    id: "asset-bench",
    type: "church_bench",
    name: "Church Bench",
    category: "Seating",
    thumbnail: makeThumb("Bench", ["#8D6E63", "#6D4C41"]),
    modelUrl: "/models/church_bench.glb",
    defaultScale: [0.7, 0.7, 0.7],
    boundingBox: { width: 2.2, depth: 0.8, height: 1.1 },
    yOffset: 0,
  },
  {
    id: "asset-desk",
    type: "desk",
    name: "Desk",
    category: "Tables",
    thumbnail: makeThumb("Desk", ["#D4A373", "#A98467"]),
    modelUrl: "/models/desk.glb",
    defaultScale: [1, 1, 1],
    boundingBox: { width: 1.8, depth: 0.8, height: 0.75 },
    yOffset: 0,
  },
  {
    id: "asset-banquet-table",
    type: "banquet_table",
    name: "Banquet Table",
    category: "Tables",
    thumbnail: makeThumb("Banquet", ["#C9ADA7", "#9A8C98"]),
    modelUrl: "/models/banquet_table.glb",
    defaultScale: [0.05, 0.05, 0.05],
    boundingBox: { width: 2.2, depth: 1, height: 0.75 },
    yOffset: 0,
  },
  {
    id: "asset-podium",
    type: "podium",
    name: "Podium",
    category: "Stage & Decor",
    thumbnail: makeThumb("Podium", ["#6D6875", "#B5838D"]),
    modelUrl: "/models/podium.glb",
    defaultScale: [0.1, 0.1, 0.1],
    boundingBox: { width: 0.8, depth: 0.8, height: 1.2 },
    yOffset: 0,
  },
  {
    id: "asset-altar",
    type: "altar",
    name: "Altar",
    category: "Stage & Decor",
    thumbnail: makeThumb("Altar", ["#52796F", "#84A98C"]),
    modelUrl: "/models/altar.glb",
    defaultScale: [1, 1, 1],
    boundingBox: { width: 2.5, depth: 1.2, height: 1.4 },
    yOffset: 0,
  },
  {
    id: "asset-piano",
    type: "piano",
    name: "Piano",
    category: "Stage & Decor",
    thumbnail: makeThumb("Piano", ["#3D405B", "#6D597A"]),
    modelUrl: "/models/piano.glb",
    defaultScale: [1.5, 1.5, 1.5],
    boundingBox: { width: 1.8, depth: 1.4, height: 1.2 },
    yOffset: 0,
  },
  {
    id: "asset-screen",
    type: "screen",
    name: "LED Screen",
    category: "Media Equipment",
    thumbnail: makeThumb("Screen", ["#355070", "#6D597A"]),
    modelUrl: "/models/screen.glb",
    defaultScale: [1, 1, 1],
    boundingBox: { width: 3.2, depth: 0.25, height: 1.8 },
    yOffset: 0,
  },
  {
    id: "asset-tv",
    type: "tv",
    name: "TV",
    category: "Media Equipment",
    thumbnail: makeThumb("TV", ["#264653", "#2A9D8F"]),
    modelUrl: "/models/tv.glb",
    defaultScale: [0.1, 0.1, 0.1],
    boundingBox: { width: 1.2, depth: 0.25, height: 0.9 },
    yOffset: 0,
  },
  {
    id: "asset-camera",
    type: "camera",
    name: "Camera",
    category: "Media Equipment",
    thumbnail: makeThumb("Camera", ["#1D3557", "#457B9D"]),
    modelUrl: "/models/camera.glb",
    defaultScale: [0.7, 0.7, 0.7],
    boundingBox: { width: 0.9, depth: 0.9, height: 1.1 },
    yOffset: 0,
  },
];
