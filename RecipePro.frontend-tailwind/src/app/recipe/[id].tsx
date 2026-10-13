import { useState, useCallback, useEffect } from "react";

import {

  View,

  Text,

  TextInput,

  Pressable,

  ScrollView,

  StyleSheet,

  Image,

  Animated,

  Alert,

  Modal

} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { recipeApi } from "../../api/recipeApi";

import type {

  RecipeResponse,

  RecipeCalculationResponse,

} from "../../types/recipe";

import ScreenLoader from "../../components/common/ScreenLoader";

import { favoriteApi } from "../../api/favoriteApi";

import { getAuthToken } from "../../utils/authStorage";

const formatEstimatedWeight = (grams: number): string => {
  if (grams >= 1000) {
    return `${Number((grams / 1000).toFixed(2))} kg`;
  }

  return `${Number(grams.toFixed(2))} g`;
};

const formatQuantity = (
  quantity: number,
  unit: string
): string => {
  return `${Number(quantity.toFixed(2))} ${unit}`;
};

export default function RecipeDetailScreen() {

  const { id, fromFavorites } = useLocalSearchParams<{
  id: string;
  fromFavorites?: string;
}>();

  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);

  const [calculation, setCalculation] =

    useState<RecipeCalculationResponse | null>(null);

  const [servings, setServings] = useState<number | null>(null);

  const [servingsInput, setServingsInput] = useState("");

  const [loading, setLoading] = useState(true);

  const [isRecipeAdded, setIsRecipeAdded] = useState(false);

  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

const [favoriteMessage, setFavoriteMessage] = useState("");

const [customIngredients, setCustomIngredients] = useState<
  Record<number, { quantity: number; unit: string }>
>({});

const [editingIngredient, setEditingIngredient] = useState<
  RecipeCalculationResponse["ingredients"][number] | null
>(null);

const [editedQuantity, setEditedQuantity] = useState("");
const [editedUnit, setEditedUnit] = useState("");

  const [activeTab, setActiveTab] = useState<

    "ingredients" | "instructions" | "nutrition"

  >("ingredients");

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const successOpacity = useState(() => new Animated.Value(0))[0];

  const successScale = useState(() => new Animated.Value(0.85))[0];

const load = useCallback(async () => {

  try {

    setLoading(true);

    // Keep loading the recipe using your existing API.

    const data = await recipeApi.getById(Number(id));

    setRecipe(data);

    const initialServings = data.baseServings;

    setServings(initialServings);

    setServingsInput(String(initialServings));

    // Keep the existing ingredient calculation behavior.

// Always load the original recipe and its normal calculation first.
let calc = await recipeApi.calculate(data.id, {
  requiredServings: initialServings,
});

setCustomIngredients({});

if (fromFavorites === "true") {
  try {
    const saved = await favoriteApi.getCustomized(data.id);

    // Restore the serving count saved by this user.
    setServings(saved.requiredServings);
    setServingsInput(String(saved.requiredServings));

    // Recalculate the recipe for the saved serving count.
    calc = await recipeApi.calculate(data.id, {
      requiredServings: saved.requiredServings,
    });

    // Restore the user's edited quantities and units.
    const savedIngredients: Record<
      number,
      { quantity: number; unit: string }
    > = {};

    saved.ingredients.forEach((ingredient) => {
      savedIngredients[ingredient.ingredientId] = {
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      };
    });

    setCustomIngredients(savedIngredients);
  } catch (error) {
    console.error("Failed to load saved recipe customization:", error);
    Alert.alert(
      "Customization unavailable",
      "The saved quantities could not be loaded. Showing the original recipe quantities."
    );
  }
}

setCalculation(calc);

    // Favorites are optional; recipe browsing must remain public.

    try {

      const token = await getAuthToken();

      if (token) {

        const favoriteIds = await favoriteApi.getMyFavorites();

        setIsRecipeAdded(favoriteIds.includes(data.id));

      } else {

        setIsRecipeAdded(false);

      }

    } catch (favoriteError) {

      console.error(

        "Failed to check recipe favorite status:",

        favoriteError

      );

      setIsRecipeAdded(false);

    }

  } catch (error) {

    console.error("Failed to load recipe:", error);

  } finally {

    setLoading(false);

  }

}, [id, fromFavorites]);

  useEffect(() => {

    load();

  }, [load]);

  const handleServingsChange = async (delta: number) => {

    if (!recipe) return;

    const base = servings ?? recipe.baseServings;

    const newServings = Math.max(1, base + delta);

    setServings(newServings);

    setServingsInput(String(newServings));

    try {

      const calc = await recipeApi.calculate(recipe.id, {

        requiredServings: newServings,

      });

      setCalculation(calc);

    } catch (e) {

      console.error(e);

    }

  };


