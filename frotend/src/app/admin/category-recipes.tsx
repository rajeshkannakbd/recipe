import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { recipeApi } from "../../api/recipeApi";
import type { RecipeResponse } from "../../types/recipe";
import AppText from "../../components/common/AppText";

export default function AdminCategoryRecipesScreen() {
  const router = useRouter();

  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const selectedCategoryId = Number(categoryId);

  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    if (!Number.isInteger(selectedCategoryId) || selectedCategoryId <= 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const allRecipes = await recipeApi.getAll();

      const filteredRecipes = allRecipes.filter(
        (recipe) => recipe.categoryId === selectedCategoryId,
      );

      setRecipes(filteredRecipes);
    } catch (error) {
      console.error("Unable to load category recipes:", error);
      Alert.alert("Error", "Unable to load recipes for this category.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  useFocusEffect(
    useCallback(() => {
      void loadRecipes();
    }, [loadRecipes]),
  );

  const title = useMemo(
    () => categoryName || "Category Recipes",
    [categoryName],
  );

  const openRecipe = (id: number) => {
    router.push({
      pathname: "/admin/edit-recipe/[id]",
      params: { id: String(id) },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F7655" />
          <AppText variant="helper" style={styles.loadingText}>
            Loading recipes...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/admin/categories")}
        >
          <Ionicons name="arrow-back" size={23} color="#17231E" />
        </Pressable>

        <View style={styles.headerText}>
          <AppText variant="pageTitle" style={styles.title} numberOfLines={1}>
            Manage {title}
          </AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
          </AppText>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/admin/edit-recipe/new")}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <AppText variant="button" style={styles.addButtonText}>
            Add
          </AppText>
        </Pressable>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          recipes.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.recipeCard}>
            <View style={styles.recipeImageContainer}>
              {item.photoUrl ? (
                <Image
                  source={{ uri: item.photoUrl }}
                  style={styles.recipeImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="restaurant-outline"
                    size={28}
                    color="#1F7655"
                  />
                </View>
              )}
            </View>

            <View style={styles.recipeInfo}>
              <AppText
                variant="cardTitle"
                style={styles.recipeName}
                numberOfLines={2}
              >
                {item.name}
              </AppText>

              <AppText
                variant="subtitle"
                style={styles.recipeDescription}
                numberOfLines={2}
              >
                {item.description || "No description available"}
              </AppText>

              <AppText variant="label" style={styles.status}>
                {String(item.status)}
              </AppText>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#C5C9C4" />
            <AppText variant="sectionTitle" style={styles.emptyTitle}>
              No recipes found
            </AppText>
            <AppText
              variant="body"
              style={styles.emptyDescription}
            >
              There are no recipes assigned to {title} yet.
            </AppText>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                router.push({
                  pathname: "/admin/edit-recipe/new",
                  params: { id: "new" },
                })
              }
            >
              <Ionicons name="add" size={19} color="#FFFFFF" />
              <AppText variant="button" style={styles.addButtonText}>
                Add Recipe
              </AppText>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#68736D",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8E3",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#17231E",
  },
  subtitle: {
    fontSize: 13,
    color: "#68736D",
    marginTop: 3,
  },
  refreshButton: {
    flexDirection: "row",
    backgroundColor: "#45e475",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  recipeImageContainer: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E7F1EA",
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    // fontSize: 15,
    fontWeight: "700",
    // color: "#17231E",
  },
  recipeDescription: {
    fontSize: 12,
    color: "#68736D",
    marginTop: 5,
    lineHeight: 17,
  },
  status: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F7655",
    marginTop: 6,
    textTransform: "capitalize",
  },
  emptyState: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17231E",
    marginTop: 14,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#68736D",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F7655",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
