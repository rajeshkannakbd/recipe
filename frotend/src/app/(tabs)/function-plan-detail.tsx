import AppText from "@/components/common/AppText";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,

  Animated,

  Image,
  Platform,
  Pressable,
  RefreshControl,

  ScrollView,

  StatusBar,

  StyleSheet,
  View
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import * as Print from "expo-print";

import { useLocalSearchParams, useRouter } from "expo-router";

import {
  functionPlanApi,

  FunctionPlanResponse,

  FunctionPlanShoppingListResponse,

  ShoppingListItemResponse,
} from "../../api/functionPlanApi";

import FunctionPlanDetailsSkeleton from "@/components/skeleton/FunctionPlanDetailsSkeleton";
import { recipeApi } from "../../api/recipeApi";

type RecipeMeta = {

  id: number;

  name: string;

  categoryName: string;

  mealType: string;

  imageUrl?: string;

};

type PlannedRecipe = {

  recipeId: number;

  recipeName: string;

  requiredServings: number;

  categoryName: string;

  mealType: string;

  imageUrl?: string;

};

const normalizeMealType = (

  value?: string | null,

  fallbackCategory?: string | null,

) => {

  const rawValue = (value ?? "").trim();

  const fallback = (fallbackCategory ?? "").trim();

  const label = rawValue || fallback || "Other";

  const normalized = label.toLowerCase();

  // Keep common meal labels consistent while preserving custom meal types from the recipe table.

  if (normalized.includes("breakfast")) return "Breakfast";

  if (normalized.includes("lunch")) return "Lunch";

  if (normalized.includes("dinner")) return "Dinner";

  if (normalized === "other") return "Other";

  return label;

};

const escapeHtml = (value: unknown) =>

  String(value ?? "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#39;");

const formatDate = (value?: string | null) => {

  if (!value) return "Not set";

  const datePart = value.slice(0, 10);

  const [year, month, day] = datePart.split("-");

  return year && month && day ? `${day}/${month}/${year}` : datePart;

};

const getMoney = (value: unknown) => {

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : null;

};

const formatQuantity = (value: unknown, unitValue: unknown) => {

  const rawUnit = String(unitValue ?? "").trim();

  const normalizedUnit = rawUnit.toLowerCase().replace(/[.\s]/g, "");

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {

    return `${String(value ?? "").trim()} ${rawUnit}`.trim();

  }

  const formatNumber = (number: number) =>

    number.toLocaleString("en-IN", {

      maximumFractionDigits: 3,

      minimumFractionDigits: 0,

    });

  // Display large metric quantities in practical shopping units (e.g. 2000 ml -> 2 L).

  const isMillilitres = [

    "ml",

    "milliliter",

    "milliliters",

    "millilitre",

    "millilitres",

  ].includes(normalizedUnit);

  const isGrams = ["g", "gram", "grams", "gm", "gms"].includes(normalizedUnit);

  if (isMillilitres && Math.abs(amount) >= 1000) {

    return `${formatNumber(amount / 1000)} L`;

  }

  if (isGrams && Math.abs(amount) >= 1000) {

    return `${formatNumber(amount / 1000)} kg`;

  }

  const displayUnit = isMillilitres ? "ml" : isGrams ? "g" : rawUnit;

  return `${formatNumber(amount)} ${displayUnit}`.trim();

};

const getItemEstimatedCost = (

  item: ShoppingListItemResponse & Record<string, unknown>,

) => {

  // Render only prices explicitly returned by the backend; never estimate/invent a price.

  return getMoney(

    item.estimatedCost ??

    item.EstimatedCost ??

    item.totalCost ??

    item.TotalCost ??

    item.totalPrice ??

    item.TotalPrice ??

    item.estimatedPrice ??

    item.EstimatedPrice,

  );

};

const getItemUnitPrice = (

  item: ShoppingListItemResponse & Record<string, unknown>,

) => {

  return getMoney(

    item.unitPrice ??

    item.UnitPrice ??

    item.pricePerUnit ??

    item.PricePerUnit ??

    item.price ??

    item.Price,

  );

};

const getItemImage = (

  item: ShoppingListItemResponse & Record<string, unknown>,

) => {

  const value =

    item.imageUrl ??

    item.ImageUrl ??

    item.ingredientImageUrl ??

    item.IngredientImageUrl ??

    item.photoUrl ??

    item.PhotoUrl ??

    item.image ??

    item.Image;

  return typeof value === "string" && /^https?:\/\//i.test(value.trim())

    ? value.trim()

    : null;

};

function AnimatedCard({

  children,

  delay = 0,

  style,

}: {

  children: React.ReactNode;

  delay?: number;

  style?: any;

}) {

  const progress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {

    const animation = Animated.timing(progress, {

      toValue: 1,

      duration: 420,

      delay,

      useNativeDriver: true,

    });

    animation.start();

    return () => animation.stop();

  }, [delay, progress]);

  return (

    <Animated.View

      style={[

        style,

        {

          opacity: progress,

          transform: [

            {

              translateY: progress.interpolate({

                inputRange: [0, 1],

                outputRange: [14, 0],

              }),

            },

          ],

        },

      ]}

    >

      {children}

    </Animated.View>

  );

}