const handleServingsInputChange = (value: string) => {
  // Allow only whole numbers, while allowing an empty field during typing.
  if (!/^\d*$/.test(value)) {
    return;
  }

  if (value === "") {
    setServingsInput("");
    return;
  }

  const numericValue = Number(value);

  // Only allow positive whole numbers.
  if (
    !Number.isInteger(numericValue) ||
    numericValue < 1 ||
    numericValue > 2147483647
  ) {
    return;
  }

  setServingsInput(value);
};


  const handleServingsInputBlur = async () => {

    if (!recipe) return;

    const numericValue = Number(servingsInput);

    // Restore previous valid value if input is invalid

    if (

      servingsInput === "" ||

      !Number.isInteger(numericValue) ||

      numericValue < 1 ||

      numericValue > 2147483647

    ) {

      const fallback = servings ?? recipe.baseServings;

      setServingsInput(String(fallback));

      return;

    }

    setServings(numericValue);

    try {

      const calc = await recipeApi.calculate(recipe.id, {

        requiredServings: numericValue,

      });

      setCalculation(calc);

    } catch (e) {

      console.error(e);

      const fallback = servings ?? recipe.baseServings;

      setServingsInput(String(fallback));

    }

  };

  const openIngredientEditor = (
  ingredient: RecipeCalculationResponse["ingredients"][number]
) => {
  const customized = customIngredients[ingredient.ingredientId];

  setEditingIngredient(ingredient);
  setEditedQuantity(
    String(customized?.quantity ?? ingredient.requiredQuantity)
  );
  setEditedUnit(customized?.unit ?? ingredient.unit);
};

const saveIngredientEdit = () => {
  if (!editingIngredient) return;

  const quantity = Number(editedQuantity);
  const unit = editedUnit.trim();

  if (!Number.isFinite(quantity) || quantity <= 0) {
    Alert.alert("Invalid quantity", "Enter a quantity greater than zero.");
    return;
  }

  if (!unit) {
    Alert.alert("Unit required", "Please enter the ingredient unit.");
    return;
  }

  setCustomIngredients((current) => ({
    ...current,
    [editingIngredient.ingredientId]: {
      quantity,
      unit,
    },
  }));

  setEditingIngredient(null);
};

