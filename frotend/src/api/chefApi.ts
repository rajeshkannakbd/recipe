import { metadataRequest, unwrapItem, unwrapList } from "./metadataHttp";

export interface ChefRecord {
  id: number;
  name: string;
  biography?: string | null;
  photoUrl?: string | null;
  sourceUrl?: string | null;
  recipeCount?: number;
}

export type ChefRequest = {
  name: string;
  biography?: string | null;
  photoUrl?: string | null;
  sourceUrl?: string | null;
};

function normalize(value: any): ChefRecord {
  return {
    id: Number(value?.id ?? value?.Id),
    name: String(value?.name ?? value?.Name ?? ""),
    biography: value?.biography ?? value?.Biography ?? null,
    photoUrl: value?.photoUrl ?? value?.PhotoUrl ?? null,
    sourceUrl: value?.sourceUrl ?? value?.SourceUrl ?? null,
    recipeCount: Number(value?.recipeCount ?? value?.RecipeCount ?? 0),
  };
}

export const chefApi = {
  async getAll(): Promise<ChefRecord[]> {
    return unwrapList<any>(await metadataRequest("chefs")).map(normalize);
  },
  async getById(id: number): Promise<ChefRecord> {
    return normalize(unwrapItem<any>(await metadataRequest(`chefs/${id}`)));
  },
  async create(request: ChefRequest): Promise<ChefRecord> {
    return normalize(
      unwrapItem<any>(
        await metadataRequest("chefs", {
          method: "POST",
          body: JSON.stringify(request),
        }),
      ),
    );
  },
  async update(id: number, request: ChefRequest): Promise<ChefRecord> {
    const result = await metadataRequest<any>(`chefs/${id}`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
    return result == null
      ? ({ id, ...request } as ChefRecord)
      : normalize(unwrapItem<any>(result));
  },
  async delete(id: number): Promise<void> {
    await metadataRequest<void>(`chefs/${id}`, { method: "DELETE" });
  },
};
