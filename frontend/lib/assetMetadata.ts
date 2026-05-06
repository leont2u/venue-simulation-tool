export const ASSET_FOOTPRINTS: Record<
  string,
  { width: number; depth: number; height: number; scale: [number, number, number] }
> = {
  chair: { width: 0.55, depth: 0.55, height: 0.9, scale: [0.7, 0.7, 0.7] },
  church_bench: { width: 2.2, depth: 0.8, height: 1.1, scale: [0.7, 0.7, 0.7] },
  desk: { width: 1.8, depth: 0.8, height: 0.75, scale: [1, 1, 1] },
  banquet_table: { width: 2.2, depth: 1, height: 0.75, scale: [1, 1, 1] },
  round_table: { width: 1.8, depth: 1.8, height: 0.75, scale: [1.6, 0.75, 1.6] },
  rectangular_table: { width: 1.8, depth: 0.8, height: 0.75, scale: [1.8, 0.75, 0.8] },
  dance_floor: { width: 5, depth: 4, height: 0.04, scale: [5, 0.04, 4] },
  podium: { width: 0.8, depth: 0.8, height: 1.2, scale: [1, 1, 1] },
  altar: { width: 2.5, depth: 1.2, height: 1.4, scale: [1, 1, 1] },
  piano: { width: 1.8, depth: 1.4, height: 1.2, scale: [1, 1, 1] },
  screen: { width: 3.2, depth: 0.25, height: 1.8, scale: [1, 1, 1] },
  tv: { width: 1.2, depth: 0.25, height: 0.9, scale: [1, 1, 1] },
  camera: { width: 0.9, depth: 0.9, height: 1.1, scale: [1, 1, 1] },
  speaker: { width: 0.8, depth: 0.8, height: 1.6, scale: [1, 1.2, 1] },
  mixing_desk: { width: 1.4, depth: 0.9, height: 0.8, scale: [1.2, 0.7, 0.8] },
  wall: { width: 1, depth: 0.2, height: 3, scale: [1, 3, 0.2] },
  door: { width: 1, depth: 0.16, height: 2.1, scale: [1, 2.1, 0.16] },
  window: { width: 1, depth: 0.16, height: 0.08, scale: [1, 0.08, 0.16] },
  column: { width: 0.35, depth: 0.35, height: 3, scale: [0.35, 3, 0.35] },
  ceiling_light: { width: 0.32, depth: 0.32, height: 0.05, scale: [0.32, 0.05, 0.32] },
  ceiling_cove: { width: 5, depth: 3, height: 0.08, scale: [5, 0.08, 3] },
  pendant_fan: { width: 1.35, depth: 1.35, height: 0.16, scale: [1.35, 0.16, 1.35] },
  railing: { width: 4, depth: 0.12, height: 0.45, scale: [4, 0.45, 0.12] },
  sofa: { width: 2.2, depth: 0.9, height: 0.85, scale: [2.2, 0.85, 0.9] },
};

export function polyPizzaRequiredUrl(type: string) {
  return `poly-pizza://required/${type}`;
}