const handleAddToMyRecipes = async () => {

  if (!recipe || isRecipeAdded || isSavingFavorite) return;

  setFavoriteMessage("");

  setIsSavingFavorite(true);

  try {


const token = await getAuthToken();

if (!token || !token.trim()) {
  setFavoriteMessage("");

  Alert.alert(
    "Login Required",
    "Please log in to add this recipe to your favorites.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log In",
        onPress: () => {
          router.push({
            pathname: "/login",
            params: {
              redirectTo: `/recipe/${recipe.id}`,
            },
          });
        },
      },
    ]
  );

  return;
}



    await favoriteApi.saveCustomized(recipe.id, {
  requiredServings: currentServings,
  ingredients: calculation.ingredients.map((ingredient) => ({
    ingredientId: ingredient.ingredientId,
    quantity:
      customIngredients[ingredient.ingredientId]?.quantity ??
      ingredient.requiredQuantity,
    unit:
      customIngredients[ingredient.ingredientId]?.unit ??
      ingredient.unit,
  })),
});

    setIsRecipeAdded(true);

    setFavoriteMessage("Recipe added to your favorites successfully.");

    setShowSuccessPopup(true);

    successOpacity.setValue(0);

    successScale.setValue(0.85);

    Animated.parallel([

      Animated.timing(successOpacity, {

        toValue: 1,

        duration: 220,

        useNativeDriver: true,

      }),

      Animated.spring(successScale, {

        toValue: 1,

        friction: 7,

        tension: 90,

        useNativeDriver: true,

      }),

    ]).start();

    setTimeout(() => {

      Animated.parallel([

        Animated.timing(successOpacity, {

          toValue: 0,

          duration: 180,

          useNativeDriver: true,

        }),

        Animated.timing(successScale, {

          toValue: 0.9,

          duration: 180,

          useNativeDriver: true,

        }),

      ]).start(() => {

        setShowSuccessPopup(false);

      });

    }, 1600);


} catch (error) {
  console.error("Failed to save recipe to favorites:", error);

  const message =
    error instanceof Error ? error.message : "";

  if (
    message.includes("401") ||
    message.toLowerCase().includes("unauthorized")
  ) {
    setFavoriteMessage("");

    Alert.alert(
      "Login Required",
      "Your login session may have expired. Please log in again to add this recipe to your favorites.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log In",
          onPress: () => {
            router.push({
              pathname: "/login",
              params: {
                redirectTo: `/recipe/${recipe.id}`,
              },
            });
          },
        },
      ]
    );
  } else {
    setFavoriteMessage(
      message || "Unable to save this recipe. Please try again."
    );
  }
} finally {
  setIsSavingFavorite(false);
}


};

  if (loading || !recipe || !calculation) {

    return <ScreenLoader />;

  }

  const currentServings = servings ?? recipe.baseServings;

  return (

    <SafeAreaView style={styles.container} edges={["top"]}>

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContent}

      >

        {/* =========================

            RECIPE HERO IMAGE

        ========================== */}

        <View style={styles.heroContainer}>

          <View style={styles.heroImage}>

            {recipe.photoUrl ? (

              <Image

                source={{ uri: recipe.photoUrl }}

                style={styles.heroImageActual}

                resizeMode="cover"


                onError={(error) =>

                  console.log(

                    "RECIPE DETAIL IMAGE ERROR:",

                    recipe.name,

                    recipe.photoUrl,

                    error.nativeEvent

                  )

                }

              />

            ) : (

              <Text style={styles.heroEmoji}>

                {recipe.name.charAt(0)}

              </Text>

            )}

          </View>

          <Pressable

            onPress={() => {

  if (router.canGoBack()) {

    router.back();

  } else {

    router.replace("/(tabs)/categories");

  }

}}

            style={styles.backBtn}

          >

            <Ionicons

              name="arrow-back"

              size={24}

              color="#17231E"

            />

          </Pressable>

        </View>

        {/* =========================

            CONTENT

        ========================== */}

        <View style={styles.contentContainer}>

          {/* TITLE */}

<View style={styles.titleSection}>
  <View style={styles.titleRow}>
    <Text style={styles.recipeTitle}>
      {recipe.name}
    </Text>

  </View>

  <Text style={styles.servingsText}>
    
      <span style={styles.spanText}>{calculation.estimatedTotalCost != null
        ? `₹${calculation.estimatedTotalCost.toFixed(2)}`
        : "—"}</span> of {currentServings} servings (Base)
    </Text>