export default function FunctionPlanDetailsScreen() {

  const router = useRouter();

  const params = useLocalSearchParams<{ planId?: string | string[] }>();

  const planId = Array.isArray(params.planId)

    ? params.planId[0]

    : params.planId;

  const [plan, setPlan] = useState<FunctionPlanResponse | null>(null);

  const [shoppingList, setShoppingList] =

    useState<FunctionPlanShoppingListResponse | null>(null);

  const [recipeMeta, setRecipeMeta] = useState<RecipeMeta[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(

    async (refresh = false) => {

      if (!planId || !/^\d+$/.test(planId)) {

        setLoading(false);

        Alert.alert(

          "Invalid function",

          "The function ID is missing or invalid.",

        );

        return;

      }

      setLoading(true);
      if (refresh) setRefreshing(true);

      const results = await Promise.allSettled([

        functionPlanApi.getById(Number(planId)),

        functionPlanApi.getShoppingList(Number(planId)),

        recipeApi.getAll(),

      ]);

      if (results[0].status === "fulfilled") {

        setPlan(results[0].value);

      } else {

        Alert.alert(

          "Unable to load function",

          results[0].reason instanceof Error

            ? results[0].reason.message

            : "Please try again.",

        );

      }

      if (results[1].status === "fulfilled") {

        setShoppingList(results[1].value);

      } else {

        setShoppingList(null);

        Alert.alert(

          "Unable to load shopping list",

          results[1].reason instanceof Error

            ? results[1].reason.message

            : "Please try again.",

        );

      }

      if (results[2].status === "fulfilled") {

        const response: any = results[2].value;

        const rows = Array.isArray(response)

          ? response

          : Array.isArray(response?.items)

            ? response.items

            : Array.isArray(response?.data)

              ? response.data

              : Array.isArray(response?.recipes)

                ? response.recipes

                : [];

        setRecipeMeta(

          rows

            .map((item: any) => ({

              id: Number(

                item?.id ?? item?.recipeId ?? item?.Id ?? item?.RecipeId,

              ),

              name: String(

                item?.name ??

                item?.recipeName ??

                item?.Name ??

                item?.RecipeName ??

                "",

              ),

              categoryName: String(

                item?.categoryName ??

                item?.CategoryName ??

                item?.category?.name ??

                "",

              ),

              mealType: String(

                item?.mealType ??

                item?.MealType ??

                item?.mealTypeName ??

                item?.MealTypeName ??

                item?.mealCategory ??

                item?.MealCategory ??

                item?.meal?.name ??

                item?.Meal?.Name ??

                "",

              ),

              imageUrl: String(

                item?.photoUrl ??

                item?.PhotoUrl ??

                item?.imageUrl ??

                item?.ImageUrl ??

                "",

              ),

            }))

            .filter(

              (item: RecipeMeta) => Number.isFinite(item.id) && item.id > 0,

            ),

        );

      }

      setLoading(false);

      setRefreshing(false);

    },

    [planId],

  );

  useEffect(() => {

    load();

  }, [load]);

  const recipeById = useMemo(

    () => new Map(recipeMeta.map((item) => [item.id, item])),

    [recipeMeta],

  );

  const recipesByMeal = useMemo(() => {

    const grouped: Record<string, PlannedRecipe[]> = {};

    (plan?.recipes ?? []).forEach((recipe) => {

      const meta = recipeById.get(recipe.recipeId);

      const categoryName = meta?.categoryName || "";

      // Prefer the explicit MealType stored on the recipe record.

      // If the API omits it, fall back to categoryName so existing records remain visible.

      const mealType = normalizeMealType(meta?.mealType, categoryName);

      if (!grouped[mealType]) grouped[mealType] = [];

      grouped[mealType].push({

        recipeId: recipe.recipeId,

        recipeName:

          recipe.recipeName || meta?.name || `Recipe #${recipe.recipeId}`,

        requiredServings: Number(recipe.requiredServings) || 0,

        categoryName: categoryName || "Uncategorized",

        mealType,

        imageUrl: meta?.imageUrl,

      });

    });

    const preferredOrder = [

      "Breakfast",

      "Brunch",

      "Lunch",

      "Dinner",

      "Snacks",

      "Dessert",

      "Other",

    ];

    return Object.fromEntries(

      Object.entries(grouped).sort(([a], [b]) => {

        const aIndex = preferredOrder.indexOf(a);

        const bIndex = preferredOrder.indexOf(b);

        if (aIndex !== -1 || bIndex !== -1) {

          if (aIndex === -1) return 1;

          if (bIndex === -1) return -1;

          return aIndex - bIndex;

        }

        return a.localeCompare(b);

      }),

    );

  }, [plan, recipeById]);

  const pricedItems = useMemo(() => {

    const items = (shoppingList?.items ?? []) as Array<

      ShoppingListItemResponse & Record<string, unknown>

    >;

    return items.map((item) => ({

      item,

      estimatedCost: getItemEstimatedCost(item),

      unitPrice: getItemUnitPrice(item),

    }));

  }, [shoppingList]);

  const totalCost = pricedItems.reduce(

    (sum, entry) => sum + (entry.estimatedCost ?? 0),

    0,

  );

  const pricedCount = pricedItems.filter(

    (entry) => entry.estimatedCost !== null || entry.unitPrice !== null,

  ).length;

  const hasCompleteTotal =

    pricedItems.length > 0 &&

    pricedItems.every((entry) => entry.estimatedCost !== null);

  const totalServings = (plan?.recipes ?? []).reduce(

    (sum, recipe) => sum + (Number(recipe.requiredServings) || 0),

    0,

  );

  const exportShoppingList = useCallback(async () => {

    const items = (shoppingList?.items ?? []) as Array<

      ShoppingListItemResponse & Record<string, unknown>

    >;

    if (items.length === 0) {

      Alert.alert("No ingredients", "There are no ingredients to export yet.");

      return;

    }

    // Export the complete ingredient array directly, not the visible screen or a scrollable view.

    // Use a simple list layout so the print engine can paginate long lists across multiple pages.

    const rows = items

      .map((item, index) => {

        const ingredientName =

          item.ingredientName ??

          item.IngredientName ??

          item.name ??

          item.Name ??

          `Ingredient ${index + 1}`;

        const rawQuantity =

          item.totalQuantity ??

          item.TotalQuantity ??

          item.quantity ??

          item.Quantity;

        const unit =

          item.unit ??

          item.Unit ??

          item.quantityUnit ??

          item.QuantityUnit ??

          "";

        const quantity = formatQuantity(rawQuantity, unit);

        return `<li><span class="checkbox">&#9633;</span><span class="name">${escapeHtml(ingredientName)}</span><span class="quantity">${escapeHtml(quantity)}</span></li>`;

      })

      .join("");

    const html = `<!DOCTYPE html>

      <html><head><meta charset="utf-8" />

      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>Ingredient Shopping List</title>

      <style>

        @page { size: A4; margin: 14mm; }

        * { box-sizing: border-box; }

        body { font-family: Arial, Helvetica, sans-serif; color: #20352a; margin: 0; font-size: 14px; }

        h1 { color: #176747; font-size: 20px; margin: 0 0 5px; }

        .count { color: #64766a; font-size: 11px; margin: 0 0 16px; }

        ul { list-style: none; margin: 0; padding: 0; }

        li { display: flex; align-items: flex-start; gap: 9px; padding: 9px 2px; border-bottom: 1px solid #e1e8e1; page-break-inside: avoid; break-inside: avoid; }

        .checkbox { width: 17px; flex: 0 0 17px; font-size: 17px; line-height: 19px; }

        .name { flex: 1; overflow-wrap: anywhere; }

        .quantity { font-weight: 700; white-space: nowrap; text-align: right; }

      </style></head><body>

        <h1>Ingredient Shopping List</h1>

        <p class="count">${items.length} ingredients</p>

        <ul>${rows}</ul>

      </body></html>`;

    try {

      if (Platform.OS === "web") {

        // Expo Print on web prints the current browser page and ignores the supplied HTML.

        // Open a separate document so only the generated ingredient list is printed.

        const printWindow = window.open("", "_blank", "width=800,height=900");

        if (!printWindow) {

          Alert.alert(

            "Allow pop-ups",

            "Please allow pop-ups for this site, then tap Export list again.",

          );

          return;

        }

        printWindow.document.open();

        printWindow.document.write(html);

        printWindow.document.close();

        printWindow.focus();

        // Wait for the standalone document to render before opening the print dialog.

        window.setTimeout(() => {

          if (!printWindow.closed) printWindow.print();

        }, 500);

      } else {

        await Print.printAsync({ html });

      }

    } catch (error) {

      Alert.alert(

        "Export failed",

        error instanceof Error

          ? error.message

          : "Unable to open the print dialog. Please try again.",

      );

    }

  }, [shoppingList]);

  if (loading || refreshing) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" />

        {/* Keep the actual header visible */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/function-planner");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color="#173A2B"
            />
          </Pressable>

          <View style={styles.headerText}>
            <AppText variant="pageTitle" style={styles.pageTitle}>
              Event details
            </AppText>

            <AppText variant="subtitle" style={styles.headerSubtitle}>
              Menu, servings and ingredient cost summary.
            </AppText>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => load(true)}
            accessibilityRole="button"
            accessibilityLabel="Refresh function details"
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color="#176747"
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <FunctionPlanDetailsSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!plan) {

    return (

      <SafeAreaView style={styles.safeArea}>

        <View style={styles.loadingState}>

          <Ionicons name="alert-circle-outline" size={34} color="#B63D3D" />

          <AppText variant="cardTitle" style={styles.emptyTitle}>Function details unavailable</AppText>

          <Pressable style={styles.primaryButton} onPress={() => router.back()}>

            <AppText variant="button" style={styles.primaryButtonText}>Go back</AppText>

          </Pressable>

        </View>

      </SafeAreaView>

    );

  }

  return (

    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>

      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>

        <Pressable

          style={styles.backButton}

          onPress={() => {

            if (router.canGoBack()) {

              router.back();

            } else {

              router.replace("/function-planner");

            }

          }}

          accessibilityRole="button"

          accessibilityLabel="Go back"

        >

          <Ionicons name="chevron-back" size={21} color="#173A2B" />

        </Pressable>

        <View style={styles.headerText}>

          <AppText variant="pageTitle" style={styles.pageTitle}>Event details</AppText>

          <AppText variant="subtitle" style={styles.headerSubtitle}>

            Menu, servings and ingredient cost summary.

          </AppText>

        </View>

        <Pressable

          style={styles.refreshButton}

          onPress={() => load(true)}

          accessibilityRole="button"

          accessibilityLabel="Refresh function details"

        >

          <Ionicons name="refresh-outline" size={19} color="#176747" />

        </Pressable>

      </View>

      <ScrollView

        style={styles.flex}

        contentContainerStyle={styles.content}

        refreshControl={

          <RefreshControl

            refreshing={refreshing}

            onRefresh={() => load(true)}

            tintColor="#176747"

          />

        }

      >

        <AnimatedCard delay={0} style={styles.heroCard}>

          <View style={styles.headerContainer}>

            <AppText variant="pageTitle" style={styles.functionName} numberOfLines={2}>

              {plan.name}

            </AppText>

          </View>

          {!!plan.location?.trim() && (

            <View style={styles.locationRow}>

              <View style={styles.locationIconWrap}>

                <Ionicons name="location-outline" size={14} color="#176747" />

              </View>

              <AppText variant="helper" style={styles.locationText} numberOfLines={1}>

                {plan.location}

              </AppText>

            </View>

          )}

          <View style={styles.dateRow}>

            <Ionicons name="calendar-outline" size={14} color="#718078" />

            <AppText variant="helper" style={styles.dateText}>{formatDate(plan.eventDate)}</AppText>

          </View>

          {!!plan.notes?.trim() && (

            <View style={styles.notesContainer}>

              <Ionicons

                name="document-text-outline"

                size={15}

                color="#64776B"

              />

              <AppText variant="body" style={styles.notesText}>{plan.notes}</AppText>

            </View>

          )}

          <View style={styles.metricsRow}>

            <View style={styles.metric}>

              <View style={styles.metricIconWrap}>

                <Ionicons name="restaurant-outline" size={15} color="#176747" />

              </View>

              <AppText variant="sectionTitle" style={styles.metricValue}>

                {plan.recipes?.length ?? 0}

              </AppText>

              <AppText variant="label" style={styles.metricLabel} numberOfLines={1}>

                Recipes

              </AppText>

            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metric}>

              <View style={styles.metricIconWrap}>

                <Ionicons name="basket-outline" size={15} color="#176747" />

              </View>

              <AppText variant="sectionTitle" style={styles.metricValue}>

                {shoppingList?.items?.length ?? 0}

              </AppText>

              <AppText variant="label" style={styles.metricLabel} numberOfLines={1}>

                Ingredients

              </AppText>

            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metric}>

              <View style={styles.metricIconWrap}>

                <Ionicons name="people-outline" size={15} color="#176747" />

              </View>

              <AppText variant="sectionTitle" style={styles.metricValue}>

                {totalServings.toLocaleString()}

              </AppText>

              <AppText variant="label" style={styles.metricLabel} numberOfLines={1}>

                Servings

              </AppText>

            </View>

          </View>

        </AnimatedCard>

        <View style={styles.menuSection}>

          <View style={styles.menuSectionHeading}>

            <View style={styles.flex}>

              <AppText variant="sectionTitle" style={styles.sectionTitle}>Menu overview</AppText>

              <AppText variant="helper" style={styles.muted}>

                All selected recipes, grouped by meal

              </AppText>

            </View>

            <View style={styles.menuCountBadge}>

              <AppText variant="label" style={styles.menuCountText}>

                {plan.recipes?.length ?? 0} items

              </AppText>

            </View>

          </View>

          {Object.entries(recipesByMeal).map(

            ([meal, mealRecipes], mealIndex) => {

              const normalizedMeal = meal.toLowerCase();

              const icon = normalizedMeal.includes("breakfast")

                ? "sunny-outline"

                : normalizedMeal.includes("brunch")

                  ? "cafe-outline"

                  : normalizedMeal.includes("lunch")

                    ? "partly-sunny-outline"

                    : normalizedMeal.includes("dinner")

                      ? "moon-outline"

                      : normalizedMeal.includes("snack")

                        ? "fast-food-outline"

                        : normalizedMeal.includes("dessert")

                          ? "ice-cream-outline"

                          : "restaurant-outline";

              return (

                <AnimatedCard

                  key={meal}

                  delay={60 + mealIndex * 35}

                  style={styles.menuGroup}

                >

                  <View style={styles.menuGroupHeader}>

                    <View style={styles.menuMealIcon}>

                      <Ionicons name={icon as any} size={16} color="#176747" />

                    </View>

                    <AppText variant="cardTitle" style={styles.menuMealTitle}>{meal}</AppText>

                    <View style={styles.menuGroupCount}>

                      <AppText variant="label" style={styles.menuGroupCountText}>

                        {mealRecipes.length}

                      </AppText>

                    </View>

                  </View>

                  <View style={styles.menuRecipeGrid}>

                    {mealRecipes.map((recipe) => (

                      <View

                        key={`${meal}-${recipe.recipeId}`}

                        style={styles.menuRecipeItem}

                      >

                        <View style={styles.menuRecipeTopLine}>

                          <View style={styles.menuRecipeDot} />

                          <AppText variant="body" style={styles.menuRecipeName}>

                            {recipe.recipeName}

                          </AppText>

                        </View>

                        {recipe.categoryName && recipe.categoryName !== meal ? (

                          <AppText variant="helper"

                            style={styles.menuRecipeCategory}

                            numberOfLines={1}

                          >

                            {recipe.categoryName}

                          </AppText>

                        ) : null}

                        <View style={styles.menuRecipeFooter}>

                          <Ionicons

                            name="people-outline"

                            size={12}

                            color="#6F8075"

                          />

                          <AppText variant="helper" style={styles.menuRecipeServings}>

                            {recipe.requiredServings.toLocaleString()} servings

                          </AppText>

                        </View>

                      </View>

                    ))}

                  </View>

                </AnimatedCard>

              );

            },

          )}

        </View>

        <View style={styles.sectionHeading}>

          <View style={styles.flex}>

            <AppText variant="sectionTitle" style={styles.sectionTitle}>Ingredients & pricing</AppText>

            <AppText variant="helper" style={styles.muted}>

              Combined quantities for all selected recipes.

            </AppText>

          </View>

          <Pressable

            style={styles.exportButton}

            onPress={exportShoppingList}

            accessibilityRole="button"

            accessibilityLabel="Export shopping list as PDF or print"

          >

            <Ionicons name="download-outline" size={16} color="#FFFFFF" />

            <AppText variant="button" style={styles.exportButtonText}>Export list</AppText>

          </Pressable>

        </View>

        <AnimatedCard delay={140} style={styles.costCard}>

          <View style={styles.costIcon}>

            <Ionicons name="wallet-outline" size={20} color="#176747" />

          </View>

          <View style={styles.flex}>

            <AppText variant="label" style={styles.costLabel}>Estimated ingredient cost</AppText>

            <AppText variant="sectionTitle" style={styles.costValue}>

              {hasCompleteTotal

                ? `₹${totalCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

                : pricedCount > 0

                  ? "Partial price data"

                  : "Price data unavailable"}

            </AppText>

            <AppText variant="helper" style={styles.costFootnote}>

              {pricedCount > 0

                ? hasCompleteTotal

                  ? "Estimated total based on all ingredient costs returned by the API"

                  : `${pricedItems.filter((entry) => entry.estimatedCost !== null).length} ingredient costs returned; the total is incomplete`

                : "The current shopping-list response does not include ingredient price fields."}

            </AppText>

          </View>

        </AnimatedCard>

        {pricedItems.length === 0 ? (

          <View style={styles.emptyShopping}>

            <Ionicons name="basket-outline" size={26} color="#87958B" />

            <AppText variant="cardTitle" style={styles.emptyTitle}>No ingredients returned</AppText>

            <AppText variant="helper" style={styles.muted}>

              Check that the selected recipes have ingredient quantities

              configured.

            </AppText>

          </View>

        ) : (

          pricedItems.map(({ item, estimatedCost, unitPrice }, index) => (

            <AnimatedCard

              key={`${item.ingredientId}-${item.unit}`}

              delay={Math.min(180 + index * 45, 600)}

              style={styles.ingredientCard}

            >

              <View style={styles.ingredientTopRow}>

                {getItemImage(item) ? (

                  <Image

                    source={{ uri: getItemImage(item)! }}

                    style={styles.ingredientPhoto}

                  />

                ) : (

                  <View style={styles.ingredientIcon}>

                    <Ionicons name="leaf-outline" size={20} color="#176747" />

                  </View>

                )}

                <View style={styles.ingredientDetails}>

                  <AppText variant="cardTitle" style={styles.ingredientName}>

                    {item.ingredientName}

                  </AppText>

                  <View style={styles.quantityPill}>

                    <Ionicons name="scale-outline" size={14} color="#176747" />

                    <AppText variant="body" style={styles.ingredientQuantity}>

                      {formatQuantity(item.totalQuantity, item.unit)}

                    </AppText>

                  </View>

                </View>

              </View>

              {!!item.usedInRecipes?.length && (

                <View style={styles.usedInRow}>

                  <Ionicons

                    name="restaurant-outline"

                    size={14}

                    color="#859188"

                  />

                  <AppText variant="helper" style={styles.usedIn}>

                    Used in: {item.usedInRecipes.join(", ")}

                  </AppText>

                </View>

              )}

              <View style={styles.ingredientDivider} />

              <View style={styles.ingredientPriceRow}>

                <View style={styles.priceMeta}>

                  <AppText variant="label" style={styles.priceCaption}>Ingredient cost</AppText>

                </View>

                <AppText variant="sectionTitle"

                  style={

                    estimatedCost !== null || unitPrice !== null

                      ? styles.priceValue

                      : styles.priceUnavailable

                  }

                >

                  {estimatedCost !== null

                    ? `₹${estimatedCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

                    : unitPrice !== null

                      ? `₹${unitPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

                      : "—"}

                </AppText>

              </View>

            </AnimatedCard>

          ))

        )}

        {shoppingList && (

          <View style={styles.infoNote}>

            <Ionicons

              name="information-circle-outline"

              size={17}

              color="#65776A"

            />

            <AppText variant="helper" style={styles.priceSubcaption}>

              The Prices for all Ingrdients are Estimated!!!

            </AppText>

          </View>

        )}

      </ScrollView>

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: "#F5F7F2" },

  flex: { flex: 1, minWidth: 0 },

  header: {

    flexDirection: "row",

    alignItems: "center",

    gap: 12,

    paddingHorizontal: 20,

    paddingTop: 8,

    paddingBottom: 20,

    backgroundColor: "#F5F7F2",

  },

  backButton: {

    width: 42,

    height: 42,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E4EAE3",

    alignItems: "center",

    justifyContent: "center",

  },

  headerText: { flex: 1, minWidth: 0 },

  eyebrow: {

    color: "#176747",

    fontSize: 11,

    fontWeight: "800",

    letterSpacing: 1.1,

    marginBottom: 4,

  },

  pageTitle: {

    color: "#172B20",

    fontSize: 23,

    lineHeight: 29,

    fontWeight: "800",

  },

  headerSubtitle: {

    color: "#718077",

    fontSize: 13,

    lineHeight: 19,

    marginTop: 4,

  },

  refreshButton: {

    width: 42,

    height: 42,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D8E9DA",

    alignItems: "center",

    justifyContent: "center",

  },

  content: {

    paddingHorizontal: 20,

    paddingTop: 8,

    paddingBottom: 36,

    maxWidth: 1120,

    width: "100%",

    alignSelf: "center",

  },

  heroCard: {

    backgroundColor: "#E8F3E9",

    borderRadius: 24,

    padding: 20,

    marginBottom: 30,

    borderLeftWidth: 5,

    borderLeftColor: "#176747",

  },

  heroIcon: {

    width: 48,

    height: 48,

    borderRadius: 16,

    backgroundColor: "#E7F5EB",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 14,

  },

  functionName: {

    color: "#1B3025",

    fontSize: 23,

    lineHeight: 29,

    fontWeight: "800",

    flexShrink: 1,

  },

  dateRow: {

    flexDirection: "row",

    alignItems: "center",

    alignSelf: "flex-start",

    gap: 6,

    marginTop: 2,

    marginBottom: 16,

  },

  dateText: { color: "#718077", fontSize: 12, fontWeight: "600" },

  notesBox: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 10,

    backgroundColor: "#F5F7F2",

    borderRadius: 14,

    padding: 13,

    marginTop: 16,

  },

  notesText: { flex: 1, color: "#526358", fontSize: 13, lineHeight: 19 },

  notesContainer: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor: "#F5F7F2",

    borderRadius: 12,

    padding: 8,

    marginBottom: 1,

  },

  metricsRow: {

    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    backgroundColor: "rgba(255,255,255,0.72)",

    borderRadius: 16,

    paddingVertical: 14,

    paddingHorizontal: 8,

    marginTop: 16,

    minHeight: 68,

  },

  metric: {

    flex: 1,

    minWidth: 0,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 4,

    paddingHorizontal: 2,

  },

  metricIconWrap: {

    width: 19,

    alignItems: "center",

    justifyContent: "center",

    flexShrink: 0,

  },

  metricValue: {

    color: "#1A3024",

    fontSize: 14,

    lineHeight: 19,

    fontWeight: "800",

    flexShrink: 0,

  },

  metricLabel: {

    color: "#718075",

    fontSize: 9,

    lineHeight: 12,

    fontWeight: "700",

    flexShrink: 1,

    minWidth: 0,

  },

  metricDivider: {

    height: 30,

    width: 1,

    backgroundColor: "#DFE7DE",

    marginHorizontal: 3,

  },

  sectionHeading: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 10,

    marginBottom: 14,

    marginTop: 2,

  },

  exportButton: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 6,

    backgroundColor: "#176747",

    borderRadius: 11,

    paddingHorizontal: 12,

    paddingVertical: 10,

  },

  exportButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  sectionTitle: {

    color: "#1B3025",

    fontSize: 21,

    lineHeight: 28,

    fontWeight: "900",

    letterSpacing: -0.4,

  },

  muted: { color: "#859188", fontSize: 11, lineHeight: 15, marginTop: 2 },

  mealCard: {

    backgroundColor: "transparent",

    borderRadius: 0,

    paddingHorizontal: 0,

    paddingVertical: 2,

    borderWidth: 0,

    borderBottomWidth: 1,

    borderBottomColor: "#DCE6DC",

    marginBottom: 12,

  },

  mealHeader: {

    flexDirection: "row",

    alignItems: "center",

    paddingBottom: 6,

    borderBottomWidth: 1,

    borderBottomColor: "#E2EAE1",

    marginBottom: 2,

  },

  menuSection: {

    marginBottom: 28,

  },

  menuSectionHeading: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,

    marginBottom: 14,

  },

  menuCountBadge: {

    backgroundColor: "#E5F1E7",

    borderRadius: 10,

    paddingHorizontal: 10,

    paddingVertical: 7,

  },

  menuCountText: {

    color: "#176747",

    fontSize: 11,

    lineHeight: 15,

    fontWeight: "800",

  },

  menuGroup: {

    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E3EAE2",

    padding: 13,

    marginBottom: 10,

  },

  menuGroupHeader: {

    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    paddingBottom: 10,

    borderBottomWidth: 1,

    borderBottomColor: "#EDF1EC",

    marginBottom: 2,

  },

  menuMealIcon: {

    width: 30,

    height: 30,

    borderRadius: 10,

    backgroundColor: "#EAF4EC",

    alignItems: "center",

    justifyContent: "center",

  },

  menuMealTitle: {

    flex: 1,

    minWidth: 0,

    color: "#1B3025",

    fontSize: 14,

    lineHeight: 19,

    fontWeight: "900",

  },

  menuGroupCount: {

    minWidth: 24,

    height: 24,

    borderRadius: 12,

    paddingHorizontal: 7,

    backgroundColor: "#F1F5F0",

    alignItems: "center",

    justifyContent: "center",

  },

  menuGroupCountText: {

    color: "#627268",

    fontSize: 11,

    fontWeight: "800",

  },

  menuRecipeGrid: {

    flexDirection: "row",

    flexWrap: "wrap",

    marginHorizontal: -5,

    paddingTop: 4,

  },

  menuRecipeItem: {

    width: "50%",

    minWidth: 0,

    paddingHorizontal: 5,

    paddingVertical: 7,

  },

  menuRecipeTopLine: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 6,

  },

  menuRecipeDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor: "#65A17E",

    marginTop: 5,

    flexShrink: 0,

  },

  menuRecipeName: {

    flex: 1,

    minWidth: 0,

    color: "#2B3D31",

    fontSize: 12,

    lineHeight: 16,

    fontWeight: "700",

    flexShrink: 1,

  },

  menuRecipeCategory: {

    color: "#8A968D",

    fontSize: 10,

    lineHeight: 14,

    marginTop: 3,

    marginLeft: 12,

  },

  menuRecipeFooter: {

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    marginTop: 5,

    marginLeft: 12,

  },

  menuRecipeServings: {

    color: "#6F8075",

    fontSize: 10,

    lineHeight: 14,

    fontWeight: "600",

  },

  mealIcon: {

    width: 42,

    height: 42,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#D8E9DA",

    alignItems: "center",

    justifyContent: "center",

  },

  mealTitle: {

    color: "#1B3025",

    fontSize: 15,

    lineHeight: 20,

    fontWeight: "900",

    letterSpacing: -0.2,

  },

  mealHeadingText: { flex: 1, minWidth: 0 },

  recipeGrid: {

    flexDirection: "row",

    flexWrap: "wrap",

    alignItems: "stretch",

    marginHorizontal: -4,

    paddingTop: 2,

  },

  recipeInfo: {

    flex: 1,

    minWidth: 0,

    alignItems: "flex-start",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E8EDE6",

    borderRadius: 10,

    padding: 8,

    minHeight: 76,

  },

  recipeCategory: {

    color: "#859188",

    fontSize: 10,

    lineHeight: 13,

    marginTop: 2,

  },

  recipeRow: {

    width: "100%",

    minWidth: 0,

    paddingHorizontal: 4,

    paddingVertical: 3,

  },

  recipeName: {

    width: "100%",

    color: "#26392D",

    fontSize: 12,

    fontWeight: "800",

    lineHeight: 16,

    flexShrink: 1,

  },

  servingsBadge: {

    backgroundColor: "#EAF4EC",

    borderRadius: 7,

    paddingHorizontal: 7,

    paddingVertical: 4,

    alignSelf: "flex-start",

    marginTop: 5,

    maxWidth: "100%",

  },

  servingsText: {

    color: "#176747",

    fontSize: 10,

    lineHeight: 13,

    fontWeight: "800",

    textAlign: "left",

  },

  costCard: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 14,

    backgroundColor: "#173F2D",

    borderRadius: 22,

    padding: 20,

    marginBottom: 22,

    borderWidth: 0,

  },

  costIcon: {

    width: 46,

    height: 46,

    borderRadius: 15,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

  },

  costLabel: { color: "#D6E9DA", fontSize: 13, fontWeight: "700" },

  costValue: {

    color: "#FFFFFF",

    fontSize: 27,

    lineHeight: 34,

    fontWeight: "900",

    marginTop: 5,

  },

  costFootnote: {

    color: "#D0DFD3",

    fontSize: 12,

    lineHeight: 18,

    marginTop: 6,

  },

  emptyShopping: {

    alignItems: "center",

    padding: 26,

    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    borderWidth: 1,

    borderColor: "#E7ECE5",

    gap: 8,

  },

  emptyTitle: {

    color: "#2C3D31",

    fontSize: 16,

    lineHeight: 22,

    fontWeight: "800",

    marginTop: 5,

    textAlign: "center",

  },

  ingredientCard: {

    backgroundColor: "transparent",

    borderRadius: 0,

    borderWidth: 0,

    borderBottomWidth: 1,

    borderBottomColor: "#E2E9E1",

    paddingHorizontal: 2,

    paddingVertical: 16,

    marginBottom: 0,

  },

  ingredientTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  ingredientPhoto: {

    width: 52,

    height: 52,

    borderRadius: 17,

    backgroundColor: "#E8F1E9",

  },

  ingredientIcon: {

    width: 52,

    height: 52,

    borderRadius: 17,

    backgroundColor: "#E7F5EB",

    alignItems: "center",

    justifyContent: "center",

  },

  ingredientDetails: { flex: 1, minWidth: 0, paddingTop: 2 },

  ingredientName: {

    color: "#25372B",

    fontSize: 16,

    lineHeight: 22,

    fontWeight: "800",

    flexShrink: 1,

  },

  quantityPill: {

    flexDirection: "row",

    alignItems: "center",

    alignSelf: "flex-start",

    gap: 6,

    backgroundColor: "#EAF3EB",

    borderRadius: 8,

    paddingHorizontal: 9,

    paddingVertical: 5,

    marginTop: 7,

  },

  ingredientQuantity: {

    color: "#176747",

    fontSize: 14,

    lineHeight: 18,

    fontWeight: "800",

  },

  usedInRow: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 7,

    marginTop: 12,

  },

  usedIn: { flex: 1, color: "#718077", fontSize: 12, lineHeight: 18 },

  ingredientDivider: {

    height: 1,

    backgroundColor: "transparent",

    marginVertical: 7,

  },

  ingredientPriceRow: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    gap: 12,

  },

  priceMeta: { flex: 1, minWidth: 0 },

  priceValue: {

    color: "#1F6846",

    fontSize: 19,

    lineHeight: 25,

    fontWeight: "900",

    flexShrink: 0,

  },

  priceUnavailable: {

    color: "#89968C",

    fontSize: 20,

    lineHeight: 26,

    fontWeight: "800",

  },

  priceCaption: {

    color: "#65766A",

    fontSize: 13,

    lineHeight: 18,

    fontWeight: "700",

  },

  priceSubcaption: {

    color: "#8A968D",

    fontSize: 12,

    lineHeight: 17,

    marginTop: 3,

  },

  infoNote: {

    flexDirection: "row",

    alignItems: "flex-start",

    gap: 9,

    padding: 14,

    backgroundColor: "#F0F4EF",

    borderRadius: 14,

    marginTop: 8,

  },

  infoNoteText: { flex: 1, color: "#637268", fontSize: 12, lineHeight: 19 },

  loadingState: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: 24,

    gap: 12,

  },

  primaryButton: {

    backgroundColor: "#176747",

    borderRadius: 14,

    paddingHorizontal: 20,

    paddingVertical: 14,

    marginTop: 12,

  },

  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },

  headerContainer: { width: "100%", marginBottom: 3 },

  locationRow: {

    flexDirection: "row",

    alignItems: "center",

    alignSelf: "flex-start",

    maxWidth: "100%",

    gap: 5,

    marginBottom: 5,

  },

  locationIconWrap: {

    width: 18,

    height: 18,

    borderRadius: 6,

    backgroundColor: "#EAF2EE",

    alignItems: "center",

    justifyContent: "center",

  },

  locationText: {

    color: "#64776B",

    fontSize: 12,

    lineHeight: 17,

    fontWeight: "600",

    flexShrink: 1,

  },

});
