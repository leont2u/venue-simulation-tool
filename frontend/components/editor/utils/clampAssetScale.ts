export default function clampAssetScale(value: number) {
  return Math.min(10, Math.max(0.02, Number.isFinite(value) ? value : 1));
}
