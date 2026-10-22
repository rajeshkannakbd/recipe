import { metadataRequest, unwrapItem, unwrapList } from "./metadataHttp";

export interface RecipeTagRecord {
  id: number;
  name: string;
  recipeCount?: number;
}

export type RecipeTagRequest = { name: string };

function normalize(value: any): RecipeTagRecord {
  return {
    id: Number(value?.id ?? value?.Id),
    name: String(value?.name ?? value?.Name ?? ""),
    recipeCount: Number(value?.recipeCount ?? value?.RecipeCount ?? 0),
  };
}

export const recipeTagApi = {
  async getAll(): Promise<RecipeTagRecord[]> {
    return unwrapList<any>(await metadataRequest("recipe-tags")).map(normalize);
  },
  async getById(id: number): Promise<RecipeTagRecord> {
    return normalize(unwrapItem<any>(await metadataRequest(`recipe-tags/${id}`)));
  },
  async create(request: RecipeTagRequest): Promise<RecipeTagRecord> {
    return normalize(unwrapItem<any>(await metadataRequest("recipe-tags", {
      method: "POST", body: JSON.stringify(request),
    })));
  },
  async update(id: number, request: RecipeTagRequest): Promise<RecipeTagRecord> {
    const result = await metadataRequest<any>(`recipe-tags/${id}`, {
      method: "PUT", body: JSON.stringify(request),
    });
    return result == null ? { id, ...request } as RecipeTagRecord : normalize(unwrapItem<any>(result));
  },
  async delete(id: number): Promise<void> {
    await metadataRequest<void>(`recipe-tags/${id}`, { method: "DELETE" });
  },
};
