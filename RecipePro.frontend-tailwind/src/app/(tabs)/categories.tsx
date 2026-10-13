import {



  useState,



  useMemo,



  useCallback,



  useEffect,



} from "react";







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







import { LinearGradient } from 'expo-linear-gradient';







import { SafeAreaView } from "react-native-safe-area-context";







import { Ionicons } from "@expo/vector-icons";







import { categoryApi } from "../../api/categoryApi";



import { recipeApi } from "../../api/recipeApi";







import type { CategoryResponse } from "../../types/category";



import type { RecipeResponse } from "../../types/recipe";







import SearchBar from "../../components/common/SearchBar";



import ScreenLoader from "../../components/common/ScreenLoader";







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







type MealType = "all" | "breakfast" | "lunch" | "dinner" | "snacks" | "beverages";



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







export default function CategoriesScreen() {



  const router = useRouter();







  const [categories, setCategories] =



    useState<CategoryResponse[]>([]);







  const [recipes, setRecipes] =



    useState<RecipeResponse[]>([]);







  const [search, setSearch] =



    useState("");







  const [loading, setLoading] =



    useState(true);







  const [activeMeal, setActiveMeal] =



    useState<MealType>("all");







  const [activeFood, setActiveFood] = useState<FoodType>("all");







  const load = useCallback(async () => {



    try {



      const [cats, recs] =



        await Promise.all([



          categoryApi.getAll(),



          recipeApi.getAll(),



        ]);







      setCategories(cats);



      setRecipes(recs);



    } catch (e) {



      console.error(



        "LOAD CATEGORIES ERROR:",



        e



      );



    } finally {



      setLoading(false);



    }



  }, []);







  useEffect(() => {



    load();



  }, [load]);







  const selectedCategoryName =



    useMemo(() => {



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



      if (



        !recipe.ingredients ||



        recipe.ingredients.length === 0



      ) {



        return false;



      }







      return recipe.ingredients.some(



        (ingredient) => {



          const ingredientName =



            ingredient.ingredientName



              ?.trim()



              .toLowerCase();







          if (!ingredientName) {



            return false;



          }







          return NON_VEG_INGREDIENT_KEYWORDS.some(



            (keyword) =>



              ingredientName.includes(keyword)



          );



        }



      );



    },



    []



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
      categoryNames.includes(recipe.categoryName?.trim().toLowerCase() ?? "")
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



          ?.map((ingredient) => ingredient.ingredientName?.toLowerCase() || "")



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



            .toLowerCase() ===



          selectedCategoryName



      );



    }







    if (search.trim()) {



      result = result.filter((category) =>



        category.name



          .toLowerCase()



          .includes(



            search.toLowerCase()



          )



      );



    }







    return result;



  }, [



    categories,



    search,



    selectedCategoryName,



  ]);







  const popularRecipes = useMemo(() => {



    return categories



      .map((cat) => {



        const catRecipes =



          recipes.filter(



            (r) =>



              r.categoryId === cat.id



          );







        return catRecipes.length > 0



          ? {



              category: cat,



              recipe: catRecipes[0],



            }



          : null;



      })



      .filter(Boolean)



      .slice(0, 4) as {



      category: CategoryResponse;



      recipe: RecipeResponse;



    }[];



  }, [categories, recipes]);







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







    <SafeAreaView



      style={styles.container}



      edges={["top"]}



    >



      <FlatList



contentContainerStyle={styles.listContent}



showsVerticalScrollIndicator={false}



key={



  activeMeal === "all" && activeFood === "all"



    ? "categories-grid"



    : "recipes-list"



}







data={



  activeMeal === "all" && activeFood === "all"



    ? filtered



    : filteredRecipes



}







numColumns={



  activeMeal === "all" && activeFood === "all" ? 2 : 1



}







