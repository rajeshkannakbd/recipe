import { useState, useMemo, useCallback, useEffect, useRef } from "react";

import {
  View,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  ImageBackground,
  Animated,
  Easing,
} from "react-native";

import { useRouter } from "expo-router";

import { LinearGradient } from "expo-linear-gradient";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { categoryApi } from "../../api/categoryApi";

import { recipeApi } from "../../api/recipeApi";
import { get } from "../../api/client";

import type { CategoryResponse } from "../../types/category";

import type { RecipeResponse } from "../../types/recipe";

import SearchBar from "../../components/common/SearchBar";

import ScreenLoader from "../../components/common/ScreenLoader";
import AppText from "@/components/common/AppText";

const CATEGORY_IMAGES: Record<string, string> = {
  tiffin:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_6.jpg",

  meals:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_5.jpg",

  snacks:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379592/images_7.jpg",

  sancks:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379592/images_7.jpg",

  beverages:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379591/images_4.jpg",
};

const COLORS = {
  background: "#F7F8F3",
  surface: "#FFFFFF",
  primary: "#1F7655",
  primaryDark: "#15543C",
  paleGreen: "#E7F1EA",
  text: "#17231E",
  muted: "#68736D",
  border: "#E5E8E3",
  orange: "#F2A541",
};

type MealType =
  | "all"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snacks"
  | "beverages";

type FoodType = "all" | "veg" | "nonveg";

type RecipeReview = {
  id?: number;
  recipeId?: number;
  userId?: number;
  userName?: string;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string;
};

type RecipeWithOptionalRating = RecipeResponse & {
  rating?: number | null;
  averageRating?: number | null;
  averageRatingValue?: number | null;
  ratingAverage?: number | null;
  averageReviewRating?: number | null;
  reviews?: Array<{ rating?: number | null }>;
  reviewCount?: number | null;
  totalReviews?: number | null;
};

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || ["null", "undefined", "nil", "n/a", "na"].includes(text.toLowerCase())) return "";
  return text;
}

function getRecipeRating(recipe: RecipeResponse): number | null {
  const item = recipe as RecipeWithOptionalRating;
  const candidates = [item.averageRating, item.averageRatingValue, item.ratingAverage, item.averageReviewRating, item.rating];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (candidate != null && Number.isFinite(value) && value > 0 && value <= 5) return value;
  }
  if (Array.isArray(item.reviews) && item.reviews.length > 0) {
    const ratings = item.reviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    if (ratings.length > 0) return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }
  return null;
}

function getReviewCount(recipe: RecipeResponse): number {
  const item = recipe as RecipeWithOptionalRating;
  const count = Number(item.reviewCount ?? item.totalReviews);
  if (Number.isFinite(count) && count > 0) return count;
  return Array.isArray(item.reviews) ? item.reviews.length : 0;
}


const NON_VEG_INGREDIENT_KEYWORDS = [
  "egg",

  "eggs",

  "chicken",

  "mutton",

  "meat",

  "beef",

  "pork",

  "fish",

  "prawn",

  "prawns",

  "shrimp",

  "crab",

  "seafood",

  "lamb",

  "turkey",

  "duck",

  "bacon",

  "ham",

  "sausage",

  "salami",

  "pepperoni",

  "keema",

  "mince",

  "minced meat",
];

