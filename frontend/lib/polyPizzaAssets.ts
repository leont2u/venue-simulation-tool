import { apiClient } from "@/lib/apiClient";
import { AssetDefinition } from "@/types/types";

export type PolyPizzaAssetResponse = {
  total: number;
  page: number;
  limit: number;
  cached: boolean;
  results: AssetDefinition[];
};

export async function fetchPolyPizzaAssets(params: {
  q?: string;
  page?: number;
  limit?: number;
  category?: number;
  license?: number;
  preset?: "venue" | "all";
}) {
  const response = await apiClient.get<PolyPizzaAssetResponse>(
    "/api/assets/poly-pizza/",
    {
      params: {
        q: params.q || undefined,
        page: params.page ?? 0,
        limit: params.limit ?? 32,
        category: params.category,
        license: params.license,
        preset: params.preset ?? "venue",
      },
    },
  );

  return response.data;
}