columnWrapperStyle={



  activeMeal === "all" && activeFood === "all"



    ? styles.columnWrapper



    : undefined



}



        ListHeaderComponent={



          <View style={styles.header}>



            <View



              style={styles.headerTop}



            >



              <View>



                <Text



                  style={styles.greeting}



                >



                  All Recipes



                </Text>







              </View>







              <Pressable



                style={



                  styles.notificationButton



                }



              >



                {/* <Ionicons



                  name="notifications-outline"



                  size={24}



                  color="#17231E"



                /> */}



              </Pressable>



            </View>







            <View



              style={



                styles.searchContainer



              }



            >



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
      <Ionicons name="apps-outline" size={16} color={activeMeal === "all" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "all" && styles.chipTextActive]}>All</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeMeal === "breakfast" && styles.chipActive]}
      onPress={() => handleMealPress("breakfast")}
    >
      <Ionicons name="sunny-outline" size={16} color={activeMeal === "breakfast" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "breakfast" && styles.chipTextActive]}>Breakfast</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeMeal === "lunch" && styles.chipActive]}
      onPress={() => handleMealPress("lunch")}
    >
      <Ionicons name="restaurant-outline" size={16} color={activeMeal === "lunch" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "lunch" && styles.chipTextActive]}>Lunch</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeMeal === "dinner" && styles.chipActive]}
      onPress={() => handleMealPress("dinner")}
    >
      <Ionicons name="moon-outline" size={16} color={activeMeal === "dinner" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "dinner" && styles.chipTextActive]}>Dinner</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeMeal === "snacks" && styles.chipActive]}
      onPress={() => handleMealPress(activeMeal === "snacks" ? "all" : "snacks")}
    >
      <Ionicons name="fast-food-outline" size={16} color={activeMeal === "snacks" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "snacks" && styles.chipTextActive]}>Snacks</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeMeal === "beverages" && styles.chipActive]}
      onPress={() => handleMealPress(activeMeal === "beverages" ? "all" : "beverages")}
    >
      <Ionicons name="cafe-outline" size={16} color={activeMeal === "beverages" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeMeal === "beverages" && styles.chipTextActive]}>Beverages</Text>
    </Pressable>
  </ScrollView>

  <View style={styles.foodFilterRow}>
    <Pressable
      style={[styles.chip, activeFood === "veg" && styles.chipActive]}
      onPress={() => handleFoodPress(activeFood === "veg" ? "all" : "veg")}
    >
      <Ionicons name="leaf-outline" size={16} color={activeFood === "veg" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeFood === "veg" && styles.chipTextActive]}>Veg</Text>
    </Pressable>

    <Pressable
      style={[styles.chip, activeFood === "nonveg" && styles.chipActive]}
      onPress={() => handleFoodPress(activeFood === "nonveg" ? "all" : "nonveg")}
    >
      <Ionicons name="fast-food-outline" size={16} color={activeFood === "nonveg" ? "#fff" : "#68736D"} />
      <Text style={[styles.chipText, activeFood === "nonveg" && styles.chipTextActive]}>Non Veg</Text>
    </Pressable>
  </View>