</View>
          {/* =========================

              TABS we can also add nution like  ["ingredients", "instructions", "nutrition"] as const

          ========================== */}

          <View style={styles.tabContainer}>

            {(

              ["ingredients", "instructions"] as const

            ).map((tab) => (

              <Pressable

                key={tab}

                style={[

                  styles.tab,

                  activeTab === tab && styles.tabActive,

                ]}

                onPress={() => setActiveTab(tab)}

              >

                <Text

                  style={[

                    styles.tabText,

                    activeTab === tab && styles.tabTextActive,

                  ]}

                >

                  {tab.charAt(0).toUpperCase() +

                    tab.slice(1)}

                </Text>

              </Pressable>

            ))}

          </View>

          {/* =========================

              INGREDIENTS TAB

          ========================== */}

          {activeTab === "ingredients" && (

            <View>

              {/* SERVING CONTROL */}

              <View style={styles.servingControl}>

                <Text style={styles.servingLabel}>

                  Number of servings

                </Text>

                <View style={styles.servingButtons}>

                  <Pressable

                    onPress={() =>

                      handleServingsChange(-1)

                    }

                    style={[

                      styles.servingBtn,

                      currentServings <= 1 &&

                        styles.servingBtnDisabled,

                    ]}

                    disabled={currentServings <= 1}

                  >

                    <Ionicons

                      name="remove"

                      size={20}

                      color={

                        currentServings <= 1

                          ? "#C5C9C4"

                          : "#fff"

                      }

                    />

                  </Pressable>

                  <TextInput

                      value={servingsInput}

                      onChangeText={handleServingsInputChange}

                      onBlur={handleServingsInputBlur}

                      keyboardType="numeric"

                      inputMode="numeric"

                      autoCorrect={false}

                      spellCheck={false}

                      maxLength={10}

                      style={styles.servingCount}

                      textAlign="center"

                      underlineColorAndroid="transparent"

                      selectTextOnFocus

                    />

                  <Pressable

                    onPress={() =>

                      handleServingsChange(1)

                    }

                    style={styles.servingBtn}

                  >

                    <Ionicons

                      name="add"

                      size={20}

                      color="#fff"

                    />

                  </Pressable>

                </View>

              </View>

              {/* ESTIMATED TOTAL RECIPE WEIGHT */}


<View style={styles.weightEstimateCard}>
  <View style={styles.weightEstimateIcon}>
    <Ionicons name="scale-outline" size={24} color="#1F7655" />
  </View>

  <View style={styles.weightEstimateContent}>
    {/* Ingredient Quantity */}
    


    {/* Estimated Cooked Weight */}
    <View style={styles.weightEstimateInfo}>
      <Text style={styles.weightEstimateLabel}>
        Estimated Cooked Weight
      </Text>

      {calculation.estimatedCookedWeightGrams != null ? (
        <Text style={styles.cookedWeightValue}>
          {formatEstimatedWeight(
            calculation.estimatedCookedWeightGrams
          )} 
        </Text>
      ) : (
        <Text style={styles.weightEstimateUnavailable}>
          Cooked weight not provided for this recipe
        </Text>
      )}

      <Text style={styles.weightEstimateNote}>
        Expected weight after cooking · {currentServings} servings
      </Text>
    </View>
  </View>
</View>
              {/* SCALED INGREDIENT TITLE */}

              <Text style={styles.scaledTitle}>

                Scaled Ingredients (for {currentServings} servings)

              </Text>

              {/* INGREDIENT LIST */}

              <View style={styles.ingredientsList}>

                {calculation.ingredients.map((ing) => {

                  /*

                   \* The calculation response is responsible for

                   \* scaled quantities.

                   \*

                   \* The original recipe response contains

                   \* ingredientPhotoUrl.

                   \*

                   \* So we find the original ingredient using

                   \* ingredientId.

                   */

                  const originalIngredient =

                    recipe.ingredients.find(

                      (item) =>

                        item.ingredientId ===

                        ing.ingredientId

                    );

                  const ingredientImageUrl =

                    originalIngredient?.ingredientPhotoUrl;

                  return (

                    <Pressable

                      key={ing.ingredientId}

                      style={styles.ingredientRow}

                      onPress={() => openIngredientEditor(ing)}

                    >

                      {/* INGREDIENT IMAGE */}

                      <View style={styles.ingredientIcon}>

                        {ingredientImageUrl ? (

                          <Image

                            source={{

                              uri: ingredientImageUrl,

                            }}

                            style={styles.ingredientImage}

                            resizeMode="cover"

                            onError={(error) =>

                              console.log(

                                "INGREDIENT IMAGE ERROR:",

                                ing.ingredientName,

                                ingredientImageUrl,

                                error.nativeEvent

                              )

                            }

                          />

                        ) : (

                          <Text

                            style={styles.ingredientEmoji}

                          >

                            {ing.ingredientName ===

                            "Basmati Rice"

                              ? "🌾"

                              : ing.ingredientName ===

                                "Chicken"

                              ? "🍗"

                              : ing.ingredientName ===

                                "Onion"

                              ? "🧅"

                              : ing.ingredientName ===

                                "Tomato"

                              ? "🍅"

                              : ing.ingredientName ===

                                "Paneer"

                              ? "🧀"

                              : "🥘"}

                          </Text>

                        )}

                      </View>

                      {/* INGREDIENT INFORMATION */}

                      <View style={styles.ingredientInfo}>

                        <Text

                          style={styles.ingredientName}

                        >

                          {ing.ingredientName}

                        </Text>

                        <Text

                          style={styles.ingredientBase}

                        >

                          {ing.baseQuantity} {ing.unit} (base)

                        </Text>
                        
                       


                      </View>

                        <View style={styles.ingredientQuantityContainer}>
                          <Text style={styles.ingredientQuantity}>
                           {formatQuantity(
    customIngredients[ing.ingredientId]?.quantity ??
      ing.requiredQuantity,
    customIngredients[ing.ingredientId]?.unit ?? ing.unit
  )}
                          </Text>

                          <Text style={styles.ingredientPrice}>
                            {ing.estimatedCost != null
                              ? `₹${ing.estimatedCost.toFixed(2)}`
                              : "Price unavailable"}
                          </Text>
                        </View>
                      
                        
                       

                      {/* SCALED QUANTITY */}

                      {/* <Text

                        style={styles.ingredientQuantity}

                      >

                        {ing.requiredQuantity} {ing.unit}

                      </Text> */}

                    </Pressable>

                  );

                })}

              </View>

              {/* TOTAL INGREDIENT COST */}
<View style={styles.totalCostContainer}>
  <View style={styles.totalCostInfo}>
    <Text style={styles.totalCostLabel}>
      Total Ingredient Cost
    </Text>

    <Text style={styles.totalCostNote}>
      For {currentServings} servings
    </Text>
  </View>

  <Text style={styles.totalCostValue}>
    {calculation.estimatedTotalCost != null
      ? `₹${calculation.estimatedTotalCost.toFixed(2)}`
      : "Price unavailable"}
  </Text>
</View>

            </View>

          )}

          {/* =========================

              INSTRUCTIONS TAB

          ========================== */}

