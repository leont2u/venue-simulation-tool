export const ASSET_FOOTPRINTS: Record<
  string,
  { width: number; depth: number; height: number; scale: [number, number, number] }
> = {
  chair: { width: 0.55, depth: 0.55, height: 0.9, scale: [0.7, 0.7, 0.7] },
  church_bench: { width: 2.2, depth: 0.8, height: 1.1, scale: [0.7, 0.7, 0.7] },
  desk: { width: 1.8, depth: 0.8, height: 0.75, scale: [1, 1, 1] },
  banquet_table: { width: 2.2, depth: 1, height: 0.75, scale: [1, 1, 1] },
  podium: { width: 0.8, depth: 0.8, height: 1.2, scale: [1, 1, 1] },
  altar: { width: 2.5, depth: 1.2, height: 1.4, scale: [1, 1, 1] },
  piano: { width: 1.8, depth: 1.4, height: 1.2, scale: [1, 1, 1] },
  screen: { width: 3.2, depth: 0.25, height: 1.8, scale: [1, 1, 1] },
  tv: { width: 1.2, depth: 0.25, height: 0.9, scale: [1, 1, 1] },
  camera: { width: 0.9, depth: 0.9, height: 1.1, scale: [1, 1, 1] },
  speaker: { width: 0.8, depth: 0.8, height: 1.6, scale: [1, 1.2, 1] },
  mixing_desk: { width: 1.4, depth: 0.9, height: 0.8, scale: [1.2, 0.7, 0.8] },
};

export function polyPizzaRequiredUrl(type: string) {
  return `poly-pizza://required/${type}`;
}