</View>







            <View



              style={styles.sectionHeader}



            >



              <Text



                style={styles.sectionTitle}



              >



                Popular Recipes



              </Text>







              <Pressable



                            onPress={() => {



  if (router.canGoBack()) {



    router.back();



  } else {



    router.replace("/(tabs)/all-recipes");



  }



}}



              >



                <Text



                  style={



                    styles.viewAllText



                  }



                >



                  View All



                </Text>



              </Pressable>



            </View>







            <FlatList



              horizontal



              data={popularRecipes}



              keyExtractor={(item) =>



                `popular-${item.recipe.id}`



              }



              showsHorizontalScrollIndicator={



                false



              }



              contentContainerStyle={



                styles.horizontalList



              }



              renderItem={({ item }) => (



                <Pressable



                  style={



                    styles.popularCard



                  }



                  onPress={() =>



                    router.push({



                      pathname:



                        "/recipe/[id]",



                      params: {



                        id: String(



                          item.recipe.id



                        ),



                      },



                    })



                  }



                >



                  <View



                    style={



                      styles.popularImage



                    }



                  >



                    {item.recipe



                      .photoUrl ? (



                      <Image



                        source={{



                          uri: item.recipe



                            .photoUrl,



                        }}



                        style={{



                          width: "100%",



                          height: "100%",



                          borderRadius: 14,



                        }}



                        resizeMode="cover"



                      />



                    ) : (



                      <Text



                        style={



                          styles.popularEmoji



                        }



                      >



                        {item.recipe.name.charAt(



                          0



                        )}



                      </Text>



                    )}



                  </View>







                  <Text



                    style={



                      styles.popularName



                    }



                    numberOfLines={1}



                  >



                    {item.recipe.name}



                  </Text>







                  <Text



                    style={



                      styles.popularMeta



                    }



                  >



                    {



                      item.recipe



                        .baseServings



                    }{" "}



                    servings



                  </Text>



                </Pressable>



              )}



            />







            <View



              style={styles.sectionHeader}



            >



              <Text



                style={styles.sectionTitle}



              >



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



              </Text>



            </View>



          </View>



        }



        renderItem={({ item }) => {



          if (activeMeal !== "all" || activeFood !== "all") {



            const recipe =



              item as RecipeResponse;







            return (



              <Pressable



                style={



                  styles.recipeCard



                }



                onPress={() =>



                  router.push({



                    pathname:



                      "/recipe/[id]",



                    params: {



                      id: String(



                        recipe.id



                      ),



                    },



                  })



                }



              >



                <View



                  style={



                    styles.recipeImage



                  }



                >



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



                    <Text



                      style={



                        styles.recipeFallbackText



                      }



                    >



                      {recipe.name.charAt(



                        0



                      )}



                    </Text>



                  )}



                </View>







                <View



                  style={styles.recipeInfo}



                >



                  <Text



                    style={



                      styles.recipeName



                    }



                    numberOfLines={1}



                  >



                    {recipe.name}



                  </Text>







                  <Text



                    style={



                      styles.recipeMeta



                    }



                    numberOfLines={1}



                  >



                    {recipe.categoryName} ·{" "}



                    {



                      recipe.baseServings



                    }{" "}



                    servings



                  </Text>







                  <View



                    style={



                      styles.recipeBottom



                    }



                  >



                    <View



                      style={



                        styles.statusBadge



                      }



                    >



                      <Text



                        style={



                          styles.statusText



                        }



                      >



                        {recipe.status}



                      </Text>



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







          const category =



            item as CategoryResponse;







          const categoryKey =



            category.name



              .trim()



              .toLowerCase();







          const imageUrl =



            CATEGORY_IMAGES[



              categoryKey



            ];







          const recipeCount =



            recipes.filter(



              (r) =>



                r.categoryId ===



                category.id



            ).length;







          return (



            <Pressable



              style={



                styles.categoryCard



              }



              onPress={() =>



                router.push({



                  pathname:



                    "/category/[id]",



                  params: {



                    id: String(



                      category.id



                    ),



                  },



                })



              }



            >



              <View



                style={



                  styles.categoryImage



                }



              >



                {imageUrl ? (



                  <Image



                    source={{



                      uri: imageUrl,



                    }}



                    style={



                      styles.categoryImageActual



                    }



                    resizeMode="cover"





                    onError={(error) =>



                      console.log(



                        "CATEGORY IMAGE ERROR:",



                        category.name,



                        imageUrl,



                        error.nativeEvent



                      )



                    }



                  />



                ) : (



                  <View



                    style={



                      styles.categoryImageFallback



                    }



                  >



                    <Text



                      style={



                        styles.categoryFallbackText



                      }



                    >



                      {category.name.charAt(



                        0



                      )}



                    </Text>



                  </View>



                )}



              </View>







              <Text



                style={



                  styles.categoryName



                }



              >



                {category.name}



              </Text>







              <Text



                style={



                  styles.categoryCount



                }



              >



                {recipeCount} recipes



              </Text>



            </Pressable>



          );



        }}



        ListEmptyComponent={



          <View



            style={styles.emptyState}



          >



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







            <Text



              style={styles.emptyTitle}



            >



              No recipes found



            </Text>







            <Text



              style={styles.emptyText}



            >



              {activeMeal ===



              "breakfast"



                ? "No Tiffin recipes are available for breakfast."



                : activeMeal ===



                    "lunch"



                  ? "No Meals recipes are available for lunch."



                  : activeMeal ===



                      "dinner"



                    ? "No Tiffin recipes are available for dinner."



                    : activeMeal ===



                        "veg"



                      ? "No vegetarian recipes are available."



                      : activeMeal ===



                          "nonveg"



                        ? "No non-vegetarian recipes are available."



                        : "No categories found."}



            </Text>



          </View>



        }



      />



    </SafeAreaView>







  );



}







const styles = StyleSheet.create({



  container: {



    backgroundColor:"#F7F8F3",



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



  },







  headerTop: {



    flexDirection: "row",



    justifyContent:



      "space-between",



    alignItems: "center",



    marginBottom: 16,



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







  searchContainer: {



    marginBottom: 16,



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



    justifyContent:



      "space-between",



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







  horizontalList: {



    paddingRight: 20,



    marginBottom: 16,



  },







  popularCard: {



    width: 140,



    marginRight: 12,



    backgroundColor: "#fff",



    borderRadius: 20,



    borderWidth: 1,



    borderColor: "#E5E8E3",



    padding: 10,



  },







  popularImage: {



    width: "100%",



    height: 100,



    borderRadius: 14,



    backgroundColor: "#E7F1EA",



    alignItems: "center",



    justifyContent: "center",



    marginBottom: 8,



    overflow: "hidden",



  },







  popularEmoji: {



    fontSize: 36,



  },







  popularName: {



    fontSize: 13,



    fontWeight: "700",



    color: "#17231E",



  },







  popularMeta: {



    fontSize: 11,



    color: "#68736D",



    marginTop: 2,



  },







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



    justifyContent:



      "space-between",



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



}); 