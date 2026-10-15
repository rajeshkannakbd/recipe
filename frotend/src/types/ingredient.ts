export interface IngredientRequest {
  name: string;
  photoUrl: string;
  purchasePrice: number | null;
  purchaseQuantity: number | null;
  purchaseUnit: string | null;
}

export interface IngredientResponse {
  id: number;
  name: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string | null;
  purchasePrice: number | null;
  purchaseQuantity: number | null;
  purchaseUnit: string | null;
}