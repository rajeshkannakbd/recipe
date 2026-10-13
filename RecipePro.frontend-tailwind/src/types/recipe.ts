export type RecipeStatus = 1 | 2;

export const RECIPE_STATUS = {
  DRAFT: 1 as RecipeStatus,
  PUBLISHED: 2 as RecipeStatus,
};

export interface RecipeIngredientRequest {
  ingredientId: number;
  quantity: number;
  unit: string;
}

export interface RecipeIngredientResponse {
  ingredientId: number;
  ingredientName: string;
  ingredientPhotoUrl: string;
  quantity: number;
  unit: string;
}

export interface RecipeProcedureRequest {
  stepNumber: number;
  title: string;
  description: string;
}

export interface RecipeProcedureResponse {
  stepNumber: number;
  title: string;
  description: string;
}

export interface RecipeRequest {
  name: string;
  description?: string | null;
  categoryId: number;
  baseServings: number;
  baseCookedWeightGrams: number | null;
  photoUrl: string;
  status: RecipeStatus;
  ingredients: RecipeIngredientRequest[];
  procedures: RecipeProcedureRequest[];
}

export interface RecipeResponse {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  baseServings: number;
  baseCookedWeightGrams: number | null;
  status: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string | null;
  ingredients: RecipeIngredientResponse[];
  procedures: RecipeProcedureResponse[];
}

export interface RecipeCalculationRequest {
  requiredServings: number;
}

export interface CalculatedIngredientResponse {
  ingredientId: number;
  ingredientName: string;
  ingredientPhotoUrl: string;
  baseQuantity: number;
  requiredQuantity: number;
  unit: string;
}

export interface RecipeCalculationResponse {
  recipeId: number;
  recipeName: string;
  baseServings: number;
  requiredServings: number;
  estimatedTotalWeightGrams: number | null;
  isWeightEstimateComplete: boolean;
  ingredients: CalculatedIngredientResponse[];
  baseCookedWeightGrams: number | null;
}
