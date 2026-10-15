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
  Modal,
  Platform,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { recipeApi } from "../../api/recipeApi";
import { favoriteApi } from "../../api/favoriteApi";
import { getAuthToken } from "../../utils/authStorage";

import type {
  RecipeResponse,
  RecipeCalculationResponse,
} from "../../types/recipe";

import ScreenLoader from "../../components/common/ScreenLoader";

const formatEstimatedWeight = (grams: number): string => {
  if (grams >= 1000) {
    return `${Number((grams / 1000).toFixed(2))} kg`;
  }

  return `${Number(grams.toFixed(2))} g`;
};

const formatQuantity = (quantity: number, unit: string): string =>
  `${Number(quantity.toFixed(2))} ${unit}`;

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
    "ingredients" | "instructions"
  >("ingredients");

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const successOpacity = useState(() => new Animated.Value(0))[0];
  const successScale = useState(() => new Animated.Value(0.85))[0];

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data = await recipeApi.getById(Number(id));

      setRecipe(data);

      const initialServings = data.baseServings;

      setServings(initialServings);
      setServingsInput(String(initialServings));

      let calc = await recipeApi.calculate(data.id, {
        requiredServings: initialServings,
      });

      setCustomIngredients({});

      if (fromFavorites === "true") {
        try {
          const saved = await favoriteApi.getCustomized(data.id);

          setServings(saved.requiredServings);
          setServingsInput(String(saved.requiredServings));

          calc = await recipeApi.calculate(data.id, {
            requiredServings: saved.requiredServings,
          });

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
          console.error(
            "Failed to load saved recipe customization:",
            error,
          );

          Alert.alert(
            "Customization unavailable",
            "The saved quantities could not be loaded. Showing the original recipe quantities.",
          );
        }
      }

      setCalculation(calc);

      try {
        const token = await getAuthToken();

        if (token) {
          const favoriteIds = await favoriteApi.getMyFavorites();
          setIsRecipeAdded(favoriteIds.includes(data.id));
        } else {
          setIsRecipeAdded(false);
        }
      } catch (error) {
        console.error("Failed to check favorite status:", error);
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

  const currentServings = servings ?? recipe?.baseServings ?? 1;

  const handleServingsChange = async (delta: number) => {
    if (!recipe) return;

    const newServings = Math.max(1, currentServings + delta);

    setServings(newServings);
    setServingsInput(String(newServings));

    try {
      const calc = await recipeApi.calculate(recipe.id, {
        requiredServings: newServings,
      });

      setCalculation(calc);
    } catch (error) {
      console.error("Failed to scale recipe:", error);
    }
  };

  const handleServingsInputChange = (value: string) => {
    if (!/^\d*$/.test(value)) return;

    if (value === "") {
      setServingsInput("");
      return;
    }

    const numericValue = Number(value);

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

    if (
      servingsInput === "" ||
      !Number.isInteger(numericValue) ||
      numericValue < 1 ||
      numericValue > 2147483647
    ) {
      setServingsInput(String(currentServings));
      return;
    }

    setServings(numericValue);

    try {
      const calc = await recipeApi.calculate(recipe.id, {
        requiredServings: numericValue,
      });

      setCalculation(calc);
    } catch (error) {
      console.error("Failed to scale recipe:", error);
      setServingsInput(String(currentServings));
    }
  };

  const openIngredientEditor = (
    ingredient: RecipeCalculationResponse["ingredients"][number],
  ) => {
    const customized = customIngredients[ingredient.ingredientId];

    setEditingIngredient(ingredient);

    setEditedQuantity(
      String(customized?.quantity ?? ingredient.requiredQuantity),
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

    Alert.alert(
      "Update ingredients",
      "Do you want to change all ingredient quantities according to this?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => applyIngredientEdit(false, quantity, unit),
        },
        {
          text: "Yes",
          onPress: () => applyIngredientEdit(true, quantity, unit),
        },
      ],
    );
  };

  const applyIngredientEdit = (
    scaleAll: boolean,
    quantity: number,
    unit: string,
  ) => {
    if (!editingIngredient || !calculation) return;

    const originalQuantity =
      customIngredients[editingIngredient.ingredientId]?.quantity ??
      editingIngredient.requiredQuantity;

    setCustomIngredients((current) => {
      if (!scaleAll || originalQuantity === 0) {
        return {
          ...current,
          [editingIngredient.ingredientId]: { quantity, unit },
        };
      }

      const ratio = quantity / originalQuantity;
      const next = { ...current };

      calculation.ingredients.forEach((ingredient) => {
        const currentQuantity =
          current[ingredient.ingredientId]?.quantity ??
          ingredient.requiredQuantity;

        const currentUnit =
          current[ingredient.ingredientId]?.unit ?? ingredient.unit;

        next[ingredient.ingredientId] = {
          quantity: currentQuantity * ratio,
          unit:
            ingredient.ingredientId === editingIngredient.ingredientId
              ? unit
              : currentUnit,
        };
      });

      return next;
    });

    setEditingIngredient(null);
  };

  // The fixed header heart replaces the former Add to My Favorites button.
  // It uses the same customized-favorites API and saves current quantities.
  const handleToggleFavorite = async () => {
    if (!recipe || !calculation || isSavingFavorite) return;

    setFavoriteMessage("");
    setIsSavingFavorite(true);

    try {
      const token = await getAuthToken();

      if (!token || !token.trim()) {
        Alert.alert(
          "Login Required",
          "Please log in to save this recipe to your favorites.",
          [
            { text: "Cancel", style: "cancel" },
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
          ],
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
      setFavoriteMessage("Recipe saved successfully.");

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
        ]).start(() => setShowSuccessPopup(false));
      }, 1600);
    } catch (error) {
      console.error("Failed to save recipe to favorites:", error);

      const message = error instanceof Error ? error.message : "";

      if (
        message.includes("401") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        Alert.alert(
          "Login Required",
          "Your login session may have expired. Please log in again.",
          [
            { text: "Cancel", style: "cancel" },
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
          ],
        );
      } else {
        setFavoriteMessage(
          message || "Unable to save this recipe. Please try again.",
        );
      }
    } finally {
      setIsSavingFavorite(false);
    }
  };

  if (loading || !recipe || !calculation) {
    return <ScreenLoader />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* FIXED TRANSPARENT BLURRED HEADER */}
      <View style={styles.fixedHeader}>
        <BlurView
          intensity={Platform.OS === "ios" ? 75 : 45}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headerTint} />
        <View pointerEvents="none" style={styles.headerFadeTop} />
        <View pointerEvents="none" style={styles.headerFadeMiddle} />
        <View pointerEvents="none" style={styles.headerFadeBottom} />

        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/categories");
            }
          }}
          style={styles.headerIconButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={23} color="#17231E" />
        </Pressable>

        <Text style={styles.headerRecipeName} numberOfLines={1}>
          {recipe.name}
        </Text>

        <Pressable
          onPress={handleToggleFavorite}
          disabled={isSavingFavorite}
          style={styles.headerIconButton}
          hitSlop={8}
        >
          <Ionicons
            name={isSavingFavorite ? "hourglass-outline" : "heart"}
            size={23}
            color={isRecipeAdded ? "#1F7655" : "#68736D"}
          />
        </Pressable>
      </View>



      {/* MAIN SCROLL: PHOTO AND RECIPE CONTENT SCROLL; STICKY CONTROLS STOP BELOW HEADER */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {/* RECIPE PHOTO */}
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
                  error.nativeEvent,
                )
              }
            />
          ) : (
            <Text style={styles.heroEmoji}>{recipe.name.charAt(0)}</Text>
          )}
        </View>

        {/* STICKY SECTION: SCALING + TABS + SECTION TITLE */}
        <View style={styles.stickyControls}>
          <View style={styles.scalingCard}>
            <View style={styles.scalingHeading}>
              <View style={styles.scalingTextContainer}>
                <Text style={styles.scalingTitle}>Scaling</Text>
                <Text style={styles.scalingSubtitle}>Adjust ingredient quantities</Text>
              </View>
            </View>

            <View style={styles.servingButtons}>
              <Pressable
                onPress={() => handleServingsChange(-1)}
                style={[
                  styles.servingBtn,
                  currentServings <= 1 && styles.servingBtnDisabled,
                ]}
                disabled={currentServings <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={currentServings <= 1 ? "#C5C9C4" : "#FFFFFF"}
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
                onPress={() => handleServingsChange(1)}
                style={styles.servingBtn}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabContainer}>
            {(["ingredients", "instructions"] as const).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "ingredients" ? (
            <Text style={styles.scaledTitle}>
              Scaled Ingredients ({currentServings} servings)
            </Text>
          ) : (
            <Text style={styles.scaledTitle}>Instructions</Text>
          )}
        </View>

        {/* ACTIVE CONTENT SCROLLS UNDER THE STICKY CONTROLS */}
        {activeTab === "ingredients" ? (
          <View style={styles.ingredientsContent}>
            {calculation.ingredients.map((ingredient, index) => {
              const originalIngredient = recipe.ingredients.find(
                (item) => item.ingredientId === ingredient.ingredientId,
              );
              const ingredientImageUrl = originalIngredient?.ingredientPhotoUrl;
              const customized = customIngredients[ingredient.ingredientId];

              return (
                <Pressable
                  key={ingredient.ingredientId}
                  style={[
                    styles.ingredientRow,
                    index === calculation.ingredients.length - 1 && styles.lastIngredientRow,
                  ]}
                  onPress={() => openIngredientEditor(ingredient)}
                >
                  <View style={styles.ingredientIcon}>
                    {ingredientImageUrl ? (
                      <Image
                        source={{ uri: ingredientImageUrl }}
                        style={styles.ingredientImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.ingredientEmoji}>
                        {ingredient.ingredientName === "Basmati Rice"
                          ? "🌾"
                          : ingredient.ingredientName === "Chicken"
                            ? "🍗"
                            : ingredient.ingredientName === "Onion"
                              ? "🧅"
                              : ingredient.ingredientName === "Tomato"
                                ? "🍅"
                                : ingredient.ingredientName === "Paneer"
                                  ? "🧀"
                                  : "🥘"}
                      </Text>
                    )}
                  </View>

                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName} numberOfLines={2}>
                      {ingredient.ingredientName}
                    </Text>
                    <Text style={styles.ingredientBase}>
                      {ingredient.baseQuantity} {ingredient.unit} (base)
                    </Text>
                  </View>

                  <View style={styles.ingredientQuantityContainer}>
                    <Text style={styles.ingredientQuantity}>
                      {formatQuantity(
                        customized?.quantity ?? ingredient.requiredQuantity,
                        customized?.unit ?? ingredient.unit,
                      )}
                    </Text>
                    <Text style={styles.ingredientPrice}>
                      {ingredient.estimatedCost != null
                        ? `₹${ingredient.estimatedCost.toFixed(2)}`
                        : "Price unavailable"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.instructionsContent}>
            {recipe.procedures.map((step) => (
              <View key={step.stepNumber} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                </View>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FIXED FOOTER: TWO SUMMARY CARDS */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomMetricCard}>
          <View style={styles.bottomMetricIcon}>
            <Ionicons
              name="scale-outline"
              size={21}
              color="#1F7655"
            />
          </View>

          <View style={styles.bottomMetricText}>
            <Text style={styles.bottomMetricLabel}>Approx. Weight</Text>
            <Text style={styles.bottomMetricValue} numberOfLines={1}>
              {calculation.estimatedCookedWeightGrams != null
                ? formatEstimatedWeight(
                    calculation.estimatedCookedWeightGrams,
                  )
                : "Unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.bottomMetricCard}>
          <View style={styles.bottomMetricIcon}>
            <Ionicons
              name="wallet-outline"
              size={21}
              color="#1F7655"
            />
          </View>

          <View style={styles.bottomMetricText}>
            <Text style={styles.bottomMetricLabel}>Approx. Price</Text>
            <Text style={styles.bottomMetricValue} numberOfLines={1}>
              {calculation.estimatedTotalCost != null
                ? `₹${calculation.estimatedTotalCost.toFixed(2)}`
                : "Unavailable"}
            </Text>
          </View>
        </View>
      </View>

      {/* EDIT INGREDIENT MODAL */}
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

            <Text style={styles.ingredientModalLabel}>Quantity</Text>

            <TextInput
              value={editedQuantity}
              onChangeText={setEditedQuantity}
              keyboardType="decimal-pad"
              style={styles.ingredientModalInput}
              placeholder="Enter quantity"
            />

            <Text style={styles.ingredientModalLabel}>Unit</Text>

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
                <Text style={styles.ingredientSaveText}>
                  Save Quantity
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SAVE SUCCESS POPUP */}
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
              <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            </View>

            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>
                Saved Successfully
              </Text>

              <Text style={styles.successMessage}>
                Added to My Favorites
              </Text>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },

  /* FIXED BLURRED HEADER */
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 66,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
    overflow: "hidden",
    borderBottomWidth: 0,
  },

  headerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
  },

  headerFadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(247, 248, 243, 0.04)",
  },

  headerFadeMiddle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: "rgba(247, 248, 243, 0.08)",
  },

  headerFadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    backgroundColor: "rgba(247, 248, 243, 0.12)",
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.60)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(229, 232, 227, 0.65)",
  },

  headerRecipeName: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },

  mainScroll: {
    flex: 1,
    marginTop: 66,
  },

  mainScrollContent: {
    paddingBottom: 12,
  },

  stickyControls: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 2,
    zIndex: 20,
    elevation: 8,
  },

  /* RECIPE IMAGE */
  heroImage: {
    height: 250,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heroImageActual: {
    width: "100%",
    height: "100%",
  },

  heroEmoji: {
    fontSize: 80,
    fontWeight: "700",
    color: "#1F7655",
  },

  ingredientsContent: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 12,
    paddingVertical: 2,
  },

  instructionsContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },

  titleSection: {
    marginBottom: 16,
  },

  recipeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#17231E",
  },

  servingsText: {
    fontSize: 13,
    color: "#68736D",
    marginTop: 5,
  },

  spanText: {
    color: "#1F7655",
    fontSize: 15,
    fontWeight: "800",
  },

  /* SCALING CONTROLS */
  scalingCard: {
  width: "100%",
  minHeight: 58,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E5E8E3",
  paddingHorizontal: 20,
  paddingVertical: 24,
  gap: 8,
  elevation: 2,
  shadowColor: "#17231E",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 5,
},
  scalingHeading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  scalingIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  scalingTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  scalingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17231E",
  },

  scalingSubtitle: {
    fontSize: 10,
    color: "#68736D",
    marginTop: 3,
  },

  servingButtons: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 7,
  },

  servingBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
  },

  servingBtnDisabled: {
    backgroundColor: "#E5E8E3",
  },

  servingCount: {
    width: 46,
    height: 34,
    borderWidth: 1,
    borderColor: "#D9E1DB",
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontSize: 16,
    fontWeight: "800",
    color: "#17231E",
    backgroundColor: "#FFFFFF",
    alignContent:"center",
  },

  /* TABS */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E7F1EA",
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    marginTop:10,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },

  tabActive: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },

  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#68736D",
  },

  tabTextActive: {
    color: "#17231E",
    fontWeight: "900",
  },

  /* INGREDIENTS */
  scaledTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17231E",
    marginBottom: 10,
  },

  ingredientsList: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2ED",
    gap: 10,
  },

  lastIngredientRow: {
    borderBottomWidth: 0,
  },

  ingredientIcon: {
    width: 50,
    height: 50,
    borderRadius: 100,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  ingredientImage: {
    width: "100%",
    height: "100%",
  },

  ingredientEmoji: {
    fontSize: 20,
  },

  ingredientInfo: {
    flex: 1,
    minWidth: 0,
  },

  ingredientName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#17231E",
  },

  ingredientBase: {
    fontSize: 11,
    color: "#68736D",
    marginTop: 4,
  },

  ingredientQuantityContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },

  ingredientQuantity: {
    fontSize: 13,
    fontWeight: "800",
    color: "#087443",
  },

  ingredientPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: "#68736D",
  },

  /* INSTRUCTIONS */
  instructionsList: {
    gap: 9,
    paddingBottom: 10,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7655",
  },

  stepDescription: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#34423A",
  },

  /* FIXED FOOTER */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 5 : 7,
    borderTopWidth: 0,
    gap: 8,
  },

  bottomMetricCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8F3",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },

  bottomMetricIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },

  bottomMetricText: {
    flex: 1,
    minWidth: 0,
  },

  bottomMetricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#68736D",
  },

  bottomMetricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F7655",
    marginTop: 2,
  },

  /* INGREDIENT EDIT MODAL */
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

  /* SUCCESS POPUP */
  successOverlay: {
    position: "absolute",
    top: 76,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#DDE8E1",
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
});