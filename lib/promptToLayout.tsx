import type { LayoutBlueprint, LayoutItem } from "./layout.types";

function has(text: string, word: string) {
  return text.toLowerCase().includes(word.toLowerCase());
}

export function promptToBlueprint(prompt: string): LayoutBlueprint {
  const wantsBanquet =
    has(prompt, "banquet") || has(prompt, "chairs") || has(prompt, "table");
  const wantsCatering = has(prompt, "catering") || has(prompt, "buffet");
  const wantsStage = has(prompt, "stage");

  const room = { width: 24, length: 18, height: 5 };

  const items: LayoutItem[] = []; // ✅ IMPORTANT

  if (wantsStage) {
    items.push({
      id: "stage-1",
      asset: "STAGE",
      position: [0, 0, -room.length / 2 + 2],
      rotation: [0, 0, 0],
      scale: 0.1,
    });
  }

  if (wantsBanquet || wantsCatering) {
    items.push({
      id: "banquet-1",
      asset: "BANQUET_CATERING",
      position: [0, 0, 1],
      rotation: [0, Math.PI, 0],
      scale: 0.1,
    });
  }

  return { room, items };
}
