import { useCallback, useMemo, useState } from "react";
import AppText from "../../components/common/AppText";

import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

import { ApiError } from "../../api/client";

import { recipeApi } from "../../api/recipeApi";

import type { RecipeResponse } from "../../types/recipe";

import SearchBar from "../../components/common/SearchBar";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenLoader from "../../components/common/ScreenLoader";
import RecipeListSkeleton2 from "@/components/skeleton/RecipeListSkeleton2";

type FilterTab = "all" | "published" | "draft";

export default function AdminRecipesScreen() {
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);

  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const [loading, setLoading] = useState(true);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [deleteName, setDeleteName] = useState("");

  const [deleting, setDeleting] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Recipe Deleted!");
  const [successMessage, setSuccessMessage] = useState("");

  const insets = useSafeAreaInsets();

  // Fetch the latest recipes from the backend.
  // silent=true is used for background refreshes so temporary network errors
  // do not repeatedly interrupt the user with alert popups.
  const load = useCallback(async (silent = false) => {
    try {
      const latestRecipes = await recipeApi.getAll();
      setRecipes(latestRecipes);
    } catch (e) {
      console.error("LOAD RECIPES ERROR:", e);

      if (!silent) {
        if (e instanceof ApiError) {
          Alert.alert(`Load Failed (${e.status})`, e.message);
        } else if (e instanceof Error) {
          Alert.alert("Error", e.message);
        } else {
          Alert.alert("Error", "Unable to load recipes.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

 
useFocusEffect(
  useCallback(() => {
    void load(false);
  }, [load]),
);


  const filtered = useMemo(() => {
    let result = recipes;

    if (activeTab === "published") {
      result = result.filter((r) => r.status === "Published");
    }

    if (activeTab === "draft") {
      result = result.filter((r) => r.status === "Draft");
    }

    if (search.trim()) {
      result = result.filter((r) =>
        `${r.name} ${r.categoryName}`

          .toLowerCase()

          .includes(search.toLowerCase()),
      );
    }

    return result;
  }, [recipes, activeTab, search]);

  const handleDelete = (
    id: number,

    name: string,
  ) => {
    setDeleteId(id);

    setDeleteName(name);

    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) {
      return;
    }

    try {
      setDeleting(true);

      await recipeApi.delete(deleteId);

      setDeleteModalVisible(false);

      setDeleteId(null);

      setDeleteName("");

      await load();
      setSuccessTitle("Recipe Deleted!");
      setSuccessMessage(`"${deleteName}" has been deleted successfully.`);
      setSuccessModalVisible(true);
    } catch (error) {
      console.error(
        "DELETE RECIPE ERROR:",

        error,
      );

      if (error instanceof ApiError) {
        console.error(
          "DELETE RECIPE STATUS:",

          error.status,
        );

        console.error(
          "DELETE RECIPE RESPONSE:",

          error.data,
        );

        Alert.alert(
          `Delete Failed (${error.status})`,

          error.message,
        );
      } else if (error instanceof Error) {
        Alert.alert(
          "Delete Failed",

          error.message,
        );
      } else {
        Alert.alert(
          "Delete Failed",

          "Unable to delete recipe.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const tabs: {
    key: FilterTab;

    label: string;
  }[] = [
      {
        key: "all",

        label: "All",
      },

      {
        key: "published",

        label: "Published",
      },

      {
        key: "draft",

        label: "Draft",
      },
    ];

  if (loading) {
    return <RecipeListSkeleton2 />;
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 8 : 8 },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <AppText variant="pageTitle" style={styles.title}>Manage Recipes</AppText>
            <AppText variant="label" style={styles.brandCaption}>ADMIN WORKSPACE</AppText>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/admin/edit-recipe/new")}
          >
            <Ionicons name="add" size={20} color="#fff" />

            <AppText variant="button" style={styles.addButtonText}>Add</AppText>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes..."
          />
        </View>

        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <AppText
                variant="label"
                style={[
                  styles.tabText,

                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.recipeCard}>
            <Pressable
              style={styles.recipeContent}
              onPress={() =>
                router.push({
                  pathname: "/recipe/[id]",

                  params: {
                    id: String(item.id),
                  },
                })
              }
            >
              <View style={styles.recipeImage}>
                {item.photoUrl ? (
                  <Image
                    source={{
                      uri: item.photoUrl,
                    }}
                    style={styles.recipeImageActual}
                    resizeMode="cover"
                    onError={(error) =>
                      console.log(
                        "ADMIN RECIPE IMAGE ERROR:",

                        item.name,

                        item.photoUrl,

                        error.nativeEvent,
                      )
                    }
                  />
                ) : (
                  <AppText variant="cardTitle" style={styles.recipeEmoji}>{item.name.charAt(0)}</AppText>
                )}
              </View>

              <View style={styles.recipeInfo}>
                <View style={styles.recipeHeadingRow}>
                  <AppText variant="cardTitle" style={styles.recipeName} numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <View style={styles.recipeActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.push({
                          pathname: "/admin/edit-recipe/[id]",
                          params: { id: String(item.id) },
                        });
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={19} color="#53605A" />
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        handleDelete(item.id, item.name);
                      }}
                      disabled={deleting}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={19} color="#B33B31" />
                    </Pressable>
                  </View>
                </View>

                <AppText variant="subtitle" style={styles.recipeMeta} numberOfLines={1}>
                  {item.categoryName || "Uncategorized"}
                  {(item as any).mealType ? ` · ${(item as any).mealType}` : ""}
                </AppText>

                <View style={styles.recipeDetailRow}>
                  <Ionicons name="people-outline" size={12} color="#68736D" />
                  <AppText variant="helper" style={styles.recipeDetailText}>
                    {item.baseServings} servings
                  </AppText>
                  {(item as any).baseCookedWeightGrams != null &&
                    Number((item as any).baseCookedWeightGrams) > 0 ? (
                    <>
                      <AppText variant="helper" style={styles.detailSeparator}>·</AppText>
                      <Ionicons name="scale-outline" size={12} color="#68736D" />
                      <AppText variant="helper" style={styles.recipeDetailText}>
                        {Number((item as any).baseCookedWeightGrams) >= 1000
                          ? `${(Number((item as any).baseCookedWeightGrams) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg cooked`
                          : `${Number((item as any).baseCookedWeightGrams).toLocaleString("en-IN", { maximumFractionDigits: 0 })} g cooked`}
                      </AppText>
                    </>
                  ) : null}
                </View>

                {((item as any).preparationTimeMinutes != null ||
                  (item as any).cookingTimeMinutes != null ||
                  (item as any).cuisine) ? (
                  <View style={styles.recipeDetailRow}>
                    {/* {(item as any).cuisine ? (
                      <>
                        <Ionicons name="restaurant-outline" size={12} color="#68736D" />
                        <AppText variant="helper" style={styles.recipeDetailText} numberOfLines={1}>
                          {(item as any).cuisine}
                        </AppText>
                      </>
                    ) : null} */}
                    {(item as any).preparationTimeMinutes != null ||
                      (item as any).cookingTimeMinutes != null ? (
                      <>
                        {/* {(item as any).cuisine ? <AppText variant="helper" style={styles.detailSeparator}>·</AppText> : null} */}
                        <Ionicons name="time-outline" size={12} color="#68736D" />
                        <AppText variant="helper" style={styles.recipeDetailText} numberOfLines={1}>
                          {[
                            (item as any).preparationTimeMinutes != null
                              ? `Prep ${(item as any).preparationTimeMinutes}m`
                              : null,
                            (item as any).cookingTimeMinutes != null
                              ? `Cook ${(item as any).cookingTimeMinutes}m`
                              : null,
                          ].filter(Boolean).join(" · ")}
                        </AppText>
                      </>
                    ) : null}
                    
                  </View>
                ) : null}

                <View
                  style={[
                    styles.statusBadge,

                    item.status === "Published"
                      ? styles.publishedBadge
                      : styles.draftBadge,
                  ]}
                >
                  <AppText
                    variant="label"
                    style={[
                      styles.statusText,

                      item.status === "Published"
                        ? styles.publishedText
                        : styles.draftText,
                    ]}
                  >
                    {item.status}
                  </AppText>
                </View>
              </View>
            </Pressable>

          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#C5C9C4" />

            <AppText variant="sectionTitle" style={styles.emptyTitle}>No recipes found</AppText>

            <AppText variant="body" style={styles.emptyText}>
              Create your first recipe to get started
            </AppText>
          </View>
        }
      />

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setDeleteModalVisible(false);
          }
        }}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteIconContainer}>
              <LottieView
                source={require("../../../assets/animations/Delete Bin.json")}
                autoPlay
                loop={!deleting}
                resizeMode="contain"
                style={styles.deleteAnimation}
              />
            </View>

            <AppText variant="sectionTitle" style={styles.deleteTitle}>Delete Recipe?</AppText>

            <AppText variant="body" style={styles.deleteMessage}>
              Are you sure you want to delete "{deleteName}"?
            </AppText>

            <View style={styles.deleteActions}>
              <Pressable
                style={styles.deleteCancelButton}
                onPress={() => {
                  if (!deleting) {
                    setDeleteModalVisible(false);
                  }
                }}
                disabled={deleting}
              >
                <AppText variant="button" style={styles.deleteCancelText}>Cancel</AppText>
              </Pressable>

              <Pressable
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <AppText variant="button" style={styles.deleteConfirmText}>
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
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={52} color="#1F7655" />
            </View>
            <AppText variant="sectionTitle" style={styles.successTitle}>{successTitle}</AppText>
            <AppText variant="body" style={styles.successMessage}>{successMessage}</AppText>
            <Pressable
              style={styles.successButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <AppText variant="button" style={styles.successButtonText}>Continue</AppText>
            </Pressable>
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
    paddingTop: 16,
    paddingBottom: 100,
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },

  headerTitle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minWidth: 0,
    marginRight: 12,
  },

  title: {
    color: "#17231E",
    flexShrink: 1,
  },

  addButton: {
    flexDirection: "row",
    flexShrink: 0,
    marginLeft: "auto",
    alignItems: "center",

    backgroundColor: "#1F7655",

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 8,

    gap: 4,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: 700,
  },

  searchContainer: {
    marginBottom: 10,
  },

  tabContainer: {
    flexDirection: "row",

    backgroundColor: "#E7F1EA",

    borderRadius: 12,

    padding: 2,
  },

  tab: {
    flex: 1,

    paddingVertical: 8,

    alignItems: "center",

    borderRadius: 8,
  },

  tabActive: {
    backgroundColor: "#fff",
  },

  tabText: {

    color: "#68736D",
  },

  tabTextActive: {
    color: "#17231E",
  },

  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 8,
    marginBottom: 12,
    marginHorizontal:0,
  },

  recipeContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  recipeImage: {
    width: 112,

    height: 150,

    borderRadius: 14,

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

    color: "#1F7655",
  },

  recipeInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },

  recipeHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
    minWidth: 0,
  },

  recipeName: {
    color: "#17231E",
    flex: 1,
    minWidth: 0,
  },

  recipeMeta: {
    color: "#68736D",
    marginTop: 3,
  },

  recipeDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    overflow:"hidden",
    gap: 2,
    marginTop: 6,
    minWidth: 0,
    justifyContent: "flex-start",
  },

  recipeDetailText: {
    color: "#68736D",
    flexShrink: 1,
  },

  detailSeparator: {
    color: "#A0AAA2",
    marginHorizontal: 1,

  },

  statusBadge: {
    alignSelf: "flex-start",

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 8,

    marginTop: 10,
  },

  publishedBadge: {
    backgroundColor: "#E7F1EA",
  },

  draftBadge: {
    backgroundColor: "#FFF3E0",
  },

  statusText: {
  },

  publishedText: {
    color: "#1F7655",
  },

  draftText: {
    color: "#E65100",
  },

  recipeActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },

  actionButton: {
    padding: 4,
    marginLeft: 2,
  },

  emptyState: {
    alignItems: "center",

    paddingVertical: 60,
  },

  emptyTitle: {

    color: "#17231E",

    marginTop: 16,
  },

  emptyText: {

    color: "#68736D",

    marginTop: 4,
  },

  deleteOverlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.45)",

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: 24,
  },

  deleteModal: {
    width: "100%",

    maxWidth: 400,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    padding: 24,
  },

  deleteIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,

    backgroundColor: "#FDECEC",

    alignItems: "center",

    justifyContent: "center",

    alignSelf: "center",

    marginBottom: 16,
  },

  deleteAnimation: {
    width: 92,
    height: 92,
  },

  deleteTitle: {

    color: "#17231E",

    textAlign: "center",
  },

  deleteMessage: {

    color: "#68736D",

    textAlign: "center",

    marginTop: 8,
  },

  deleteActions: {
    flexDirection: "row",

    gap: 12,

    marginTop: 24,
  },

  deleteCancelButton: {
    flex: 1,

    paddingVertical: 14,

    borderRadius: 14,

    backgroundColor: "#E7F1EA",

    alignItems: "center",
  },

  deleteCancelText: {

    color: "#17231E",
  },

  deleteConfirmButton: {
    flex: 1,

    paddingVertical: 14,

    borderRadius: 14,

    backgroundColor: "#B33B31",

    alignItems: "center",
  },

  deleteConfirmText: {

    color: "#FFFFFF",
  },

  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "#17231E",
    textAlign: "center",
  },
  successMessage: {
    color: "#68736D",
    textAlign: "center",
    marginTop: 8,
  },
  successButton: {
    width: "100%",
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#1F7655",
    alignItems: "center",
  },
  successButtonText: {
    color: "#FFFFFF",
  },
  brandCaption: {
    letterSpacing: 1.6,
    color: "#829087",
    marginTop: 2,
  },
});
