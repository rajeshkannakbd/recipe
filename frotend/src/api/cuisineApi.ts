import { metadataRequest, unwrapItem, unwrapList } from "./metadataHttp";

export interface CuisineRecord {
  id: number;
  name: string;
  recipeCount?: number;
}

export type CuisineRequest = { name: string };

function normalize(value: any): CuisineRecord {
  return {
    id: Number(value?.id ?? value?.Id),
    name: String(value?.name ?? value?.Name ?? ""),
    recipeCount: Number(value?.recipeCount ?? value?.RecipeCount ?? 0),
  };
}

// Requires the backend Cuisine entity, controller, and migration to be implemented.
export const cuisineApi = {
  async getAll(): Promise<CuisineRecord[]> {
    return unwrapList<any>(await metadataRequest("cuisines")).map(normalize);
  },
  async getById(id: number): Promise<CuisineRecord> {
    return normalize(unwrapItem<any>(await metadataRequest(`cuisines/${id}`)));
  },
  async create(request: CuisineRequest): Promise<CuisineRecord> {
    return normalize(unwrapItem<any>(await metadataRequest("cuisines", {
      method: "POST", body: JSON.stringify(request),
    })));
  },
  async update(id: number, request: CuisineRequest): Promise<CuisineRecord> {
    const result = await metadataRequest<any>(`cuisines/${id}`, {
      method: "PUT", body: JSON.stringify(request),
    });
    return result == null ? { id, ...request } as CuisineRecord : normalize(unwrapItem<any>(result));
  },
  async delete(id: number): Promise<void> {
    await metadataRequest<void>(`cuisines/${id}`, { method: "DELETE" });
  },
};
