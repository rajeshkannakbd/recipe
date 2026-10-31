import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ingredientApi } from "../../api/ingredientApi";
import { recipeApi } from "../../api/recipeApi";
import AppText from "../../components/common/AppText";
import RecipeListSkeleton from "../../components/skeleton/RecipeListSkeleton";
import SearchBar from "../../components/common/SearchBar";
import {
  IngredientType,
  type IngredientResponse,
} from "../../types/ingredient";

type MealFilter = "All" | string;
type FoodFilter = "All" | "Veg" | "Non Veg";
type RecipeIngredient = {
  ingredientId?: number;
  ingredientName?: string;
  ingredientPhotoUrl?: string | null;
  quantity?: number;
  unit?: string;
};
type RecipeTag = { id?: number; name?: string };
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
  averageRating?: number | null;
  reviewCount?: number;
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
  const [ingredientTypesById, setIngredientTypesById] = useState<
    Record<number, number>
  >({});
  const [search, setSearch] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState<MealFilter>("All");
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [activeCookingStyle, setActiveCookingStyle] = useState("All");
  const [activeFood, setActiveFood] = useState<FoodFilter>("All");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<
    "meal" | "cuisine" | "style" | null
  >(null);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Subtle entrance animations for the header and recipe list.
  const entrance = useRef(new Animated.Value(0)).current;

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
        (ingredientResult.value as IngredientResponse[]).forEach(
          (ingredient) => {
            const type = Number(ingredient.ingredientType);
            if (
              ingredient.id != null &&
              (type === IngredientType.Veg || type === IngredientType.NonVeg)
            ) {
              ingredientMap[ingredient.id] = type;
            }
          },
        );
        setIngredientTypesById(ingredientMap);
      } else {
        console.error(
          "Unable to load ingredient diet types:",
          ingredientResult.reason,
        );
        setIngredientTypesById({});
      }
    } catch (error) {
      console.error("Failed to load recipes:", error);
      setRecipes([]);
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
        return Number.isFinite(ingredientId)
          ? ingredientTypesById[ingredientId]
          : undefined;
      });
      // One non-veg ingredient makes the recipe non-veg.
      if (ingredientTypes.some((type) => type === IngredientType.NonVeg))
        return "Non Veg";
      // Only call a recipe vegetarian when every linked ingredient is explicitly marked Veg.
      if (ingredientTypes.every((type) => type === IngredientType.Veg))
        return "Veg";
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
      result = result.filter(
        (recipe) => getRecipeDietType(recipe) === "Non Veg",
      );
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
        const average = Number(recipe.averageRating) || 0;
        const count = Number(recipe.reviewCount) || 0;
        return { recipe, index, average, count };
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
    getRecipeDietType,
  ]);
  const resetFilters = () => {
    setSearch("");
    setActiveMeal("All");
    setActiveCuisine("All");
    setActiveCookingStyle("All");
    setActiveFood("All");
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
      <AppText style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );
  const renderRecipe = ({ item }: { item: RecipeItem }) => {
    const averageRating = Number(item.averageRating) || 0;
    const reviewCount = Number(item.reviewCount) || 0;
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
              <AppText style={styles.mealBadgeText}>{item.mealType}</AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.recipeInfo}>
          <View style={styles.nameRatingRow}>
            <AppText variant="cardTitle" style={styles.recipeName} numberOfLines={1}>
              {item.name || "Untitled recipe"}
            </AppText>
            {reviewCount > 0 && averageRating > 0 ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#D99A18" />
                <AppText variant="label" style={styles.ratingText}>
                  {averageRating.toFixed(1)}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="body" style={styles.recipeDescription} numberOfLines={1}>
            {item.description?.trim() ||
              item.categoryName ||
              "Discover this recipe."}
          </AppText>
          <View style={styles.metaRow}>
            {item.cuisine ? (
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={13} color="#68736D" />
                <AppText variant="helper" style={styles.metaText} numberOfLines={1}>
                  {item.cuisine}
                </AppText>
              </View>
            ) : null}
            {totalTime > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#68736D" />
                <AppText variant="helper" style={styles.metaText}>{formatMinutes(totalTime)}</AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {item.baseServings ? (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color="#68736D" />
                <AppText variant="helper" style={styles.metaText}>
                  {item.baseServings} servings
                </AppText>
              </View>
            ) : null}
            {weight ? (
              <View style={styles.metaItem}>
                <Ionicons name="scale-outline" size={13} color="#68736D" />
                <AppText variant="helper" style={styles.metaText}>{weight}</AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.bottomLeft}>
              {item.chefName ? (
                <AppText variant="label" style={styles.chefText} numberOfLines={1}>
                  By {item.chefName}
                </AppText>
              ) : null}
              {reviewCount > 0 ? (
                <AppText variant="helper" style={styles.reviewCount}>
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={19} color="#A6AEA8" />
          </View>
          {tagNames.length ? (
            <View style={styles.tagsRow}>
              {tagNames.map((tag, index) => (
                <View key={`${tag}-${index}`} style={styles.tag}>
                  <AppText variant="label" style={styles.tagText}>{tag}</AppText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };
  if (loading) return <RecipeListSkeleton />;
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
            <AppText variant="pageTitle" style={styles.title}>All Recipes</AppText>
            {/* <AppText variant="subtitle" style={styles.subtitle}>Find your next favourite dish</AppText> */}
          </View>
          <Pressable
            style={styles.headerIconButton}
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel="Refresh recipes"
            hitSlop={6}
          >
            <Ionicons name="refresh-outline" size={20} color="#1F7655" />
          </Pressable>
        </View>
        <View style={styles.searchToolsRow}>
          <View style={styles.searchContainer}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search recipes, ingredients, chefs..."
            />
          </View>
          <Pressable
            style={[styles.headerIconButton, filtersVisible && styles.headerIconButtonActive]}
            onPress={() => {
              setFiltersVisible((visible) => !visible);
              setActiveDropdown(null);
              setDropdownSearch("");
            }}
            accessibilityRole="button"
            accessibilityLabel={filtersVisible ? "Hide recipe filters" : "Show recipe filters"}
            accessibilityState={{ expanded: filtersVisible }}
            hitSlop={6}
          >
            <Ionicons name="options-outline" size={21} color={filtersVisible ? "#FFFFFF" : "#1F7655"} />
          </Pressable>
        </View>
        <View style={styles.foodToggleRow}>
          {([
            { label: "All", icon: "restaurant-outline" as const },
            { label: "Veg", icon: "leaf-outline" as const },
            { label: "Non Veg", icon: "fish-outline" as const },
          ] as const).map((option) => (
            <Pressable
              key={option.label}
              style={[
                styles.foodToggleButton,
                activeFood === option.label && styles.foodToggleButtonActive,
                option.label === "Veg" && activeFood === "Veg" && styles.vegToggleActive,
                option.label === "Non Veg" && activeFood === "Non Veg" && styles.nonVegToggleActive,
              ]}
              onPress={() => setActiveFood(option.label)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFood === option.label }}
            >
              <Ionicons
                name={option.icon}
                size={15}
                color={activeFood === option.label ? "#FFFFFF" : option.label === "Veg" ? "#27834B" : option.label === "Non Veg" ? "#C44949" : "#68736D"}
              />
              <AppText style={[
                styles.foodToggleText,
                activeFood === option.label && styles.foodToggleTextActive,
              ]}>
                {option.label}
              </AppText>
            </Pressable>
          ))}
          <View style={styles.foodToggleUtilityGroup}>
            {activeMeal !== "All" ||
              activeCuisine !== "All" ||
              activeCookingStyle !== "All" ||
              activeFood !== "All" ||
              search.trim() ? (
              <Pressable
                style={styles.utilityIconButton}
                onPress={resetFilters}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                hitSlop={6}
              >
                <Ionicons name="close-circle-outline" size={19} color="#C44949" /> 
              </Pressable>
            ) : null}
          </View>
        </View>
        {filtersVisible ? (
          <View style={styles.filterTableWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTableRow}
              keyboardShouldPersistTaps="handled"
            >
              {(
                [
                  {
                    key: "meal",
                    title: "Meal type",
                    value: activeMeal,
                    options: mealOptions,
                  },
                  {
                    key: "cuisine",
                    title: "Cuisine",
                    value: activeCuisine,
                    options: cuisineOptions,
                  },
                  {
                    key: "style",
                    title: "Cooking style",
                    value: activeCookingStyle,
                    options: cookingStyleOptions,
                  },
                ] as const
              ).map((filter) => (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterDropdown,
                    activeDropdown === filter.key && styles.filterDropdownOpen,
                    filter.value !== "All" && styles.filterDropdownSelected,
                  ]}
                  onPress={() => {
                    setDropdownSearch("");
                    setActiveDropdown((current) =>
                      current === filter.key ? null : filter.key,
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${filter.title}`}
                  accessibilityState={{ expanded: activeDropdown === filter.key }}
                >
                  <AppText variant="label" style={styles.filterDropdownTitle} numberOfLines={1}>
                    {filter.title}
                  </AppText>
                  <View style={styles.filterDropdownValueRow}>
                    <AppText
                      style={[
                        styles.filterDropdownValue,
                        filter.value !== "All" &&
                        styles.filterDropdownValueSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {filter.value}
                    </AppText>
                    <Ionicons
                      name={
                        activeDropdown === filter.key
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={13}
                      color={filter.value !== "All" ? "#1F7655" : "#778179"}
                    />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {activeDropdown ? (
              <View style={styles.filterDropdownMenu}>
                <View style={styles.filterDropdownMenuHeader}>
                  {/* <AppText style={styles.filterDropdownMenuTitle}>
                  {activeDropdown === "meal"
                    ? "Meal type"
                    : activeDropdown === "cuisine"
                      ? "Cuisine"
                      : activeDropdown === "style"
                        ? "Cooking style"
                        : "Cooking style"}
                </AppText> */}
                  <Pressable
                    onPress={() => {
                      setActiveDropdown(null);
                      setDropdownSearch("");
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color="#66736A" />
                  </Pressable>
                </View>
                <View style={styles.dropdownSearchBox}>
                  <Ionicons name="search-outline" size={16} color="#849087" />
                  <TextInput
                    value={dropdownSearch}
                    onChangeText={setDropdownSearch}
                    placeholder={`Search ${activeDropdown === "meal" ? "meal types" : activeDropdown === "cuisine" ? "cuisines" : activeDropdown === "style" ? "cooking styles" : "filter options"}...`}
                    placeholderTextColor="#929D95"
                    style={styles.dropdownSearchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel="Search filter options"
                  />
                  {!!dropdownSearch && (
                    <Pressable onPress={() => setDropdownSearch("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color="#849087" />
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  style={styles.filterDropdownOptions}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {(activeDropdown === "meal"
                    ? mealOptions
                    : activeDropdown === "cuisine"
                      ? cuisineOptions
                      : cookingStyleOptions
                  )
                    .filter((option) =>
                      normalize(option).includes(normalize(dropdownSearch)),
                    )
                    .map((option) => {
                      const selectedValue =
                        activeDropdown === "meal"
                          ? activeMeal
                          : activeDropdown === "cuisine"
                            ? activeCuisine
                            : activeCookingStyle;
                      const isSelected = option === selectedValue;
                      return (
                        <Pressable
                          key={option}
                          style={[
                            styles.filterDropdownOption,
                            isSelected && styles.filterDropdownOptionActive,
                          ]}
                          onPress={() => {
                            if (activeDropdown === "meal") setActiveMeal(option);
                            else if (activeDropdown === "cuisine")
                              setActiveCuisine(option);
                            else setActiveCookingStyle(option);
                            setActiveDropdown(null);
                          }}
                        >
                          <AppText
                            style={[
                              styles.filterDropdownOptionText,
                              isSelected && styles.filterDropdownOptionTextActive,
                            ]}
                          >
                            {option}
                          </AppText>
                          {isSelected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#1F7655"
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  {!(activeDropdown === "meal"
                    ? mealOptions
                    : activeDropdown === "cuisine"
                      ? cuisineOptions
                      : cookingStyleOptions
                  ).some((option) =>
                    normalize(option).includes(normalize(dropdownSearch)),
                  ) ? (
                    <AppText variant="helper" style={styles.dropdownNoResults}>
                      No matching options
                    </AppText>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
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
              <AppText variant="sectionTitle" style={styles.emptyTitle}>No recipes found</AppText>
              <AppText style={styles.emptyText}>
                Try another search or remove some filters.
              </AppText>
              <Pressable style={styles.resetButton} onPress={resetFilters}>
                <AppText variant="button" style={styles.resetButtonText}>
                  Clear search and filters
                </AppText>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? <View style={styles.listFooter} /> : undefined
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3ED",
  },
  headerIconButtonActive: { backgroundColor: "#1F7655" },
  refreshButton: {
    marginLeft: 0,
  },
  searchToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  searchContainer: { flex: 1, minWidth: 0 },
  foodToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // marginBottom: 5,
    marginTop: 2,
    flexWrap: "nowrap",
  },
  foodToggleUtilityGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  utilityIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
  },
  foodToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    backgroundColor: "#FFFFFF",
  },
  foodToggleButtonActive: {
    backgroundColor: "#1F7655",
    borderColor: "#1F7655",
  },
  vegToggleActive: { backgroundColor: "#27834B", borderColor: "#27834B" },
  nonVegToggleActive: { backgroundColor: "#C44949", borderColor: "#C44949" },
  foodToggleText: { fontSize: 12, fontWeight: "700", color: "#68736D" },
  foodToggleTextActive: { color: "#FFFFFF" },
  filterTableWrap: { marginTop: 2, zIndex: 5 },
  filterTableRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 7,
    paddingBottom: 3,
  },
  filterDropdown: {
    width: 103,
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  filterDropdownOpen: { borderColor: "#1F7655", backgroundColor: "#F5FAF6" },
  filterDropdownSelected: { borderColor: "#B6D5C1" },
  filterDropdownTitle: {
    color: "#657268",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 5,
  },
  filterDropdownValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  filterDropdownValue: {
    flex: 1,
    color: "#25332B",
    fontSize: 11,
    fontWeight: "700",
  },
  filterDropdownValueSelected: { color: "#1F7655" },
  filterDropdownMenu: {
    marginTop: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE7DE",
    borderRadius: 13,
    padding: 10,
    shadowColor: "#17231E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  filterDropdownMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2ED",
  },
  filterDropdownMenuTitle: {
    color: "#1B2D22",
    fontSize: 13,
    fontWeight: "800",
  },
  dropdownSearchBox: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    backgroundColor: "#FBFCFA",
    borderRadius: 9,
    paddingHorizontal: 9,
    marginTop: 9,
    marginBottom: 5,
  },
  dropdownSearchInput: {
    flex: 1,
    color: "#25332B",
    fontSize: 12,
    paddingVertical: 7,
  },
  dropdownNoResults: {
    color: "#778179",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
  },
  filterDropdownOptions: { maxHeight: 190 },
  filterDropdownOption: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
    borderRadius: 8,
    marginTop: 3,
  },
  filterDropdownOptionActive: { backgroundColor: "#EAF4ED" },
  filterDropdownOptionText: { color: "#425047", fontSize: 12, flex: 1 },
  filterDropdownOptionTextActive: { color: "#1F7655", fontWeight: "800" },
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
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#68736D",
  },
  chipTextActive: { color: "#FFFFFF" },
  advancedFilters: { marginTop: 9, gap: 3 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  listAnimationWrap: { flex: 1 },
  emptyListContent: { flexGrow: 1 },
  recipeCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EAE4",
    padding: 10,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#17231E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  cardImageWrap: {
    width: 112,
    height: 150,
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    borderRadius: 12,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E7F1EA",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
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
    flexShrink: 1,
    minWidth: 0,
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
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: "#17231E",
  },
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