{activeTab === "instructions" && (
  <View style={styles.instructionsList}>
    {recipe.procedures.map((step) => (
      <View
        key={step.stepNumber}
        style={styles.instructionRow}
      >
        <View style={styles.stepContent}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>
              {step.stepNumber}
            </Text>
          </View>

          <Text style={styles.stepDescription}>
            {step.description}
          </Text>
        </View>
      </View>
    ))}
  </View>
)}

          {/* =========================

              NUTRITION TAB

          ========================== */}

          {activeTab === "nutrition" && (

            <View style={styles.nutritionContainer}>

              <View style={styles.nutritionCard}>

                <Text style={styles.nutritionTitle}>

                  Nutrition per serving

                </Text>

                <View style={styles.nutritionGrid}>

                  <View style={styles.nutritionItem}>

                    <Text style={styles.nutritionValue}>

                      450

                    </Text>

                    <Text style={styles.nutritionLabel}>

                      Calories

                    </Text>

                  </View>

                  <View style={styles.nutritionItem}>

                    <Text style={styles.nutritionValue}>

                      35g

                    </Text>

                    <Text style={styles.nutritionLabel}>

                      Protein

                    </Text>

                  </View>

                  <View style={styles.nutritionItem}>

                    <Text style={styles.nutritionValue}>

                      12g

                    </Text>

                    <Text style={styles.nutritionLabel}>

                      Fat

                    </Text>

                  </View>

                  <View style={styles.nutritionItem}>

                    <Text style={styles.nutritionValue}>

                      58g

                    </Text>

                    <Text style={styles.nutritionLabel}>

                      Carbs

                    </Text>

                  </View>

                </View>

              </View>

            </View>

          )}

          {/* =========================

              ADD TO MY RECIPES

          ========================== */}

 <Pressable

  style={[

    styles.addButton,

    isRecipeAdded && styles.addButtonDisabled,

    isSavingFavorite && { opacity: 0.7 },

  ]}

  onPress={handleAddToMyRecipes}

  disabled={isRecipeAdded || isSavingFavorite}

>

  <Ionicons

    name={

      isRecipeAdded

        ? "checkmark-circle"

        : isSavingFavorite

          ? "hourglass-outline"

          : "heart-outline"

    }

    size={20}

    color={isRecipeAdded ? "#68736D" : "#fff"}

  />

  <Text

    style={[

      styles.addButtonText,

      isRecipeAdded && styles.addButtonTextDisabled,

    ]}

  >

    {isRecipeAdded

      ? "Already in My Favorites"

      : isSavingFavorite

        ? "Saving..."

        : "Add to My Favorites"}

  </Text>

</Pressable>

{favoriteMessage !== "" && (

  <Text style={styles.favoriteMessage}>

    {favoriteMessage}

  </Text>

)}

        </View>

      </ScrollView>

      <Modal
  visible={editingIngredient !== null}
  transparent
  animationType="fade"
  onRequestClose={() => setEditingIngredient(null)}
