import { Project } from "@/types/types";

const CHAIRS_PER_SKETCHFAB_ROUND_TABLE = 4;
const ROUND_TABLE_SF_UID = "b3b1d1d338aa46ed9d480a613098e024";

export default function estimateCapacity(project: Project) {
  // Round tables using the Sketchfab combined model have 4 chairs baked in.
  const sfRoundTables = project.items.filter(
    (item) =>
      item.type === "round_table" &&
      (item.assetUrl?.includes(ROUND_TABLE_SF_UID) ||
        item.assetUrl?.startsWith("sketchfab://")),
  ).length;

  const explicitChairs = project.items.filter((item) =>
    ["chair", "church_bench", "banquet_table", "desk"].includes(item.type),
  ).length;

  const primitiveRoundTables = project.items.filter(
    (item) =>
      item.type === "round_table" &&
      !item.assetUrl?.includes(ROUND_TABLE_SF_UID) &&
      !item.assetUrl?.startsWith("sketchfab://"),
  ).length;

  const total =
    sfRoundTables * CHAIRS_PER_SKETCHFAB_ROUND_TABLE +
    explicitChairs +
    primitiveRoundTables * 8;

  if (total > 0) return total;
  return Math.round((project.room.width * project.room.depth) / 2.8);
}
