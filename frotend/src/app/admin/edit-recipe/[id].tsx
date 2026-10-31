import { useCallback, useMemo, useState } from "react";

import {
  Alert,
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

import { useLocalSearchParams, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { categoryApi } from "../../../api/categoryApi";

import { ingredientApi } from "../../../api/ingredientApi";

import { recipeApi } from "../../../api/recipeApi";

import type { CategoryResponse } from "../../../types/category";

import type { IngredientResponse } from "../../../types/ingredient";

import type { RecipeResponse } from "../../../types/recipe";

import { useFocusEffect } from "expo-router";

import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";

import {
  RECIPE_STATUS,
  type RecipeRequest,
  type RecipeStatus,
} from "../../../types/recipe";

import EditRecipeSkeleton from "@/components/skeleton/EditRecipeSkeleton";
import AppText from "../../../components/common/AppText";

const UNITS = ["g", "kg", "ml", "l", "pcs", "tbsp", "tsp", "cup"];

const UNIT_GROUPS: Record<string, string[]> = {
  g: ["g", "kg"],
  kg: ["kg", "g"],
  ml: ["ml", "l"],
  l: ["l", "ml"],
  pcs: ["pcs"],
  tbsp: ["tbsp", "tsp", "cup"],
  tsp: ["tsp", "tbsp", "cup"],
  cup: ["cup", "tbsp", "tsp"],
};

function getIngredientDefinedUnit(
  ingredient: IngredientResponse | undefined,
): string {
  if (!ingredient) return "g";

  const raw = ingredient as unknown as Record<string, unknown>;
  const candidates = [
    raw.purchaseUnit,
    raw.purchaseUnitName,
    raw.unit,
    raw.defaultUnit,
    raw.measurementUnit,
    raw.baseUnit,
    raw.unitOfMeasure,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().toLowerCase();
    const match = UNITS.find((unit) => unit.toLowerCase() === normalized);
    if (match) return match;
    if (normalized === "gram" || normalized === "grams") return "g";
    if (normalized === "kilogram" || normalized === "kilograms") return "kg";
    if (
      normalized === "milliliter" ||
      normalized === "milliliters" ||
      normalized === "millilitre" ||
      normalized === "millilitres"
    )
      return "ml";
    if (
      normalized === "liter" ||
      normalized === "liters" ||
      normalized === "litre" ||
      normalized === "litres"
    )
      return "l";
    if (
      normalized === "piece" ||
      normalized === "pieces" ||
      normalized === "pc"
    )
      return "pcs";
  }

  return "g";
}

function getCompatibleUnits(definedUnit: string): string[] {
  return UNIT_GROUPS[definedUnit] ?? [definedUnit];
}

const AUTH_TOKEN_KEY = "recipepro_token";

async function getStoredAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return (
        globalThis.sessionStorage?.getItem(AUTH_TOKEN_KEY) ??
        globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) ??
        null
      );
    }

    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn("Unable to read the saved authentication token:", error);
    return null;
  }
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web" && typeof globalThis.alert === "function") {
    globalThis.alert(`${title}\n\n${message}`);

    return;
  }

  Alert.alert(title, message);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  return "An unexpected error occurred. Check the console for details.";
}

