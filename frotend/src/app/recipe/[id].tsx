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
import { get, API_BASE_URL } from "../../api/client";
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

const hasText = (value?: string | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

type RecipeReview = {
  id: number;
  recipeId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function RecipeDetailScreen() {
  const { id, fromFavorites } = useLocalSearchParams<{
    id: string;
    fromFavorites?: string;
  }>();

  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [showRecipeDetails, setShowRecipeDetails] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

      // Reviews are returned by a separate endpoint, not by the recipe response.
      try {
        const reviewData = await get<unknown>(`/recipes/${data.id}/reviews`);
        const normalizedReviews: RecipeReview[] = Array.isArray(reviewData)
          ? (reviewData as RecipeReview[])
          : reviewData &&
              typeof reviewData === "object" &&
              Array.isArray((reviewData as { items?: unknown[] }).items)
            ? ((reviewData as { items: RecipeReview[] }).items)
            : reviewData &&
                typeof reviewData === "object" &&
                Array.isArray((reviewData as { reviews?: unknown[] }).reviews)
              ? ((reviewData as { reviews: RecipeReview[] }).reviews)
              : [];
        setReviews(normalizedReviews);
      } catch (reviewError) {
        console.warn("Could not load recipe reviews:", reviewError);
        setReviews([]);
      }

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

  const handleSubmitReview = async () => {
    if (!recipe || isSubmittingReview) return;

    try {
      const token = await getAuthToken();
      if (!token || !token.trim()) {
        setShowReviewModal(false);
        Alert.alert(
          "Login required",
          "Please log in to leave a review.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log in",
              onPress: () =>
                router.push({
                  pathname: "/login",
                  params: { redirectTo: `/recipe/${recipe.id}` },
                }),
            },
          ],
        );
        return;
      }

      setIsSubmittingReview(true);
      const response = await fetch(`${API_BASE_URL}/recipes/${recipe.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          responseData?.message ||
          (response.status === 409
            ? "You have already reviewed this recipe."
            : `Could not submit review (${response.status}).`),
        );
      }

      const createdReview = responseData as RecipeReview;
      setReviews((current) => [
        createdReview,
        ...current.filter((item) => item.id !== createdReview.id),
      ]);
      setReviewComment("");
      setReviewRating(5);
      setShowReviewModal(false);
      Alert.alert("Thank you!", "Your review has been added.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Unable to submit review", message);
    } finally {
      setIsSubmittingReview(false);
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
        stickyHeaderIndices={[2]}
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

        {/* COMPACT RECIPE INTRO: keep scaling close to the top */}
        <View style={styles.recipeOverview}>
          <View style={styles.recipeHeadingRow}>
            <View style={styles.recipeHeadingText}>
              <Text style={styles.recipeTitle}>{recipe.name}</Text>
              {hasText(recipe.description) ? (
                <Text style={styles.recipeDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={styles.recipeInfoButton}
              onPress={() => setShowRecipeDetails(true)}
              accessibilityRole="button"
              accessibilityLabel="Show recipe details and reviews"
              hitSlop={8}
            >
              <Ionicons name="information" size={19} color="#1F7655" />
            </Pressable>
          </View>

          <View style={styles.quickMetaRow}>
            {hasText(recipe.categoryName) ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="grid-outline" size={14} color="#1F7655" />
                <Text style={styles.quickMetaText}>{recipe.categoryName}</Text>
              </View>
            ) : null}
            {hasText(recipe.mealType) ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="restaurant-outline" size={14} color="#1F7655" />
                <Text style={styles.quickMetaText}>{recipe.mealType}</Text>
              </View>
            ) : null}
            {(recipe.preparationTimeMinutes != null || recipe.cookingTimeMinutes != null) ? (
              <View style={styles.quickMetaItem}>
                <Ionicons name="time-outline" size={14} color="#1F7655" />
                <Text style={styles.quickMetaText}>
                  {(Number(recipe.preparationTimeMinutes) || 0) +
                    (Number(recipe.cookingTimeMinutes) || 0)} min total
                </Text>
              </View>
            ) : null}
            <View style={styles.quickMetaItem}>
              <Ionicons name="star" size={14} color="#E6A23C" />
              <Text style={styles.quickMetaText}>
                {reviews.length
                  ? (reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviews.length).toFixed(1)
                  : "New"}
                {reviews.length ? ` · ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : ""}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.writeReviewInline}
            onPress={() => setShowReviewModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Write a recipe review"
          >
            <Ionicons name="create-outline" size={16} color="#1F7655" />
            <Text style={styles.writeReviewInlineText}>Write a review</Text>
          </Pressable>

          {(recipe.tags?.filter((tag) => hasText(tag.name)).length ?? 0) > 0 ? (
            <View style={styles.tagList}>
              {(showAllTags
                ? recipe.tags!.filter((tag) => hasText(tag.name))
                : recipe.tags!.filter((tag) => hasText(tag.name)).slice(0, 3)
              ).map((tag) => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag.name}</Text>
                </View>
              ))}
              {(recipe.tags?.filter((tag) => hasText(tag.name)).length ?? 0) > 3 ? (
                <Pressable
                  onPress={() => setShowAllTags((current) => !current)}
                  style={styles.moreTagsButton}
                  accessibilityRole="button"
                  accessibilityLabel={showAllTags ? "Show fewer tags" : "Show all tags"}
                  hitSlop={6}
                >
                  <Text style={styles.moreTagsText}>
                    {showAllTags
                      ? "Show less"
                      : `+${recipe.tags!.filter((tag) => hasText(tag.name)).length - 3} more`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* STICKY SECTION: SCALING + TABS + SECTION TITLE */}
        <View style={styles.stickyControls}>
          <View style={styles.scalingCard}>
            <View style={styles.scalingHeading}>
              <View style={styles.scalingTextContainer}>
                <Text style={styles.scalingTitle}>Scaling</Text>
                <Text style={styles.scalingSubtitle}>Set servings and quantities</Text>
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
            <View style={styles.scaledTitleRow}>
              <Text style={styles.scaledTitle}>
                Scaled Ingredients ({currentServings} servings)
              </Text>
              <View style={styles.priceSourceLegend}>
                <View style={styles.priceSourceLegendItem}>
                  <View style={[styles.priceSourceDot, styles.priceSourceDotManual]} />
                  <Text style={styles.priceSourceLegendText}>Manual price</Text>
                </View>
                <View style={styles.priceSourceLegendItem}>
                  <View style={[styles.priceSourceDot, styles.priceSourceDotGovt]} />
                  <Text style={styles.priceSourceLegendText}>Govt. Price</Text>
                </View>
              </View>
            </View>
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
              const priceSource = (
                ingredient as typeof ingredient & { priceSource?: string | null }
              ).priceSource;

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
                    {ingredient.estimatedCost != null && Number.isFinite(ingredient.estimatedCost) ? (
                      <View style={styles.ingredientPriceWrap}>
                        <Text style={styles.ingredientPrice}>
                          ₹{ingredient.estimatedCost.toFixed(2)}
                        </Text>
                        {priceSource === "GovernmentApi" ||
                        priceSource === "Govt" ||
                        priceSource === "Government" ? (
                          <View style={[styles.priceSourceDot, styles.priceSourceDotGovt]} />
                        ) : priceSource === "Admin" ||
                          priceSource === "Manual" ? (
                          <View style={[styles.priceSourceDot, styles.priceSourceDotManual]} />
                        ) : null}
                      </View>
                    ) : null}
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
                <View style={styles.instructionTextWrap}>
                  {hasText(step.title) ? (
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  ) : null}
                  {hasText(step.description) ? (
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* RECIPE DETAILS MODAL: opened from the info button beside the recipe name */}
      <Modal
        visible={showRecipeDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecipeDetails(false)}
      >
        <View style={styles.recipeDetailsModalOverlay}>
          <View style={styles.recipeDetailsModal}>
            <View style={styles.recipeDetailsModalHeader}>
              <View style={styles.detailsAccordionHeading}>
                <Text style={styles.detailsAccordionTitle}>Recipe details & reviews</Text>
                <Text style={styles.detailsAccordionSubtitle}>
                  {[
                    hasText(recipe.cuisine) ? recipe.cuisine : null,
                    hasText(recipe.chefName) ? recipe.chefName : null,
                    `${reviews.length} review${reviews.length === 1 ? "" : "s"}`,
                  ].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Pressable
                style={styles.recipeDetailsCloseButton}
                onPress={() => setShowRecipeDetails(false)}
                accessibilityRole="button"
                accessibilityLabel="Close recipe details"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#34423A" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailsAccordionBody}>
              <View style={styles.detailGrid}>
                {hasText(recipe.cuisine) ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cuisine</Text>
                    <Text style={styles.detailValue}>{recipe.cuisine}</Text>
                  </View>
                ) : null}
                {hasText(recipe.chefName) ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Chef</Text>
                    <Text style={styles.detailValue}>{recipe.chefName}</Text>
                  </View>
                ) : null}
                {hasText(recipe.cookingStyleName) ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cooking style</Text>
                    <Text style={styles.detailValue}>{recipe.cookingStyleName}</Text>
                  </View>
                ) : null}
                {recipe.baseServings != null && recipe.baseServings > 0 ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Base servings</Text>
                    <Text style={styles.detailValue}>{recipe.baseServings}</Text>
                  </View>
                ) : null}
                {recipe.baseCookedWeightGrams != null && recipe.baseCookedWeightGrams > 0 ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Base cooked weight</Text>
                    <Text style={styles.detailValue}>{formatEstimatedWeight(recipe.baseCookedWeightGrams)}</Text>
                  </View>
                ) : null}
                {recipe.preparationTimeMinutes != null ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Preparation</Text>
                    <Text style={styles.detailValue}>{recipe.preparationTimeMinutes} min</Text>
                  </View>
                ) : null}
                {recipe.cookingTimeMinutes != null ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cooking</Text>
                    <Text style={styles.detailValue}>{recipe.cookingTimeMinutes} min</Text>
                  </View>
                ) : null}
              </View>

              {hasText(recipe.storageInstructions) ? (
                <View style={styles.storageNote}>
                  <Ionicons name="snow-outline" size={17} color="#1F7655" />
                  <View style={styles.storageTextWrap}>
                    <Text style={styles.storageTitle}>Storage instructions</Text>
                    <Text style={styles.storageDescription}>{recipe.storageInstructions}</Text>
                    {recipe.shelfLifeHours != null && recipe.shelfLifeHours > 0 ? (
                      <Text style={styles.shelfLifeText}>
                        Best used within {recipe.shelfLifeHours >= 24 && recipe.shelfLifeHours % 24 === 0
                          ? `${recipe.shelfLifeHours / 24} day${recipe.shelfLifeHours / 24 === 1 ? "" : "s"}`
                          : `${recipe.shelfLifeHours} hour${recipe.shelfLifeHours === 1 ? "" : "s"}`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {hasText(recipe.sourceName) || hasText(recipe.sourceUrl) ? (
                <View style={styles.sourceNote}>
                  <Ionicons name="book-outline" size={16} color="#1F7655" />
                  <View style={styles.storageTextWrap}>
                    <Text style={styles.storageTitle}>Recipe source</Text>
                    {hasText(recipe.sourceName) ? (
                      <Text style={styles.storageDescription}>{recipe.sourceName}</Text>
                    ) : null}
                    {hasText(recipe.sourceUrl) ? (
                      <Text style={styles.sourceUrl} numberOfLines={2}>{recipe.sourceUrl}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.reviewsSection}>
                <View style={styles.reviewsHeading}>
                  <Text style={styles.reviewsTitle}>Reviews</Text>
                  <View style={styles.ratingSummary}>
                    <Ionicons name="star" size={15} color="#E6A23C" />
                    <Text style={styles.ratingSummaryText}>
                      {reviews.length
                        ? (reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviews.length).toFixed(1)
                        : "—"}
                    </Text>
                    <Text style={styles.reviewCountText}>({reviews.length})</Text>
                  </View>
                </View>
                {reviews.length ? (
                  reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewTopRow}>
                        <Text style={styles.reviewUserName}>{hasText(review.userName) ? review.userName : "User"}</Text>
                        <View style={styles.reviewRating}>
                          <Ionicons name="star" size={13} color="#E6A23C" />
                          <Text style={styles.reviewRatingText}>{Number(review.rating) || 0}/5</Text>
                        </View>
                      </View>
                      {hasText(review.comment) ? (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      ) : null}
                      {hasText(review.createdAt) ? (
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noReviewsText}>No reviews yet.</Text>
                )}
              </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* WRITE REVIEW MODAL */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewModalHeader}>
              <View style={styles.reviewModalHeading}>
                <Text style={styles.reviewModalTitle}>Rate this recipe</Text>
                <Text style={styles.reviewModalSubtitle} numberOfLines={2}>
                  Share your experience with {recipe.name}.
                </Text>
              </View>
              <Pressable
                onPress={() => setShowReviewModal(false)}
                style={styles.reviewModalClose}
                accessibilityRole="button"
                accessibilityLabel="Close review form"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color="#34423A" />
              </Pressable>
            </View>

            <View style={styles.reviewStarPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setReviewRating(star)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                >
                  <Ionicons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={34}
                    color="#E6A23C"
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.reviewRatingCaption}>
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][reviewRating]}
            </Text>

            <Text style={styles.reviewInputLabel}>Your review (optional)</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="What did you think of this recipe?"
              placeholderTextColor="#8A938E"
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={styles.reviewCommentInput}
            />
            <Text style={styles.reviewCharacterCount}>
              {reviewComment.length}/1000
            </Text>

            <View style={styles.reviewModalActions}>
              <Pressable
                style={styles.reviewCancelButton}
                onPress={() => setShowReviewModal(false)}
                disabled={isSubmittingReview}
              >
                <Text style={styles.reviewCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.reviewSubmitButton,
                  isSubmittingReview && styles.reviewSubmitButtonDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                <Text style={styles.reviewSubmitText}>
                  {isSubmittingReview ? "Submitting..." : "Submit review"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* FIXED FOOTER: show only metrics returned by the calculation API */}
      {(calculation.estimatedCookedWeightGrams != null || calculation.estimatedTotalCost != null) ? (
        <View style={styles.bottomBar}>
          {calculation.estimatedCookedWeightGrams != null ? (
            <View style={styles.bottomMetricCard}>
              <View style={styles.bottomMetricIcon}>
                <Ionicons name="scale-outline" size={21} color="#1F7655" />
              </View>
              <View style={styles.bottomMetricText}>
                <Text style={styles.bottomMetricLabel}>Approx. Weight</Text>
                <Text style={styles.bottomMetricValue} numberOfLines={1}>
                  {formatEstimatedWeight(calculation.estimatedCookedWeightGrams)}
                </Text>
              </View>
            </View>
          ) : null}

          {calculation.estimatedTotalCost != null ? (
            <View style={styles.bottomMetricCard}>
              <View style={styles.bottomMetricIcon}>
                <Ionicons name="wallet-outline" size={21} color="#1F7655" />
              </View>
              <View style={styles.bottomMetricText}>
                <Text style={styles.bottomMetricLabel}>Approx. Price</Text>
                <Text style={styles.bottomMetricValue} numberOfLines={1}>
                  ₹{calculation.estimatedTotalCost.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

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
    height: 58,
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
    width: 38,
    height: 38,
    borderRadius: 12,
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
    marginTop: 58,
  },

  mainScrollContent: {
    paddingBottom: 8,
  },

  stickyControls: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    zIndex: 20,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
  },

  /* RECIPE IMAGE */
  heroImage: {
    height: 170,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heroImageActual: {
    width: "100%",
    height: "100%",
  },

  /* COMPACT RECIPE INTRO */
  recipeOverview: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  quickMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },
  quickMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 3,
  },
  quickMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34423A",
  },
  moreTagsText: {
    alignSelf: "center",
    color: "#68736D",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  moreTagsButton: {
    alignSelf: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  detailsAccordion: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    overflow: "hidden",
  },
  detailsAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  detailsAccordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsAccordionHeading: {
    flex: 1,
    minWidth: 0,
  },
  detailsAccordionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#17231E",
  },
  detailsAccordionSubtitle: {
    fontSize: 11,
    color: "#68736D",
    marginTop: 3,
  },
  detailsAccordionBody: {
    borderTopWidth: 1,
    borderTopColor: "#E5E8E3",
    paddingHorizontal: 2,
    paddingBottom: 12,
  },
  detailGrid: {
    paddingTop: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 18,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: "#68736D",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: "#17231E",
    fontWeight: "700",
    textAlign: "right",
  },
  recipeHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recipeHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  recipeDescription: {
    color: "#65736A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: "#E4F0E8",
    borderWidth: 1,
    borderColor: "#D3E5D9",
  },
  tagChipText: {
    color: "#1F7655",
    fontSize: 11,
    fontWeight: "700",
  },
  recipeFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 9,
  },
  recipeFact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  recipeFactText: {
    color: "#34423A",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  sourceNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7EBE7",
  },
  sourceUrl: {
    color: "#52645A",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  reviewsSection: {
    marginTop: 14,
  },
  reviewsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingSummaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewCountText: {
    fontSize: 12,
    color: "#68736D",
  },
  reviewCard: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewUserName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#52645A",
  },
  reviewComment: {
    color: "#52645A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  reviewDate: {
    color: "#8A938E",
    fontSize: 10,
    marginTop: 6,
  },
  noReviewsText: {
    fontSize: 12,
    color: "#68736D",
    paddingVertical: 8,
  },
  storageNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E7EBE7",
  },
  storageTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  storageTitle: {
    color: "#1F7655",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  storageDescription: {
    color: "#34423A",
    fontSize: 12,
    lineHeight: 18,
  },
  shelfLifeText: {
    color: "#68736D",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
  },

  heroEmoji: {
    fontSize: 80,
    fontWeight: "700",
    color: "#1F7655",
  },

  ingredientsContent: {
    backgroundColor: "transparent",
    marginHorizontal: 14,
    marginVertical: 12,
    paddingHorizontal: 0,
  },

  instructionsContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },

  titleSection: {
    marginBottom: 16,
  },

  recipeInfoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  writeReviewInline: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 3,
  },
  writeReviewInlineText: {
    color: "#1F7655",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 22, 17, 0.48)",
  },
  reviewModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: Platform.OS === "ios" ? 34 : 22,
  },
  reviewModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E7EBE7",
  },
  reviewModalHeading: {
    flex: 1,
    minWidth: 0,
  },
  reviewModalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#17231E",
  },
  reviewModalSubtitle: {
    color: "#68736D",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  reviewModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F1",
  },
  reviewStarPicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 22,
  },
  reviewRatingCaption: {
    textAlign: "center",
    color: "#8A6A28",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 22,
  },
  reviewInputLabel: {
    color: "#34423A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  reviewCommentInput: {
    minHeight: 112,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "#DCE3DD",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#17231E",
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "#FBFCFA",
  },
  reviewCharacterCount: {
    alignSelf: "flex-end",
    color: "#8A938E",
    fontSize: 11,
    marginTop: 5,
  },
  reviewModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  reviewCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#F1F4F0",
  },
  reviewCancelText: {
    color: "#52645A",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewSubmitButton: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#1F7655",
  },
  reviewSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reviewSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  recipeDetailsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12, 22, 17, 0.48)",
    justifyContent: "flex-end",
  },
  recipeDetailsModal: {
    maxHeight: "86%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
    overflow: "hidden",
  },
  recipeDetailsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
    marginBottom: 2,
  },
  recipeDetailsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F4F0",
    alignItems: "center",
    justifyContent: "center",
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
  minHeight: 48,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#E5E8E3",
  paddingHorizontal: 12,
  paddingVertical: 8,
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
    marginTop: 1,
  },

  servingButtons: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 7,
  },

  servingBtn: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
  },

  servingBtnDisabled: {
    backgroundColor: "#E5E8E3",
  },

  servingCount: {
    width: 42,
    height: 30,
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
    backgroundColor: "#E9EDE8",
    borderRadius: 9,
    padding: 3,
    marginBottom: 8,
    marginTop: 7,
  },

  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 11,
  },

  tabActive: {
    backgroundColor: "#FFFFFF",
    flex: 1,
    paddingVertical: 7,
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
  scaledTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 7,
  },

  scaledTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#17231E",
  },

  priceSourceLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  priceSourceLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  priceSourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priceSourceDotManual: {
    backgroundColor: "#D64545",
  },

  priceSourceDotGovt: {
    backgroundColor: "#1F9D65",
  },

  priceSourceLegendText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    color: "#68736D",
  },

  ingredientsList: {
    paddingHorizontal: 10,
    paddingVertical: 1,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e3e3",
    gap: 10,
  },

  lastIngredientRow: {
    borderBottomWidth: 0,
  },

  ingredientIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginTop: 2,
  },

  ingredientQuantityContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },

  ingredientQuantity: {
    fontSize: 13,
    fontWeight: "800",
    color: "#087443",
  },

  ingredientPriceWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  ingredientPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: "#68736D",
  },

  ingredientPriceSource: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    color: "#68736D",
  },

  ingredientPriceSourceGovt: {
    color: "#1F7655",
  },

  ingredientPriceSourceManual: {
    color: "#7A6A43",
  },

  /* INSTRUCTIONS */
  instructionsList: {
    gap: 9,
    paddingBottom: 10,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
  },

  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7655",
  },

  instructionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    color: "#17231E",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#52645A",
  },

  /* FIXED FOOTER */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: Platform.OS === "ios" ? 4 : 5,
    borderTopWidth: 0,
    gap: 8,
  },

  bottomMetricCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8F3",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },

  bottomMetricIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
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
    marginBottom: 14,
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