
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { categoryApi } from "../../api/categoryApi";
import { recipeApi } from "../../api/recipeApi";

import type { CategoryResponse } from "../../types/category";
import type { RecipeResponse } from "../../types/recipe";

import SearchBar from "../../components/common/SearchBar";

import CategoryRecipesSkeleton from "../../components/skeleton/CategoryRecipesSkeleton";

/* =====================================================
   CATEGORY IMAGES
===================================================== */

const CATEGORY_IMAGES: Record<string, string> = {
  tiffin:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_6.jpg",

  meals:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_5.jpg",

  snacks:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379592/images_7.jpg",

  beverages:
    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379591/images_4.jpg",
};

export default function CategoryRecipesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  const [category, setCategory] =
    useState<CategoryResponse | null>(null);

  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  /* =====================================================
     LOAD CATEGORY + RECIPES
  ===================================================== */

  const load = useCallback(async () => {
    try {
      const [cat, allRecipes] = await Promise.all([
        categoryApi.getById(Number(id)),
        recipeApi.getAll(),
      ]);

      setCategory(cat);

      setRecipes(
        allRecipes.filter(
          (r) => r.categoryId === Number(id)
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
     SEARCH FILTER
  ===================================================== */

  const filtered = useMemo(
    () =>
      recipes.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      ),
    [recipes, search]
  );

  /* =====================================================
     LOADING SKELETON
  ===================================================== */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top"]}
      >
        {/* FIXED BACK BUTTON */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtnFixed}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#17231E"
          />
        </Pressable>

        {/* CONTINUOUS SHIMMER SKELETON */}
        <CategoryRecipesSkeleton />
      </SafeAreaView>
    );
  }

  /* =====================================================
     CATEGORY NOT FOUND
  ===================================================== */

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Category not found
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* =====================================================
     CATEGORY IMAGE
  ===================================================== */

  const categoryKey = category.name.trim().toLowerCase();

  const categoryImageUrl = category.imageUrl;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      {/* FIXED BACK BUTTON */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtnFixed}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color="#17231E"
        />
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        /* =================================================
           HEADER
        ================================================== */

        ListHeaderComponent={
          <View style={styles.header}>
            {/* CATEGORY INFORMATION */}

            <View style={styles.categoryInfo}>
              <View style={styles.categoryIcon}>
                {categoryImageUrl ? (
                  <Image
                    source={{
                      uri: categoryImageUrl,
                    }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                    onLoad={() =>
                      console.log(
                        "CATEGORY IMAGE LOADED:",
                        category.name,
                        categoryImageUrl
                      )
                    }
                    onError={(error) =>
                      console.log(
                        "CATEGORY IMAGE ERROR:",
                        category.name,
                        categoryImageUrl,
                        error.nativeEvent
                      )
                    }
                  />
                ) : (
                  <Text style={styles.categoryEmoji}>
                    {category.name === "Tiffin"
                      ? "🍳"
                      : category.name === "Meals"
                        ? "🍽"
                        : category.name === "Dinner"
                          ? "🌙"
                          : category.name === "Snacks"
                            ? "🍿"
                            : category.name === "Desserts"
                              ? "🍰"
                              : "🍚"}
                  </Text>
                )}
              </View>

              <Text style={styles.categoryName}>
                {category.name}
              </Text>

              <Text style={styles.categoryDescription}>
                {category.description}
              </Text>

              <Text style={styles.recipeCount}>
                {recipes.length} recipes
              </Text>
            </View>

            {/* SEARCH */}

            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search in this category"
              />
            </View>
          </View>
        }

        /* =================================================
           RECIPE CARD
        ================================================== */

        renderItem={({ item }) => (
          <Pressable
            style={styles.recipeCard}
            onPress={() =>
              router.push({
                pathname: "/recipe/[id]",
                params: {
                  id: String(item.id),
                },
              })
            }
          >
            {/* RECIPE IMAGE */}

            <View style={styles.recipeImage}>
              {item.photoUrl ? (
                <Image
                  source={{
                    uri: item.photoUrl,
                  }}
                  style={styles.recipeImageActual}
                  resizeMode="cover"
                  onLoad={() =>
                    console.log(
                      "CATEGORY RECIPE IMAGE LOADED:",
                      item.name,
                      item.photoUrl
                    )
                  }
                  onError={(error) =>
                    console.log(
                      "CATEGORY RECIPE IMAGE ERROR:",
                      item.name,
                      item.photoUrl,
                      error.nativeEvent
                    )
                  }
                />
              ) : (
                <Text style={styles.recipeEmoji}>
                  {item.name.charAt(0)}
                </Text>
              )}
            </View>

            {/* RECIPE INFORMATION */}

            <View style={styles.recipeInfo}>
              <Text
                style={styles.recipeName}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text style={styles.recipeMeta}>
                {item.baseServings} servings
              </Text>

              {/* STATUS */}

              <View
                style={[
                  styles.statusBadge,
                  item.status === "Published"
                    ? styles.publishedBadge
                    : styles.draftBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === "Published"
                      ? styles.publishedText
                      : styles.draftText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            {/* ARROW */}

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#C5C9C4"
            />
          </Pressable>
        )}

        /* =================================================
           EMPTY STATE
        ================================================== */

        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="restaurant-outline"
              size={48}
              color="#C5C9C4"
            />

            <Text style={styles.emptyTitle}>
              No recipes yet
            </Text>

            <Text style={styles.emptyText}>
              Recipes in this category will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* BACK BUTTON */

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  backBtnFixed: {
    position: "absolute",
    top: 12,
    left: 16,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    alignItems: "center",
    justifyContent: "center",
  },

  /* CATEGORY */

  categoryInfo: {
    alignItems: "center",
    marginBottom: 16,
  },

  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },

  categoryImage: {
    width: "100%",
    height: "100%",
  },

  categoryEmoji: {
    fontSize: 36,
  },

  categoryName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#17231E",
  },

  categoryDescription: {
    fontSize: 14,
    color: "#68736D",
    marginTop: 4,
    textAlign: "center",
  },

  recipeCount: {
    fontSize: 13,
    color: "#1F7655",
    fontWeight: "600",
    marginTop: 8,
  },

  /* SEARCH */

  searchContainer: {
    marginTop: 8,
  },

  /* RECIPE CARD */

  recipeCard: {
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
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  recipeImageActual: {
    width: "100%",
    height: "100%",
  },

  recipeEmoji: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F7655",
  },

  /* RECIPE INFORMATION */

  recipeInfo: {
    flex: 1,
    marginLeft: 12,
  },

  recipeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17231E",
  },

  recipeMeta: {
    fontSize: 13,
    color: "#68736D",
    marginTop: 2,
  },

  /* STATUS */

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },

  publishedBadge: {
    backgroundColor: "#E7F1EA",
  },

  draftBadge: {
    backgroundColor: "#FFF3E0",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  publishedText: {
    color: "#1F7655",
  },

  draftText: {
    color: "#E65100",
  },

  /* EMPTY STATE */

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17231E",
    marginTop: 16,
  },

  emptyText: {
    fontSize: 14,
    color: "#68736D",
    marginTop: 4,
  },

  /* ERROR */

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#68736D",
    marginBottom: 20,
  },

  backButton: {
    backgroundColor: "#1F7655",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
