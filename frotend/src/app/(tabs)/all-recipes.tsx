import { useState, useMemo, useCallback, useEffect } from "react";

import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { recipeApi } from "../../api/recipeApi";
import type { RecipeResponse } from "../../types/recipe";

import SearchBar from "../../components/common/SearchBar";
import ScreenLoader from "../../components/common/ScreenLoader";

type MealType =
  | "all"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snacks"
  | "beverages";
type FoodType = "all" | "veg" | "nonveg";

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

export default function AllRecipesScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState<MealType>("all");
  const [activeFood, setActiveFood] = useState<FoodType>("all");

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

  const isNonVegRecipe = useCallback((recipe: RecipeResponse) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return false;
    }

    return recipe.ingredients.some((ingredient) => {
      const ingredientName = ingredient.ingredientName?.trim().toLowerCase();
      if (!ingredientName) return false;
      return NON_VEG_INGREDIENT_KEYWORDS.some((keyword) =>
        ingredientName.includes(keyword),
      );
    });
  }, []);

  const filtered = useMemo(() => {
    let result = recipes.filter((r) => r.status === "Published");

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

    if (activeFood === "veg") {
      result = result.filter((recipe) => !isNonVegRecipe(recipe));
    } else if (activeFood === "nonveg") {
      result = result.filter(isNonVegRecipe);
    }

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

  const handleMealPress = (meal: MealType) => {
    setActiveMeal(meal);
    setSearch("");
  };

  const handleFoodPress = (food: FoodType) => {
    setActiveFood(food);
    setSearch("");
  };

  if (loading) return <ScreenLoader />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>All Recipes</Text>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes..."
          />
        </View>

        <View style={styles.filterNavigation}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsRow}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              style={[styles.chip, activeMeal === "all" && styles.chipActive]}
              onPress={() => handleMealPress("all")}
            >
              {/* <Ionicons
                    name="apps-outline"
                    size={16}
                    color={activeMeal === "all" ? "#fff" : "#68736D"}
                  /> */}
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "all" && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                activeMeal === "breakfast" && styles.chipActive,
              ]}
              onPress={() => handleMealPress("breakfast")}
            >
              <Ionicons
                name="sunny-outline"
                size={16}
                color={activeMeal === "breakfast" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "breakfast" && styles.chipTextActive,
                ]}
              >
                Breakfast
              </Text>
            </Pressable>

            <Pressable
              style={[styles.chip, activeMeal === "lunch" && styles.chipActive]}
              onPress={() => handleMealPress("lunch")}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={activeMeal === "lunch" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "lunch" && styles.chipTextActive,
                ]}
              >
                Lunch
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                activeMeal === "dinner" && styles.chipActive,
              ]}
              onPress={() => handleMealPress("dinner")}
            >
              <Ionicons
                name="moon-outline"
                size={16}
                color={activeMeal === "dinner" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "dinner" && styles.chipTextActive,
                ]}
              >
                Dinner
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                activeMeal === "snacks" && styles.chipActive,
              ]}
              onPress={() =>
                handleMealPress(activeMeal === "snacks" ? "all" : "snacks")
              }
            >
              <Ionicons
                name="fast-food-outline"
                size={16}
                color={activeMeal === "snacks" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "snacks" && styles.chipTextActive,
                ]}
              >
                Snacks
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                activeMeal === "beverages" && styles.chipActive,
              ]}
              onPress={() =>
                handleMealPress(
                  activeMeal === "beverages" ? "all" : "beverages",
                )
              }
            >
              <Ionicons
                name="cafe-outline"
                size={16}
                color={activeMeal === "beverages" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeMeal === "beverages" && styles.chipTextActive,
                ]}
              >
                Beverages
              </Text>
            </Pressable>
          </ScrollView>

          <View style={styles.foodFilterRow}>
            <Pressable
              style={[styles.chip, activeFood === "veg" && styles.chipActive]}
              onPress={() =>
                handleFoodPress(activeFood === "veg" ? "all" : "veg")
              }
            >
              <Ionicons
                name="leaf-outline"
                size={16}
                color={activeFood === "veg" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeFood === "veg" && styles.chipTextActive,
                ]}
              >
                Veg
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                activeFood === "nonveg" && styles.chipActive,
              ]}
              onPress={() =>
                handleFoodPress(activeFood === "nonveg" ? "all" : "nonveg")
              }
            >
              <Ionicons
                name="fast-food-outline"
                size={16}
                color={activeFood === "nonveg" ? "#fff" : "#68736D"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeFood === "nonveg" && styles.chipTextActive,
                ]}
              >
                Non Veg
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
                  />
                ) : (
                  <Text style={styles.recipeEmoji}>{item.name.charAt(0)}</Text>
                )}
              </View>
            </View>

            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName} numberOfLines={1}>
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

            <Ionicons name="chevron-forward" size={20} color="#C5C9C4" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recipes found</Text>
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
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    zIndex: 10,
    paddingVertical:14,  
    marginBottom:15,
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
    marginBottom: 12,
    paddingTop:12,
  },

  // title: {
  //   fontSize: 28,
  //   fontWeight: "800",
  //   color: "#17231E",
  //   marginBottom: 16,
  // },

  // searchContainer: {
  //   marginBottom: 8,
  // },

  filterNavigation: {
    // marginBottom: ,
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