export default function CategoriesScreen() {
  const router = useRouter();

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(18)).current;
  const heroArtScale = useRef(new Animated.Value(0.88)).current;
  const heroButtonScale = useRef(new Animated.Value(1)).current;

  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);

  const [reviewsByRecipeId, setReviewsByRecipeId] = useState<Record<string, RecipeReview[]>>({});

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [activeMeal, setActiveMeal] = useState<MealType>("all");

  const [activeFood, setActiveFood] = useState<FoodType>("all");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const load = useCallback(async () => {
    try {
      const [cats, recs] = await Promise.all([
        categoryApi.getAll(),

        recipeApi.getAll(),
      ]);

      setCategories(cats);
      setRecipes(recs);

      // Reviews are returned by a separate endpoint, not by GET /api/recipes.
      // Load them separately so Popular Recipes can show real ratings/counts.
      const publishedRecipes = recs.filter((recipe) => {
        const status = String(recipe.status ?? "").trim().toLowerCase();
        return !status || status === "published" || status === "2";
      });

      const reviewEntries = await Promise.all(
        publishedRecipes.map(async (recipe) => {
          try {
            const response = await get<unknown>(`/recipes/${recipe.id}/reviews`);
            let payload = response as unknown;

            if (payload && typeof payload === "object" && !Array.isArray(payload)) {
              const wrapper = payload as {
                items?: unknown;
                data?: unknown;
                reviews?: unknown;
              };
              payload = wrapper.items ?? wrapper.reviews ?? wrapper.data ?? payload;
            }

            const reviewList = Array.isArray(payload)
              ? payload
              : payload && typeof payload === "object" && "rating" in payload
                ? [payload]
                : [];

            return [
              String(recipe.id),
              reviewList.filter(
                (review): review is RecipeReview =>
                  !!review && typeof review === "object" && "rating" in review,
              ),
            ] as const;
          } catch (reviewError) {
            // Keep the home screen usable if reviews are unavailable for a recipe.
            console.warn(`Unable to load reviews for recipe ${recipe.id}:`, reviewError);
            return [String(recipe.id), []] as const;
          }
        }),
      );

      setReviewsByRecipeId(Object.fromEntries(reviewEntries));
    } catch (e) {
      console.error(
        "LOAD CATEGORIES ERROR:",

        e,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;

    heroOpacity.setValue(0);
    heroTranslateY.setValue(18);
    heroArtScale.setValue(0.88);

    const entrance = Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(heroArtScale, {
        toValue: 1,
        speed: 14,
        bounciness: 3,
        useNativeDriver: true,
      }),
    ]);

    entrance.start();
    return () => entrance.stop();
  }, [loading, heroOpacity, heroTranslateY, heroArtScale]);

  const selectedCategoryName = useMemo(() => {
    switch (activeMeal) {
      case "breakfast":
        return "tiffin";

      case "lunch":
        return "meals";

      case "dinner":
        return "tiffin";

      case "snacks":
        return "snacks";

      case "beverages":
        return "beverages";

      default:
        return null;
    }
  }, [activeMeal]);

  const isNonVegRecipe = useCallback(
    (recipe: RecipeResponse) => {
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        return false;
      }

      return recipe.ingredients.some((ingredient) => {
        const ingredientName = ingredient.ingredientName

          ?.trim()

          .toLowerCase();

        if (!ingredientName) {
          return false;
        }

        return NON_VEG_INGREDIENT_KEYWORDS.some((keyword) =>
          ingredientName.includes(keyword),
        );
      });
    },

    [],
  );

  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Meal/category filter
    if (activeMeal !== "all") {
      let categoryNames: string[];

      switch (activeMeal) {
        case "breakfast":
        case "dinner":
          categoryNames = ["tiffin"];
          break;
        case "lunch":
          categoryNames = ["meals"];
          break;
        case "snacks":
          categoryNames = ["snacks", "sancks"];
          break;
        case "beverages":
          categoryNames = ["beverages", "beverage", "drinks"];
          break;
        default:
          categoryNames = [];
      }

      result = result.filter((recipe) =>
        categoryNames.includes(recipe.categoryName?.trim().toLowerCase() ?? ""),
      );
    }

    // Vegetarian / non-vegetarian filter

    if (activeFood === "veg") {
      result = result.filter((recipe) => !isNonVegRecipe(recipe));
    } else if (activeFood === "nonveg") {
      result = result.filter(isNonVegRecipe);
    }

    // Search filter

    if (search.trim()) {
      const searchValue = search.trim().toLowerCase();

      result = result.filter((recipe) => {
        const recipeName = recipe.name?.toLowerCase() || "";

        const categoryName = recipe.categoryName?.toLowerCase() || "";

        const ingredientNames =
          recipe.ingredients

            ?.map(
              (ingredient) => ingredient.ingredientName?.toLowerCase() || "",
            )

            .join(" ") || "";

        return (
          recipeName.includes(searchValue) ||
          categoryName.includes(searchValue) ||
          ingredientNames.includes(searchValue)
        );
      });
    }

    return result;
  }, [recipes, activeMeal, activeFood, search, isNonVegRecipe]);

  const filtered = useMemo(() => {
    let result = categories;

    if (selectedCategoryName) {
      result = result.filter(
        (category) =>
          category.name

            .trim()

            .toLowerCase() === selectedCategoryName,
      );
    }

    if (search.trim()) {
      result = result.filter((category) =>
        category.name

          .toLowerCase()

          .includes(search.toLowerCase()),
      );
    }

    return result;
  }, [categories, search, selectedCategoryName]);

  const popularRecipes = useMemo(() => {
    const published = recipes.filter((recipe) => {
      const status = String(recipe.status ?? "").trim().toLowerCase();
      return !status || status === "published" || status === "2";
    });

    const getReviews = (recipe: RecipeResponse) => reviewsByRecipeId[String(recipe.id)] ?? [];
    const getLiveRating = (recipe: RecipeResponse): number | null => {
      const ratings = getReviews(recipe)
        .map((review) => Number(review.rating))
        .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
      if (ratings.length > 0) {
        return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      }
      return getRecipeRating(recipe);
    };
    const getLiveReviewCount = (recipe: RecipeResponse) => {
      const count = getReviews(recipe).length;
      return count > 0 ? count : getReviewCount(recipe);
    };

    return [...published]
      .sort((a, b) => {
        const ratingA = getLiveRating(a) ?? -1;
        const ratingB = getLiveRating(b) ?? -1;
        if (ratingA !== ratingB) return ratingB - ratingA;

        const reviewsA = getLiveReviewCount(a);
        const reviewsB = getLiveReviewCount(b);
        if (reviewsA !== reviewsB) return reviewsB - reviewsA;

        return cleanText(a.name).localeCompare(cleanText(b.name));
      })
      .slice(0, 8);
  }, [recipes, reviewsByRecipeId]);

  const handleMealPress = (meal: MealType) => {
    setActiveMeal(meal);

    setSearch("");
  };

  const handleFoodPress = (food: FoodType) => {
    setActiveFood(food);

    setSearch("");
  };

  if (loading) {
    return <ScreenLoader />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fixed white header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
           <AppText variant="pageTitle" style={styles.brandName}>RecipePro</AppText>
            <AppText variant="label" style={styles.brandCaption}>PLAN · COOK · SCALE</AppText>
        </View>
        
        <AppText variant="sectionTitle" style={styles.headingg}>What are we cooking today?</AppText>
        
        {/* <View style={[
  styles.searchContainer, 
  isSelected && styles.selectedBorder
]}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search categories..."
          />
        </View> */}
      </View>

 
      <FlatList
        ListHeaderComponent={
          <View>
                 <View>
                  <Animated.View
                    style={[
                      styles.heroEntrance,
                      {
                        opacity: heroOpacity,
                        transform: [{ translateY: heroTranslateY }],
                      },
                    ]}
                  >
                    <ImageBackground
                      source={{
                        uri: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85",
                      }}
                      style={styles.hero}
                      imageStyle={styles.heroImage}
                      resizeMode="cover"
                    >
                      <LinearGradient
                        colors={["rgba(13, 45, 29, 0.86)", "rgba(13, 45, 29, 0.54)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.heroShade}
                      >
                        <View style={styles.heroRow}>
                          <View style={styles.heroCopy}>
                            <AppText variant="label" style={styles.heroEyebrow}>YOUR NEXT FAVOURITE</AppText>
                            <AppText variant="pageTitle" style={styles.heroTitle}>Good food,{"\n"}made simple.</AppText>
                            <AppText variant="body" style={styles.heroDescription}>
                              Explore recipes, cooking styles and meal ideas.
                            </AppText>
                            <Animated.View
                              style={[
                                styles.heroButtonAnimated,
                                { transform: [{ scale: heroButtonScale }] },
                              ]}
                            >
                              <Pressable
                                style={styles.heroButton}
                                onPress={() => router.push("/(tabs)/all-recipes")}
                                onPressIn={() =>
                                  Animated.spring(heroButtonScale, {
                                    toValue: 0.96,
                                    speed: 22,
                                    bounciness: 2,
                                    useNativeDriver: true,
                                  }).start()
                                }
                                onPressOut={() =>
                                  Animated.spring(heroButtonScale, {
                                    toValue: 1,
                                    speed: 18,
                                    bounciness: 3,
                                    useNativeDriver: true,
                                  }).start()
                                }
                                accessibilityRole="button"
                              >
                                <AppText variant="button" style={styles.heroButtonText}>Explore recipes</AppText>
                                <Ionicons name="arrow-forward" size={16} color={COLORS.primaryDark} />
                              </Pressable>
                            </Animated.View>
                          </View>
                          <Animated.View
                            style={[
                              styles.heroArt,
                              { transform: [{ scale: heroArtScale }] },
                            ]}
                          >
                            <Ionicons name="restaurant-outline" size={62} color="#FFFFFF" />
                            <View style={styles.heroLeaf}>
                              <Ionicons name="leaf" size={23} color="#FFFFFF" />
                            </View>
                          </Animated.View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </Animated.View>

            <View style={styles.popularSectionHeader}>
              <View style={styles.popularSectionCopy}>
                <AppText variant="sectionTitle" style={styles.sectionTitle}>Popular recipes</AppText>
                <AppText variant="subtitle" style={styles.popularSectionSubtitle}>Top-rated recipes first</AppText>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/all-recipes")}
                hitSlop={8}
                style={styles.popularViewAll}
              >
                <AppText variant="button" style={styles.viewAllText}>View all</AppText>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
              </Pressable>
            </View>
            {popularRecipes.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularCardsContent}
              >
                {popularRecipes.map((recipe) => {
                  const recipeReviews = reviewsByRecipeId[String(recipe.id)] ?? [];
                  const validRatings = recipeReviews
                    .map((review) => Number(review.rating))
                    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
                  const rating = validRatings.length > 0
                    ? validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length
                    : getRecipeRating(recipe);
                  const reviewCount = recipeReviews.length > 0
                    ? recipeReviews.length
                    : getReviewCount(recipe);
                  const photoUrl = cleanText(recipe.photoUrl);
                  return (
                    <Pressable
                      key={recipe.id}
                      style={styles.popularCard}
                      onPress={() =>
                        router.push({
                          pathname: "/recipe/[id]",
                          params: { id: String(recipe.id) },
                        })
                      }
                    >
                      <View style={styles.popularImageWrap}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.popularImageActual} resizeMode="cover" />
                        ) : (
                          <View style={styles.popularImageFallback}>
                            <Ionicons name="restaurant-outline" size={38} color={COLORS.primary} />
                          </View>
                        )}
                        <View style={styles.popularBadge}>
                          <Ionicons name="sparkles" size={12} color={COLORS.primary} />
                          <AppText variant="label" style={styles.popularBadgeText}>Popular</AppText>
                        </View>
                      </View>
                      <AppText variant="cardTitle" style={styles.popularName} numberOfLines={2}>
                        {cleanText(recipe.name) || "Untitled recipe"}
                      </AppText>
                      <AppText variant="helper" style={styles.popularCategory} numberOfLines={1}>
                        {cleanText(recipe.categoryName) || "Recipe"}
                      </AppText>
                      <View style={styles.ratingRow}>
                        {rating !== null ? (
                          <>
                            <Ionicons name="star" size={14} color={COLORS.orange} />
                            <AppText variant="label" style={styles.ratingText}>{rating.toFixed(1)}</AppText>
                            {reviewCount > 0 && <AppText variant="helper" style={styles.reviewCount}>({reviewCount})</AppText>}
                          </>
                        ) : (
                          <>
                            <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                            <AppText variant="helper" style={styles.reviewCount}>Discover this recipe</AppText>
                          </>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.popularEmptyState}>
                <Ionicons name="restaurant-outline" size={24} color={COLORS.muted} />
                <AppText variant="body" style={styles.popularEmptyText}>Published recipes will appear here when available.</AppText>
              </View>
            )}

              <View style={styles.scrollSectionHeader}>
                <AppText variant="sectionTitle" style={styles.sectionTitle}>
                  {/* Keep your existing section-title condition here */}
                  {activeFood === "veg"
                    ? "Vegetarian Recipes"
                    : activeFood === "nonveg"
                      ? "Non-Vegetarian Recipes"
                      : activeMeal === "breakfast"
                        ? "Breakfast - Tiffin"
                        : activeMeal === "lunch"
                          ? "Lunch - Meals"
                          : activeMeal === "dinner"
                            ? "Dinner - Tiffin"
                            : "Categories"}
                </AppText>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        key={
          activeMeal === "all" && activeFood === "all"
            ? "categories-grid"
            : "recipes-list"
        }
        data={
          (activeMeal === "all" && activeFood === "all"
            ? filtered
            : filteredRecipes) as CategoryResponse[]
        }
        numColumns={activeMeal === "all" && activeFood === "all" ? 2 : 1}
        columnWrapperStyle={
          activeMeal === "all" && activeFood === "all"
            ? styles.columnWrapper
            : undefined
        }
        renderItem={({ item }) => {
          if (activeMeal !== "all" || activeFood !== "all") {
            const recipe = item as unknown as RecipeResponse;

            return (
              <Pressable
                style={styles.recipeCard}
                onPress={() =>
                  router.push({
                    pathname: "/recipe/[id]",

                    params: {
                      id: String(recipe.id),
                    },
                  })
                }
              >
                <View style={styles.recipeImage}>
                  {recipe.photoUrl ? (
                    <Image
                      source={{
                        uri: recipe.photoUrl,
                      }}
                      style={{
                        width: "100%",

                        height: "100%",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <AppText variant="pageTitle" style={styles.recipeFallbackText}>
                      {recipe.name.charAt(0)}
                    </AppText>
                  )}
                </View>

                <View style={styles.recipeInfo}>
                  <AppText variant="cardTitle" style={styles.recipeName} numberOfLines={1}>
                    {recipe.name}
                  </AppText>

                  <AppText variant="helper" style={styles.recipeMeta} numberOfLines={1}>
                    {recipe.categoryName} · {recipe.baseServings} servings
                  </AppText>

                  <View style={styles.recipeBottom}>
                    <View style={styles.statusBadge}>
                      <AppText variant="label" style={styles.statusText}>{recipe.status}</AppText>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#68736D"
                    />
                  </View>
                </View>
              </Pressable>
            );
          }

          const category = item as CategoryResponse;

          const categoryKey = category.name

            .trim()

            .toLowerCase();

          const imageUrl = category.imageUrl;

          const recipeCount = recipes.filter(
            (r) => r.categoryId === category.id,
          ).length;

          return (
            <Pressable
              style={styles.categoryCard}
              onPress={() =>
                router.push({
                  pathname: "/category/[id]",

                  params: {
                    id: String(category.id),
                  },
                })
              }
            >
              <View style={styles.categoryImage}>
                {imageUrl ? (
                  <Image
                    source={{
                      uri: imageUrl,
                    }}
                    style={styles.categoryImageActual}
                    resizeMode="cover"
                    onError={(error) =>
                      console.log(
                        "CATEGORY IMAGE ERROR:",

                        category.name,

                        imageUrl,

                        error.nativeEvent,
                      )
                    }
                  />
                ) : (
                  <View style={styles.categoryImageFallback}>
                    <AppText variant="pageTitle" style={styles.categoryFallbackText}>
                      {category.name.charAt(0)}
                    </AppText>
                  </View>
                )}
              </View>

              <AppText variant="cardTitle" style={styles.categoryName}>{category.name}</AppText>

              <AppText variant="helper" style={styles.categoryCount}>{recipeCount} recipes</AppText>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeFood === "nonveg"
                  ? "fast-food-outline"
                  : activeFood === "veg"
                    ? "leaf-outline"
                    : "restaurant-outline"
              }
              size={48}
              color="#C5C9C4"
            />

            <AppText variant="sectionTitle" style={styles.emptyTitle}>No recipes found</AppText>

            <AppText variant="body" style={styles.emptyText}>
              {activeMeal === "breakfast"
                ? "No Tiffin recipes are available for breakfast."
                : activeMeal === "lunch"
                  ? "No Meals recipes are available for lunch."
                  : activeMeal === "dinner"
                    ? "No Tiffin recipes are available for dinner."
                    : activeFood === "veg"
                      ? "No vegetarian recipes are available."
                      : activeFood === "nonveg"
                        ? "No non-vegetarian recipes are available."
                        : "No categories found."}
            </AppText>
          </View>
        }
      />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  container: {
    backgroundColor: "#F7F8F3",

    flex: 1,
  },

  listContent: {
    paddingHorizontal: 10,

    paddingBottom: 0,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    zIndex: 10,
  },

  headerTop: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems:"flex-start",

    marginBottom: 8,
    paddingTop: 4,
  },

  title: {
    fontSize: 24,

    fontWeight: "800",

    color: "#065534",
  },

  addButton: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#1F7655",

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 8,

    gap: 4,
  },

  addButtonText: {
    color: "#fff",

    fontSize: 14,

    fontWeight: "700",
  },

  searchContainer: {
    marginBottom: 5,
    marginTop:8,
    borderColor: '#2f681a',
    borderWidth: 1 ,
    borderRadius:10,
  },
    selectedBorder: {
    borderColor: '#007aff', // Turns blue on selection
    borderWidth: 2          // Makes the border thicker on selection
  },

  greeting: {
    fontSize: 24,

    fontWeight: "800",

    color: "#17231E",
  },

  notificationButton: {
    width: 44,

    height: 44,

    borderRadius: 14,

    backgroundColor: "#fff",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    alignItems: "center",

    justifyContent: "center",
  },
  
  filterNavigation: {
    marginBottom: 24,
    gap: 10,
  },

  categoryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },

  foodFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  chip: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 20,

    backgroundColor: "#fff",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    gap: 6,
  },

  filterSeparator: {
    width: 1,
    height: 28,
    backgroundColor: "#D9DED9",
    marginHorizontal: 4,
    alignSelf: "center",
  },

  chipActive: {
    backgroundColor: "#1F7655",

    borderColor: "#1F7655",
  },

  chipText: {
    fontSize: 13,

    fontWeight: "600",

    color: "#68736D",
  },

  chipTextActive: {
    color: "#fff",
  },

  sectionHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 12,

    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 18,

    fontWeight: "700",

    color: "#17231E",
  },

  viewAllText: {
    fontSize: 13,

    fontWeight: "600",

    color: "#1F7655",
  },

  popularSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  popularSectionCopy: { flex: 1, paddingRight: 8 },
  popularSectionSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  popularViewAll: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 5 },
  popularCardsContent: { paddingHorizontal: 2, paddingRight: 20, paddingBottom: 4 },
  popularCard: {
    width: 188,
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  popularImageWrap: {
    height: 118,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: COLORS.paleGreen,
    position: "relative",
  },
  popularImageActual: { width: "100%", height: "100%" },
  popularImageFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paleGreen },
  popularBadge: {
    position: "absolute", left: 8, top: 8, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 5,
  },
  popularBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "800" },
  popularName: { color: COLORS.text, fontSize: 15, lineHeight: 20, fontWeight: "800", marginTop: 10, minHeight: 2 },
  popularCategory: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  ratingText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
  reviewCount: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
  popularEmptyState: {
    marginHorizontal: 20, padding: 20, borderRadius: 16, backgroundColor: COLORS.surface,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  popularEmptyText: { color: COLORS.muted, fontSize: 12, flex: 1, lineHeight: 18 },

  categoryCard: {
    width: "48%",

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 12,

    marginBottom: 12,
  },

  categoryImage: {
    width: "100%",

    height: 100,

    borderRadius: 14,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 8,

    overflow: "hidden",
  },

  categoryImageActual: {
    width: "100%",

    height: "100%",
  },

  categoryImageFallback: {
    width: "100%",

    height: "100%",

    alignItems: "center",

    justifyContent: "center",
  },

  categoryFallbackText: {
    fontSize: 36,

    fontWeight: "700",

    color: "#1F7655",
  },

  categoryName: {
    fontSize: 15,

    fontWeight: "700",

    color: "#17231E",
  },

  categoryCount: {
    fontSize: 12,

    color: "#68736D",

    marginTop: 2,
  },

  recipeCard: {
    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 12,

    marginBottom: 12,
  },

  recipeImage: {
    width: 82,

    height: 82,

    borderRadius: 16,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",
  },

  recipeFallbackText: {
    fontSize: 30,

    fontWeight: "800",

    color: "#1F7655",
  },

  recipeInfo: {
    flex: 1,

    marginLeft: 14,
  },

  recipeName: {
    fontSize: 16,

    fontWeight: "800",

    color: "#17231E",
  },

  recipeMeta: {
    fontSize: 12,

    color: "#68736D",

    marginTop: 5,
  },

  recipeBottom: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 8,
  },

  statusBadge: {
    backgroundColor: "#E7F1EA",

    paddingHorizontal: 8,

    paddingVertical: 4,

    borderRadius: 8,
  },

  statusText: {
    fontSize: 10,

    fontWeight: "700",

    color: "#1F7655",
  },

  emptyState: {
    alignItems: "center",

    paddingVertical: 40,

    width: "100%",
  },

  emptyTitle: {
    fontSize: 18,

    fontWeight: "700",

    color: "#17231E",

    marginTop: 16,
  },

  emptyText: {
    fontSize: 14,

    color: "#8A938E",

    marginTop: 6,

    textAlign: "center",
  },

    brandName: { color: "#0e5c23", fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  brandCaption: { color: "#444242", fontSize: 9, fontWeight: "700", letterSpacing: 1.2, marginTop: 3 },
  headingg: { color: "#313730", fontSize: 22, lineHeight: 29, fontWeight: "800", letterSpacing: -0.25 },
    heroEntrance: {
    marginHorizontal: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  hero: {
    minHeight: 206,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.primaryDark,
  },
  heroImage: {
    borderRadius: 24,
  },
  heroShade: {
    flex: 1,
    minHeight: 206,
    padding: 20,
    backgroundColor: "rgba(13, 45, 29, 0.22)",
  },
  heroRow: {
    flex: 1,
    minHeight: 164,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCopy: { flex: 1, zIndex: 1, alignItems: "flex-start" },
  heroEyebrow: { color: "#D3E8DA", fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { color: COLORS.surface, fontSize: 27, lineHeight: 32, fontWeight: "800", letterSpacing: -0.4, marginTop: 8 },
  heroDescription: { color: "#F0F6F1", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 215 },
  heroButtonAnimated: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  heroButtonText: { color: COLORS.primaryDark, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  heroArt: {
    width: 82,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    opacity: 0.94,
  },
  heroLeaf: {
    position: "absolute",
    right: 0,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(62, 140, 105, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
});
