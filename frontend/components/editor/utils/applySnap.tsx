export default function applySnap(value: number, enabled: boolean) {
  return enabled ? Math.round(value * 4) / 4 : value;
}
