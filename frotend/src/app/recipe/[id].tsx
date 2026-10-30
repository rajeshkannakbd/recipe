import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL, get } from "../../api/client";
import { favoriteApi } from "../../api/favoriteApi";
import type {
  FunctionPlanRequest,
  FunctionPlanResponse,
} from "../../api/functionPlanApi";
import { functionPlanApi } from "../../api/functionPlanApi";
import { recipeApi } from "../../api/recipeApi";
import { getAuthToken } from "../../utils/authStorage";

import type {
  RecipeCalculationResponse,
  RecipeResponse,
} from "../../types/recipe";

import AppText from "@/components/common/AppText";
import RecipeDetailSkeleton, {
  SkeletonBlock,
} from "../../components/skeleton/RecipeDetailSkeleton";

const formatEstimatedWeight = (grams: number): string => {
  if (grams >= 1000) {
    return `${Number((grams / 1000).toFixed(2))} kg`;
  }

  return `${Number(grams.toFixed(2))} g`;
};

const formatQuantity = (quantity: number, unit: string): string =>
  `${Number(quantity.toFixed(2))} ${unit}`;

const hasText = (value?: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeUnit = (unit: string): string => unit.trim().toLowerCase();

const quantitiesMatch = (left: number, right: number): boolean =>
  Math.abs(left - right) < 0.000001;

const getReadableErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) return "Please try again.";
  return error.message || "Please try again.";
};

const getUserIdFromToken = (token: string): number | null => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const rawId =
      payload.sub ??
      payload.nameid ??
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      payload.userId ??
      payload.user_id;
    const userId = Number(rawId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
};


/**
 * Only ingredients listed here can be manually edited on the recipe detail screen.
 * Add more ingredient names to this array when needed.
 * Matching ignores letter case and leading/trailing spaces.
 */
const EDITABLE_INGREDIENT_NAMES = [
  "sugar",
  "salt",
  "brown sugar",
  "Red Chili Powder",
  "Cooking Oil",
];

/** Return true only when an ingredient is in the front-end allowlist above. */
const isIngredientEditable = (ingredientName?: string | null): boolean => {
  const normalizedName = (ingredientName ?? "").trim().toLowerCase();
  return EDITABLE_INGREDIENT_NAMES.some(
    (allowedName) => allowedName.toLowerCase() === normalizedName,
  );
};

type RecipeReview = {
  id: number;
  recipeId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type IngredientDatabaseRecord = {
  id?: number;
  name?: string;
  photoUrl?: string | null;
  gramsPerMilliliter?: number | null;
  gramsPerPiece?: number | null;
  purchasePrice?: number | null;
  purchaseQuantity?: number | null;
  purchaseUnit?: string | null;
  ingredientType?: number | string | null;
  brand?: string | null;
  isCautionRequired?: boolean | null;
  cautionMessage?: string | null;
  notes?: string | null;
  shelfLifeDays?: number | null;
  storageInstructions?: string | null;
  wastageQuantity?: number | null;
  wastageUnit?: string | null;
  status?: number | string | null;
};

const normalizeIngredientRecords = (
  payload: unknown,
): IngredientDatabaseRecord[] => {
  let records: unknown = payload;

  if (!Array.isArray(records) && records && typeof records === "object") {
    const wrapped = records as {
      items?: unknown;
      data?: unknown;
      ingredients?: unknown;
      results?: unknown;
    };
    records =
      wrapped.items ??
      wrapped.data ??
      wrapped.ingredients ??
      wrapped.results ??
      [];
  }

  if (!Array.isArray(records)) return [];

  return records.filter(
    (item): item is IngredientDatabaseRecord =>
      item !== null && typeof item === "object",
  );
};

const formatDetailValue = (
  value: string | number | boolean | null | undefined,
  fallback = "Not available",
): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && !value.trim()) return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  return String(value);
};

const formatPurchaseDetails = (
  ingredient: IngredientDatabaseRecord,
): string => {
  if (
    ingredient.purchasePrice == null ||
    ingredient.purchaseQuantity == null ||
    !hasText(ingredient.purchaseUnit)
  ) {
    return "Not available";
  }

  return `₹${Number(ingredient.purchasePrice.toFixed(2))} per ${Number(
    ingredient.purchaseQuantity.toFixed(2),
  )} ${ingredient.purchaseUnit}`;
};