>
  <View style={styles.ingredientModalOverlay}>
    <View style={styles.ingredientModal}>
      <Text style={styles.ingredientModalTitle}>
        Edit Ingredient
      </Text>

      <Text style={styles.ingredientModalName}>
        {editingIngredient?.ingredientName}
      </Text>

      <Text style={styles.ingredientModalLabel}>
        Quantity
      </Text>

      <TextInput
        value={editedQuantity}
        onChangeText={setEditedQuantity}
        keyboardType="decimal-pad"
        style={styles.ingredientModalInput}
        placeholder="Enter quantity"
      />

      <Text style={styles.ingredientModalLabel}>
        Unit
      </Text>

      <TextInput
        value={editedUnit}
        onChangeText={setEditedUnit}
        style={styles.ingredientModalInput}
        placeholder="e.g. g, ml, pieces"
        autoCapitalize="none"
      />

      <View style={styles.ingredientModalActions}>
        <Pressable
          style={styles.ingredientCancelButton}
          onPress={() => setEditingIngredient(null)}
        >
          <Text style={styles.ingredientCancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={styles.ingredientSaveButton}
          onPress={saveIngredientEdit}
        >
          <Text style={styles.ingredientSaveText}>Save Quantity</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

      {showSuccessPopup && (

        <View style={styles.successOverlay} pointerEvents="none">

          <Animated.View

            style={[

              styles.successPopup,

              {

                opacity: successOpacity,

                transform: [{ scale: successScale }],

              },

            ]}

          >

            <View style={styles.successIconContainer}>

              <Ionicons name="checkmark" size={28} color="#fff" />

            </View>

            <View style={styles.successTextContainer}>

              <Text style={styles.successTitle}>Saved Successfully</Text>

              <Text style={styles.successMessage}>

                Added to My Favourites

              </Text>

            </View>

          </Animated.View>

        </View>

      )}

</SafeAreaView>

  );

}

/* =====================================================

   STYLES

\\===================================================== */

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: "#F7F8F3",

  },

  scrollContent: {

    paddingBottom: 40,

  },

  heroContainer: {

    position: "relative",

  },

  heroImage: {

    height: 280,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",

  },

  /*

   \* Actual recipe image

   */

  heroImageActual: {

    width: "100%",

    height: "100%",

  },

  /*

   \* Fallback when recipe.photoUrl

   \* is not available

   */

  heroEmoji: {

    fontSize: 80,

    fontWeight: "700",

    color: "#1F7655",

  },

  backBtn: {

    position: "absolute",

    top: 16,

    left: 16,

    width: 44,

    height: 44,

    borderRadius: 14,

    backgroundColor: "#fff",

    alignItems: "center",

    justifyContent: "center",

  },

  contentContainer: {

    backgroundColor: "#F7F8F3",

    borderTopLeftRadius: 28,

    borderTopRightRadius: 28,

    marginTop: -20,

    paddingHorizontal: 20,

    paddingTop: 24,

  },

  titleSection: {
    marginBottom: 20,

  },

  recipeTitle: {

    fontSize: 28,

    fontWeight: "800",

    color: "#17231E",

  },

  servingsText: {

    fontSize: 14,

    color: "#68736D",

    marginTop: 4,

  },

  /* =========================

     TABS

  ========================== */

  tabContainer: {

    flexDirection: "row",

    backgroundColor: "#E7F1EA",

    borderRadius: 16,

    padding: 4,

    marginBottom: 20,

  },

  tab: {

    flex: 1,

    paddingVertical: 10,

    alignItems: "center",

    borderRadius: 12,

  },

  tabActive: {

    backgroundColor: "#fff",

  },

  tabText: {

    fontSize: 13,

    fontWeight: "600",

    color: "#68736D",

  },

  tabTextActive: {

    color: "#17231E",

  },

  /* =========================

     SERVING CONTROL

  ========================== */

  servingControl: {

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 16,

    marginBottom: 16,

  },

  servingLabel: {

    fontSize: 14,

    fontWeight: "600",

    color: "#17231E",

    marginBottom: 12,

  },

  servingButtons: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 20,

  },

  servingBtn: {

    width: 44,

    height: 44,

    borderRadius: 22,

    backgroundColor: "#1F7655",

    alignItems: "center",

    justifyContent: "center",

  },

  servingBtnDisabled: {

    backgroundColor: "#E5E8E3",

  },

  servingCount: {

        fontSize: 22,

        fontWeight: "800",

        color: "#17231E",

        minWidth: 56,

        height: 35,

        borderWidth: 1,

        borderColor: "#5a5c5a",

        borderRadius: 8,

        paddingVertical: 4

        ,

        paddingHorizontal: 4,

        backgroundColor: "#FFFFFF",

        outlineStyle: "none",

        outlineWidth: 1,

        appearance: "none",

        boxShadow: "none",

      },

  /* =========================

     INGREDIENTS

  ========================== */

  scaledTitle: {

    fontSize: 16,

    fontWeight: "700",

    color: "#17231E",

    marginBottom: 12,

  },

  ingredientsList: {

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    overflow: "hidden",

    marginBottom: 20,

  },

  ingredientRow: {

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 16,

    paddingVertical: 12,

    borderBottomWidth: 1,

    borderBottomColor: "#F0F2ED",

  },

  ingredientIcon: {

    width: 40,

    height: 40,

    borderRadius: 20,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,

    overflow: "hidden",

  },

  /*

   \* Actual ingredient image

   */

  ingredientImage: {

    width: "100%",

    height: "100%",

    borderRadius: 20,

  },

  /*

   \* Fallback ingredient emoji

   */

  ingredientEmoji: {

    fontSize: 20,

  },

  ingredientInfo: {

    flex: 1,



  },

  ingredientName: {

    fontSize: 15,

    fontWeight: "600",

    color: "#17231E",
  },

  ingredientBase: {

    fontSize: 12,

    color: "#68736D",

    marginTop: 2,

  },

  ingredientQuantity: {

    fontSize: 15,

    fontWeight: "700",

    color: "#1F7655",

  },

  /* =========================

     INSTRUCTIONS

  ========================== */

 instructionsList: {
  marginBottom: 12,
},

