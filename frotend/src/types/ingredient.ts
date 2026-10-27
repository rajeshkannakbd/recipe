/** Numeric values must match RecipePro.Api.Models.Enums. */
export enum IngredientType {
  Veg = 1,
  NonVeg = 2,
}

/** Numeric values must match RecipePro.Api.Models.Enums.IngredientStatus. */
export enum IngredientStatus {
  Active = 1,
  Inactive = 2,
}

export const INGREDIENT_STATUS = {
  Active: 1 as const,
  Inactive: 2 as const,
};

export interface IngredientRequest {
  name: string;
  photoUrl: string | null;
  purchasePrice: number | null;
  purchaseQuantity: number | null;
  purchaseUnit: string | null;
  ingredientType: IngredientType;
  gramsPerMilliliter: number | null;
  gramsPerPiece: number | null;
  wastageQuantity: number | null;
  wastageUnit: string | null;
  isCautionRequired: boolean;
  cautionMessage: string | null;
  storageInstructions: string | null;
  shelfLifeDays: number | null;
  brand: string | null;
  notes: string | null;
  status: IngredientStatus;
}

export interface IngredientResponse {
  id: number;
  name: string;
  photoUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
  gramsPerMilliliter?: number | null;
  gramsPerPiece?: number | null;
  purchasePrice?: number | null;
  purchaseQuantity?: number | null;
  purchaseUnit?: string | null;
  ingredientType?: IngredientType | number;
  wastageQuantity?: number | null;
  wastageUnit?: string | null;
  isCautionRequired?: boolean;
  cautionMessage?: string | null;
  storageInstructions?: string | null;
  shelfLifeDays?: number | null;
  brand?: string | null;
  notes?: string | null;
  status: IngredientStatus;
}
