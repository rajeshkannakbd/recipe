import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FavoritesScreenSkeleton from "@/components/skeleton/FavoritesScreenSkeleton";
import type { FavoriteCustomization, FavoriteEntry } from "../../api/favoriteApi";
import { favoriteApi } from "../../api/favoriteApi";
import { recipeApi } from "../../api/recipeApi";
import AppText from "../../components/common/AppText";
import type { RecipeResponse } from "../../types/recipe";
import { getAuthToken } from "../../utils/authStorage";

import SearchBar from "../../components/common/SearchBar";

export default function FavoritesScreen() {
  const router = useRouter();

  type FavoriteRecipeItem = RecipeResponse & {
    favoriteId: number;
    requiredServings: number;
    customization?: FavoriteCustomization | null;
  };

  const [recipes, setRecipes] = useState<FavoriteRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonCount, setSkeletonCount] = useState(0);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setSkeletonCount(0);
    try {
      const token = await getAuthToken();

      if (!token) {
        setRecipes([]);
        setSkeletonCount(0);
        return;
      }

      const favoriteEntries: FavoriteEntry[] = await favoriteApi.getMyFavorites();
      setSkeletonCount(favoriteEntries.length);

      const results = await Promise.all(
        favoriteEntries.map(async (entry): Promise<FavoriteRecipeItem> => {
          const recipe = await recipeApi.getById(entry.recipeId);
          let customization: FavoriteCustomization | null = null;
          try {
            customization = await favoriteApi.getCustomized(entry.favoriteId);
          } catch {
            // Basic favorites may not have a saved ingredient customization.
          }
          return {
            ...recipe,
            favoriteId: entry.favoriteId,
            requiredServings: entry.requiredServings,
            customization,
          };
        }),
      );

      setRecipes(results);
    } catch (error) {
      setSkeletonCount(0);
      console.error("Failed to load favorites:", error);
      setRecipes([]);

      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("log in")
      ) {
        Alert.alert(
          "Login required",
          "Please log in to view your saved recipes.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login",
              onPress: () => router.push("/login"),
            },
          ],
        );
      } else {
        Alert.alert(
          "Unable to load favourites",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openRemoveConfirmation = (favoriteId: number) => {
    setSelectedFavoriteId(favoriteId);
    setShowRemoveModal(true);
  };

  const closeRemoveConfirmation = () => {
    if (removing) return;

    setShowRemoveModal(false);
    setSelectedFavoriteId(null);
  };

  const handleRemoveFavorite = async () => {
    if (selectedFavoriteId === null || removing) return;

    try {
      setRemoving(true);

      await favoriteApi.remove(selectedFavoriteId);

      setRecipes((current) =>
        current.filter((recipe) => recipe.favoriteId !== selectedFavoriteId),
      );

      setShowRemoveModal(false);
      setSelectedFavoriteId(null);
    } catch (error) {
      console.error("Failed to remove favorite:", error);

      Alert.alert(
        "Unable to remove favorite",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRemoving(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return recipes;
    }

    return recipes.filter((recipe) => {
      const recipeName = recipe.name?.toLowerCase() ?? "";
      const categoryName = recipe.categoryName?.toLowerCase() ?? "";
      const ingredientNames =
        recipe.ingredients
          ?.map((ingredient) => ingredient.ingredientName?.toLowerCase() ?? "")
          .join(" ") ?? "";

      return (
        recipeName.includes(searchValue) ||
        categoryName.includes(searchValue) ||
        ingredientNames.includes(searchValue)
      );
    });
  }, [recipes, search]);

  if (loading) {
    return <FavoritesScreenSkeleton count={skeletonCount} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="pageTitle" style={styles.title}>My Favourites</AppText>
        <AppText variant="subtitle" style={styles.subtitle}>Your saved recipes</AppText>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search saved recipes..."
          />
        </View>
      </View>
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => String(item.favoriteId)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.recipeCard}
            onPress={() =>
              router.push({
                pathname: "/recipe/[id]",
                params: {
                  id: String(item.id),
                  fromFavorites: "true",
                  favoriteId: String(item.favoriteId),
                },
              })
            }
          >
            <View style={styles.recipeImage}>
              {item.photoUrl ? (
                <Image
                  source={{ uri: item.photoUrl }}
                  style={styles.recipeImageActual}
                  resizeMode="cover"
                />
              ) : (
                <AppText variant="cardTitle" style={styles.recipeEmoji}>{item.name.charAt(0)}</AppText>
              )}
            </View>

            <View style={styles.recipeInfo}>
              <AppText variant="cardTitle" style={styles.recipeName} numberOfLines={1}>
                {item.name}
              </AppText>

              <AppText variant="helper" style={styles.recipeMeta}>
                {item.categoryName} · {item.requiredServings} servings
              </AppText>
              {item.customization && (
                <View style={styles.savedCustomization}>
                  <AppText variant="helper" style={styles.savedServings}>
                    Customized for {item.customization.requiredServings}{" "}
                    servings
                  </AppText>
                </View>
              )}
            </View>

            <Pressable
              style={styles.heartButton}
              onPress={(event) => {
                event.stopPropagation();
                openRemoveConfirmation(item.favoriteId);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from favourites`}
            >
              <Ionicons name="heart" size={22} color="#E91E63" />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search.trim() ? "search-outline" : "heart-outline"}
              size={48}
              color="#C5C9C4"
            />

            <AppText variant="sectionTitle" style={styles.emptyTitle}>
              {search.trim() ? "No matching recipes" : "No favourites yet"}
            </AppText>

            <AppText variant="body" style={styles.emptyText}>
              {search.trim()
                ? "Try another recipe, category, or ingredient."
                : "Save recipes to see them here"}
            </AppText>

            {!search.trim() && (
              <Pressable
                style={styles.browseButton}
                onPress={() => router.replace("/categories")}
              >
                <AppText variant="button" style={styles.browseButtonText}>Browse Recipes</AppText>
              </Pressable>
            )}
          </View>
        }
      />

      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={closeRemoveConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name="heart-dislike-outline"
                size={28}
                color="#E91E63"
              />
            </View>

            <AppText variant="sectionTitle" style={styles.confirmTitle}>Remove from Favourites?</AppText>

            <AppText variant="body" style={styles.confirmMessage}>
              Are you sure you want to remove this recipe from your favourites?
            </AppText>

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={closeRemoveConfirmation}
                disabled={removing}
              >
                <AppText variant="button" style={styles.cancelButtonText}>Cancel</AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.removeButton,
                  removing && styles.removeButtonDisabled,
                ]}
                onPress={handleRemoveFavorite}
                disabled={removing}
              >
                <AppText variant="button" style={styles.removeButtonText}>
                  {removing ? "Removing..." : "Remove"}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
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

    alignItems: "center",

    marginBottom: 16,
    paddingTop: 8,
  },

  title: {
    fontSize: 24,

    fontWeight: "800",

    color: "#17231E",
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
    marginTop: 14,
  },
  subtitle: {
    fontSize: 14,
    color: "#68736D",
    marginTop: 4,
  },
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
    borderRadius: 16,
  },
  recipeEmoji: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F7655",
  },
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
  heartButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
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
  browseButton: {
    backgroundColor: "#1F7655",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FCE8EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 14,
    color: "#68736D",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F1F3EF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#68736D",
  },
  removeButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#E91E63",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  savedCustomization: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E8E3",
  },

  savedServings: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F7655",
    marginBottom: 4,
  },

  savedIngredient: {
    fontSize: 12,
    color: "#52645A",
    marginTop: 3,
  },
});
