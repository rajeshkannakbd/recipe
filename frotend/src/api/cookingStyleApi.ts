import { metadataRequest, unwrapItem, unwrapList } from "./metadataHttp";

export interface CookingStyleRecord {
  id: number;
  name: string;
  description?: string | null;
  recipeCount?: number;
}

export type CookingStyleRequest = { name: string; description?: string | null };

function normalize(value: any): CookingStyleRecord {
  return {
    id: Number(value?.id ?? value?.Id),
    name: String(value?.name ?? value?.Name ?? ""),
    description: value?.description ?? value?.Description ?? null,
    recipeCount: Number(value?.recipeCount ?? value?.RecipeCount ?? 0),
  };
}

export const cookingStyleApi = {
  async getAll(): Promise<CookingStyleRecord[]> {
    return unwrapList<any>(await metadataRequest("cooking-styles")).map(
      normalize,
    );
  },
  async getById(id: number): Promise<CookingStyleRecord> {
    return normalize(
      unwrapItem<any>(await metadataRequest(`cooking-styles/${id}`)),
    );
  },
  async create(request: CookingStyleRequest): Promise<CookingStyleRecord> {
    return normalize(
      unwrapItem<any>(
        await metadataRequest("cooking-styles", {
          method: "POST",
          body: JSON.stringify(request),
        }),
      ),
    );
  },
  async update(
    id: number,
    request: CookingStyleRequest,
  ): Promise<CookingStyleRecord> {
    const result = await metadataRequest<any>(`cooking-styles/${id}`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
    return result == null
      ? ({ id, ...request } as CookingStyleRecord)
      : normalize(unwrapItem<any>(result));
  },
  async delete(id: number): Promise<void> {
    await metadataRequest<void>(`cooking-styles/${id}`, { method: "DELETE" });
  },
};