instructionRow: {
  marginBottom: 8,
},

stepContent: {
  flexDirection: "row",
  alignItems: "flex-start",
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#E3E6E0",
  paddingVertical: 10,
  paddingHorizontal: 12,
  gap: 10,
},

stepNumber: {
  width: 26,
  height: 26,
  borderRadius: 8,
  backgroundColor: "#E2F0E7",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

stepNumberText: {
  fontSize: 12,
  fontWeight: "800",
  color: "#19734F",
},

stepDescription: {
  flex: 1,
  fontSize: 13,
  color: "#34423A",
  lineHeight: 19,
},

  /* =========================

     NUTRITION

  ========================== */

  nutritionContainer: {

    marginBottom: 20,

  },

  nutritionCard: {

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 20,

  },

  nutritionTitle: {

    fontSize: 16,

    fontWeight: "700",

    color: "#17231E",

    marginBottom: 16,

  },

  nutritionGrid: {

    flexDirection: "row",

    flexWrap: "wrap",

    gap: 12,

  },

  nutritionItem: {

    flex: 1,

    minWidth: "45%",

    backgroundColor: "#F7F8F3",

    borderRadius: 16,

    padding: 16,

    alignItems: "center",

  },

  nutritionValue: {

    fontSize: 20,

    fontWeight: "800",

    color: "#1F7655",

  },

  nutritionLabel: {

    fontSize: 12,

    color: "#68736D",

    marginTop: 4,

  },

  /* =========================

     ADD BUTTON

  ========================== */

  addButton: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#1F7655",

    borderRadius: 16,

    paddingVertical: 16,

    gap: 8,

  },

  addButtonText: {

    color: "#fff",

    fontSize: 16,

    fontWeight: "700",

  },

  successOverlay: {

    position: "absolute",

    top: 24,

    left: 20,

    right: 20,

    alignItems: "center",

    zIndex: 1000,

  },
successPopup: {
  width: "100%",
  maxWidth: 380,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#fff",
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: "#DDE8E1",
  boxShadow: "0px 5px 12px rgba(0, 0, 0, 0.12)",
  elevation: 8,
},

  successIconContainer: {

    width: 42,

    height: 42,

    borderRadius: 21,

    backgroundColor: "#1F7655",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,

  },

  successTextContainer: {

    flex: 1,

  },

  successTitle: {

    fontSize: 15,

    fontWeight: "800",

    color: "#17231E",

  },

  successMessage: {

    fontSize: 13,

    color: "#68736D",

    marginTop: 2,

  },

  addButtonDisabled: {

  backgroundColor: "#E5E8E3",

  borderColor: "#D5D9D4",

  borderWidth: 1,

},

