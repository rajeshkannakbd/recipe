import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { recipeApi } from "../../api/recipeApi";
import { ingredientApi } from "../../api/ingredientApi";
import { IngredientType, type IngredientResponse } from "../../types/ingredient";
import { get } from "../../api/client";
import SearchBar from "../../components/common/SearchBar";
import ScreenLoader from "../../components/common/ScreenLoader";
type MealFilter = "All" | string;
type FoodFilter = "All" | "Veg" | "Non Veg";
type TimeFilter = "All" | "Under 30 min" | "30–60 min" | "Over 60 min";
type RecipeIngredient = {
  ingredientId?: number;
  ingredientName?: string;
  ingredientPhotoUrl?: string | null;
  quantity?: number;
  unit?: string;
};
type RecipeTag = { id?: number; name?: string };
type RecipeReview = {
  id?: number;
  recipeId?: number;
  rating?: number;
  comment?: string;
  userName?: string;
  createdAt?: string;
};
type RecipeItem = {
  id: number;
  name: string;
  description?: string | null;
  categoryId?: number;
  categoryName?: string | null;
  baseServings?: number | null;
  baseCookedWeightGrams?: number | null;
  status?: string | number | null;
  photoUrl?: string | null;
  cuisine?: string | null;
  mealType?: string | null;
  chefId?: number | null;
  chefName?: string | null;
  cookingStyleId?: number | null;
  cookingStyleName?: string | null;
  preparationTimeMinutes?: number | null;
  cookingTimeMinutes?: number | null;
  storageInstructions?: string | null;
  shelfLifeHours?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  tags?: RecipeTag[] | null;
  ingredients?: RecipeIngredient[] | null;
};
function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLowerCase()
    : "";
}
// Keep one visible option for values that differ only by casing or whitespace.
// Example: "South Indian", "south indian", and " South   Indian " become one chip.
function uniqueFilterOptions(
  values: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawValue of values) {
    const label =
      typeof rawValue === "string" ? rawValue.trim().replace(/\s+/g, " ") : "";
    if (!label) continue;
    const key = normalize(label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}
function isPublished(recipe: RecipeItem): boolean {
  return normalize(recipe.status) === "published" || recipe.status === 2;
}
function extractReviews(payload: unknown): RecipeReview[] {
  if (Array.isArray(payload)) return payload as RecipeReview[];
  if (payload && typeof payload === "object") {
    const value = payload as Record<string, unknown>;
    for (const key of ["items", "reviews", "data"]) {
      if (Array.isArray(value[key])) return value[key] as RecipeReview[];
      if (value[key] && typeof value[key] === "object") {
        const nested = extractReviews(value[key]);
        if (nested.length) return nested;
      }
    }
    if ("rating" in value) return [value as RecipeReview];
  }
  return [];
}
function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
function formatWeight(value?: number | null): string | null {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) <= 0)
    return null;
  const grams = Number(value);
  return grams >= 1000
    ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`
    : `${Math.round(grams)} g`;
}
export default function AllRecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [ingredientTypesById, setIngredientTypesById] = useState<Record<number, number>>({});
  const [reviewsByRecipeId, setReviewsByRecipeId] = useState<
    Record<number, RecipeReview[]>
  >({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState<MealFilter>("All");
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [activeCookingStyle, setActiveCookingStyle] = useState("All");
  const [activeFood, setActiveFood] = useState<FoodFilter>("All");
  const [activeTime, setActiveTime] = useState<TimeFilter>("All");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Subtle entrance animations for the header and recipe list.
  const entrance = useRef(new Animated.Value(0)).current;
  const refreshScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) return;

    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [loading, entrance]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recipeResult, ingredientResult] = await Promise.allSettled([
        recipeApi.getAll(),
        ingredientApi.getAll(),
      ]);
      if (recipeResult.status === "rejected") throw recipeResult.reason;
      const response = recipeResult.value;
      const recipeList = Array.isArray(response)
        ? (response as unknown as RecipeItem[])
        : [];
      setRecipes(recipeList);
      // Use the IngredientType saved in the database; do not infer diet from ingredient names.
      if (ingredientResult.status === "fulfilled") {
        const ingredientMap: Record<number, number> = {};
        (ingredientResult.value as IngredientResponse[]).forEach((ingredient) => {
          const type = Number(ingredient.ingredientType);
          if (ingredient.id != null && (type === IngredientType.Veg || type === IngredientType.NonVeg)) {
            ingredientMap[ingredient.id] = type;
          }
        });
        setIngredientTypesById(ingredientMap);
      } else {
        console.error("Unable to load ingredient diet types:", ingredientResult.reason);
        setIngredientTypesById({});
      }
      // Reviews are returned by a separate endpoint, not as part of each recipe response.
      const publishedRecipes = recipeList.filter(isPublished);
      const reviewResults = await Promise.all(
        publishedRecipes.map(async (recipe) => {
          try {
            const payload = await get<unknown>(`/recipes/${recipe.id}/reviews`);
            return [recipe.id, extractReviews(payload)] as const;
          } catch {
            // One recipe's review endpoint failing should not prevent the page loading.
            return [recipe.id, []] as const;
          }
        }),
      );
      const reviewMap: Record<number, RecipeReview[]> = {};
      reviewResults.forEach(([recipeId, reviews]) => {
        reviewMap[recipeId] = reviews;
      });
      setReviewsByRecipeId(reviewMap);
    } catch (error) {
      console.error("Failed to load recipes:", error);
      setRecipes([]);
      setReviewsByRecipeId({});
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const mealOptions = useMemo(() => {
    const values = recipes.filter(isPublished).map((recipe) => recipe.mealType);
    return [
      "All",
      ...uniqueFilterOptions(values).sort((a, b) => a.localeCompare(b)),
    ];
  }, [recipes]);
  const cuisineOptions = useMemo(() => {
    const values = recipes.filter(isPublished).map((recipe) => recipe.cuisine);
    return [
      "All",
      ...uniqueFilterOptions(values).sort((a, b) => a.localeCompare(b)),
    ];
  }, [recipes]);
  const cookingStyleOptions = useMemo(() => {
    const values = recipes
      .filter(isPublished)
      .map((recipe) => recipe.cookingStyleName);
    return [
      "All",
      ...uniqueFilterOptions(values).sort((a, b) => a.localeCompare(b)),
    ];
  }, [recipes]);
  const getRecipeDietType = useCallback(
    (recipe: RecipeItem): "Veg" | "Non Veg" | "Unknown" => {
      const recipeIngredients = recipe.ingredients ?? [];
      if (recipeIngredients.length === 0) return "Unknown";
      const ingredientTypes = recipeIngredients.map((ingredient) => {
        const ingredientId = Number(ingredient.ingredientId);
        return Number.isFinite(ingredientId) ? ingredientTypesById[ingredientId] : undefined;
      });
      // One non-veg ingredient makes the recipe non-veg.
      if (ingredientTypes.some((type) => type === IngredientType.NonVeg)) return "Non Veg";
      // Only call a recipe vegetarian when every linked ingredient is explicitly marked Veg.
      if (ingredientTypes.every((type) => type === IngredientType.Veg)) return "Veg";
      // Recipes with missing/unknown ingredient types remain unclassified rather than guessed.
      return "Unknown";
    },
    [ingredientTypesById],
  );
  const filtered = useMemo(() => {
    const searchValue = normalize(search);
    let result = recipes.filter(isPublished);
    if (activeMeal !== "All") {
      result = result.filter(
        (recipe) => normalize(recipe.mealType) === normalize(activeMeal),
      );
    }
    if (activeCuisine !== "All") {
      result = result.filter(
        (recipe) => normalize(recipe.cuisine) === normalize(activeCuisine),
      );
    }
    if (activeCookingStyle !== "All") {
      result = result.filter(
        (recipe) =>
          normalize(recipe.cookingStyleName) === normalize(activeCookingStyle),
      );
    }
    if (activeFood === "Veg") {
      result = result.filter((recipe) => getRecipeDietType(recipe) === "Veg");
    }
    if (activeFood === "Non Veg") {
      result = result.filter((recipe) => getRecipeDietType(recipe) === "Non Veg");
    }
    if (activeTime !== "All") {
      result = result.filter((recipe) => {
        const total =
          Math.max(0, Number(recipe.preparationTimeMinutes) || 0) +
          Math.max(0, Number(recipe.cookingTimeMinutes) || 0);
        if (total <= 0) return false;
        if (activeTime === "Under 30 min") return total < 30;
        if (activeTime === "30–60 min") return total >= 30 && total <= 60;
        return total > 60;
      });
    }
    if (searchValue) {
      result = result.filter((recipe) => {
        const searchableText = [
          recipe.name,
          recipe.description,
          recipe.categoryName,
          recipe.cuisine,
          recipe.mealType,
          recipe.chefName,
          recipe.cookingStyleName,
          recipe.sourceName,
          recipe.storageInstructions,
          ...(recipe.tags ?? []).map((tag) => tag.name),
          ...(recipe.ingredients ?? []).map(
            (ingredient) => ingredient.ingredientName,
          ),
        ]
          .map(normalize)
          .join(" ");
        return searchableText.includes(searchValue);
      });
    }
    // Show recipes with the strongest ratings/review activity first, while retaining stable ordering for ties.
    return result
      .map((recipe, index) => {
        const reviews = reviewsByRecipeId[recipe.id] ?? [];
        const validRatings = reviews
          .map((review) => Number(review.rating))
          .filter(
            (rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5,
          );
        const average = validRatings.length
          ? validRatings.reduce((sum, rating) => sum + rating, 0) /
            validRatings.length
          : 0;
        return { recipe, index, average, count: validRatings.length };
      })
      .sort(
        (a, b) =>
          b.average - a.average || b.count - a.count || a.index - b.index,
      )
      .map((entry) => entry.recipe);
  }, [
    recipes,
    search,
    activeMeal,
    activeCuisine,
    activeCookingStyle,
    activeFood,
    activeTime,
    getRecipeDietType,
    reviewsByRecipeId,
  ]);
  const resetFilters = () => {
    setSearch("");
    setActiveMeal("All");
    setActiveCuisine("All");
    setActiveCookingStyle("All");
    setActiveFood("All");
    setActiveTime("All");
  };
  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    iconName?: keyof typeof Ionicons.glyphMap,
  ) => (
    <Pressable
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      {iconName ? (
        <Ionicons
          name={iconName}
          size={15}
          color={active ? "#FFFFFF" : "#68736D"}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
  const renderRecipe = ({ item }: { item: RecipeItem }) => {
    const reviews = reviewsByRecipeId[item.id] ?? [];
    const ratings = reviews
      .map((review) => Number(review.rating))
      .filter(
        (rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5,
      );
    const averageRating = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;
    const totalTime =
      (Number(item.preparationTimeMinutes) || 0) +
      (Number(item.cookingTimeMinutes) || 0);
    const weight = formatWeight(item.baseCookedWeightGrams);
    const tagNames = (item.tags ?? [])
      .map((tag) => tag.name)
      .filter(Boolean)
      .slice(0, 2);
    return (
      <Pressable
        style={styles.recipeCard}
        onPress={() =>
          router.push({
            pathname: "/recipe/[id]",
            params: { id: String(item.id) },
          })
        }
      >
        <View style={styles.cardImageWrap}>
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="restaurant-outline" size={30} color="#1F7655" />
            </View>
          )}
          {item.mealType ? (
            <View style={styles.mealBadge}>
              <Text style={styles.mealBadgeText}>{item.mealType}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.recipeInfo}>
          <View style={styles.nameRatingRow}>
            <Text style={styles.recipeName} numberOfLines={2}>
              {item.name || "Untitled recipe"}
            </Text>
            {ratings.length > 0 ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#D99A18" />
                <Text style={styles.ratingText}>
                  {averageRating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {item.description?.trim() ||
              item.categoryName ||
              "Discover this recipe."}
          </Text>
          <View style={styles.metaRow}>
            {item.cuisine ? (
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={13} color="#68736D" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.cuisine}
                </Text>
              </View>
            ) : null}
            {totalTime > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#68736D" />
                <Text style={styles.metaText}>{formatMinutes(totalTime)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {item.baseServings ? (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color="#68736D" />
                <Text style={styles.metaText}>
                  {item.baseServings} servings
                </Text>
              </View>
            ) : null}
            {weight ? (
              <View style={styles.metaItem}>
                <Ionicons name="scale-outline" size={13} color="#68736D" />
                <Text style={styles.metaText}>{weight}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.bottomLeft}>
              {item.chefName ? (
                <Text style={styles.chefText} numberOfLines={1}>
                  By {item.chefName}
                </Text>
              ) : null}
              {ratings.length > 0 ? (
                <Text style={styles.reviewCount}>
                  {ratings.length} {ratings.length === 1 ? "review" : "reviews"}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={19} color="#A6AEA8" />
          </View>
          {tagNames.length ? (
            <View style={styles.tagsRow}>
              {tagNames.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };
  if (loading) return <ScreenLoader />;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={styles.headingTextWrap}>
            <Text style={styles.title}>All Recipes</Text>
            <Text style={styles.subtitle}>Find your next favourite dish</Text>
          </View>
          <Pressable
            style={[
              styles.refreshButton,
              { transform: [{ scale: refreshScale }] },
            ]}
            onPressIn={() =>
              Animated.spring(refreshScale, {
                toValue: 0.92,
                useNativeDriver: true,
                speed: 28,
                bounciness: 4,
              }).start()
            }
            onPressOut={() =>
              Animated.spring(refreshScale, {
                toValue: 1,
                useNativeDriver: true,
                speed: 24,
                bounciness: 6,
              }).start()
            }
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel="Refresh recipes"
          >
            <Ionicons name="refresh-outline" size={20} color="#1F7655" />
          </Pressable>
        </View>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes, ingredients, chefs..."
          />
        </View>
        <View style={styles.filterHeadingRow}>
          <Text style={styles.filterHeading}>Meal type</Text>
          <Pressable
            onPress={() => setShowAdvancedFilters((current) => !current)}
            style={styles.filterToggle}
          >
            <Ionicons name="options-outline" size={16} color="#1F7655" />
            <Text style={styles.filterToggleText}>
              {showAdvancedFilters ? "Less filters" : "More filters"}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {mealOptions.map((meal) =>
            renderChip(
              meal,
              activeMeal === meal,
              () => setActiveMeal(meal),
              meal === "All" ? "apps-outline" : "restaurant-outline",
            ),
          )}
        </ScrollView>
        {showAdvancedFilters ? (
          <View style={styles.advancedFilters}>
            <Text style={styles.filterHeading}>Cuisine</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {cuisineOptions.map((cuisine) =>
                renderChip(
                  cuisine,
                  activeCuisine === cuisine,
                  () => setActiveCuisine(cuisine),
                  "globe-outline",
                ),
              )}
            </ScrollView>
            <Text style={styles.filterHeading}>Cooking style</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {cookingStyleOptions.map((style) =>
                renderChip(
                  style,
                  activeCookingStyle === style,
                  () => setActiveCookingStyle(style),
                  "flame-outline",
                ),
              )}
            </ScrollView>
            <Text style={styles.filterHeading}>Diet</Text>
            <View style={styles.chipsRow}>
              {renderChip(
                "All",
                activeFood === "All",
                () => setActiveFood("All"),
                "apps-outline",
              )}
              {renderChip(
                "Veg",
                activeFood === "Veg",
                () => setActiveFood(activeFood === "Veg" ? "All" : "Veg"),
                "leaf-outline",
              )}
              {renderChip(
                "Non Veg",
                activeFood === "Non Veg",
                () =>
                  setActiveFood(activeFood === "Non Veg" ? "All" : "Non Veg"),
                "fast-food-outline",
              )}
            </View>
            <Text style={styles.filterHeading}>Total time</Text>
            <View style={styles.chipsRow}>
              {(
                [
                  "All",
                  "Under 30 min",
                  "30–60 min",
                  "Over 60 min",
                ] as TimeFilter[]
              ).map((time) =>
                renderChip(
                  time,
                  activeTime === time,
                  () => setActiveTime(time),
                  "time-outline",
                ),
              )}
            </View>
          </View>
        ) : null}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
          </Text>
          {activeMeal !== "All" ||
          activeCuisine !== "All" ||
          activeCookingStyle !== "All" ||
          activeFood !== "All" ||
          activeTime !== "All" ||
          search.trim() ? (
            <Pressable onPress={resetFilters}>
              <Text style={styles.clearText}>Clear filters</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
      <Animated.View
        style={[
          styles.listAnimationWrap,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecipe}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.emptyListContent,
        ]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={30} color="#1F7655" />
            </View>
            <Text style={styles.emptyTitle}>No recipes found</Text>
            <Text style={styles.emptyText}>
              Try another search or remove some filters.
            </Text>
            <Pressable style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>
                Clear search and filters
              </Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          filtered.length > 0 ? <View style={styles.listFooter} /> : null
        }
        />
      </Animated.View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  header: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBE6",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingTextWrap: { flex: 1 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#17231E",
    letterSpacing: -0.65,
  },
  subtitle: { color: "#778179", fontSize: 13, lineHeight: 19, marginTop: 4 },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3ED",
    marginLeft: 12,
  },
  searchContainer: { marginTop: 16, marginBottom: 16 },
  filterHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterHeading: {
    color: "#25332B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 8,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  filterToggleText: { fontSize: 12, fontWeight: "700", color: "#1F7655" },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8E1",
    gap: 5,
  },
  chipActive: { backgroundColor: "#1F7655", borderColor: "#1F7655" },
  chipText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: "#68736D" },
  chipTextActive: { color: "#FFFFFF" },
  advancedFilters: { marginTop: 9, gap: 3 },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  resultsText: { fontSize: 12, color: "#778179", fontWeight: "600" },
  clearText: { fontSize: 12, color: "#1F7655", fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  listAnimationWrap: { flex: 1 },
  emptyListContent: { flexGrow: 1 },
  recipeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6EAE4",
    padding: 11,
    marginBottom: 13,
    overflow: "hidden",
    shadowColor: "#17231E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },
  cardImageWrap: {
    width: 112,
    minHeight: 132,
    position: "relative",
    alignSelf: "stretch",
  },
  recipeImage: {
    width: "100%",
    height: "100%",
    minHeight: 132,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
  },
  imageFallback: {
    flex: 1,
    minHeight: 132,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  mealBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: 100,
  },
  mealBadgeText: { fontSize: 10, fontWeight: "800", color: "#1F7655" },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 2,
    justifyContent: "center",
  },
  nameRatingRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  recipeName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: "#17231E",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FFF5D9",
  },
  ratingText: { fontSize: 11, fontWeight: "800", color: "#8B6210" },
  recipeDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#778179",
    marginTop: 5,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  metaText: {
    color: "#68736D",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  bottomLeft: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chefText: {
    fontSize: 10,
    color: "#1F7655",
    fontWeight: "700",
    maxWidth: "70%",
  },
  reviewCount: { fontSize: 10, color: "#8A938E" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 },
  tag: {
    backgroundColor: "#F0F5F0",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagText: { color: "#52705E", fontSize: 9, fontWeight: "700" },
  emptyState: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800", color: "#17231E" },
  emptyText: {
    fontSize: 13,
    color: "#778179",
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1F7655",
    borderRadius: 12,
  },
  resetButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  listFooter: { height: 40 },
});