export default function RecipeDetailScreen() {
  const { id, fromFavorites, favoriteId } = useLocalSearchParams<{
    id: string;
    fromFavorites?: string;
    favoriteId?: string;
  }>();

  const router = useRouter();
  // Favorites are snapshots: viewing a saved entry must never mutate its values.
  const isReadOnlyFavorite = fromFavorites === "true" && Boolean(favoriteId);

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [myReview, setMyReview] = useState<RecipeReview | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [showRecipeDetails, setShowRecipeDetails] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [calculation, setCalculation] =
    useState<RecipeCalculationResponse | null>(null);

  const [servings, setServings] = useState<number | null>(null);
  const [servingsInput, setServingsInput] = useState("");
  const [loading, setLoading] = useState(true);

  const [isRecipeAdded, setIsRecipeAdded] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  // Add this recipe to an existing function/event or create a new one.
  const [showAddToEventModal, setShowAddToEventModal] = useState(false);
  const [functionPlans, setFunctionPlans] = useState<FunctionPlanResponse[]>(
    [],
  );
  const [isLoadingFunctionPlans, setIsLoadingFunctionPlans] = useState(false);
  const [isSavingFunctionPlan, setIsSavingFunctionPlan] = useState(false);
  const [requiredServingsInput, setRequiredServingsInput] = useState(
    String(recipe?.baseServings ?? 1),
  );
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  const [customIngredients, setCustomIngredients] = useState<
    Record<number, { quantity: number; unit: string }>
  >({});

  const [editingIngredient, setEditingIngredient] = useState<
    RecipeCalculationResponse["ingredients"][number] | null
  >(null);

  const [editedQuantity, setEditedQuantity] = useState("");
  const [editedUnit, setEditedUnit] = useState("");

  const [showIngredientInfoModal, setShowIngredientInfoModal] = useState(false);
  const [selectedIngredientInfo, setSelectedIngredientInfo] =
    useState<IngredientDatabaseRecord | null>(null);
  const [isLoadingIngredientInfo, setIsLoadingIngredientInfo] = useState(false);

  const [activeTab, setActiveTab] = useState<"ingredients" | "instructions">(
    "ingredients",
  );

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const successOpacity = useState(() => new Animated.Value(0))[0];
  const successScale = useState(() => new Animated.Value(0.85))[0];

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data = await recipeApi.getById(Number(id));

      setRecipe(data);

      // Reviews are returned by a separate endpoint, not by the recipe response.
      let loadedReviews: RecipeReview[] = [];
      try {
        const reviewData = await get<unknown>(`/recipes/${data.id}/reviews`);
        const normalizedReviews: RecipeReview[] = Array.isArray(reviewData)
          ? (reviewData as RecipeReview[])
          : reviewData &&
            typeof reviewData === "object" &&
            Array.isArray((reviewData as { items?: unknown[] }).items)
            ? (reviewData as { items: RecipeReview[] }).items
            : reviewData &&
              typeof reviewData === "object" &&
              Array.isArray((reviewData as { reviews?: unknown[] }).reviews)
              ? (reviewData as { reviews: RecipeReview[] }).reviews
              : [];
        loadedReviews = normalizedReviews;
        setReviews(normalizedReviews);
      } catch (reviewError) {
        console.warn("Could not load recipe reviews:", reviewError);
        loadedReviews = [];
        setReviews([]);
      }

      // Do not call /reviews/mine because the backend currently returns 404.
      // Match the user's review from the public review list using the JWT ID.
      try {
        const token = await getAuthToken();
        const userId = token?.trim() ? getUserIdFromToken(token) : null;
        setMyReview(
          userId == null
            ? null
            : loadedReviews.find((review) => Number(review.userId) === userId) ?? null,
        );
      } catch {
        setMyReview(null);
      }

      const initialServings = data.baseServings;

      setServings(initialServings);
      setServingsInput(String(initialServings));

      let calc = await recipeApi.calculate(data.id, {
        requiredServings: initialServings,
      });
      let loadedServings = initialServings;
      let loadedCustomIngredients: Record<
        number,
        { quantity: number; unit: string }
      > = {};

      setCustomIngredients({});

      if (fromFavorites === "true" && favoriteId) {
        try {
          const selectedFavoriteId = Number(favoriteId);

          if (
            !Number.isInteger(selectedFavoriteId) ||
            selectedFavoriteId <= 0
          ) {
            throw new Error("Invalid favorite entry ID.");
          }

          const saved = await favoriteApi.getCustomized(selectedFavoriteId);

          // Ensure the selected favorite belongs to the recipe being displayed.
          if (saved.recipeId !== data.id) {
            throw new Error("The saved favorite does not match this recipe.");
          }

          loadedServings = saved.requiredServings;
          setServings(saved.requiredServings);
          setServingsInput(String(saved.requiredServings));

          calc = await recipeApi.calculate(data.id, {
            requiredServings: saved.requiredServings,
          });

          const savedIngredients: Record<
            number,
            { quantity: number; unit: string }
          > = {};

          saved.ingredients.forEach((ingredient) => {
            savedIngredients[ingredient.ingredientId] = {
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            };
          });

          loadedCustomIngredients = savedIngredients;
          setCustomIngredients(savedIngredients);
        } catch (error) {
          console.error("Failed to load saved recipe customization:", error);

          Alert.alert(
            "Customization unavailable",
            error instanceof Error
              ? error.message
              : "The saved quantities could not be loaded.",
          );
        }
      }

      setCalculation(calc);

      // A filled heart means this exact serving + ingredient customization is
      // saved, not merely that another version of the recipe is a favorite.
      try {
        const token = await getAuthToken();
        if (!token?.trim()) {
          setIsRecipeAdded(false);
        } else {
          const favoriteEntries = await favoriteApi.getMyFavorites();
          const currentIngredients = calc.ingredients.map((ingredient) => ({
            ingredientId: ingredient.ingredientId,
            quantity:
              loadedCustomIngredients[ingredient.ingredientId]?.quantity ??
              ingredient.requiredQuantity,
            unit:
              loadedCustomIngredients[ingredient.ingredientId]?.unit ?? ingredient.unit,
          }));

          let exactMatchFound = false;
          for (const entry of favoriteEntries) {
            if (
              entry.recipeId !== data.id ||
              entry.requiredServings !== loadedServings
            ) {
              continue;
            }

            try {
              const saved = await favoriteApi.getCustomized(entry.favoriteId);
              if (saved.recipeId !== data.id || saved.requiredServings !== loadedServings) {
                continue;
              }

              const savedByIngredient = new Map(
                saved.ingredients.map((ingredient) => [
                  ingredient.ingredientId,
                  ingredient,
                ]),
              );
              if (
                currentIngredients.length === saved.ingredients.length &&
                currentIngredients.every((ingredient) => {
                  const stored = savedByIngredient.get(ingredient.ingredientId);
                  return Boolean(
                    stored &&
                    quantitiesMatch(stored.quantity, ingredient.quantity) &&
                    normalizeUnit(stored.unit) === normalizeUnit(ingredient.unit),
                  );
                })
              ) {
                exactMatchFound = true;
                break;
              }
            } catch {
              // Basic favorites have no saved customization; ignore them here.
            }
          }
          setIsRecipeAdded(exactMatchFound);
        }
      } catch {
        // Favorite status is optional UI state. Do not log expected auth/API errors.
        setIsRecipeAdded(false);
      }
    } catch (error) {
      console.error("Failed to load recipe:", error);
    } finally {
      setLoading(false);
    }
  }, [id, fromFavorites, favoriteId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentServings = servings ?? recipe?.baseServings ?? 1;

  // Estimate cooking time proportionally to the serving scale.
  // Preparation time stays fixed because it usually does not scale directly
  // with the number of servings.
  // Scale cooking time according to the selected servings.
  // Preparation time is not included.
  const baseServingsForTime = Math.max(1, recipe?.baseServings ?? 1);

  const scaledCookingTimeMinutes =
    recipe?.cookingTimeMinutes == null
      ? null
      : Math.ceil(
        (recipe.cookingTimeMinutes * currentServings) /
        baseServingsForTime,
      );

  const handleServingsChange = async (delta: number) => {
    if (!recipe || isReadOnlyFavorite) return;

    const newServings = Math.max(1, currentServings + delta);

    setServings(newServings);
    setServingsInput(String(newServings));
    setIsRecipeAdded(false);

    try {
      const calc = await recipeApi.calculate(recipe.id, {
        requiredServings: newServings,
      });

      setCalculation(calc);
    } catch (error) {
      console.error("Failed to scale recipe:", error);
    }
  };

  const handleServingsInputChange = (value: string) => {
    if (isReadOnlyFavorite) return;
    if (!/^\d*$/.test(value)) return;

    if (value === "") {
      setServingsInput("");
      return;
    }

    const numericValue = Number(value);

    if (
      !Number.isInteger(numericValue) ||
      numericValue < 1 ||
      numericValue > 2147483647
    ) {
      return;
    }

    setServingsInput(value);
  };

  const handleServingsInputBlur = async () => {
    if (!recipe || isReadOnlyFavorite) return;

    const numericValue = Number(servingsInput);

    if (
      servingsInput === "" ||
      !Number.isInteger(numericValue) ||
      numericValue < 1 ||
      numericValue > 2147483647
    ) {
      setServingsInput(String(currentServings));
      return;
    }

    setServings(numericValue);
    setIsRecipeAdded(false);

    try {
      const calc = await recipeApi.calculate(recipe.id, {
        requiredServings: numericValue,
      });

      setCalculation(calc);
    } catch (error) {
      console.error("Failed to scale recipe:", error);
      setServingsInput(String(currentServings));
    }
  };

  const openIngredientInfo = async (
    ingredientId: number,
    ingredientName: string,
    ingredientPhotoUrl?: string | null,
  ) => {
    setSelectedIngredientInfo({
      id: ingredientId,
      name: ingredientName,
      photoUrl: ingredientPhotoUrl ?? null,
    });
    setShowIngredientInfoModal(true);
    setIsLoadingIngredientInfo(true);

    try {
      const response = await get<unknown>("/ingredients");
      const records = normalizeIngredientRecords(response);
      const normalizedName = ingredientName.trim().toLowerCase();
      const matchedIngredient =
        records.find((item) => Number(item.id) === ingredientId) ??
        records.find(
          (item) => (item.name ?? "").trim().toLowerCase() === normalizedName,
        );

      if (matchedIngredient) {
        setSelectedIngredientInfo({
          ...matchedIngredient,
          id: matchedIngredient.id ?? ingredientId,
          name: matchedIngredient.name ?? ingredientName,
          photoUrl:
            matchedIngredient.photoUrl ?? ingredientPhotoUrl ?? null,
        });
      }
    } catch (error) {
      console.warn("Could not load ingredient details:", error);
    } finally {
      setIsLoadingIngredientInfo(false);
    }
  };

  const openIngredientEditor = (
    ingredient: RecipeCalculationResponse["ingredients"][number],
  ) => {
    if (isReadOnlyFavorite) return;
    const customized = customIngredients[ingredient.ingredientId];

    setEditingIngredient(ingredient);

    setEditedQuantity(
      String(customized?.quantity ?? ingredient.requiredQuantity),
    );

    setEditedUnit(customized?.unit ?? ingredient.unit);
  };

  const saveIngredientEdit = () => {
    if (!editingIngredient) return;

    const quantity = Number(editedQuantity);
    const unit = editedUnit.trim();

    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert("Invalid quantity", "Enter a quantity greater than zero.");
      return;
    }

    if (!unit) {
      Alert.alert("Unit required", "Please enter the ingredient unit.");
      return;
    }

    // Save the edited ingredient without opening a native confirmation alert.
    applyIngredientEdit(false, quantity, unit);
  };

  const applyIngredientEdit = (
    scaleAll: boolean,
    quantity: number,
    unit: string,
  ) => {
    if (!editingIngredient || !calculation) return;

    const originalQuantity =
      customIngredients[editingIngredient.ingredientId]?.quantity ??
      editingIngredient.requiredQuantity;

    setIsRecipeAdded(false);
    setCustomIngredients((current) => {
      if (!scaleAll || originalQuantity === 0) {
        return {
          ...current,
          [editingIngredient.ingredientId]: { quantity, unit },
        };
      }

      const ratio = quantity / originalQuantity;
      const next = { ...current };

      calculation.ingredients.forEach((ingredient) => {
        const currentQuantity =
          current[ingredient.ingredientId]?.quantity ??
          ingredient.requiredQuantity;

        const currentUnit =
          current[ingredient.ingredientId]?.unit ?? ingredient.unit;

        next[ingredient.ingredientId] = {
          quantity: currentQuantity * ratio,
          unit:
            ingredient.ingredientId === editingIngredient.ingredientId
              ? unit
              : currentUnit,
        };
      });

      return next;
    });

    setEditingIngredient(null);
  };

  // The fixed header heart replaces the former Add to My Favorites button.
  // It uses the same customized-favorites API and saves current quantities.
  const handleToggleFavorite = async () => {
    if (!recipe || !calculation || isSavingFavorite || isReadOnlyFavorite) return;

    setIsSavingFavorite(true);

    try {
      const token = await getAuthToken();

      if (!token || !token.trim()) {
        Alert.alert(
          "Login Required",
          "Please log in to save this recipe to your favorites.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log In",
              onPress: () => {
                router.push({
                  pathname: "/login",
                  params: {
                    redirectTo: `/recipe/${recipe.id}`,
                  },
                });
              },
            },
          ],
        );

        return;
      }

      await favoriteApi.saveCustomized(recipe.id, {
        requiredServings: currentServings,
        ingredients: calculation.ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          quantity:
            customIngredients[ingredient.ingredientId]?.quantity ??
            ingredient.requiredQuantity,
          unit:
            customIngredients[ingredient.ingredientId]?.unit ?? ingredient.unit,
        })),
      });

      setIsRecipeAdded(true);

      // Show the existing success popup.
      setShowSuccessPopup(true);
      successOpacity.setValue(0);
      successScale.setValue(0.85);

      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      // Let the popup display before returning to My Favorites.
      setTimeout(() => {
        router.back();
      }, 1500);

      return;
    } catch (error) {
      const message = getReadableErrorMessage(error);
      const normalizedMessage = message.toLowerCase();

      if (
        message.includes("401") ||
        normalizedMessage.includes("unauthorized")
      ) {
        Alert.alert(
          "Login Required",
          "Your login session may have expired. Please log in again.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log In",
              onPress: () => {
                router.push({
                  pathname: "/login",
                  params: {
                    redirectTo: `/recipe/${recipe.id}`,
                  },
                });
              },
            },
          ],
        );
      } else if (
        message.includes("409") ||
        normalizedMessage.includes("conflict") ||
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("already been saved") ||
        normalizedMessage.includes("duplicate")
      ) {
        Alert.alert(
          "Already in My Favorites",
          "This exact recipe customization (servings and ingredient quantities) is already saved. Open My Favorites to view it, or change the servings or ingredient quantities before saving another version.",
          [{ text: "OK", style: "default" }],
        );
      } else {
        Alert.alert(
          "Could Not Save Favorite",
          message || "Unable to save this recipe. Please try again.",
          [{ text: "OK", style: "default" }],
        );
      }
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const openAddToEvent = async () => {
    const token = await getAuthToken();
    if (!token || !token.trim()) {
      Alert.alert(
        "Login Required",
        "Please log in to add recipes to an event.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log In",
            onPress: () =>
              router.push({
                pathname: "/login",
                params: { redirectTo: `/recipe/${recipe?.id}` },
              }),
          },
        ],
      );
      return;
    }

    setRequiredServingsInput(String(currentServings));
    setShowCreateEventForm(false);
    setNewEventName("");
    setShowAddToEventModal(true);
    setIsLoadingFunctionPlans(true);
    try {
      const plans = await functionPlanApi.getAll();
      setFunctionPlans(Array.isArray(plans) ? plans : []);
    } catch (error) {
      console.error("Failed to load events:", error);
      Alert.alert(
        "Could not load events",
        error instanceof Error ? error.message : "Please try again.",
      );
      setFunctionPlans([]);
    } finally {
      setIsLoadingFunctionPlans(false);
    }
  };

  const getValidatedRequiredServings = () => {
    const value = Number(requiredServingsInput.trim());
    if (!Number.isInteger(value) || value < 1 || value > 2147483647) {
      Alert.alert(
        "Invalid servings",
        "Enter a whole number of servings greater than zero.",
      );
      return null;
    }
    return value;
  };

  const addRecipeToExistingEvent = async (plan: FunctionPlanResponse) => {
    if (!recipe || isSavingFunctionPlan) return;
    const requiredServings = getValidatedRequiredServings();
    if (requiredServings === null) return;

    const existingRecipe = plan.recipes?.find(
      (item) => item.recipeId === recipe.id,
    );
    if (existingRecipe) {
      Alert.alert(
        "Recipe already added",
        `${recipe.name} is already in “${plan.name}”.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update servings",
            onPress: async () => {
              setIsSavingFunctionPlan(true);
              try {
                const request: FunctionPlanRequest = {
                  name: plan.name,
                  eventDate: plan.eventDate ?? null,
                  notes: plan.notes ?? null,
                  recipes: plan.recipes.map((item) => ({
                    recipeId: item.recipeId,
                    requiredServings:
                      item.recipeId === recipe.id
                        ? requiredServings
                        : item.requiredServings,
                  })),
                };
                await functionPlanApi.update(plan.id, request);
                setShowAddToEventModal(false);
                Alert.alert(
                  "Event updated",
                  `${recipe.name} servings updated in “${plan.name}”.`,
                );
              } catch (error) {
                Alert.alert(
                  "Could not update event",
                  error instanceof Error ? error.message : "Please try again.",
                );
              } finally {
                setIsSavingFunctionPlan(false);
              }
            },
          },
        ],
      );
      return;
    }

    setIsSavingFunctionPlan(true);
    try {
      const request: FunctionPlanRequest = {
        name: plan.name,
        eventDate: plan.eventDate ?? null,
        notes: plan.notes ?? null,
        recipes: [
          ...(plan.recipes ?? []).map((item) => ({
            recipeId: item.recipeId,
            requiredServings: item.requiredServings,
          })),
          { recipeId: recipe.id, requiredServings },
        ],
      };
      await functionPlanApi.update(plan.id, request);
      setShowAddToEventModal(false);
      Alert.alert(
        "Added to event",
        `${recipe.name} was added to “${plan.name}” for ${requiredServings} servings.`,
      );
    } catch (error) {
      console.error("Failed to add recipe to event:", error);
      Alert.alert(
        "Could not add recipe",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSavingFunctionPlan(false);
    }
  };

  const createEventWithRecipe = async () => {
    if (!recipe || isSavingFunctionPlan) return;
    const name = newEventName.trim();
    if (name.length < 2) {
      Alert.alert(
        "Event name required",
        "Enter an event name with at least 2 characters.",
      );
      return;
    }
    const requiredServings = getValidatedRequiredServings();
    if (requiredServings === null) return;

    setIsSavingFunctionPlan(true);
    try {
      await functionPlanApi.create({
        name,
        eventDate: null,
        notes: null,
        recipes: [{ recipeId: recipe.id, requiredServings }],
      });
      setShowAddToEventModal(false);
      Alert.alert(
        "Event created",
        `Created “${name}” with ${recipe.name} for ${requiredServings} servings.`,
      );
    } catch (error) {
      console.error("Failed to create event:", error);
      Alert.alert(
        "Could not create event",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSavingFunctionPlan(false);
    }
  };

  const openReviewForm = () => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment ?? "");
      setIsEditingReview(true);
    } else {
      setReviewRating(5);
      setReviewComment("");
      setIsEditingReview(false);
    }

    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!recipe || isSubmittingReview) return;

    try {
      const token = await getAuthToken();

      if (!token || !token.trim()) {
        setShowReviewModal(false);
        Alert.alert(
          "Login required",
          "Please log in to leave or edit a review.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log in",
              onPress: () =>
                router.push({
                  pathname: "/login",
                  params: { redirectTo: `/recipe/${recipe.id}` },
                }),
            },
          ],
        );
        return;
      }

      setIsSubmittingReview(true);

      const editing = isEditingReview && myReview !== null;
      const url = editing
        ? `${API_BASE_URL}/recipes/${recipe.id}/reviews/${myReview.id}`
        : `${API_BASE_URL}/recipes/${recipe.id}/reviews`;

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ??
          `Could not ${editing ? "update" : "submit"} review (${response.status}).`,
        );
      }

      const savedReview = responseData as RecipeReview;
      setMyReview(savedReview);
      setReviews((current) => {
        const alreadyInList = current.some(
          (item) => item.id === savedReview.id,
        );

        if (alreadyInList) {
          return current.map((item) =>
            item.id === savedReview.id ? savedReview : item,
          );
        }

        return [savedReview, ...current];
      });

      setShowReviewModal(false);
      setIsEditingReview(false);

      Alert.alert(
        editing ? "Review updated" : "Thank you!",
        editing
          ? "Your review has been updated successfully."
          : "Your review has been added successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Unable to save review", message);
    } finally {
      setIsSubmittingReview(false);
    }
  };


  if (loading || !recipe || !calculation) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right"]}
      >
        {/* Fixed header remains visible */}
        <View style={styles.fixedHeader}>
          <BlurView
            intensity={Platform.OS === "ios" ? 75 : 45}
            tint="light"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          <View style={styles.headerTint} />

          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/categories");
              }
            }}
            style={styles.headerIconButton}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={23} color="#17231E" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <SkeletonBlock style={{ width: 120, height: 16 }} />
          </View>

          <View style={styles.headerIconButton}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#1F7655"
            />
          </View>

          <View style={styles.headerIconButton}>
            <Ionicons
              name="heart-outline"
              size={23}
              color="#68736D"
            />
          </View>
        </View>

        <RecipeDetailSkeleton />
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* FIXED TRANSPARENT BLURRED HEADER */}
      <View style={styles.fixedHeader}>
        <BlurView
          intensity={Platform.OS === "ios" ? 75 : 45}
          tint="light"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const}
        />

        <View style={styles.headerTint} />
        <View pointerEvents="none" style={styles.headerFadeTop} />
        <View pointerEvents="none" style={styles.headerFadeMiddle} />
        <View pointerEvents="none" style={styles.headerFadeBottom} />

        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/categories");
            }
          }}
          style={styles.headerIconButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={23} color="#17231E" />
        </Pressable>

        <AppText style={styles.headerRecipeName} numberOfLines={1}>
          {recipe.name}
        </AppText>

        <Pressable
          onPress={openAddToEvent}
          style={[styles.headerIconButton, styles.addToEventHeaderButton]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add recipe to event"
        >
          <Ionicons name="calendar-outline" size={20} color="#1F7655" />
        </Pressable>

        <Pressable
          onPress={handleToggleFavorite}
          disabled={isSavingFavorite || isReadOnlyFavorite}
          style={[styles.headerIconButton, isReadOnlyFavorite && { opacity: 1 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            isReadOnlyFavorite ? "Saved favorite, editing disabled" : isRecipeAdded ? "Saved to favorites" : "Add to favorites"
          }
        >
          <Ionicons
            name={isSavingFavorite && !isReadOnlyFavorite ? "hourglass-outline" : (isRecipeAdded || isReadOnlyFavorite) ? "heart" : "heart-outline"}
            size={23}
            color={(isRecipeAdded || isReadOnlyFavorite) ? "#1F7655" : "#68736D"}
          />
        </Pressable>
      </View>

      {/* MAIN SCROLL: PHOTO AND RECIPE CONTENT SCROLL; STICKY CONTROLS STOP BELOW HEADER */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {/* RECIPE PHOTO */}
        <View style={styles.heroImage}>
          {recipe.photoUrl ? (
            <Image
              source={{ uri: recipe.photoUrl }}
              style={styles.heroImageActual}
              resizeMode="cover"
              onError={(error) =>
                console.log(
                  "RECIPE DETAIL IMAGE ERROR:",
                  recipe.name,
                  recipe.photoUrl,
                  error.nativeEvent,
                )
              }
            />
          ) : (
            <AppText style={styles.heroEmoji}>{recipe.name.charAt(0)}</AppText>
          )}
        </View>

        {/* COMPACT RECIPE INTRO: keep scaling close to the top */}
        <View style={styles.recipeOverview}>
          <View style={styles.recipeHeadingRow}>
            <View style={styles.recipeHeadingText}>
              <AppText style={styles.recipeTitle}>{recipe.name}</AppText>
              {hasText(recipe.description) ? (
                <AppText style={styles.recipeDescription} numberOfLines={3}>
                  {recipe.description}
                </AppText>
              ) : null}
            </View>
            <Pressable
              style={styles.recipeInfoButton}
              onPress={() => setShowRecipeDetails(true)}
              accessibilityRole="button"
              accessibilityLabel="Show recipe details and reviews"
              hitSlop={8}
            >
              <Ionicons name="information" size={19} color="#1F7655" />
            </Pressable>
          </View>

          <View style={styles.quickMetaRow}>
            {hasText(recipe.categoryName) ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="grid-outline" size={14} color="#1F7655" />
                <AppText style={styles.quickMetaText}>{recipe.categoryName}</AppText>
              </View>
            ) : null}
            {hasText(recipe.mealType) ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="restaurant-outline" size={14} color="#1F7655" />
                <AppText style={styles.quickMetaText}>{recipe.mealType}</AppText>
              </View>
            ) : null}
            {recipe.cookingTimeMinutes != null ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="time-outline" size={14} color="#1F7655" />
                <AppText style={styles.quickMetaText}>
                  {scaledCookingTimeMinutes} min cooking
                </AppText>
              </View>
            ) : null}
            <View style={styles.quickMetaItem}>
              <Ionicons name="star" size={14} color="#E6A23C" />
              <AppText style={styles.quickMetaText}>
                {reviews.length
                  ? (
                    reviews.reduce(
                      (sum, review) => sum + (Number(review.rating) || 0),
                      0,
                    ) / reviews.length
                  ).toFixed(1)
                  : "New"}
                {reviews.length
                  ? ` · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                  : ""}
              </AppText>
            </View>
          </View>

          <Pressable
            style={styles.writeReviewInline}
            onPress={openReviewForm}
            accessibilityRole="button"
            accessibilityLabel={
              myReview ? "Edit your recipe review" : "Write a recipe review"
            }
          >
            <Ionicons
              name={myReview ? "create-outline" : "star-outline"}
              size={16}
              color="#1F7655"
            />
            <AppText style={styles.writeReviewInlineText}>
              {myReview ? "Edit your review" : "Write a review"}
            </AppText>
          </Pressable>

          {(recipe.tags?.filter((tag) => hasText(tag.name)).length ?? 0) > 0 ? (
            <View style={styles.tagList}>
              {(showAllTags
                ? recipe.tags!.filter((tag) => hasText(tag.name))
                : recipe.tags!.filter((tag) => hasText(tag.name)).slice(0, 3)
              ).map((tag) => (
                <View key={tag.id} style={styles.tagChip}>
                  <AppText style={styles.tagChipText}>{tag.name}</AppText>
                </View>
              ))}
              {(recipe.tags?.filter((tag) => hasText(tag.name)).length ?? 0) >
                3 ? (
                <Pressable
                  onPress={() => setShowAllTags((current) => !current)}
                  style={styles.moreTagsButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAllTags ? "Show fewer tags" : "Show all tags"
                  }
                  hitSlop={6}
                >
                  <AppText style={styles.moreTagsText}>
                    {showAllTags
                      ? "Show less"
                      : `+${recipe.tags!.filter((tag) => hasText(tag.name)).length - 3} more`}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* STICKY SECTION: SCALING + TABS + SECTION TITLE */}
        <View style={styles.stickyControls}>
          <View style={styles.scalingCard}>
            <View style={styles.scalingHeading}>
              <View style={styles.scalingTextContainer}>
                <AppText style={styles.scalingTitle}>Scaling</AppText>
                <AppText style={styles.scalingSubtitle}>
                  {isReadOnlyFavorite ? "Saved customization · editing disabled" : "Set servings and quantities"}
                </AppText>
              </View>
            </View>

            <View style={styles.servingButtons}>
              <Pressable
                onPress={() => handleServingsChange(-1)}
                style={[
                  styles.servingBtn, isReadOnlyFavorite && styles.servingBtnDisabled
                ]}
                disabled={isReadOnlyFavorite || currentServings <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={currentServings <= 1 ? "#C5C9C4" : "#FFFFFF"}
                />
              </Pressable>

              <TextInput
                value={servingsInput}
                onChangeText={handleServingsInputChange}
                onBlur={handleServingsInputBlur}
                keyboardType="numeric"
                inputMode="numeric"
                autoCorrect={false}
                spellCheck={false}
                maxLength={10}
                style={styles.servingCount}
                textAlign="center"
                underlineColorAndroid="transparent"
                selectTextOnFocus
                editable={!isReadOnlyFavorite}
              />

              <Pressable
                onPress={() => handleServingsChange(1)}
                style={[styles.servingBtn, isReadOnlyFavorite && styles.servingBtnDisabled]}
                disabled={isReadOnlyFavorite}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabContainer}>
            {(["ingredients", "instructions"] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <AppText
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </AppText>
              </Pressable>
            ))}
          </View>

          {activeTab === "ingredients" ? (
            <View style={styles.scaledTitleRow}>
              <AppText style={styles.scaledTitle}>
                Scaled Ingredients ({currentServings} servings)
              </AppText>
            </View>
          ) : (
            <AppText style={styles.scaledTitle}>Instructions</AppText>
          )}
        </View>

        {/* ACTIVE CONTENT SCROLLS UNDER THE STICKY CONTROLS */}
        {activeTab === "ingredients" ? (
          <View style={styles.ingredientsContent}>
            {calculation.ingredients.map((ingredient, index) => {
              const originalIngredient = recipe.ingredients.find(
                (item) => item.ingredientId === ingredient.ingredientId,
              );
              const ingredientImageUrl = originalIngredient?.ingredientPhotoUrl;
              const customized = customIngredients[ingredient.ingredientId];
              const priceSource = (
                ingredient as typeof ingredient & {
                  priceSource?: string | null;
                }
              ).priceSource;

              const canEditIngredient = !isReadOnlyFavorite && isIngredientEditable(
                ingredient.ingredientName,
              );

              return (
                <View
                  key={ingredient.ingredientId}
                  style={[
                    styles.ingredientRow,
                    index === calculation.ingredients.length - 1 &&
                    styles.lastIngredientRow,
                    !canEditIngredient && styles.ingredientRowNotEditable,
                  ]}
                >
                  <Pressable
                    style={styles.ingredientIcon}
                    onPress={() => openIngredientEditor(ingredient)}
                    disabled={!canEditIngredient}
                    accessibilityRole={canEditIngredient ? "button" : undefined}
                    accessibilityLabel={`Edit ${ingredient.ingredientName} quantity`}
                  >
                    {ingredientImageUrl ? (
                      <Image
                        source={{ uri: ingredientImageUrl }}
                        style={styles.ingredientImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <AppText style={styles.ingredientEmoji}>
                        {ingredient.ingredientName === "Basmati Rice"
                          ? "🌾"
                          : ingredient.ingredientName === "Chicken"
                            ? "🍗"
                            : ingredient.ingredientName === "Onion"
                              ? "🧅"
                              : ingredient.ingredientName === "Tomato"
                                ? "🍅"
                                : ingredient.ingredientName === "Paneer"
                                  ? "🧀"
                                  : "🥘"}
                      </AppText>
                    )}
                  </Pressable>

                  <View style={styles.ingredientInfo}>
                    <View style={styles.ingredientNameRow}>
                      <Pressable
                        onPress={() => openIngredientEditor(ingredient)}
                        disabled={!canEditIngredient}
                        accessibilityRole={canEditIngredient ? "button" : undefined}
                        accessibilityLabel={`Edit ${ingredient.ingredientName} quantity`}
                        style={styles.ingredientNamePressable}
                      >
                        <AppText style={styles.ingredientName} numberOfLines={2}>
                          {ingredient.ingredientName}
                        </AppText>
                      </Pressable>
                      <Pressable
                        style={styles.ingredientInfoButton}
                        onPress={() =>
                          void openIngredientInfo(
                            ingredient.ingredientId,
                            ingredient.ingredientName,
                            ingredientImageUrl,
                          )
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Show details for ${ingredient.ingredientName}`}
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={16}
                          color="#1F7655"
                        />
                      </Pressable>
                      {canEditIngredient ? (
                        <View
                          style={styles.ingredientEditMark}
                          accessible
                          accessibilityLabel="Editable ingredient"
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color="#1F7655"
                          />
                        </View>
                      ) : null}
                    </View>
                    <AppText style={styles.ingredientBase}>
                      Wastage:{" "}
                      {ingredient.wastageQuantity != null &&
                        hasText(ingredient.wastageUnit)
                        ? `${Number(ingredient.wastageQuantity.toFixed(2))} ${ingredient.wastageUnit}`
                        : "Not specified"}
                    </AppText>
                  </View>

                  <Pressable
                    style={styles.ingredientQuantityContainer}
                    onPress={() => openIngredientEditor(ingredient)}
                    disabled={!canEditIngredient}
                    accessibilityRole={canEditIngredient ? "button" : undefined}
                    accessibilityLabel={`Edit ${ingredient.ingredientName} quantity`}
                  >
                    <AppText style={styles.ingredientQuantity}>
                      {formatQuantity(
                        customized?.quantity ?? ingredient.requiredQuantity,
                        customized?.unit ?? ingredient.unit,
                      )}
                    </AppText>
                    {ingredient.estimatedCost != null &&
                      Number.isFinite(ingredient.estimatedCost) ? (
                      <View style={styles.ingredientPriceWrap}>
                        <AppText style={styles.ingredientPrice}>
                          ₹{ingredient.estimatedCost.toFixed(2)}
                        </AppText>
                        {priceSource === "GovernmentApi" ||
                          priceSource === "Govt" ||
                          priceSource === "Government" ? (
                          <View
                            style={[
                              styles.priceSourceDot,
                              styles.priceSourceDotGovt,
                            ]}
                          />
                        ) : priceSource === "Admin" ||
                          priceSource === "Manual" ? (
                          <View
                            style={[
                              styles.priceSourceDot,
                              styles.priceSourceDotManual,
                            ]}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
            <View style={styles.ingredientLegendFooter}>
              <View style={styles.ingredientLegendTitleRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color="#68736D"
                />
                <AppText style={styles.ingredientLegendTitle}>
                  Ingredient guide
                </AppText>
              </View>

              <View style={styles.ingredientLegendItems}>
                <View style={styles.ingredientLegendItem}>
                  <Ionicons name="create-outline" size={14} color="#1F7655" />
                  <AppText style={styles.ingredientLegendText}>
                    Editable ingredient
                  </AppText>
                </View>
                <View style={styles.ingredientLegendItem}>
                  <View
                    style={[styles.priceSourceDot, styles.priceSourceDotManual]}
                  />
                  <AppText style={styles.ingredientLegendText}>Manual price</AppText>
                </View>
                <View style={styles.ingredientLegendItem}>
                  <View
                    style={[styles.priceSourceDot, styles.priceSourceDotGovt]}
                  />
                  <AppText style={styles.ingredientLegendText}>Govt. price</AppText>
                </View>
              </View>
              <View>
                <AppText variant="mutedText">Note: All quantities, costs, cooking times, and wastage are estimates</AppText>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.instructionsContent}>
            {recipe.procedures.map((step) => (
              <View key={step.stepNumber} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <AppText style={styles.stepNumberText}>{step.stepNumber}</AppText>
                </View>
                <View style={styles.instructionTextWrap}>
                  {hasText(step.title) ? (
                    <AppText style={styles.stepTitle}>{step.title}</AppText>
                  ) : null}
                  {hasText(step.description) ? (
                    <AppText style={styles.stepDescription}>
                      {step.description}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ADD TO EVENT MODAL */}
      <Modal
        visible={showAddToEventModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddToEventModal(false)}
      >
        <View style={styles.eventModalOverlay}>
          <KeyboardAvoidingView
            style={styles.keyboardModalView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.keyboardModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.eventModal}>
                <View style={styles.eventModalHeader}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.eventModalTitle}>Add to Event</AppText>
                    <AppText style={styles.eventModalSubtitle} numberOfLines={2}>
                      {recipe.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setShowAddToEventModal(false)}
                    style={styles.eventModalClose}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={22} color="#34423A" />
                  </Pressable>
                </View>

                <AppText style={styles.eventFieldLabel}>Required servings</AppText>
                <TextInput
                  value={requiredServingsInput}
                  onChangeText={(value) => {
                    if (/^\d*$/.test(value)) setRequiredServingsInput(value);
                  }}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="Enter servings"
                  style={styles.eventTextInput}
                  selectTextOnFocus
                />
                <AppText style={styles.eventHelperText}>
                  Choose how many people this recipe should serve for this event.
                </AppText>

                <Pressable
                  style={styles.createEventToggle}
                  onPress={() => setShowCreateEventForm((current) => !current)}
                >
                  <Ionicons
                    name={
                      showCreateEventForm
                        ? "remove-circle-outline"
                        : "add-circle-outline"
                    }
                    size={20}
                    color="#1F7655"
                  />
                  <AppText style={styles.createEventToggleText}>
                    {showCreateEventForm
                      ? "Choose an existing event"
                      : "Create a new event"}
                  </AppText>
                </Pressable>

                {showCreateEventForm ? (
                  <View style={styles.createEventForm}>
                    <AppText style={styles.eventFieldLabel}>Event name</AppText>
                    <TextInput
                      value={newEventName}
                      onChangeText={setNewEventName}
                      placeholder="e.g. Family function"
                      maxLength={150}
                      style={styles.eventTextInput}
                      returnKeyType="done"
                    />
                    <AppText style={styles.eventHelperText}>
                      You can add the event date and notes later in Function
                      Planner.
                    </AppText>
                    <Pressable
                      style={[
                        styles.eventPrimaryButton,
                        isSavingFunctionPlan && styles.eventButtonDisabled,
                      ]}
                      onPress={createEventWithRecipe}
                      disabled={isSavingFunctionPlan}
                    >
                      <AppText style={styles.eventPrimaryButtonText}>
                        {isSavingFunctionPlan
                          ? "Saving…"
                          : "Create event and add recipe"}
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <AppText style={styles.eventListTitle}>Your events</AppText>
                    {isLoadingFunctionPlans ? (
                      <View style={styles.eventLoadingRow}>
                        <AppText style={styles.eventEmptyText}>Loading events…</AppText>
                      </View>
                    ) : functionPlans.length === 0 ? (
                      <View style={styles.eventEmptyBox}>
                        <Ionicons
                          name="calendar-clear-outline"
                          size={28}
                          color="#8A938E"
                        />
                        <AppText style={styles.eventEmptyText}>
                          You don't have any events yet.
                        </AppText>
                        <AppText style={styles.eventEmptyHint}>
                          Create one above to start planning.
                        </AppText>
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.eventList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {functionPlans.map((plan) => {
                          const alreadyAdded =
                            plan.recipes?.some(
                              (item) => item.recipeId === recipe.id,
                            ) ?? false;
                          return (
                            <Pressable
                              key={plan.id}
                              style={styles.eventListItem}
                              onPress={() => addRecipeToExistingEvent(plan)}
                              disabled={isSavingFunctionPlan}
                            >
                              <View style={styles.eventListIcon}>
                                <Ionicons
                                  name="calendar-outline"
                                  size={19}
                                  color="#1F7655"
                                />
                              </View>
                              <View style={styles.eventListTextWrap}>
                                <AppText
                                  style={styles.eventListName}
                                  numberOfLines={1}
                                >
                                  {plan.name}
                                </AppText>
                                <AppText
                                  style={styles.eventListMeta}
                                  numberOfLines={1}
                                >
                                  {plan.recipes?.length ?? 0} recipe
                                  {(plan.recipes?.length ?? 0) === 1 ? "" : "s"}
                                  {plan.eventDate
                                    ? ` · ${new Date(plan.eventDate).toLocaleDateString()}`
                                    : ""}
                                </AppText>
                              </View>
                              {alreadyAdded ? (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={21}
                                  color="#1F7655"
                                />
                              ) : (
                                <Ionicons
                                  name="chevron-forward"
                                  size={19}
                                  color="#8A938E"
                                />
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </>
                )}
                {isSavingFunctionPlan ? (
                  <AppText style={styles.eventSavingText}>Saving event…</AppText>
                ) : null}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* RECIPE DETAILS MODAL: opened from the info button beside the recipe name */}
      <Modal
        visible={showRecipeDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecipeDetails(false)}
      >
        <View style={styles.recipeDetailsModalOverlay}>
          <View style={styles.recipeDetailsModal}>
            <View style={styles.recipeDetailsModalHeader}>
              <View style={styles.detailsAccordionHeading}>
                <AppText style={styles.detailsAccordionTitle}>
                  Recipe details & reviews
                </AppText>
                <AppText style={styles.detailsAccordionSubtitle}>
                  {[
                    hasText(recipe.cuisine) ? recipe.cuisine : null,
                    hasText(recipe.chefName) ? recipe.chefName : null,
                    `${reviews.length} review${reviews.length === 1 ? "" : "s"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </View>
              <Pressable
                style={styles.recipeDetailsCloseButton}
                onPress={() => setShowRecipeDetails(false)}
                accessibilityRole="button"
                accessibilityLabel="Close recipe details"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#34423A" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailsAccordionBody}>
                <View style={styles.detailGrid}>
                  {hasText(recipe.cuisine) ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Cuisine</AppText>
                      <AppText style={styles.detailValue}>{recipe.cuisine}</AppText>
                    </View>
                  ) : null}
                  {hasText(recipe.chefName) ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Chef</AppText>
                      <AppText style={styles.detailValue}>{recipe.chefName}</AppText>
                    </View>
                  ) : null}
                  {hasText(recipe.cookingStyleName) ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Cooking style</AppText>
                      <AppText style={styles.detailValue}>
                        {recipe.cookingStyleName}
                      </AppText>
                    </View>
                  ) : null}
                  {recipe.baseServings != null && recipe.baseServings > 0 ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Base servings</AppText>
                      <AppText style={styles.detailValue}>
                        {recipe.baseServings}
                      </AppText>
                    </View>
                  ) : null}
                  {recipe.baseCookedWeightGrams != null &&
                    recipe.baseCookedWeightGrams > 0 ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Base cooked weight</AppText>
                      <AppText style={styles.detailValue}>
                        {formatEstimatedWeight(recipe.baseCookedWeightGrams)}
                      </AppText>
                    </View>
                  ) : null}
                  {recipe.preparationTimeMinutes != null ? (
                    <View style={styles.detailItem}>
                      <AppText style={styles.detailLabel}>Preparation</AppText>
                      <AppText style={styles.detailValue}>
                        {recipe.preparationTimeMinutes} min
                      </AppText>
                    </View>
                  ) : null}
                  <View style={styles.detailItem}>
                    <AppText style={styles.detailLabel}>Estimated cooking</AppText>
                    <AppText style={styles.detailValue}>
                      {recipe.cookingTimeMinutes} min
                    </AppText>
                  </View>
                </View>

                {hasText(recipe.storageInstructions) ? (
                  <View style={styles.storageNote}>
                    <Ionicons name="snow-outline" size={17} color="#1F7655" />
                    <View style={styles.storageTextWrap}>
                      <AppText style={styles.storageTitle}>
                        Storage instructions
                      </AppText>
                      <AppText style={styles.storageDescription}>
                        {recipe.storageInstructions}
                      </AppText>
                      {recipe.shelfLifeHours != null &&
                        recipe.shelfLifeHours > 0 ? (
                        <AppText style={styles.shelfLifeText}>
                          Best used within{" "}
                          {recipe.shelfLifeHours >= 24 &&
                            recipe.shelfLifeHours % 24 === 0
                            ? `${recipe.shelfLifeHours / 24} day${recipe.shelfLifeHours / 24 === 1 ? "" : "s"}`
                            : `${recipe.shelfLifeHours} hour${recipe.shelfLifeHours === 1 ? "" : "s"}`}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {hasText(recipe.sourceName) || hasText(recipe.sourceUrl) ? (
                  <View style={styles.sourceNote}>
                    <Ionicons name="book-outline" size={16} color="#1F7655" />
                    <View style={styles.storageTextWrap}>
                      <AppText style={styles.storageTitle}>Recipe source</AppText>
                      {hasText(recipe.sourceName) ? (
                        <AppText style={styles.storageDescription}>
                          {recipe.sourceName}
                        </AppText>
                      ) : null}
                      {hasText(recipe.sourceUrl) ? (
                        <AppText style={styles.sourceUrl} numberOfLines={2}>
                          {recipe.sourceUrl}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.reviewsSection}>
                  <View style={styles.reviewsHeading}>
                    <AppText style={styles.reviewsTitle}>Reviews</AppText>
                    <View style={styles.ratingSummary}>
                      <Ionicons name="star" size={15} color="#E6A23C" />
                      <AppText style={styles.ratingSummaryText}>
                        {reviews.length
                          ? (
                            reviews.reduce(
                              (sum, review) =>
                                sum + (Number(review.rating) || 0),
                              0,
                            ) / reviews.length
                          ).toFixed(1)
                          : "—"}
                      </AppText>
                      <AppText style={styles.reviewCountText}>
                        ({reviews.length})
                      </AppText>
                    </View>
                  </View>
                  {reviews.length ? (
                    reviews.map((review) => (
                      <View key={review.id} style={styles.reviewCard}>
                        <View style={styles.reviewTopRow}>
                          <AppText style={styles.reviewUserName}>
                            {hasText(review.userName)
                              ? review.userName
                              : "User"}
                          </AppText>
                          <View style={styles.reviewRating}>
                            <Ionicons name="star" size={13} color="#E6A23C" />
                            <AppText style={styles.reviewRatingText}>
                              {Number(review.rating) || 0}/5
                            </AppText>
                          </View>
                        </View>
                        {hasText(review.comment) ? (
                          <AppText style={styles.reviewComment}>
                            {review.comment}
                          </AppText>
                        ) : null}
                        {hasText(review.createdAt) ? (
                          <AppText style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </AppText>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <AppText style={styles.noReviewsText}>No reviews yet.</AppText>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* WRITE REVIEW MODAL */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <KeyboardAvoidingView
            style={styles.keyboardModalView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.keyboardModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.reviewModal}>
                <View style={styles.reviewModalHeader}>
                  <View style={styles.reviewModalHeading}>
                    <AppText style={styles.reviewModalTitle}>
                      {isEditingReview ? "Edit your review" : "Rate this recipe"}
                    </AppText>
                    <AppText style={styles.reviewModalSubtitle} numberOfLines={2}>
                      Share your experience with {recipe.name}.
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setShowReviewModal(false)}
                    style={styles.reviewModalClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close review form"
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={22} color="#34423A" />
                  </Pressable>
                </View>

                <View style={styles.reviewStarPicker}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setReviewRating(star)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                    >
                      <Ionicons
                        name={star <= reviewRating ? "star" : "star-outline"}
                        size={34}
                        color="#E6A23C"
                      />
                    </Pressable>
                  ))}
                </View>
                <AppText style={styles.reviewRatingCaption}>
                  {
                    ["", "Poor", "Fair", "Good", "Very good", "Excellent"][
                    reviewRating
                    ]
                  }
                </AppText>

                <AppText style={styles.reviewInputLabel}>Your review (optional)</AppText>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="What did you think of this recipe?"
                  placeholderTextColor="#8A938E"
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  style={styles.reviewCommentInput}
                />
                <AppText style={styles.reviewCharacterCount}>
                  {reviewComment.length}/1000
                </AppText>

                <View style={styles.reviewModalActions}>
                  <Pressable
                    style={styles.reviewCancelButton}
                    onPress={() => setShowReviewModal(false)}
                    disabled={isSubmittingReview}
                  >
                    <AppText style={styles.reviewCancelText}>Cancel</AppText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.reviewSubmitButton,
                      isSubmittingReview && styles.reviewSubmitButtonDisabled,
                    ]}
                    onPress={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    <AppText style={styles.reviewSubmitText}>
                      {isSubmittingReview
                        ? "Saving..."
                        : isEditingReview
                          ? "Save changes"
                          : "Submit review"}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* FIXED FOOTER: show only metrics returned by the calculation API */}
      {calculation.estimatedCookedWeightGrams != null ||
        calculation.estimatedTotalCost != null ? (
        <View style={styles.bottomBar}>
          {calculation.estimatedCookedWeightGrams != null ? (
            <View style={styles.bottomMetricCard}>
              <View style={styles.bottomMetricIcon}>
                <Ionicons name="scale-outline" size={21} color="#1F7655" />
              </View>
              <View style={styles.bottomMetricText}>
                <AppText style={styles.bottomMetricLabel}>Total Cooked Weight</AppText>
                <AppText style={styles.bottomMetricValue} numberOfLines={1}>
                  {formatEstimatedWeight(
                    calculation.estimatedCookedWeightGrams,
                  )}
                </AppText>
              </View>
            </View>
          ) : null}

          {calculation.estimatedTotalCost != null ? (
            <View style={styles.bottomMetricCard}>
              <View style={styles.bottomMetricIcon}>
                <Ionicons name="wallet-outline" size={21} color="#1F7655" />
              </View>
              <View style={styles.bottomMetricText}>
                <AppText style={styles.bottomMetricLabel}>Total Ingredient Price</AppText>
                <AppText style={styles.bottomMetricValue} numberOfLines={1}>
                  ₹{calculation.estimatedTotalCost.toFixed(2)}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* INGREDIENT DATABASE DETAILS MODAL */}
      <Modal
        visible={showIngredientInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIngredientInfoModal(false)}
      >
        <View style={styles.ingredientDetailsOverlay}>
          <View style={styles.ingredientDetailsModal}>
            <View style={styles.ingredientDetailsHeader}>
              <View style={styles.ingredientDetailsHeading}>
                {selectedIngredientInfo?.photoUrl ? (
                  <Image
                    source={{ uri: selectedIngredientInfo.photoUrl }}
                    style={styles.ingredientDetailsImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.ingredientDetailsImageFallback}>
                    <Ionicons
                      name="leaf-outline"
                      size={24}
                      color="#1F7655"
                    />
                  </View>
                )}
                <View style={styles.ingredientDetailsTitleWrap}>
                  <AppText style={styles.ingredientDetailsTitle}>
                    {selectedIngredientInfo?.name ?? "Ingredient details"}
                  </AppText>
                  <AppText style={styles.ingredientDetailsSubtitle}>
                    Ingredient information
                  </AppText>
                </View>
              </View>
              <Pressable
                onPress={() => setShowIngredientInfoModal(false)}
                style={styles.ingredientDetailsClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close ingredient details"
              >
                <Ionicons name="close" size={22} color="#34423A" />
              </Pressable>
            </View>

            {isLoadingIngredientInfo ? (
              <View style={styles.ingredientDetailsLoading}>
                <AppText style={styles.ingredientDetailsMuted}>
                  Loading ingredient details...
                </AppText>
              </View>
            ) : (
              <ScrollView
                style={styles.ingredientDetailsScroll}
                contentContainerStyle={styles.ingredientDetailsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.ingredientDetailsSection}>
                  <AppText style={styles.ingredientDetailsSectionTitle}>
                    Purchase information
                  </AppText>
                  <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>Purchase price</AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {formatPurchaseDetails(selectedIngredientInfo ?? {})}
                    </AppText>
                  </View>
                  <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>Brand</AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {formatDetailValue(selectedIngredientInfo?.brand)}
                    </AppText>
                  </View>
                  <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>Ingredient type</AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {selectedIngredientInfo?.ingredientType === 1
                        ? 'Veg'
                        : selectedIngredientInfo?.ingredientType === 2
                          ? 'Non Veg'
                          : 'un specified'}
                    </AppText>
                  </View>
                </View>

                <View style={styles.ingredientDetailsSection}>
                  <AppText style={styles.ingredientDetailsSectionTitle}>
                    Measurements
                  </AppText>
                  {/* <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>
                      Density (g/ml)
                    </AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {formatDetailValue(selectedIngredientInfo?.gramsPerMilliliter)}
                    </AppText>
                  </View> */}
                  {/* <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>
                      Weight per piece (g)
                    </AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {formatDetailValue(selectedIngredientInfo?.gramsPerPiece)}
                    </AppText>
                  </View> */}
                  <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>
                      Wastage
                    </AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {selectedIngredientInfo?.wastageQuantity != null &&
                        hasText(selectedIngredientInfo?.wastageUnit)
                        ? `${Number(selectedIngredientInfo.wastageQuantity.toFixed(2))} ${selectedIngredientInfo.wastageUnit}`
                        : "Not configured"}
                    </AppText>
                  </View>
                </View>

                <View style={styles.ingredientDetailsSection}>
                  <AppText style={styles.ingredientDetailsSectionTitle}>
                    Storage and preparation
                  </AppText>
                  <View style={styles.ingredientDetailsRow}>
                    <AppText style={styles.ingredientDetailsLabel}>Shelf life</AppText>
                    <AppText style={styles.ingredientDetailsValue}>
                      {selectedIngredientInfo?.shelfLifeDays != null
                        ? `${selectedIngredientInfo.shelfLifeDays} days`
                        : "Not specified"}
                    </AppText>
                  </View>
                  <View style={styles.ingredientDetailsTextBlock}>
                    <AppText style={styles.ingredientDetailsLabel}>
                      Storage instructions
                    </AppText>
                    <AppText style={styles.ingredientDetailsParagraph}>
                      {formatDetailValue(
                        selectedIngredientInfo?.storageInstructions,
                      )}
                    </AppText>
                  </View>
                  <View style={styles.ingredientDetailsTextBlock}>
                    <AppText style={styles.ingredientDetailsLabel}>Notes</AppText>
                    <AppText style={styles.ingredientDetailsParagraph}>
                      {formatDetailValue(selectedIngredientInfo?.notes)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.ingredientDetailsSection}>
                  <AppText style={styles.ingredientDetailsSectionTitle}>
                    Caution
                  </AppText>
                  <AppText style={styles.ingredientDetailsParagraph}>
                    {selectedIngredientInfo?.isCautionRequired
                      ? formatDetailValue(
                        selectedIngredientInfo.cautionMessage,
                        "Caution required; no message was provided.",
                      )
                      : "No specific caution flagged in the database."}
                  </AppText>
                </View>
              </ScrollView>
            )}

            <Pressable
              style={styles.ingredientDetailsDoneButton}
              onPress={() => setShowIngredientInfoModal(false)}
              accessibilityRole="button"
            >
              <AppText style={styles.ingredientDetailsDoneText}>Close</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* EDIT INGREDIENT MODAL */}
      <Modal
        visible={editingIngredient !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingIngredient(null)}
      >
        <View style={styles.ingredientModalOverlay}>
          <KeyboardAvoidingView
            style={styles.centeredKeyboardModalView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.centeredKeyboardModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.ingredientModal}>
                <AppText style={styles.ingredientModalTitle}>Edit Ingredient</AppText>

                <AppText style={styles.ingredientModalName}>
                  {editingIngredient?.ingredientName}
                </AppText>

                <AppText style={styles.ingredientModalLabel}>Quantity</AppText>

                <TextInput
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  keyboardType="decimal-pad"
                  style={styles.ingredientModalInput}
                  placeholder="Enter quantity"
                />

                <AppText style={styles.ingredientModalLabel}>Unit</AppText>

                <TextInput
                  value={editedUnit}
                  onChangeText={setEditedUnit}
                  style={styles.ingredientModalInput}
                  placeholder="e.g. g, ml, pieces"
                  autoCapitalize="none"
                />

                <View style={styles.ingredientModalActions}>
                  <Pressable
                    style={styles.ingredientCancelButton}
                    onPress={() => setEditingIngredient(null)}
                  >
                    <AppText style={styles.ingredientCancelText}>Cancel</AppText>
                  </Pressable>

                  <Pressable
                    style={styles.ingredientSaveButton}
                    onPress={saveIngredientEdit}
                  >
                    <AppText style={styles.ingredientSaveText}>Save Quantity</AppText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* SAVE SUCCESS POPUP */}
      {showSuccessPopup && (
        <View style={styles.successOverlay} pointerEvents="none">
          <Animated.View
            style={[
              styles.successPopup,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            </View>

            <View style={styles.successTextContainer}>
              <AppText style={styles.successTitle}>Saved Successfully</AppText>

              <AppText style={styles.successMessage}>Added to My Favorites</AppText>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },

  /* FIXED BLURRED HEADER */
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
    overflow: "hidden",
    marginTop: Platform.OS === "web" ? 0 : 58,
    borderBottomWidth: 0,

  },

  headerTint: {
    ...{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
  },

  headerFadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(247, 248, 243, 0.04)",
  },

  headerFadeMiddle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: "rgba(247, 248, 243, 0.08)",
  },

  headerFadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    backgroundColor: "rgba(247, 248, 243, 0.12)",
  },

  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.60)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(229, 232, 227, 0.65)",
  },

  headerRecipeName: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },

  mainScroll: {
    flex: 1,
    marginTop: 58,
  },

  mainScrollContent: {
    paddingBottom: 8,
  },

  stickyControls: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    zIndex: 20,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
  },

  /* RECIPE IMAGE */
  heroImage: {
    height: 170,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heroImageActual: {
    width: "100%",
    height: "100%",
  },

  /* COMPACT RECIPE INTRO */
  recipeOverview: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  quickMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  quickMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 3,
  },
  quickMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34423A",
  },
  moreTagsText: {
    alignSelf: "center",
    color: "#68736D",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  moreTagsButton: {
    alignSelf: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  detailsAccordion: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    overflow: "hidden",
  },
  detailsAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  detailsAccordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsAccordionHeading: {
    flex: 1,
    minWidth: 0,
  },
  detailsAccordionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#17231E",
  },
  detailsAccordionSubtitle: {
    fontSize: 11,
    color: "#68736D",
    marginTop: 3,
  },
  detailsAccordionBody: {
    // borderTopWidth: 1,
    // borderTopColor: "#E5E8E3",
    paddingHorizontal: 2,
    paddingBottom: 12,
  },
  detailGrid: {
    paddingTop: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 18,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: "#68736D",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: "#17231E",
    fontWeight: "700",
    textAlign: "right",
  },
  recipeHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recipeHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  recipeDescription: {
    color: "#65736A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: "#E4F0E8",
    borderWidth: 1,
    borderColor: "#D3E5D9",
  },
  tagChipText: {
    color: "#1F7655",
    fontSize: 11,
    fontWeight: "700",
  },
  recipeFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  recipeFact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  recipeFactText: {
    color: "#34423A",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  sourceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7EBE7",
  },
  sourceUrl: {
    color: "#52645A",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  reviewsSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7EBE7",

  },
  reviewsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingSummaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewCountText: {
    fontSize: 12,
    color: "#68736D",
  },
  reviewCard: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewUserName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#52645A",
  },
  reviewComment: {
    color: "#52645A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  reviewDate: {
    color: "#8A938E",
    fontSize: 10,
    marginTop: 6,
  },
  noReviewsText: {
    fontSize: 12,
    color: "#68736D",
    paddingVertical: 8,
  },
  storageNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 8,
    marginTop: 10,
    // borderTopWidth: StyleSheet.hairlineWidth,
    // borderTopColor: "#E7EBE7",
  },
  storageTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  storageTitle: {
    color: "#1F7655",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  storageDescription: {
    color: "#34423A",
    fontSize: 12,
    lineHeight: 18,
  },
  shelfLifeText: {
    color: "#68736D",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
  },

  heroEmoji: {
    fontSize: 80,
    fontWeight: "700",
    color: "#1F7655",
  },

  ingredientsContent: {
    backgroundColor: "transparent",
    marginHorizontal: 14,
    marginVertical: 12,
    paddingHorizontal: 0,
  },

  instructionsContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },

  titleSection: {
    marginBottom: 16,
  },

  recipeInfoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  writeReviewInline: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 3,
  },
  writeReviewInlineText: {
    color: "#1F7655",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 22, 17, 0.48)",
  },
  keyboardModalView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardModalContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  reviewModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
  },
  reviewModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  reviewModalHeading: {
    flex: 1,
    minWidth: 0,
  },
  reviewModalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewModalSubtitle: {
    color: "#68736D",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  reviewModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F1",
  },
  reviewStarPicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 22,
  },
  reviewRatingCaption: {
    textAlign: "center",
    color: "#8A6A28",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 22,
  },
  reviewInputLabel: {
    color: "#34423A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  reviewCommentInput: {
    minHeight: 112,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "#DCE3DD",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#17231E",
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "#FBFCFA",
  },
  reviewCharacterCount: {
    alignSelf: "flex-end",
    color: "#8A938E",
    fontSize: 11,
    marginTop: 5,
  },
  reviewModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  reviewCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#F1F4F0",
  },
  reviewCancelText: {
    color: "#52645A",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewSubmitButton: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#1F7655",
  },
  reviewSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reviewSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  addToEventHeaderButton: {
    backgroundColor: "rgba(231, 241, 234, 0.88)",
    borderColor: "rgba(205, 225, 212, 0.9)",
  },
  eventModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 22, 17, 0.48)",
  },
  eventModal: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
  },
  eventModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E7EBE7",
    marginBottom: 16,
  },
  eventModalTitle: { fontSize: 20, fontWeight: "800", color: "#17231E" },
  eventModalSubtitle: { fontSize: 13, color: "#68736D", marginTop: 4 },
  eventModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F3EF",
  },
  eventFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34423A",
    marginBottom: 7,
  },
  eventTextInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#DDE4DE",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
    color: "#17231E",
    backgroundColor: "#FBFCFA",
  },
  eventHelperText: {
    color: "#7A847E",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  createEventToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  createEventToggleText: { color: "#1F7655", fontSize: 14, fontWeight: "800" },
  createEventForm: {
    padding: 13,
    backgroundColor: "#F7F8F3",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E8E3",
  },
  eventPrimaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F7655",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  eventPrimaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  eventButtonDisabled: { opacity: 0.6 },
  eventListTitle: {
    color: "#34423A",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 8,
  },
  eventList: { maxHeight: 300 },
  eventListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  eventListIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  eventListTextWrap: { flex: 1, minWidth: 0 },
  eventListName: { fontSize: 14, fontWeight: "800", color: "#17231E" },
  eventListMeta: { fontSize: 11, color: "#68736D", marginTop: 3 },
  eventEmptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    backgroundColor: "#F7F8F3",
    borderRadius: 14,
  },
  eventEmptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#52645A",
    marginTop: 8,
    textAlign: "center",
  },
  eventEmptyHint: {
    fontSize: 11,
    color: "#7A847E",
    marginTop: 4,
    textAlign: "center",
  },
  eventLoadingRow: { paddingVertical: 20, alignItems: "center" },
  eventSavingText: {
    textAlign: "center",
    color: "#1F7655",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },

  recipeDetailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12, 22, 17, 0.48)",
    justifyContent: "flex-end",
  },
  recipeDetailsModal: {
    maxHeight: "86%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
    overflow: "hidden",
  },
  recipeDetailsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
    marginBottom: 2,
  },
  recipeDetailsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F4F0",
    alignItems: "center",
    justifyContent: "center",
  },

  recipeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#17231E",
  },

  servingsText: {
    fontSize: 13,
    color: "#68736D",
    marginTop: 5,
  },

  spanText: {
    color: "#1F7655",
    fontSize: 15,
    fontWeight: "800",
  },

  /* SCALING CONTROLS */
  scalingCard: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    elevation: 2,
    shadowColor: "#17231E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  scalingHeading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  scalingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  scalingTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  scalingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17231E",
  },

  scalingSubtitle: {
    fontSize: 10,
    color: "#68736D",
    marginTop: 1,
  },

  servingButtons: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 7,
  },

  servingBtn: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
  },

  servingBtnDisabled: {
    backgroundColor: "#E5E8E3",
  },

  servingCount: {
    width: 42,
    height: 30,
    borderWidth: 1,
    borderColor: "#D9E1DB",
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontSize: 16,
    fontWeight: "800",
    color: "#17231E",
    backgroundColor: "#FFFFFF",
    alignContent: "center",
  },

  /* TABS */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E9EDE8",
    borderRadius: 9,
    padding: 3,
    marginBottom: 8,
    marginTop: 7,
  },

  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 11,
  },

  tabActive: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 11,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#68736D",
  },

  tabTextActive: {
    color: "#17231E",
    fontWeight: "900",
  },

  /* INGREDIENTS */
  scaledTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 7,
  },

  scaledTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#17231E",
  },

  priceSourceLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  priceSourceLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  priceSourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priceSourceDotManual: {
    backgroundColor: "#D64545",
  },

  priceSourceDotGovt: {
    backgroundColor: "#1F9D65",
  },

  priceSourceLegendText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    color: "#68736D",
  },

  ingredientLegendFooter: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8E3",
  },

  ingredientLegendTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },

  ingredientLegendTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#34423A",
  },

  ingredientLegendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 14,
    rowGap: 8,
  },

  ingredientLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  ingredientLegendText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    color: "#68736D",
  },

  ingredientsList: {
    paddingHorizontal: 10,
    paddingVertical: 1,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e3e3",
    gap: 10,
  },

  lastIngredientRow: {
    borderBottomWidth: 0,
  },

  // Keep locked ingredients visually consistent while preventing taps from opening the editor.
  ingredientRowNotEditable: {
    opacity: 1,
  },

  ingredientIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  ingredientImage: {
    width: "100%",
    height: "100%",
  },

  ingredientEmoji: {
    fontSize: 20,
  },

  ingredientInfo: {
    flex: 1,
    minWidth: 0,
  },

  ingredientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 4,
  },

  ingredientInfoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 1,
  },

  ingredientEditMark: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  ingredientNamePressable: {
    flexShrink: 1,
    minWidth: 0,
  },

  ingredientName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17231E",
  },

  ingredientBase: {
    fontSize: 11,
    color: "#68736D",
    marginTop: 2,
  },

  ingredientQuantityContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },

  ingredientQuantity: {
    fontSize: 13,
    fontWeight: "800",
    color: "#087443",
  },

  ingredientPriceWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  ingredientPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: "#68736D",
  },

  ingredientPriceSource: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    color: "#68736D",
  },

  ingredientPriceSourceGovt: {
    color: "#1F7655",
  },

  ingredientPriceSourceManual: {
    color: "#7A6A43",
  },

  /* INSTRUCTIONS */
  instructionsList: {
    gap: 9,
    paddingBottom: 10,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
  },

  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7655",
  },

  instructionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    color: "#17231E",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#52645A",
  },

  /* FIXED FOOTER */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: Platform.OS === "ios" ? 4 : 5,
    borderTopWidth: 0,
    gap: 8,
  },

  bottomMetricCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8F3",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },

  bottomMetricIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },

  bottomMetricText: {
    flex: 1,
    minWidth: 0,
  },

  bottomMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#68736D",
  },

  bottomMetricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F7655",
    marginTop: 2,
  },

  /* INGREDIENT DETAILS MODAL */
  ingredientDetailsOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 25, 19, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },

  ingredientDetailsModal: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
  },

  ingredientDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    // borderBottomWidth: 1,
    // borderBottomColor: "#E8EEE9",
    gap: 10,
  },

  ingredientDetailsHeading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 11,
  },

  ingredientDetailsImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
  },

  ingredientDetailsImageFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  ingredientDetailsTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  ingredientDetailsTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#17231E",
  },

  ingredientDetailsSubtitle: {
    fontSize: 12,
    color: "#68736D",
    marginTop: 3,
  },

  ingredientDetailsClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F1",
    alignItems: "center",
    justifyContent: "center",
  },

  ingredientDetailsScroll: {
    flexGrow: 0,
    marginTop: 4,
  },

  ingredientDetailsScrollContent: {
    paddingBottom: 4,
  },

  ingredientDetailsLoading: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },

  ingredientDetailsMuted: {
    color: "#68736D",
    fontSize: 13,
  },

  ingredientDetailsSection: {
    paddingTop: 16,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1ED",
    gap: 10,
  },

  ingredientDetailsSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F7655",
    marginBottom: 1,
  },

  ingredientDetailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  ingredientDetailsLabel: {
    flex: 0.9,
    fontSize: 12,
    lineHeight: 17,
    color: "#68736D",
  },

  ingredientDetailsValue: {
    flex: 1.1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#17231E",
    textAlign: "right",
  },

  ingredientDetailsTextBlock: {
    gap: 5,
  },

  ingredientDetailsParagraph: {
    fontSize: 12,
    lineHeight: 18,
    color: "#34423A",
  },

  ingredientDetailsDoneButton: {
    marginTop: 14,
    borderRadius: 13,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  ingredientDetailsDoneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* INGREDIENT EDIT MODAL */
  ingredientModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centeredKeyboardModalView: {
    flex: 1,
    justifyContent: "center",
  },
  centeredKeyboardModalContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  ingredientModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
  },

  ingredientModalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#17231E",
  },

  ingredientModalName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F7655",
    marginTop: 8,
    marginBottom: 14,
  },

  ingredientModalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#68736D",
    marginBottom: 7,
  },

  ingredientModalInput: {
    borderWidth: 1,
    borderColor: "#D9E1DB",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 16,
    color: "#17231E",
    marginBottom: 16,
  },

  ingredientModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },

  ingredientCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F1F3EF",
  },

  ingredientCancelText: {
    color: "#52645A",
    fontWeight: "700",
  },

  ingredientSaveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#1F7655",
  },

  ingredientSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* SUCCESS POPUP */
  successOverlay: {
    position: "absolute",
    top: 76,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 1000,
  },

  successPopup: {
    width: "100%",
    maxWidth: 380,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#DDE8E1",
    elevation: 8,
  },

  successIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  successTextContainer: {
    flex: 1,
  },

  successTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17231E",
  },

  successMessage: {
    fontSize: 13,
    color: "#68736D",
    marginTop: 2,
  },
});