addButtonTextDisabled: {

  color: "#68736D",

},

favoriteMessage: {

  marginTop: 10,

  marginBottom: 12,

  textAlign: "center",

  fontSize: 14,

  color: "#68736D",

},


  weightEstimateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E7F1EA",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D3E5D9",
  },
  weightEstimateIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop:16,
  },
  weightEstimateInfo: {
    flex: 1,
  },
  weightEstimateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#68736D",
    paddingTop:20,
  },
  weightEstimateValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F7655",
    marginTop: 3,
  },
  weightEstimateUnavailable: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A5A22",
    marginTop: 5,
  },
  weightEstimateNote: {
    fontSize: 12,
    color: "#68736D",
    marginTop: 4,
  },
  weightEstimateCard: {
  flexDirection: "row",
  alignItems: "flex-start",
  backgroundColor: "#F0F7F2",
  borderWidth: 1,
  borderColor: "#D8E9DD",
  borderRadius: 16,
  padding: 16,
  gap: 14,
},
weightEstimateContent: {
  flex: 1,
  minWidth: 0,
  gap: 14,
},

weightEstimateInfo: {
  flex: 1,
},

weightEstimateLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#52645A",
  marginBottom: 5,
},

weightEstimateValue: {
  fontSize: 23,
  fontWeight: "700",
  color: "#1F7655",
},

cookedWeightValue: {
  fontSize: 26,
  fontWeight: "700",
  color: "#174D38",
},

weightEstimateNote: {
  fontSize: 12,
  color: "#718078",
  marginTop: 5,
  lineHeight: 18,
},

weightEstimateUnavailable: {
  fontSize: 13,
  color: "#A16207",
  marginTop: 3,
},

weightEstimateDivider: {
  height: 1,
  backgroundColor: "#D8E9DD",
  marginVertical: 2,
},

ingredientQuantityContainer: {
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 4,
},

ingredientQuantity: {
  fontSize: 14,
  fontWeight: "700",
  color: "#087443",
},

ingredientPrice: {
  fontSize: 12,
  fontWeight: "600",
  color: "#6B7280",
},

totalCostContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 18,
  backgroundColor: "#E7F1EA",
  borderTopWidth: 1,
  borderTopColor: "#D3E5D9",
},

totalCostInfo: {
  flex: 1,
},

totalCostLabel: {
  fontSize: 15,
  fontWeight: "700",
  color: "#17231E",
},

totalCostNote: {
  fontSize: 12,
  color: "#68736D",
  marginTop: 4,
},

totalCostValue: {
  fontSize: 20,
  fontWeight: "800",
  color: "#1F7655",
  marginLeft: 12,
},
titleRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
},

titleCost: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1F7655",
  flexShrink: 0,
},
spanText:{
  color:"#1F7655",
  fontSize:16,
  fontWeight: "700",
},
ingredientModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
},

ingredientModal: {
  width: "100%",
  maxWidth: 400,
  backgroundColor: "#FFFFFF",
  borderRadius: 22,
  padding: 22,
},

ingredientModalTitle: {
  fontSize: 21,
  fontWeight: "800",
  color: "#17231E",
},

ingredientModalName: {
  fontSize: 15,
  fontWeight: "600",
  color: "#1F7655",
  marginTop: 8,
  marginBottom: 20,
},

ingredientModalLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#68736D",
  marginBottom: 7,
},

ingredientModalInput: {
  borderWidth: 1,
  borderColor: "#D9E1DB",
  borderRadius: 12,
  paddingHorizontal: 13,
  paddingVertical: 11,
  fontSize: 16,
  color: "#17231E",
  marginBottom: 16,
},

ingredientModalActions: {
  flexDirection: "row",
  gap: 10,
  marginTop: 4,
},

ingredientCancelButton: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 13,
  borderRadius: 12,
  backgroundColor: "#F1F3EF",
},

ingredientCancelText: {
  color: "#52645A",
  fontWeight: "700",
},

ingredientSaveButton: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 13,
  borderRadius: 12,
  backgroundColor: "#1F7655",
},

ingredientSaveText: {
  color: "#FFFFFF",
  fontWeight: "700",
},

});