// A comma-separated input such as "tasty, healthy, South Indian" becomes
// distinct tag names, with whitespace and duplicates normalized.
function parseCommaSeparatedNames(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter((name) => {
      if (!name) return false;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

interface FormIngredient {
  ingredientId: number;

  quantity: string;

  unit: string;
}

interface FormProcedure {
  stepNumber: number;

  title: string;

  description: string;
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  const isNew = id === "new";

  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [ingredients, setIngredients] = useState<IngredientResponse[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const [successTitle, setSuccessTitle] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [successAction, setSuccessAction] = useState<"back" | "list" | null>(
    null,
  );

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [categoryId, setCategoryId] = useState<number>(0);

  const [baseServings, setBaseServings] = useState("4");

  const [baseCookedWeightGrams, setBaseCookedWeightGrams] = useState("");

  const [photoUrl, setPhotoUrl] = useState("");

  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [status, setStatus] = useState<RecipeStatus>(RECIPE_STATUS.PUBLISHED);

  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);

  const [ingredientSearch, setIngredientSearch] = useState("");

  const [selectedSearchIngredient, setSelectedSearchIngredient] =
    useState<IngredientResponse | null>(null);

  const [expandedIngredientIndex, setExpandedIngredientIndex] = useState<
    number | null
  >(null);

  const [procedures, setProcedures] = useState<FormProcedure[]>([]);

  // Additional recipe metadata supported by RecipeRequest.
  const [chefId, setChefId] = useState<number | null>(null);
  const [cookingStyleId, setCookingStyleId] = useState<number | null>(null);
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState("");
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState("");
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [nutritionVerified, setNutritionVerified] = useState(false);
  const [nutrition, setNutrition] = useState({
    caloriesKcal: "",
    proteinGrams: "",
    carbohydratesGrams: "",
    fatGrams: "",
    fiberGrams: "",
    sugarGrams: "",
    sodiumMilligrams: "",
  });
  const [metadataOptions, setMetadataOptions] = useState<{
    chefs: { id: number; name: string }[];
    cookingStyles: { id: number; name: string }[];
    cuisines: { id: number; name: string }[];
    tags: { id: number; name: string }[];
  }>({ chefs: [], cookingStyles: [], cuisines: [], tags: [] });
  const [chefSearch, setChefSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [cookingStyleSearch, setCookingStyleSearch] = useState("");
  const [cuisineSearch, setCuisineSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [creatingMetadata, setCreatingMetadata] = useState<
    "chef" | "cookingStyle" | "cuisine" | "tag" | null
  >(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, ings] = await Promise.all([
        categoryApi.getAll(),

        ingredientApi.getAll(),
      ]);

      setCategories(cats);
      setIngredients(ings);

      const apiBaseUrl = (
        process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
      ).replace(/\/$/, "");
      const token = await getStoredAuthToken();
      const getLookup = async (
        path: string,
      ): Promise<{ id: number; name: string }[]> => {
        try {
          const response = await fetch(`${apiBaseUrl}/${path}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!response.ok) return [];
          const payload = await response.json();
          const values = Array.isArray(payload)
            ? payload
            : (payload?.items ?? payload?.data ?? []);
          return values
            .map((item: any) => ({
              id: Number(item.id ?? item.Id),
              name: String(item.name ?? item.Name ?? ""),
            }))
            .filter(
              (item: { id: number; name: string }) => item.id > 0 && item.name,
            );
        } catch {
          return [];
        }
      };
      // Prefer the cuisine lookup stored in the database. If that endpoint is
      // unavailable in this backend version, fall back to cuisines already
      // saved on recipes so existing values remain selectable.
      const [chefs, cookingStyles, recipes, tags, databaseCuisines] =
        await Promise.all([
          getLookup("chefs"),
          getLookup("cooking-styles"),
          recipeApi.getAll().catch(() => [] as RecipeResponse[]),
          getLookup("recipe-tags"),
          getLookup("cuisines"),
        ]);

      const recipeCuisineNames = Array.from(
        new Set(
          recipes
            .map((recipe) => String((recipe as any).cuisine ?? "").trim())
            .filter((value) => value.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b));

      const cuisines =
        databaseCuisines.length > 0
          ? databaseCuisines
          : recipeCuisineNames.map((name, index) => ({ id: index + 1, name }));

      setMetadataOptions({ chefs, cookingStyles, cuisines, tags });

      if (!isNew) {
        const data: RecipeResponse = await recipeApi.getById(Number(id));

        setName(data.name);

        setDescription(data.description || "");

        setCategoryId(data.categoryId);

        setBaseServings(String(data.baseServings));

        setBaseCookedWeightGrams(
          data.baseCookedWeightGrams != null
            ? String(data.baseCookedWeightGrams)
            : "",
        );

        setPhotoUrl(data.photoUrl || "");
        setCuisine((data as any).cuisine ?? "");
        setCuisineSearch("");
        setMealType((data as any).mealType ?? "");
        setChefId((data as any).chefId ?? null);
        setCookingStyleId((data as any).cookingStyleId ?? null);
        setPreparationTimeMinutes(
          (data as any).preparationTimeMinutes == null
            ? ""
            : String((data as any).preparationTimeMinutes),
        );
        setCookingTimeMinutes(
          (data as any).cookingTimeMinutes == null
            ? ""
            : String((data as any).cookingTimeMinutes),
        );
        setTagIds(
          ((data as any).tags ?? [])
            .map((tag: any) => Number(tag.id ?? tag.Id))
            .filter((x: number) => x > 0),
        );
        const nutritionData = (data as any).nutrition;
        if (nutritionData) {
          setNutrition({
            caloriesKcal:
              nutritionData.caloriesKcal == null
                ? ""
                : String(nutritionData.caloriesKcal),
            proteinGrams:
              nutritionData.proteinGrams == null
                ? ""
                : String(nutritionData.proteinGrams),
            carbohydratesGrams:
              nutritionData.carbohydratesGrams == null
                ? ""
                : String(nutritionData.carbohydratesGrams),
            fatGrams:
              nutritionData.fatGrams == null
                ? ""
                : String(nutritionData.fatGrams),
            fiberGrams:
              nutritionData.fiberGrams == null
                ? ""
                : String(nutritionData.fiberGrams),
            sugarGrams:
              nutritionData.sugarGrams == null
                ? ""
                : String(nutritionData.sugarGrams),
            sodiumMilligrams:
              nutritionData.sodiumMilligrams == null
                ? ""
                : String(nutritionData.sodiumMilligrams),
          });
          setNutritionVerified(Boolean(nutritionData.isVerified));
        } else {
          setNutritionVerified(false);
        }

        setSelectedImage(null);

        setStatus(
          String(data.status).toLowerCase() === "published"
            ? RECIPE_STATUS.PUBLISHED
            : RECIPE_STATUS.DRAFT,
        );

        setFormIngredients(
          data.ingredients.map((item) => ({
            ingredientId: item.ingredientId,

            quantity: String(item.quantity),

            unit: item.unit,
          })),
        );

        setProcedures(
          data.procedures.map((item) => ({
            stepNumber: item.stepNumber,

            title: item.title,

            description: item.description,
          })),
        );
      } else {
        // Reset every field when creating a new recipe.

        setName("");

        setDescription("");

        setCategoryId(cats[0]?.id || 0);

        setBaseServings("4");

        setBaseCookedWeightGrams("");

        setPhotoUrl("");
        setSelectedImage(null);
        setCuisine("");
        setCuisineSearch("");
        setMealType("");
        setChefId(null);
        setCookingStyleId(null);
        setPreparationTimeMinutes("");
        setCookingTimeMinutes("");
        setTagIds([]);
        setNutritionVerified(false);
        setNutrition({
          caloriesKcal: "",
          proteinGrams: "",
          carbohydratesGrams: "",
          fatGrams: "",
          fiberGrams: "",
          sugarGrams: "",
          sodiumMilligrams: "",
        });
        setStatus(RECIPE_STATUS.PUBLISHED);

        setFormIngredients([]);

        setIngredientSearch("");

        setSelectedSearchIngredient(null);

        setExpandedIngredientIndex(null);

        setProcedures([
          {
            stepNumber: 1,

            title: "",

            description: "",
          },
        ]);
      }
    } catch (error) {
      console.error("Unable to load recipe form:", error);

      showMessage("Unable to load recipe form", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  // Refresh shared reference data without reloading the whole form.
  // This avoids overwriting unsaved edits while keeping categories and
  // ingredients up to date when another user changes them.
  const refreshReferenceData = useCallback(async () => {
    try {
      const [latestCategories, latestIngredients] = await Promise.all([
        categoryApi.getAll(),
        ingredientApi.getAll(),
      ]);

      setCategories(latestCategories);
      setIngredients(latestIngredients);
    } catch (error) {
      console.warn("Unable to refresh categories and ingredients:", error);
    }
  }, []);

const createMetadataOption = async (
  kind: "chef" | "cookingStyle" | "cuisine" | "tag",
) => {
  const rawName =
    kind === "chef"
      ? chefSearch
      : kind === "cookingStyle"
        ? cookingStyleSearch
        : kind === "cuisine"
          ? cuisineSearch
          : tagSearch;
  const newName = rawName.trim().replace(/\s+/g, " ");
  if (!newName || creatingMetadata) return;

  const listKey =
    kind === "chef"
      ? "chefs"
      : kind === "cookingStyle"
        ? "cookingStyles"
        : kind === "cuisine"
          ? "cuisines"
          : "tags";
  const currentList = metadataOptions[listKey];
  const existing = currentList.find(
    (item) => item.name.toLowerCase() === newName.toLowerCase(),
  );
  if (existing) {
    if (kind === "chef") {
      setChefId(existing.id);
      setChefSearch(existing.name);
    } else if (kind === "cookingStyle") {
      setCookingStyleId(existing.id);
      setCookingStyleSearch("");
    } else if (kind === "cuisine") {
      setCuisine(existing.name);
      setCuisineSearch("");
    } else {
      setTagIds((previous) => [
        existing.id,
        ...previous.filter((id) => id !== existing.id),
      ]);
      setTagSearch("");
    }
    return;
  }

  // Cuisine is a string on Recipe.Cuisine, not a separate database record.
  // Select it now; it becomes persistent when the recipe is saved.
  if (kind === "cuisine") {
    setCuisine(newName);
    setCuisineSearch(newName);
    setMetadataOptions((previous) => ({
      ...previous,
      cuisines: [
        { id: -Date.now(), name: newName },
        ...previous.cuisines.filter(
          (item) => item.name.toLowerCase() !== newName.toLowerCase(),
        ),
      ],
    }));
    showMessage(
      "Cuisine selected",
      `“${newName}” will be saved with this recipe when you press Save.`,
    );
    return;
  }

  // Beyond this point, TypeScript knows 'kind' can ONLY be "chef" | "cookingStyle" | "tag"
  setCreatingMetadata(kind);
  try {
    const apiBaseUrl = (
      process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
    ).replace(/\/$/, "");
    const token = await getStoredAuthToken();
    
    // Removed "cuisine" from path resolution
    const path =
      kind === "chef"
        ? "chefs"
        : kind === "cookingStyle"
          ? "cooking-styles"
          : "recipe-tags";

    const response = await fetch(`${apiBaseUrl}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: newName }),
    });

    const responseText = await response.text();
    let payload: any = {};
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = {};
      }
    }
    if (!response.ok) {
      const detail = payload?.message ?? payload?.title ?? responseText;
      throw new Error(
        `Could not create ${kind === "cookingStyle" ? "cooking style" : kind} (${response.status}). ${detail || "Check the API endpoint and request model."}`,
      );
    }
    const result = payload?.data ?? payload?.item ?? payload;
    const saved = {
      id: Number(
        result?.id ??
        result?.Id ??
        result?.chefId ??
        result?.cookingStyleId ??
        result?.tagId,
      ),
      name: String(result?.name ?? result?.Name ?? newName),
    };
    
    // Removed "Cuisine" option string formatting
    if (!Number.isInteger(saved.id) || saved.id <= 0) {
      throw new Error(
        `${kind === "cookingStyle" ? "Cooking style" : kind === "tag" ? "Tag" : "Chef"} may have been created, but the response did not include its ID. Check the POST response shape.`,
      );
    }
    setMetadataOptions((previous) => ({
      ...previous,
      [listKey]: [
        saved,
        ...previous[listKey].filter((item) => item.id !== saved.id),
      ],
    }));

    // Removed "cuisine" condition checks
    if (kind === "chef") {
      setChefId(saved.id);
      setChefSearch(saved.name);
    } else if (kind === "cookingStyle") {
      setCookingStyleId(saved.id);
      setCookingStyleSearch("");
    } else {
      setTagIds((previous) => [
        saved.id,
        ...previous.filter((id) => id !== saved.id),
      ]);
      setTagSearch("");
    }
    showMessage(
      "Added successfully",
      `“${saved.name}” was created and selected.`,
    );
  } catch (error) {
    showMessage(
      `Unable to create ${kind === "cookingStyle" ? "cooking style" : kind}`,
      getErrorMessage(error),
    );
  } finally {
    setCreatingMetadata(null);
  }
};


  // Load the form when this screen becomes active.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Poll categories and ingredients every 5 seconds while this screen is
  // focused. Do not call load() repeatedly: it resets form fields and could
  // erase unsaved user input.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshSafely = async () => {
        if (!isActive || saving || successModalVisible) return;
        await refreshReferenceData();
      };

      const intervalId = setInterval(() => {
        void refreshSafely();
      }, 5000);

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [refreshReferenceData, saving, successModalVisible]),
  );

  const filteredIngredients = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase();

    if (!query) return [];

    return ingredients.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [ingredients, ingredientSearch]);

  const chooseRecipeImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission required",
          "Allow photo library access to choose a recipe image.",
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [4, 3],

        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      showMessage("Image selection failed", getErrorMessage(error));
    }
  };

  const uploadRecipeImage = async (recipeId: number) => {
    if (!selectedImage) return;

    const apiBaseUrl = (
      process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
    ).replace(/\/$/, "");

    const formData = new FormData();

    const uri = selectedImage.uri;

    const fileName =
      selectedImage.fileName || `recipe-${recipeId}-${Date.now()}.jpg`;

    const mimeType = selectedImage.mimeType || "image/jpeg";

    if (Platform.OS === "web" && selectedImage.file) {
      formData.append("file", selectedImage.file);
    } else {
      formData.append("file", {
        uri,

        name: fileName,

        type: mimeType,
      } as unknown as Blob);
    }

    const token = await getStoredAuthToken();

    const response = await fetch(`${apiBaseUrl}/recipes/${recipeId}/image`, {
      method: "POST",

      headers: token ? { Authorization: `Bearer ${token}` } : undefined,

      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(body || `Image upload failed (${response.status}).`);
    }

    // The backend should return the saved Cloudinary URL.

    let uploadedUrl = "";

    const responseText = await response.text();

    if (responseText) {
      try {
        const payload = JSON.parse(responseText) as {
          imageUrl?: string;

          photoUrl?: string;

          url?: string;

          data?: { imageUrl?: string; photoUrl?: string; url?: string };
        };

        uploadedUrl =
          payload.photoUrl ||
          payload.imageUrl ||
          payload.url ||
          payload.data?.photoUrl ||
          payload.data?.imageUrl ||
          payload.data?.url ||
          "";
      } catch {
        // Some endpoints may return an empty/non-JSON success response.
      }
    }

    if (uploadedUrl) setPhotoUrl(uploadedUrl);

    setSelectedImage(null);
  };

  const handleSave = async () => {
    const recipeId = Number(id);

    if (!isNew && (!id || !Number.isInteger(recipeId) || recipeId <= 0)) {
      showMessage(
        "Invalid recipe",

        "The recipe ID is missing or invalid. Return to the recipe list and open Edit again.",
      );

      console.error("Invalid recipe ID while saving:", id);

      return;
    }

    if (
      !name.trim() ||
      !categoryId ||
      !baseServings ||
      Number(baseServings) < 1 ||
      !Number.isInteger(Number(baseServings)) ||
      formIngredients.length === 0 ||
      procedures.length === 0
    ) {
      await load();
      showMessage(
        "Validation",

        "Enter a recipe title, valid base servings, select a category, add at least one ingredient and one procedure.",
      );

      return;
    }

    if (saving) return;
    setSaving(true);

    const newlySavedDetails: string[] = [];

    // New chef, cooking style, and tag records are created only as part of Save.
    const createLookupOnSave = async (
      path: "chefs" | "cooking-styles" | "recipe-tags",
      value: string,
    ): Promise<{ id: number; name: string }> => {
      const apiBaseUrl = (
        process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
      ).replace(/\/$/, "");
      const token = await getStoredAuthToken();
      const response = await fetch(`${apiBaseUrl}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: value }),
      });
      const responseText = await response.text();
      let payload: any = {};
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = {};
        }
      }
      // If a tag was created by another request or was missing from the
      // initially loaded options, reuse the existing tag instead of failing
      // the entire recipe save.
      if (!response.ok && response.status === 409 && path === "recipe-tags") {
        const lookupResponse = await fetch(`${apiBaseUrl}/recipe-tags`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (lookupResponse.ok) {
          const lookupPayload = await lookupResponse.json();
          const allTags = Array.isArray(lookupPayload)
            ? lookupPayload
            : (lookupPayload?.items ?? lookupPayload?.data ?? []);
          const existingTag = allTags.find(
            (item: any) =>
              String(item.name ?? item.Name ?? "")
                .trim()
                .toLowerCase() === value.trim().toLowerCase(),
          );
          const existingId = Number(existingTag?.id ?? existingTag?.Id);
          if (existingTag && Number.isInteger(existingId) && existingId > 0) {
            return {
              id: existingId,
              name: String(existingTag.name ?? existingTag.Name ?? value),
            };
          }
        }
      }
      if (!response.ok) {
        throw new Error(
          `Could not save new ${path === "cooking-styles" ? "cooking style" : path === "recipe-tags" ? "tag" : "chef"}: ${payload?.message ?? payload?.title ?? responseText ?? response.status}`,
        );
      }
      const result = payload?.data ?? payload?.item ?? payload;
      const saved = {
        id: Number(
          result?.id ??
          result?.Id ??
          result?.chefId ??
          result?.cookingStyleId ??
          result?.tagId,
        ),
        name: String(result?.name ?? result?.Name ?? value),
      };
      if (!Number.isInteger(saved.id) || saved.id <= 0) {
        throw new Error(
          `The ${path} endpoint did not return the new record ID.`,
        );
      }
      return saved;
    };

    let resolvedChefId = chefId;
    let resolvedCookingStyleId = cookingStyleId;
    let resolvedTagIds = [...tagIds];

    try {
      const typedChef = chefSearch.trim().replace(/\s+/g, " ");
      if (typedChef) {
        const existingChef = metadataOptions.chefs.find(
          (x) => x.name.toLowerCase() === typedChef.toLowerCase(),
        );
        if (existingChef) {
          resolvedChefId = existingChef.id;
        } else {
          const saved = await createLookupOnSave("chefs", typedChef);
          resolvedChefId = saved.id;
          newlySavedDetails.push(`Chef: ${saved.name}`);
          setChefId(saved.id);
          setMetadataOptions((previous) => ({
            ...previous,
            chefs: [saved, ...previous.chefs],
          }));
        }
      }

      const typedStyle = cookingStyleSearch.trim().replace(/\s+/g, " ");
      if (typedStyle) {
        const existingStyle = metadataOptions.cookingStyles.find(
          (x) => x.name.toLowerCase() === typedStyle.toLowerCase(),
        );
        if (existingStyle) {
          resolvedCookingStyleId = existingStyle.id;
        } else {
          const saved = await createLookupOnSave("cooking-styles", typedStyle);
          resolvedCookingStyleId = saved.id;
          newlySavedDetails.push(`Cooking style: ${saved.name}`);
          setCookingStyleId(saved.id);
          setMetadataOptions((previous) => ({
            ...previous,
            cookingStyles: [saved, ...previous.cookingStyles],
          }));
        }
      }

      const typedCuisine = cuisineSearch.trim().replace(/\s+/g, " ");
      if (
        typedCuisine &&
        !metadataOptions.cuisines.some(
          (x) => x.name.toLowerCase() === typedCuisine.toLowerCase(),
        )
      ) {
        newlySavedDetails.push(`Cuisine: ${typedCuisine} (saved with recipe)`);
      }

      // Allow several tags in one field, separated by commas.
      // Each tag is stored as its own RecipeTag row and linked by its ID.
      const typedTags = parseCommaSeparatedNames(tagSearch);
      const currentTagOptions = [...metadataOptions.tags];
      for (const typedTag of typedTags) {
        const existingTag = currentTagOptions.find(
          (x) => x.name.toLowerCase() === typedTag.toLowerCase(),
        );
        if (existingTag) {
          if (!resolvedTagIds.includes(existingTag.id)) {
            resolvedTagIds.push(existingTag.id);
          }
          continue;
        }

        const saved = await createLookupOnSave("recipe-tags", typedTag);
        if (!resolvedTagIds.includes(saved.id)) {
          resolvedTagIds.push(saved.id);
        }
        // Only describe it as newly saved if it was not already present in
        // the loaded options (the helper can also resolve a 409 duplicate).
        const wasAlreadyKnown = currentTagOptions.some(
          (item) =>
            item.id === saved.id ||
            item.name.trim().toLowerCase() === saved.name.trim().toLowerCase(),
        );
        if (!wasAlreadyKnown) {
          newlySavedDetails.push(`Tag: ${saved.name}`);
        }
        currentTagOptions.unshift(saved);
        setMetadataOptions((previous) => ({
          ...previous,
          tags: [
            saved,
            ...previous.tags.filter((item) => item.id !== saved.id),
          ],
        }));
      }
      // Keep IDs unique even if the user typed a duplicate or selected a chip.
      resolvedTagIds = [...new Set(resolvedTagIds)];
      setTagIds(resolvedTagIds);
    } catch (error) {
      setSaving(false);
      showMessage("Unable to save new details", getErrorMessage(error));
      return;
    }

    const request: RecipeRequest = {
      name: name.trim(),

      description: description.trim() || null,

      categoryId,

      baseServings: Number(baseServings),

      baseCookedWeightGrams:
        baseCookedWeightGrams.trim() === ""
          ? null
          : Number(baseCookedWeightGrams),

      photoUrl: photoUrl.trim(),

      status,

      cuisine: (cuisineSearch.trim() || cuisine).trim() || null,
      mealType: mealType.trim() || null,
      chefId: resolvedChefId,
      cookingStyleId: resolvedCookingStyleId,
      preparationTimeMinutes: preparationTimeMinutes.trim()
        ? Number(preparationTimeMinutes)
        : null,
      cookingTimeMinutes: cookingTimeMinutes.trim()
        ? Number(cookingTimeMinutes)
        : null,
      tagIds: resolvedTagIds,

      ingredients: formIngredients.map((item) => ({
        ingredientId: item.ingredientId,

        quantity: Number(item.quantity),

        unit: item.unit,
      })),

      procedures: procedures.map((item, index) => ({
        ...item,

        stepNumber: index + 1,

        title: item.title.trim(),

        description: item.description.trim(),
      })),
    };

    if (
      request.ingredients.some(
        (item) =>
          !item.ingredientId ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0,
      ) ||
      request.procedures.some(
        (item) => !item.title.trim() || !item.description.trim(),
      )
    ) {
      showMessage(
        "Validation",

        "Check ingredient quantities and ensure every procedure has a title and description.",
      );

      return;
    }

    try {
      let savedRecipeId = recipeId;

      if (isNew) {
        const created = await recipeApi.create(request);

        const createdResult = created as unknown as {
          id?: number;

          recipeId?: number;

          data?: { id?: number; recipeId?: number };
        };

        savedRecipeId =
          createdResult?.id ??
          createdResult?.recipeId ??
          createdResult?.data?.id ??
          createdResult?.data?.recipeId ??
          0;

        if (!Number.isInteger(savedRecipeId) || savedRecipeId <= 0) {
          throw new Error(
            "Recipe was created, but the API response did not include its ID. Make recipeApi.create return the created recipe or its ID so the image can be uploaded.",
          );
        }
      } else {
        await recipeApi.update(recipeId, request);
      }

      if (selectedImage) {
        setUploadingImage(true);
        await uploadRecipeImage(savedRecipeId);
      }

      let nutritionSaveWarning = "";
      if (
        showNutrition &&
        Object.values(nutrition).some((value) => value.trim() !== "")
      ) {
        const apiBaseUrl = (
          process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"
        ).replace(/\/$/, "");
        const token = await getStoredAuthToken();
        const nutritionPayload = {
          caloriesKcal: nutrition.caloriesKcal.trim()
            ? Number(nutrition.caloriesKcal)
            : null,
          proteinGrams: nutrition.proteinGrams.trim()
            ? Number(nutrition.proteinGrams)
            : null,
          carbohydratesGrams: nutrition.carbohydratesGrams.trim()
            ? Number(nutrition.carbohydratesGrams)
            : null,
          fatGrams: nutrition.fatGrams.trim()
            ? Number(nutrition.fatGrams)
            : null,
          fiberGrams: nutrition.fiberGrams.trim()
            ? Number(nutrition.fiberGrams)
            : null,
          sugarGrams: nutrition.sugarGrams.trim()
            ? Number(nutrition.sugarGrams)
            : null,
          sodiumMilligrams: nutrition.sodiumMilligrams.trim()
            ? Number(nutrition.sodiumMilligrams)
            : null,
          dataSource: "Manual entry",
          isVerified: nutritionVerified,
        };
        const nutritionUrl = `${apiBaseUrl}/recipes/${savedRecipeId}/nutrition`;
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        try {
          // Many REST controllers expose nutrition creation as POST rather than PUT.
          let response = await fetch(nutritionUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(nutritionPayload),
          });
          if (response.status === 405) {
            response = await fetch(nutritionUrl, {
              method: "PUT",
              headers,
              body: JSON.stringify(nutritionPayload),
            });
          }
          if (!response.ok) {
            nutritionSaveWarning = `The recipe was saved, but nutrition could not be saved (HTTP ${response.status}). Check the nutrition controller route and allowed method.`;
          }
        } catch {
          nutritionSaveWarning =
            "The recipe was saved, but nutrition could not be saved because the API could not be reached.";
        }
      }

      setSuccessTitle(isNew ? "Recipe Created!" : "Recipe Updated!");

      const baseSuccessMessage = isNew
        ? `"${name.trim()}" has been created successfully.`
        : `"${name.trim()}" has been updated successfully.`;
      const metadataSuccessMessage = newlySavedDetails.length
        ? `\n\nNew details saved:\n${newlySavedDetails.map((item) => `• ${item}`).join("\n")}`
        : "";
      setSuccessMessage(`${baseSuccessMessage}${metadataSuccessMessage}`);
      if (nutritionSaveWarning) {
        setSuccessMessage(
          (previous) => `${previous}\n\n${nutritionSaveWarning}`,
        );
      }

      setSuccessAction(isNew ? "list" : "back");
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Unable to save recipe:", error);

      showMessage("Save failed", getErrorMessage(error));
    } finally {
      setSaving(false);

      setUploadingImage(false);
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deleting) return;

    setDeleting(true);

    try {
      await recipeApi.delete(Number(id));

      setDeleteModalVisible(false);

      setSuccessTitle("Recipe Deleted!");

      setSuccessMessage(`"${name}" has been deleted successfully.`);

      setSuccessAction("back");

      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Unable to delete recipe:", error);

      showMessage("Delete failed", getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);

    if (successAction === "list") {
      router.replace("/admin/recipes");
    } else if (successAction === "back") {
      router.replace("/admin/recipes");
    }

    setSuccessAction(null);
  };

  const updateIngredient = (
    index: number,

    key: keyof FormIngredient,

    value: string | number,
  ) => {
    setFormIngredients((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addIngredient = () => {
    const ingredientToAdd = selectedSearchIngredient;

    if (!ingredientToAdd) {
      Alert.alert(
        "Select Ingredient",

        "Search and select an ingredient from the dropdown first.",
      );

      return;
    }

    if (
      formIngredients.some((item) => item.ingredientId === ingredientToAdd.id)
    ) {
      Alert.alert(
        "Ingredient already added",

        `${ingredientToAdd.name} is already in this recipe.`,
      );

      return;
    }

    setFormIngredients((previous) => [
      {
        ingredientId: ingredientToAdd.id,

        quantity: "1",

        unit: getIngredientDefinedUnit(ingredientToAdd),
      },

      ...previous,
    ]);

    setIngredientSearch("");

    setSelectedSearchIngredient(null);

    setExpandedIngredientIndex(null);
  };

  const removeIngredient = (index: number) => {
    setFormIngredients((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );

    setExpandedIngredientIndex((current) => {
      if (current === null || current === index) return null;

      return current > index ? current - 1 : current;
    });
  };

  const updateProcedure = (
    index: number,

    key: keyof FormProcedure,

    value: string | number,
  ) => {
    setProcedures((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addProcedure = () => {
    setProcedures((previous) => [
      ...previous,

      {
        stepNumber: previous.length + 1,

        title: "",

        description: "",
      },
    ]);
  };

  const removeProcedure = (index: number) => {
    setProcedures((previous) =>
      previous

        .filter((_, itemIndex) => itemIndex !== index)

        .map((item, itemIndex) => ({
          ...item,

          stepNumber: itemIndex + 1,
        })),
    );
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) return <EditRecipeSkeleton />;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable onPress={() => handleBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#17231E" />
          </Pressable>

          <AppText style={styles.headerTitle}>
            {isNew ? "Create Recipe" : "Edit Recipe"}
          </AppText>

          <Pressable onPress={handleSave} disabled={saving}>
            <AppText style={styles.saveText}>
              {saving
                ? uploadingImage
                  ? "Uploading image..."
                  : "Saving..."
                : "Save"}
            </AppText>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.forma}>
            <AppText style={styles.label}>Recipe Title</AppText>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken Biryani"
              placeholderTextColor="#8A938E"
            />

            <AppText style={styles.label}>Category</AppText>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <View style={styles.chipContainer}>
                {categories
                  .filter((category) =>
                    category.name
                      .toLowerCase()
                      .includes(categorySearch.trim().toLowerCase()),
                  )
                  .map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.chip,

                        categoryId === category.id && styles.chipActive,
                      ]}
                      onPress={() => setCategoryId(category.id)}
                    >
                      <AppText
                        style={[
                          styles.chipText,

                          categoryId === category.id && styles.chipTextActive,
                        ]}
                      >
                        {category.name}
                      </AppText>
                    </Pressable>
                  ))}
              </View>
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <AppText style={styles.label}>Base Servings</AppText>

                <TextInput
                  style={styles.input}
                  value={baseServings}
                  onChangeText={setBaseServings}
                  keyboardType="numeric"
                  placeholder="4"
                  placeholderTextColor="#8A938E"
                />
              </View>

              <View style={styles.flex1}>
                <AppText style={styles.label}>Status</AppText>

                <View style={styles.statusToggle}>
                  <Pressable
                    style={[
                      styles.statusBtn,

                      status === RECIPE_STATUS.DRAFT && styles.statusBtnActive,
                    ]}
                    onPress={() => setStatus(RECIPE_STATUS.DRAFT)}
                  >
                    <AppText
                      style={[
                        styles.statusText,

                        status === RECIPE_STATUS.DRAFT &&
                        styles.statusTextActive,
                      ]}
                    >
                      Draft
                    </AppText>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.statusBtn,

                      status === RECIPE_STATUS.PUBLISHED &&
                      styles.statusBtnActive,
                    ]}
                    onPress={() => setStatus(RECIPE_STATUS.PUBLISHED)}
                  >
                    <AppText
                      style={[
                        styles.statusText,

                        status === RECIPE_STATUS.PUBLISHED &&
                        styles.statusTextActive,
                      ]}
                    >
                      Published
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>

            <AppText style={styles.label}>Base Cooked Weight (grams)</AppText>

            <TextInput
              style={styles.input}
              value={baseCookedWeightGrams}
              onChangeText={setBaseCookedWeightGrams}
              keyboardType="decimal-pad"
              placeholder="e.g. 260"
              placeholderTextColor="#8A938E"
            />

            <AppText style={styles.helperText}>
              Total weight of the cooked recipe for the base servings.
            </AppText>

            <View style={styles.detailsHero}>
              <View style={styles.detailsHeroHeader}>
                <View style={styles.detailsHeroIcon}>
                  <Ionicons name="options-outline" size={22} color="#FFFFFF" />
                </View>

                <View style={styles.detailsHeroCopy}>
                  <AppText style={styles.detailsHeroTitle}>Recipe details</AppText>
                  <AppText style={styles.detailsHeroSubtitle}>
                    Make this recipe easier to discover
                  </AppText>
                </View>

                <Pressable
                  onPress={() => setShowAdvanced((v) => !v)}
                  style={styles.detailsToggle}
                  accessibilityRole="button"
                >
                  <AppText style={styles.detailsToggleText}>
                    {showAdvanced ? "Hide" : isNew ? "Add" : "Edit"}
                  </AppText>
                  <Ionicons
                    name={showAdvanced ? "chevron-up" : "chevron-down"}
                    size={15}
                    color="#176747"
                  />
                </Pressable>
              </View>

              <View style={styles.detailsSummaryRow}>
                <View style={styles.summaryPill}>
                  <Ionicons name="person-outline" size={11} color="#DDF4E7" />
                  <AppText style={styles.summaryPillText}>Chef</AppText>
                </View>

                <View style={styles.summaryPill}>
                  <Ionicons name="globe-outline" size={11} color="#DDF4E7" />
                  <AppText style={styles.summaryPillText}>
                    {cuisine.trim() || "Cuisine"}
                  </AppText>
                </View>

                {/* <View style={styles.summaryPill}>
                  <Ionicons name="restaurant-outline" size={11} color="#DDF4E7" />
                  <AppText style={styles.summaryPillText}>
                    {mealType.trim() || "Meal"}
                  </AppText>
                </View> */}

                <View style={styles.summaryPill}>
                  <Ionicons name="pricetag-outline" size={11} color="#DDF4E7" />
                  <AppText style={styles.summaryPillText}>
                    {tagIds.length > 0
                      ? `${tagIds.length} Tags`
                      : "Tags"}
                  </AppText>
                </View>
              </View>
            </View>
            {showAdvanced && (
              <View style={styles.metadataPanel}>
                <View style={styles.metadataGroupHeading}>
                  <View style={styles.metadataGroupIcon}>
                    <Ionicons name="people-outline" size={16} color="#176747" />
                  </View>
                  <View>
                    <AppText style={styles.metadataGroupTitle}>
                      People & style
                    </AppText>
                    <AppText style={styles.metadataGroupSubtitle}>
                      Who made it and how it is prepared
                    </AppText>
                  </View>
                </View>
                <AppText style={styles.label}>Chef</AppText>
                <View style={styles.metadataCreateRow}>
                  <TextInput
                    style={[styles.input, styles.metadataCreateInput]}
                    value={chefSearch}
                    onChangeText={setChefSearch}
                    placeholder="Search or enter a chef…"
                    placeholderTextColor="#8A938E"
                    autoCapitalize="words"
                  />
                </View>
                {!!chefSearch.trim() &&
                  !metadataOptions.chefs.some(
                    (x) =>
                      x.name.toLowerCase() === chefSearch.trim().toLowerCase(),
                  ) && (
                    <AppText style={styles.newValueLabel}>
                      NEW · Saved when you save the recipe
                    </AppText>
                  )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.cuisineScroller}
                >
                  {metadataOptions.chefs
                    .filter((x) =>
                      x.name.toLowerCase().includes(chefSearch.toLowerCase()),
                    )
                    .map((x) => (
                      <Pressable
                        key={x.id}
                        onPress={() => {
                          if (chefId === x.id) {
                            setChefId(null);
                            setChefSearch("");
                          } else {
                            setChefId(x.id);
                            setChefSearch(x.name);
                          }
                        }}
                        style={[
                          styles.optionChip,
                          chefId === x.id && styles.optionChipSelected,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.optionChipText,
                            chefId === x.id && styles.optionChipTextSelected,
                          ]}
                        >
                          {chefId === x.id ? "✓ " : ""}
                          {x.name}
                        </AppText>
                      </Pressable>
                    ))}
                </ScrollView>
                <AppText style={styles.label}>Cooking style</AppText>
                <View style={styles.metadataCreateRow}>
                  <TextInput
                    style={[styles.input, styles.metadataCreateInput]}
                    value={cookingStyleSearch}
                    onChangeText={setCookingStyleSearch}
                    placeholder="Search or enter a cooking style…"
                    placeholderTextColor="#8A938E"
                    autoCapitalize="words"
                  />
                </View>
                {!!cookingStyleSearch.trim() &&
                  !metadataOptions.cookingStyles.some(
                    (x) =>
                      x.name.toLowerCase() ===
                      cookingStyleSearch.trim().toLowerCase(),
                  ) && (
                    <AppText style={styles.newValueLabel}>
                      NEW · Saved when you save the recipe
                    </AppText>
                  )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.cuisineScroller}
                >
                  {metadataOptions.cookingStyles
                    .filter((x) =>
                      x.name
                        .toLowerCase()
                        .includes(cookingStyleSearch.toLowerCase()),
                    )
                    .map((x) => (
                      <Pressable
                        key={x.id}
                        onPress={() => {
                          setCookingStyleId(
                            cookingStyleId === x.id ? null : x.id,
                          );
                          setCookingStyleSearch("");
                        }}
                        style={[
                          styles.optionChip,
                          cookingStyleId === x.id && styles.optionChipSelected,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.optionChipText,
                            cookingStyleId === x.id &&
                            styles.optionChipTextSelected,
                          ]}
                        >
                          {cookingStyleId === x.id ? "✓ " : ""}
                          {x.name}
                        </AppText>
                      </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.detailsDivider} />

                <AppText style={styles.label}>Cuisine</AppText>
                <View style={styles.metadataCreateRow}>
                  <TextInput
                    style={[styles.input, styles.metadataCreateInput]}
                    value={cuisineSearch}
                    onChangeText={setCuisineSearch}
                    placeholder="Search or enter a cuisine…"
                    placeholderTextColor="#8A938E"
                    autoCapitalize="words"
                  />
                </View>
                {!!cuisineSearch.trim() &&
                  !metadataOptions.cuisines.some(
                    (x) =>
                      x.name.toLowerCase() ===
                      cuisineSearch.trim().toLowerCase(),
                  ) && (
                    <AppText style={styles.newValueLabel}>
                      NEW · Saved with this recipe
                    </AppText>
                  )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.cuisineScroller}
                >
                  {metadataOptions.cuisines
                    .filter((item) =>
                      item.name
                        .toLowerCase()
                        .includes(cuisineSearch.trim().toLowerCase()),
                    )
                    .map((item) => {
                      const selected =
                        cuisine.trim().toLowerCase() ===
                        item.name.trim().toLowerCase();
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            if (selected) {
                              setCuisine("");
                              setCuisineSearch("");
                            } else {
                              setCuisine(item.name);
                              setCuisineSearch(item.name);
                            }
                          }}
                          style={[
                            styles.optionChip,
                            selected && styles.optionChipSelected,
                          ]}
                        >
                          <AppText
                            style={[
                              styles.optionChipText,
                              selected && styles.optionChipTextSelected,
                            ]}
                          >
                            {selected ? "✓ " : ""}
                            {item.name}
                          </AppText>
                        </Pressable>
                      );
                    })}
                </ScrollView>
                {metadataOptions.cuisines.length === 0 ? (
                  <AppText style={styles.helperText}>
                    No saved cuisines yet. Enter a cuisine; it will be saved
                    when you press the recipe Save button.
                  </AppText>
                ) : null}
                {/* <AppText style={styles.label}>Meal type</AppText>
                <View style={styles.optionWrap}>
                  {[
                    "Breakfast",
                    "Lunch",
                    "Dinner",
                    "Snack",
                    "Dessert",
                    "Beverage",
                  ].map((x) => (
                    <Pressable
                      key={x}
                      onPress={() => setMealType(mealType === x ? "" : x)}
                      style={[
                        styles.optionChip,
                        mealType === x && styles.optionChipSelected,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.optionChipText,
                          mealType === x && styles.optionChipTextSelected,
                        ]}
                      >
                        {mealType === x ? "✓ " : ""}
                        {x}
                      </AppText>
                    </Pressable>
                  ))}
                </View> */}
                <View style={styles.detailsDivider} />
                <View style={styles.metadataGroupHeading}>
                  <View style={styles.metadataGroupIcon}>
                    <Ionicons name="time-outline" size={16} color="#176747" />
                  </View>
                  <View>
                    <AppText style={styles.metadataGroupTitle}>Timing</AppText>
                    <AppText style={styles.metadataGroupSubtitle}>
                      A quick guide for meal planning
                    </AppText>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <AppText style={styles.label}>Preparation</AppText>
                    <View style={styles.minuteInputWrap}>
                      <TextInput
                        style={styles.minuteInput}
                        value={preparationTimeMinutes}
                        onChangeText={setPreparationTimeMinutes}
                        keyboardType="numeric"
                        placeholder="15"
                        placeholderTextColor="#8A938E"
                      />
                      <AppText style={styles.minuteSuffix}>min</AppText>
                    </View>
                  </View>
                  <View style={styles.flex1}>
                    <AppText style={styles.label}>Cooking</AppText>
                    <View style={styles.minuteInputWrap}>
                      <TextInput
                        style={styles.minuteInput}
                        value={cookingTimeMinutes}
                        onChangeText={setCookingTimeMinutes}
                        keyboardType="numeric"
                        placeholder="30"
                        placeholderTextColor="#8A938E"
                      />
                      <AppText style={styles.minuteSuffix}>min</AppText>
                    </View>
                  </View>
                </View>
                <View style={styles.detailsDivider} />
                <View style={styles.metadataGroupHeading}>
                  <View style={styles.metadataGroupIcon}>
                    <Ionicons
                      name="pricetags-outline"
                      size={16}
                      color="#176747"
                    />
                  </View>
                  <View>
                    <AppText style={styles.metadataGroupTitle}>tags</AppText>
                    <AppText style={styles.metadataGroupSubtitle}>
                      Choose tags that describe the recipe
                    </AppText>
                  </View>
                </View>
                <View style={styles.metadataCreateRow}>
                  <TextInput
                    style={[styles.input, styles.metadataCreateInput]}
                    value={tagSearch}
                    onChangeText={setTagSearch}
                    placeholder="Search or enter a new tag…"
                    placeholderTextColor="#8A938E"
                    autoCapitalize="words"
                  />
                </View>
                {parseCommaSeparatedNames(tagSearch).some(
                  (typedTag) =>
                    !metadataOptions.tags.some(
                      (x) => x.name.toLowerCase() === typedTag.toLowerCase(),
                    ),
                ) && (
                    <AppText style={styles.newValueLabel}>
                      NEW ·{" "}
                      {parseCommaSeparatedNames(tagSearch)
                        .filter(
                          (typedTag) =>
                            !metadataOptions.tags.some(
                              (x) =>
                                x.name.toLowerCase() === typedTag.toLowerCase(),
                            ),
                        )
                        .join(", ")}{" "}
                      · Saved when you save the recipe
                    </AppText>
                  )}
                <AppText style={styles.helperText}>
                  Enter multiple tags separated by commas, for example: tasty,
                  healthy, spicy.
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.cuisineScroller}
                >
                  {metadataOptions.tags
                    .filter(
                      (x) =>
                        !tagSearch.trim() ||
                        x.name.toLowerCase().includes(tagSearch.toLowerCase()),
                    )
                    .map((x) => (
                      <Pressable
                        key={x.id}
                        onPress={() =>
                          setTagIds((old) =>
                            old.includes(x.id)
                              ? old.filter((id) => id !== x.id)
                              : [...old, x.id],
                          )
                        }
                        style={[
                          styles.optionChip,
                          tagIds.includes(x.id) && styles.optionChipSelected,
                        ]}
                      >
                        <AppText
                          style={[
                            styles.optionChipText,
                            tagIds.includes(x.id) &&
                            styles.optionChipTextSelected,
                          ]}
                        >
                          {tagIds.includes(x.id) ? "✓ " : ""}
                          {x.name}
                        </AppText>
                      </Pressable>
                    ))}
                </ScrollView>
                {tagIds.length > 0 && (
                  <AppText style={styles.selectedCountText}>
                    {tagIds.length} tag{tagIds.length === 1 ? "" : "s"} selected
                  </AppText>
                )}
              </View>
            )}
            <View style={styles.sectionHeaderRow}>
              <View>
                <AppText style={styles.metadataSectionTitle}>
                  Nutrition <AppText style={styles.helperText}>(Optional)</AppText >
                </AppText>
                <AppText style={styles.helperText}>
                  Nutrition Value of this Recipe
                </AppText>
              </View>
              <Pressable
                onPress={() => setShowNutrition((v) => !v)}
                style={styles.outlineSmallButton}
              >
                <AppText style={styles.outlineSmallButtonText}>
                  {showNutrition ? "Hide" : isNew ? "Add" : "Add / Edit"}
                </AppText>
              </Pressable>
            </View>
            {showNutrition && (
              <View style={styles.metadataPanel}>
                {(
                  [
                    ["caloriesKcal", "Calories (kcal)"],
                    ["proteinGrams", "Protein (g)"],
                    ["carbohydratesGrams", "Carbohydrates (g)"],
                    ["fatGrams", "Fat (g)"],
                    ["fiberGrams", "Fiber (g)"],
                    ["sugarGrams", "Sugar (g)"],
                    ["sodiumMilligrams", "Sodium (mg)"],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key}>
                    <AppText style={styles.label}>{label}</AppText>
                    <TextInput
                      style={styles.input}
                      value={nutrition[key]}
                      onChangeText={(value) =>
                        setNutrition((previous) => ({
                          ...previous,
                          [key]: value,
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#8A938E"
                    />
                  </View>
                ))}
                <Pressable
                  onPress={() => setNutritionVerified((v) => !v)}
                  style={styles.verifyRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      nutritionVerified && styles.checkboxChecked,
                    ]}
                  >
                    {nutritionVerified && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.verifyTitle}>Nutrition verified</AppText>
                    <AppText style={styles.helperText}>
                      Only enable after checking the values.
                    </AppText>
                  </View>
                </Pressable>
              </View>
            )}

            <AppText style={styles.label}>Recipe Image</AppText>

            {selectedImage?.uri || photoUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage?.uri || photoUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />

                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel selected image"
                >
                  <Ionicons name="close-circle" size={24} color="#B33B31" />

                  <AppText style={styles.removeImageText}>
                    {selectedImage
                      ? "Cancel selected image"
                      : "Keep current image"}
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <AppText style={styles.imageHelperText}>
                Choose a photo from your device. JPG, PNG or WebP, up to 5 MB.
              </AppText>
            )}

            <Pressable
              style={styles.chooseImageButton}
              onPress={chooseRecipeImage}
            >
              <Ionicons name="image-outline" size={20} color="#1F7655" />

              <AppText style={styles.chooseImageButtonText}>
                {selectedImage
                  ? "Choose a different image"
                  : photoUrl
                    ? "Replace image"
                    : "Browse image"}
              </AppText>
            </Pressable>

            <AppText style={styles.label}>Description</AppText>

            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the recipe..."
              placeholderTextColor="#8A938E"
              multiline
              numberOfLines={3}
            />

            <AppText style={styles.sectionTitle}>Ingredients</AppText>

            <View style={styles.ingredientSearchRow}>
              <View style={styles.ingredientSearchContainer}>
                <Ionicons name="search-outline" size={20} color="#68736D" />

                <TextInput
                  style={styles.ingredientSearchInput}
                  value={ingredientSearch}
                  onChangeText={(value) => {
                    setIngredientSearch(value);

                    setSelectedSearchIngredient(null);
                  }}
                  placeholder="Search ingredients..."
                  placeholderTextColor="#8A938E"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {ingredientSearch.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setIngredientSearch("");

                      setSelectedSearchIngredient(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#8A938E" />
                  </Pressable>
                )}
              </View>

              <Pressable
                style={[
                  styles.addIngredientButton,
                  !selectedSearchIngredient &&
                  styles.addIngredientButtonDisabled,
                ]}
                onPress={addIngredient}
                accessibilityRole="button"
                accessibilityLabel="Add selected ingredient"
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <AppText style={styles.addIngredientButtonText}>Add</AppText>
              </Pressable>
            </View>

            {ingredientSearch.trim().length > 0 && (
              <View style={styles.searchResultsContainer}>
                {filteredIngredients.length > 0 ? (
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.searchResultsList}
                  >
                    {filteredIngredients.map((ingredient) => {
                      const isSelected =
                        selectedSearchIngredient?.id === ingredient.id;

                      return (
                        <Pressable
                          key={ingredient.id}
                          style={[
                            styles.searchResultItem,

                            isSelected && styles.searchResultItemSelected,
                          ]}
                          onPress={() => {
                            const alreadyAdded = formIngredients.some(
                              (item) => item.ingredientId === ingredient.id,
                            );

                            if (alreadyAdded) {
                              Alert.alert(
                                "Ingredient already added",

                                `${ingredient.name} is already in this recipe.`,
                              );

                              return;
                            }

                            // Select first, then use the adjacent Add button.
                            // This keeps Add functional and lets the user confirm
                            // which ingredient they are adding.
                            setSelectedSearchIngredient(ingredient);
                          }}
                        >
                          <AppText
                            style={[
                              styles.searchResultText,

                              isSelected && styles.searchResultTextSelected,
                            ]}
                          >
                            {ingredient.name}
                          </AppText>

                          {isSelected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#1F7655"
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <AppText style={styles.noIngredientsText}>
                    No matching ingredients found.
                  </AppText>
                )}
              </View>
            )}

            {formIngredients.map((item, index) => {
              const selectedIngredient = ingredients.find(
                (ingredient) => ingredient.id === item.ingredientId,
              );

              const isExpanded = expandedIngredientIndex === index;

              const availableIngredients = ingredients.filter(
                (ingredient) =>
                  ingredient.id !== item.ingredientId &&
                  ingredient.name

                    .toLowerCase()

                    .includes(ingredientSearch.trim().toLowerCase()),
              );

              return (
                <View
                  key={`${item.ingredientId}-${index}`}
                  style={styles.ingredientCard}
                >
                  <View style={styles.ingredientHeader}>
                    <AppText style={styles.ingredientLabel}>
                      Ingredient {index + 1}
                    </AppText>

                    <Pressable
                      onPress={() => removeIngredient(index)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove ingredient"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#B33B31"
                      />
                    </Pressable>
                  </View>

                  <View style={styles.selectedIngredientRow}>
                    <View
                      style={[
                        styles.chip,

                        styles.chipActive,

                        styles.selectedChip,
                      ]}
                    >
                      <AppText
                        style={[styles.chipText, styles.chipTextActive]}
                        numberOfLines={1}
                      >
                        {selectedIngredient?.name ?? "Select ingredient"}
                      </AppText>
                    </View>

                    <Pressable
                      style={styles.toggleIngredientButton}
                      onPress={() =>
                        setExpandedIngredientIndex((current) =>
                          current === index ? null : index,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={
                        isExpanded
                          ? "Hide ingredient choices"
                          : "Show ingredient choices"
                      }
                    >
                      <Ionicons
                        name={isExpanded ? "close" : "chevron-down"}
                        size={18}
                        color="#1F7655"
                      />
                    </Pressable>
                  </View>

                  {isExpanded && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.expandedIngredientList}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.chipContainer}>
                        {availableIngredients.map((ingredient) => (
                          <Pressable
                            key={ingredient.id}
                            style={styles.chip}
                            onPress={() => {
                              setFormIngredients((previous) =>
                                previous.map((formItem, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                      ...formItem,
                                      ingredientId: ingredient.id,
                                      unit: getIngredientDefinedUnit(
                                        ingredient,
                                      ),
                                    }
                                    : formItem,
                                ),
                              );

                              setExpandedIngredientIndex(null);

                              setIngredientSearch("");

                              setSelectedSearchIngredient(null);
                            }}
                          >
                            <AppText style={styles.chipText} numberOfLines={1}>
                              {ingredient.name}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {isExpanded && availableIngredients.length === 0 && (
                    <AppText style={styles.noIngredientsText}>
                      No other ingredients available.
                    </AppText>
                  )}

                  <View style={styles.quantityRow}>
                    <TextInput
                      style={styles.quantityInput}
                      value={item.quantity}
                      onChangeText={(value) =>
                        updateIngredient(index, "quantity", value)
                      }
                      keyboardType="decimal-pad"
                      placeholder="Qty"
                      placeholderTextColor="#8A938E"
                    />

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.unitContainer}>
                        {getCompatibleUnits(
                          getIngredientDefinedUnit(selectedIngredient),
                        ).map((unit) => (
                          <Pressable
                            key={unit}
                            style={[
                              styles.unitChip,

                              item.unit === unit && styles.unitChipActive,
                            ]}
                            onPress={() =>
                              updateIngredient(index, "unit", unit)
                            }
                          >
                            <AppText
                              style={[
                                styles.unitText,

                                item.unit === unit && styles.unitTextActive,
                              ]}
                            >
                              {unit}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              );
            })}

            <AppText style={styles.sectionTitle}>Procedure</AppText>

            {procedures.map((item, index) => (
              <View key={index} style={styles.procedureCard}>
                <View style={styles.procedureHeader}>
                  <View style={styles.stepBadge}>
                    <AppText style={styles.stepBadgeText}>{item.stepNumber}</AppText>
                  </View>

                  <AppText style={styles.procedureLabel}>
                    Step {item.stepNumber}
                  </AppText>

                  <Pressable onPress={() => removeProcedure(index)}>
                    <Ionicons name="trash-outline" size={20} color="#B33B31" />
                  </Pressable>
                </View>

                <TextInput
                  style={styles.input}
                  value={item.title}
                  onChangeText={(value) =>
                    updateProcedure(index, "title", value)
                  }
                  placeholder="Step title"
                  placeholderTextColor="#8A938E"
                />

                <TextInput
                  style={[styles.input, styles.textArea, { marginTop: 8 }]}
                  value={item.description}
                  onChangeText={(value) =>
                    updateProcedure(index, "description", value)
                  }
                  placeholder="Step description"
                  placeholderTextColor="#8A938E"
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            <Pressable style={styles.addButton} onPress={addProcedure}>
              <AppText style={styles.addButtonText}>Add Step</AppText>
            </Pressable>

            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <AppText style={styles.saveButtonText}>
                {saving
                  ? uploadingImage
                    ? "Uploading image..."
                    : "Saving..."
                  : isNew
                    ? "Create Recipe"
                    : "Save Changes"}
              </AppText>
            </Pressable>

            {!isNew && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <AppText style={styles.deleteButtonText}>Delete Recipe</AppText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={28} color="#B33B31" />
            </View>

            <AppText style={styles.popupTitle}>Delete Recipe?</AppText>

            <AppText style={styles.popupMessage}>
              Are you sure you want to delete "{name}"?
            </AppText>

            <View style={styles.popupActions}>
              <Pressable
                style={styles.cancelPopupButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <AppText style={styles.cancelPopupText}>Cancel</AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmDeleteButton,
                  deleting && styles.disabledButton,
                ]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <AppText style={styles.confirmDeleteText}>
                  {deleting ? "Deleting..." : "Delete"}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={34} color="#1F7655" />
            </View>

            <AppText style={styles.popupTitle}>{successTitle}</AppText>

            <AppText style={styles.popupMessage}>{successMessage}</AppText>

            <Pressable
              style={styles.successPopupButton}
              onPress={closeSuccessModal}
            >
              <AppText style={styles.successPopupText}>Continue</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  popupOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.45)",

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: 24,
  },

  popupCard: {
    width: "100%",

    maxWidth: 400,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    padding: 24,

    alignItems: "center",
  },

  deleteIconCircle: {
    width: 64,

    height: 64,

    borderRadius: 32,

    backgroundColor: "#FCEBEA",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 16,
  },

  successIconCircle: {
    width: 64,

    height: 64,

    borderRadius: 32,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 16,
  },

  popupTitle: {
    fontSize: 20,

    fontWeight: "800",

    color: "#17231E",

    textAlign: "center",
  },

  popupMessage: {
    fontSize: 14,

    lineHeight: 21,

    color: "#68736D",

    textAlign: "center",

    marginTop: 8,
  },

  popupActions: {
    flexDirection: "row",

    width: "100%",

    gap: 10,

    marginTop: 22,
  },

  cancelPopupButton: {
    flex: 1,

    paddingVertical: 13,

    borderRadius: 14,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",
  },

  cancelPopupText: {
    color: "#17231E",

    fontSize: 14,

    fontWeight: "700",
  },

  confirmDeleteButton: {
    flex: 1,

    paddingVertical: 13,

    borderRadius: 14,

    backgroundColor: "#B83B32",

    alignItems: "center",

    justifyContent: "center",
  },

  confirmDeleteText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.65,
  },

  successPopupButton: {
    width: "100%",

    marginTop: 24,

    paddingVertical: 14,

    borderRadius: 14,

    backgroundColor: "#1F7655",

    alignItems: "center",
  },

  successPopupText: {
    fontSize: 15,

    fontWeight: "700",

    color: "#FFFFFF",
  },

  container: {
    flex: 1,

    backgroundColor: "#F7F8F3",
  },
  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 60,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 16,
  },

  form: {
    width: "100%",
    flexGrow: 1,
  },

  backButton: {
    width: 44,

    height: 44,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 10,
  },

  headerTitle: {
    fontSize: 18,

    fontWeight: "700",

    color: "#17231E",
  },

  saveText: {
    fontSize: 16,

    fontWeight: "700",

    color: "#1F7655",
    paddingRight: 15,
  },

  forma: {
    flex: 1,
  },

  label: {
    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",

    marginBottom: 8,

    marginTop: 16,
  },

  input: {
    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    paddingHorizontal: 16,

    paddingVertical: 14,

    fontSize: 16,

    color: "#17231E",
  },

  textArea: {
    height: 80,

    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",

    gap: 12,
  },

  flex1: {
    flex: 1,
  },

  chipScroll: {
    marginBottom: 8,
  },

  chipContainer: {
    flexDirection: "row",

    gap: 8,
  },

  chip: {
    paddingHorizontal: 16,

    paddingVertical: 10,

    borderRadius: 12,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E5E8E3",
  },

  chipActive: {
    backgroundColor: "#1F7655",

    borderColor: "#1F7655",
  },

  chipText: {
    fontSize: 14,

    fontWeight: "600",

    color: "#68736D",
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  statusToggle: {
    flexDirection: "row",

    backgroundColor: "#E7F1EA",

    borderRadius: 12,

    padding: 4,
  },

  statusBtn: {
    flex: 1,

    paddingVertical: 10,

    alignItems: "center",

    borderRadius: 8,
  },

  statusBtnActive: {
    backgroundColor: "#FFFFFF",
  },

  statusText: {
    fontSize: 14,

    fontWeight: "600",

    color: "#68736D",
  },

  statusTextActive: {
    color: "#17231E",
  },

  sectionTitle: {
    fontSize: 20,

    fontWeight: "800",

    color: "#17231E",

    marginTop: 24,

    marginBottom: 12,
  },

  ingredientSearchRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    marginBottom: 12,
  },

  ingredientSearchContainer: {
    flex: 1,

    minWidth: 0,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    paddingHorizontal: 12,

    minHeight: 48,

    gap: 8,
  },

  ingredientSearchInput: {
    flex: 1,

    minWidth: 0,

    paddingVertical: 10,

    fontSize: 14,

    color: "#17231E",
  },

  addIngredientButton: {
    minHeight: 48,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 12,

    borderRadius: 14,

    backgroundColor: "#1F7655",
  },

  addIngredientButtonDisabled: {
    opacity: 0.55,
  },

  addIngredientButtonText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "700",
  },

  searchResultsContainer: {
    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    borderRadius: 14,

    marginTop: -4,

    marginBottom: 12,

    overflow: "hidden",
  },

  searchResultsList: {
    maxHeight: 220,
  },

  searchResultItem: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 14,

    paddingVertical: 12,

    borderBottomWidth: 1,

    borderBottomColor: "#F0F1ED",

    gap: 8,
  },

  searchResultItemSelected: {
    backgroundColor: "#E7F1EA",
  },

  searchResultText: {
    flex: 1,

    fontSize: 14,

    color: "#17231E",
  },

  searchResultTextSelected: {
    color: "#1F7655",

    fontWeight: "700",
  },

  noIngredientsText: {
    fontSize: 12,

    color: "#68736D",

    padding: 12,
  },

  ingredientCard: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },

  ingredientHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 12,
  },

  ingredientLabel: {
    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",
  },

  selectedIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
    marginBottom: 4,
  },

  selectedChip: {
    flex: 1,
    minWidth: 0,
  },

  toggleIngredientButton: {
    width: 30,

    height: 30,

    borderRadius: 15,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",
  },

  expandedIngredientList: {
    marginTop: 8,

    marginBottom: 4,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
    marginTop: 8,
  },

  quantityInput: {
    width: 80,
    minHeight: 46,
    backgroundColor: "#F7F8F3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#17231E",
  },

  unitContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unitChip: {
    paddingHorizontal: 12,

    paddingVertical: 10,

    borderRadius: 10,

    backgroundColor: "#F7F8F3",

    borderWidth: 1,

    borderColor: "#E5E8E3",
  },

  unitChipActive: {
    backgroundColor: "#1F7655",

    borderColor: "#1F7655",
  },

  unitText: {
    fontSize: 13,

    fontWeight: "600",

    color: "#68736D",
  },

  unitTextActive: {
    color: "#FFFFFF",
  },

  addButton: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#1F7655",

    borderStyle: "dashed",

    paddingVertical: 14,

    gap: 8,
  },

  addButtonText: {
    fontSize: 15,

    fontWeight: "700",

    color: "#1F7655",
  },

  procedureCard: {
    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 16,

    marginBottom: 12,
  },

  procedureHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 12,

    gap: 12,
  },

  stepBadge: {
    width: 32,

    height: 32,

    borderRadius: 16,

    backgroundColor: "#1F7655",

    alignItems: "center",

    justifyContent: "center",
  },

  stepBadgeText: {
    fontSize: 14,

    fontWeight: "700",

    color: "#FFFFFF",
  },

  procedureLabel: {
    flex: 1,

    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",
  },

  saveButton: {
    backgroundColor: "#1F7655",

    borderRadius: 16,

    paddingVertical: 16,

    alignItems: "center",

    marginTop: 24,
  },

  saveButtonText: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "700",
  },

  deleteButton: {
    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#F5D5D0",

    paddingVertical: 16,

    alignItems: "center",

    marginTop: 12,
  },

  deleteButtonText: {
    color: "#B33B31",

    fontSize: 16,

    fontWeight: "700",
  },

  newValueLabel: {
    color: "#A45A12",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  helperText: {
    fontSize: 12,

    color: "#68736D",

    marginTop: 6,
  },

  imageHelperText: {
    fontSize: 13,

    color: "#68736D",

    lineHeight: 19,

    marginBottom: 10,
  },

  imagePreviewContainer: {
    marginBottom: 10,
  },

  imagePreview: {
    width: "100%",

    height: 190,

    borderRadius: 16,

    backgroundColor: "#E7F1EA",
  },

  removeImageButton: {
    flexDirection: "row",

    alignItems: "center",

    alignSelf: "flex-start",

    gap: 6,

    marginTop: 8,
  },

  removeImageText: {
    fontSize: 13,

    fontWeight: "600",

    color: "#B33B31",
  },

  chooseImageButton: {
    minHeight: 48,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    paddingHorizontal: 14,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#1F7655",

    borderStyle: "dashed",
  },

  chooseImageButtonText: {
    fontSize: 14,

    fontWeight: "700",

    color: "#1F7655",
  },

  metadataSectionTitle: { fontSize: 17, fontWeight: "800", color: "#17231E" },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  outlineSmallButton: {
    borderWidth: 1,
    borderColor: "#C9D9D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  outlineSmallButtonText: { color: "#1F7655", fontSize: 12, fontWeight: "800" },
detailsHero: {
  width: "100%",
  padding: 14,
  marginTop: 14,
  marginBottom: 10,
  borderRadius: 18,
  backgroundColor: "#174F3B",
},

detailsHeroHeader: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

detailsHeroIcon: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#2B7557",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

detailsHeroCopy: {
  flex: 1,
  minWidth: 0,
},

detailsHeroTitle: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "800",
},

detailsHeroSubtitle: {
  color: "#C8E4D5",
  fontSize: 11,
  marginTop: 3,
},

detailsSummaryRow: {
  width: "100%",
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "stretch",
  gap: 5,
  marginTop: 13,
},

summaryPill: {
  flex: 1,
  minWidth: 0,
  height: 32,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  paddingHorizontal: 3,
  borderRadius: 18,
  backgroundColor: "#2A684F",
},

summaryPillText: {
  color: "#F1FFF6",
  fontSize: 9,
  fontWeight: "700",
  flexShrink: 1,
  textAlign: "center",
},

detailsEmptySummary: {
  color: "#C8E4D5",
  fontSize: 10,
},
detailsToggle: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  paddingHorizontal: 9,
  paddingVertical: 8,
  borderRadius: 10,
  backgroundColor: "#FFFFFF",
  flexShrink: 0,
  alignSelf: "center",
},
  detailsToggleText: { color: "#176747", fontSize: 11, fontWeight: "800" },
  metadataPanel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE4",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#173D2C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  metadataGroupHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    marginBottom: 13,
  },
  metadataGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E8F4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  metadataGroupTitle: { color: "#1A3025", fontSize: 13, fontWeight: "800" },
  metadataGroupSubtitle: { color: "#819087", fontSize: 10, marginTop: 2 },
  detailsDivider: { height: 1, backgroundColor: "#EAF0EC", marginVertical: 13 },
  minuteInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE6E0",
    backgroundColor: "#FAFCFA",
    borderRadius: 12,
    paddingRight: 12,
    marginBottom: 10,
  },
  minuteInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#17231E",
    fontSize: 14,
  },
  minuteSuffix: { color: "#829087", fontSize: 11, fontWeight: "700" },
  selectedCountText: {
    color: "#1F7655",
    fontSize: 11,
    fontWeight: "700",
    marginTop: -2,
    marginBottom: 2,
  },
  metadataCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
  },
  metadataCreateInput: {
    flex: 1,
    marginBottom: 0,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  cuisineScroller: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
    paddingBottom: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFE8E2",
    backgroundColor: "#F9FBF9",
  },
  optionChipSelected: { borderColor: "#1F7655", backgroundColor: "#E6F4EB" },
  optionChipText: { color: "#46554C", fontSize: 12, fontWeight: "600" },
  optionChipTextSelected: { color: "#176747", fontWeight: "800" },
  multilineInput: { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E8E2",
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#AAB9AF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1F7655", borderColor: "#1F7655" },
  verifyTitle: { color: "#17231E", fontWeight: "800", fontSize: 14 },
});
