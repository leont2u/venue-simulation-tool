import { apiClient } from "@/lib/apiClient";
import { AssetDefinition } from "@/types/types";

export type SketchfabAssetResponse = {
  total: number;
  page: number;
  limit: number;
  cached: boolean;
  results: AssetDefinition[];
};

export async function fetchSketchfabAssets(params: {
  q: string;
  page?: number;
  limit?: number;
}) {
  const response = await apiClient.get<SketchfabAssetResponse>(
    "/api/assets/sketchfab/",
    {
      params: {
        q: params.q,
        page: params.page ?? 0,
        limit: params.limit ?? 12,
      },
    },
  );

  return response.data;
}

export type CuratedSketchfabResponse = {
  total: number;
  results: AssetDefinition[];
};

export async function fetchCuratedSketchfabAssets() {
  const response = await apiClient.get<CuratedSketchfabResponse>(
    "/api/assets/sketchfab/curated/",
  );
  return response.data;
}
