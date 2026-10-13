import { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { recipeApi } from "../../api/recipeApi";
import type { RecipeResponse } from "../../types/recipe";
import SearchBar from "../../components/common/SearchBar";
import ScreenLoader from "../../components/common/ScreenLoader";

export default function AllRecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setRecipes(await recipeApi.getAll());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      recipes.filter(
        (r) =>
          r.status === "Published" &&
          `${r.name} ${r.categoryName}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [recipes, search]
  );

  if (loading) return <ScreenLoader />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>All Recipes</Text>
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search recipes..."
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.recipeCard}
            onPress={() =>
              router.push({
                pathname: "/recipe/[id]",
                params: { id: String(item.id) },
              })
            }
          >
            <View style={styles.recipeImageContainer}>
              <View style={styles.recipeImage}>
                {item.photoUrl ? (
                  <Image
                    source={{ uri: item.photoUrl }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 16,
                    }}
                    resizeMode="cover"
                    onError={(error) =>
                      console.log(
                        "ALL RECIPES IMAGE ERROR:",
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
            </View>

            <View style={styles.recipeInfo}>
              <Text
                style={styles.recipeName}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text style={styles.recipeMeta}>
                {item.categoryName} · {item.baseServings} servings
              </Text>

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

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#C5C9C4"
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No recipes found
            </Text>
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

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#17231E",
    marginBottom: 16,
  },

  searchContainer: {
    marginBottom: 8,
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

  recipeImageContainer: {
    position: "relative",
  },

  recipeImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
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

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 14,
    color: "#8A938E",
  },
});