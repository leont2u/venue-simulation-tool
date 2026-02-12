export type AssetKey = "BANQUET_CATERING" | "STAGE";

export type LayoutItem = {
  id: string;
  asset: AssetKey;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export type LayoutBlueprint = {
  room: { width: number; length: number; height: number };
  items: LayoutItem[];
};
