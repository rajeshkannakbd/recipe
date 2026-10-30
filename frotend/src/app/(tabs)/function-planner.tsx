import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/common/AppText";

import FunctionPlannerSkeleton from "@/components/skeleton/FunctionPlannerSkeleton";
import {
  functionPlanApi,
  FunctionPlanRequest,
  FunctionPlanResponse,
} from "../../api/functionPlanApi";
import { recipeApi } from "../../api/recipeApi";

type RecipeChoice = {
  id: number;
  name: string;
  baseServings: number;
  categoryName?: string | null;
};

type SelectedRecipes = Record<number, number>;

const toPositiveNumber = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const datePart = value.slice(0, 10);
  const parts = datePart.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : datePart;
};

const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatSelectedDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const normalizeRecipe = (item: any): RecipeChoice | null => {
  const id = Number(item?.id ?? item?.recipeId ?? item?.Id ?? item?.RecipeId);
  const name = String(
    item?.name ?? item?.recipeName ?? item?.Name ?? item?.RecipeName ?? "",
  ).trim();

  if (!Number.isFinite(id) || id <= 0 || !name) return null;

  return {
    id,
    name,
    baseServings: toPositiveNumber(item?.baseServings ?? item?.BaseServings, 1),
    categoryName:
      item?.categoryName ?? item?.CategoryName ?? item?.category?.name ?? null,
  };
};

const getPlanRecipes = (plan: FunctionPlanResponse) =>
  Array.isArray(plan.recipes) ? plan.recipes : [];

export default function FunctionPlannerScreen() {
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeChoice[]>([]);
  const [plans, setPlans] = useState<FunctionPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FunctionPlanResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const [planName, setPlanName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [notes, setNotes] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [selected, setSelected] = useState<SelectedRecipes>({});

  const [deletingPlanId, setDeletingPlanId] = useState<number | null>(null);

  const loadPlans = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await functionPlanApi.getAll();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert(
        "Unable to load functions",
        error instanceof Error
          ? error.message
          : "Please check your connection and permissions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    setLoadingRecipes(true);
    try {
      const response = await recipeApi.getAll();
      const rows = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.items)
          ? (response as any).items
          : Array.isArray((response as any)?.data)
            ? (response as any).data
            : Array.isArray((response as any)?.recipes)
              ? (response as any).recipes
              : [];

      const normalized = rows
        .map(normalizeRecipe)
        .filter(
          (recipe: RecipeChoice | null): recipe is RecipeChoice =>
            recipe !== null,
        )
        .sort((a: RecipeChoice, b: RecipeChoice) =>
          a.name.localeCompare(b.name),
        );

      setRecipes(normalized);
      if (!normalized.length) {
        Alert.alert(
          "No recipes available",
          "No usable recipes were returned by the recipes API. Check that recipes exist and the API response includes recipe ID and name.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to load recipes",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoadingRecipes(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filteredRecipes = useMemo(() => {
    const term = recipeSearch.trim().toLowerCase();

    return (
      recipes
        .filter(
          (recipe) =>
            !term ||
            recipe.name.toLowerCase().includes(term) ||
            (recipe.categoryName ?? "").toLowerCase().includes(term),
        )
        // Keep selected recipes at the top of the scroll list.
        // Within each group, preserve the existing alphabetical order.
        .sort((a, b) => {
          const aSelected = selected[a.id] !== undefined;
          const bSelected = selected[b.id] !== undefined;

          if (aSelected !== bSelected) {
            return aSelected ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        })
    );
  }, [recipes, recipeSearch, selected]);

  const selectedRecipeRows = useMemo(
    () =>
      recipes
        .filter((recipe) => selected[recipe.id] !== undefined)
        .map((recipe) => ({
          ...recipe,
          requiredServings: selected[recipe.id],
        })),
    [recipes, selected],
  );

  const today = startOfDay(new Date());
  const todayISO = toLocalISODate(today);
  const calendarCells = useMemo(() => {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, (_, index) => ({
        key: `blank-${index}`,
        day: null as number | null,
        date: "",
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = toLocalISODate(new Date(year, month, day));
        return { key: date, day, date };
      }),
    ];
  }, [displayedMonth]);

  const openCalendar = () => {
    const baseDate = eventDate ? new Date(`${eventDate}T00:00:00`) : new Date();
    setDisplayedMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setCalendarVisible(true);
  };

  const openAddModal = async () => {
    setEditingPlan(null);
    setPlanName("");
    setEventDate("");
    setNotes("");
    setRecipeSearch("");
    setSelected({});
    setAddModalVisible(true);
    await loadRecipes();
  };

  const openEditModal = async (plan: FunctionPlanResponse) => {
    setEditingPlan(plan);
    setPlanName(plan.name ?? "");
    setEventDate(plan.eventDate ? String(plan.eventDate).slice(0, 10) : "");
    setNotes(plan.notes ?? "");
    setRecipeSearch("");
    const existingSelections: SelectedRecipes = {};
    getPlanRecipes(plan).forEach((item) => {
      const recipeId = Number(item.recipeId);
      const servings = toPositiveNumber(item.requiredServings, 10);
      if (recipeId > 0) existingSelections[recipeId] = servings;
    });
    setSelected(existingSelections);
    setAddModalVisible(true);
    await loadRecipes();
  };

  const closeAddModal = () => {
    if (saving) return;
    setAddModalVisible(false);
    setEditingPlan(null);
  };

  const toggleRecipe = (recipe: RecipeChoice) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[recipe.id] !== undefined) {
        delete next[recipe.id];
      } else {
        // Default every selected recipe to 10 servings, as requested.
        next[recipe.id] = 10;
      }
      return next;
    });
  };

  const updateServings = (recipeId: number, value: string) => {
    if (value === "") {
      setSelected((current) => ({ ...current, [recipeId]: 0 }));
      return;
    }
    if (!/^\d+$/.test(value)) return;
    const parsed = Number(value);
    if (parsed > 100000) return;
    setSelected((current) => ({ ...current, [recipeId]: parsed }));
  };

  const adjustServings = (recipeId: number, delta: number) => {
    setSelected((current) => ({
      ...current,
      [recipeId]: Math.min(
        100000,
        Math.max(1, toPositiveNumber(current[recipeId], 10) + delta),
      ),
    }));
  };

  const validateForm = () => {
    if (planName.trim().length < 2) {
      Alert.alert(
        "Function name required",
        "Enter a function name with at least 2 characters.",
      );
      return false;
    }
    if (!eventDate.trim()) {
      Alert.alert(
        "Event date required",
        "Select an event date from the calendar.",
      );
      return false;
    }
    const selectedDate = new Date(`${eventDate.trim()}T00:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim()) ||
      Number.isNaN(selectedDate.getTime()) ||
      toLocalISODate(selectedDate) !== eventDate.trim()
    ) {
      Alert.alert(
        "Invalid event date",
        "Please select a valid date from the calendar.",
      );
      return false;
    }
    if (!editingPlan && eventDate.trim() < todayISO) {
      Alert.alert(
        "Past date not allowed",
        "Choose today or a future date for the event.",
      );
      return false;
    }
    if (!notes.trim()) {
      Alert.alert(
        "Notes required",
        "Add useful notes for this function before saving.",
      );
      return false;
    }
    if (!selectedRecipeRows.length) {
      Alert.alert(
        "Select recipes",
        "Select at least one recipe for this function.",
      );
      return false;
    }
    if (
      selectedRecipeRows.some(
        (recipe) =>
          !Number.isInteger(recipe.requiredServings) ||
          recipe.requiredServings < 1,
      )
    ) {
      Alert.alert(
        "Invalid servings",
        "Each selected recipe must have at least 1 serving.",
      );
      return false;
    }
    return true;
  };

  const saveFunction = async () => {
    if (saving || !validateForm()) return;

    const request: FunctionPlanRequest = {
      name: planName.trim(),
      eventDate: `${eventDate.trim()}T00:00:00`,
      notes: notes.trim(),
      recipes: selectedRecipeRows.map((recipe) => ({
        recipeId: recipe.id,
        requiredServings: recipe.requiredServings,
      })),
    };

    setSaving(true);
    try {
      const saved = editingPlan
        ? await functionPlanApi.update(editingPlan.id, request)
        : await functionPlanApi.create(request);
      setPlans((current) =>
        editingPlan
          ? current.map((plan) => (plan.id === saved.id ? saved : plan))
          : [saved, ...current.filter((plan) => plan.id !== saved.id)],
      );
      setAddModalVisible(false);
      setEditingPlan(null);
      setSelected({});
      setPlanName("");
      setEventDate("");
      setNotes("");
      Alert.alert(
        editingPlan ? "Function updated" : "Function saved",
        `"${saved.name}" was ${editingPlan ? "updated" : "saved"} successfully.`,
      );
      await loadPlans(false);
    } catch (error) {
      Alert.alert(
        editingPlan ? "Could not update function" : "Could not save function",
        error instanceof Error
          ? error.message
          : "The server rejected the request. Check the API response and your permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = (plan: FunctionPlanResponse) => {
    Alert.alert(
      "Delete function?",
      `Delete "${plan.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingPlanId(plan.id);
            try {
              await functionPlanApi.delete(plan.id);
              setPlans((current) =>
                current.filter((item) => item.id !== plan.id),
              );
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error instanceof Error ? error.message : "Please try again.",
              );
            } finally {
              setDeletingPlanId(null);
            }
          },
        },
      ],
    );
  };

  const renderPlanRecipeSummary = (plan: FunctionPlanResponse) => {
    const planRecipes = getPlanRecipes(plan);
    if (!planRecipes.length) {
      return (
        <AppText style={styles.muted} variant="helper">Recipe details are not available.</AppText>
      );
    }

    return (
      <View style={styles.planRecipeList}>
        {planRecipes.map((item, index) => (
          <View key={`${item.recipeId}-${index}`} style={styles.planRecipeRow}>
            <View style={styles.recipeBullet}>
              <Ionicons name="restaurant-outline" size={14} color="#267653" />
            </View>
            <AppText style={styles.planRecipeName} variant="body" numberOfLines={2}>
              {item.recipeName || `Recipe #${item.recipeId}`}
            </AppText>
            <View style={styles.servingBadge}>
              <AppText style={styles.servingBadgeText} variant="label">
                {item.requiredServings} servings
              </AppText>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.page}>
        <View style={styles.header}>
          {/* <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/categories" as never)
            }
          >
            <Ionicons name="chevron-back" size={21} color="#173A2B" />
          </Pressable> */}

          <View style={styles.headerText}>
            {/* <AppText style={styles.eyebrow} variant="label"></AppText> */}
            <AppText style={styles.pageTitle} variant="pageTitle">EVENT'S</AppText>
            <AppText style={styles.headerSubtitle} variant="subtitle">
              Plan menus and manage ingredient requirements.
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add function"
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <AppText style={styles.addButtonText} variant="button">Add</AppText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPlans(false);
              }}
              tintColor="#267653"
            />
          }
        >
          <View style={styles.listHeading}>
            <View>
              <AppText style={styles.sectionTitle} variant="sectionTitle">Saved functions</AppText>
              <AppText style={styles.muted} variant="helper">
                {plans.length} {plans.length === 1 ? "function" : "functions"}
              </AppText>
            </View>
            <Pressable
              style={styles.refreshButton}
              onPress={() => loadPlans()}
              accessibilityRole="button"
              accessibilityLabel="Refresh saved functions"
            >
              <Ionicons name="refresh-outline" size={18} color="#267653" />
            </Pressable>
          </View>

          {loading ? (
            <FunctionPlannerSkeleton />
          ) : plans.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={30} color="#267653" />
              </View>
              <AppText style={styles.emptyTitle} variant="cardTitle">No functions yet</AppText>
              <AppText style={styles.emptyDescription} variant="body">
                Create your first function to select recipes, set serving
                counts, and prepare a combined shopping list.
              </AppText>
              <Pressable style={styles.emptyAction} onPress={openAddModal}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <AppText style={styles.emptyActionText} variant="button">Create function</AppText>
              </Pressable>
            </View>
          ) : (
            plans.map((plan) => {
              const planRecipes = getPlanRecipes(plan);
              const totalServings = planRecipes.reduce(
                (sum, item) => sum + toPositiveNumber(item.requiredServings, 0),
                0,
              );
              return (
                <View key={plan.id} style={styles.functionCard}>
                  <View style={styles.functionCardHeader}>
                    <View style={styles.functionIcon}>
                      <Ionicons name="calendar" size={19} color="#267653" />
                    </View>
                    <View style={styles.functionTitleWrap}>
                      <AppText style={styles.functionName} variant="cardTitle">{plan.name}</AppText>
                      <AppText style={styles.functionDate} variant="helper">
                        {plan.eventDate
                          ? `Event date · ${formatDate(plan.eventDate)}`
                          : "Event date not set"}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${plan.name}`}
                      style={styles.editButton}
                      onPress={() => openEditModal(plan)}
                      disabled={deletingPlanId === plan.id || saving}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#267653"
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${plan.name}`}
                      style={styles.deleteButton}
                      onPress={() => deletePlan(plan)}
                      disabled={deletingPlanId === plan.id}
                    >
                      {deletingPlanId === plan.id ? (
                        <ActivityIndicator size="small" color="#B63D3D" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#B63D3D"
                        />
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Ionicons
                        name="restaurant-outline"
                        size={15}
                        color="#637368"
                      />
                      <AppText style={styles.metricText} variant="helper">
                        {planRecipes.length}{" "}
                        {planRecipes.length === 1 ? "recipe" : "recipes"}
                      </AppText>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metric}>
                      <Ionicons
                        name="people-outline"
                        size={15}
                        color="#637368"
                      />
                      <AppText style={styles.metricText} variant="helper">
                        {totalServings.toLocaleString()} total servings
                      </AppText>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    style={styles.shoppingButton}
                    onPress={() =>
                      router.push({
                        pathname: "/function-plan-detail",
                        params: { planId: String(plan.id) },
                      } as never)
                    }
                  >
                    <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                    <AppText style={styles.shoppingButtonText} variant="button">
                      View shopping list
                    </AppText>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.modalCloseButton}
                onPress={closeAddModal}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={
                  editingPlan ? "Close edit function" : "Close add function"
                }
              >
                <Ionicons name="close" size={22} color="#27382D" />
              </Pressable>
              <View style={styles.modalHeaderText}>
                <AppText style={styles.modalTitle} variant="sectionTitle">
                  {editingPlan ? "Edit Event" : "Add Events"}
                </AppText>
                <AppText style={styles.modalSubtitle} variant="subtitle">
                  {editingPlan
                    ? "Update event details and selected recipes."
                    : "Add event details and choose recipes."}
                </AppText>
              </View>
              <View style={{ width: 42 }} />
            </View>

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <AppText style={styles.formSectionTitle} variant="sectionTitle">Event details</AppText>

              <View style={styles.formCard}>
                <AppText style={styles.label} variant="label">
                  Event name <AppText style={styles.requiredMark} variant="label">*</AppText>
                </AppText>
                <TextInput
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g. Wedding lunch"
                  placeholderTextColor="#929D95"
                  style={styles.input}
                  maxLength={150}
                  returnKeyType="next"
                />

                <AppText style={styles.label} variant="label">
                  Event date <AppText style={styles.requiredMark} variant="label">*</AppText>
                </AppText>
                <Pressable
                  style={styles.inputWithIcon}
                  onPress={openCalendar}
                  accessibilityRole="button"
                  accessibilityLabel="Select event date from calendar"
                  disabled={saving}
                >
                  <Ionicons name="calendar-outline" size={18} color="#267653" />
                  <AppText
                    style={[
                      styles.iconInput,
                      !eventDate && styles.datePlaceholder,
                    ]} variant="body"
                    numberOfLines={1}
                  >
                    {eventDate
                      ? formatSelectedDate(eventDate)
                      : "Select event date"}
                  </AppText>
                  <Ionicons name="chevron-down" size={18} color="#7A897F" />
                </Pressable>
                <AppText style={styles.helperText} variant="helper">
                  Past dates are disabled. You can select today or any future
                  date.
                </AppText>

                <AppText style={styles.label} variant="label">
                  Notes <AppText style={styles.requiredMark} variant="label">*</AppText>
                </AppText>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Venue, meal timing, dietary requirements, or special instructions…"
                  placeholderTextColor="#929D95"
                  style={[styles.input, styles.notesInput]}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <AppText style={styles.characterCount} variant="helper">{notes.length}/2000</AppText>
              </View>

              <View style={styles.recipePickerSection}>
                <View style={styles.pickerTitleRow}>
                  <View style={styles.flex}>
                    <AppText style={styles.formSectionTitle} variant="sectionTitle">
                      Select recipes *
                    </AppText>
                    <AppText style={styles.helperText} variant="helper">
                      Tap a recipe to select it. New selections start at 10
                      servings.
                    </AppText>
                  </View>
                  <View style={styles.selectedPill}>
                    <AppText style={styles.selectedPillText} variant="label">
                      {selectedRecipeRows.length} selected
                    </AppText>
                  </View>
                </View>

                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={18} color="#849087" />
                  <TextInput
                    value={recipeSearch}
                    onChangeText={setRecipeSearch}
                    placeholder="Search recipes or categories"
                    placeholderTextColor="#929D95"
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  {!!recipeSearch && (
                    <Pressable
                      onPress={() => setRecipeSearch("")}
                      accessibilityRole="button"
                      accessibilityLabel="Clear recipe search"
                    >
                      <Ionicons name="close-circle" size={18} color="#849087" />
                    </Pressable>
                  )}
                </View>

                {loadingRecipes ? (
                  <View style={styles.recipeLoading}>
                    <ActivityIndicator color="#267653" />
                    <AppText style={styles.muted} variant="helper">Loading recipes…</AppText>
                  </View>
                ) : filteredRecipes.length === 0 ? (
                  <View style={styles.noRecipes}>
                    <Ionicons name="search-outline" size={24} color="#9AA69D" />
                    <AppText style={styles.noRecipesTitle} variant="cardTitle">
                      No matching recipes
                    </AppText>
                    <AppText style={styles.muted} variant="helper">Try a different search.</AppText>
                  </View>
                ) : (
                  <View style={styles.recipeListFrame}>
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      style={styles.recipeListScroll}
                    >
                      {filteredRecipes.map((recipe) => {
                        const isSelected = selected[recipe.id] !== undefined;
                        return (
                          <View
                            key={recipe.id}
                            style={[
                              styles.recipeOption,
                              isSelected && styles.recipeOptionSelected,
                            ]}
                          >
                            <Pressable
                              style={styles.recipeOptionMain}
                              onPress={() => toggleRecipe(recipe)}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isSelected }}
                            >
                              <View
                                style={[
                                  styles.checkbox,
                                  isSelected && styles.checkboxSelected,
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark"
                                    size={15}
                                    color="#FFFFFF"
                                  />
                                )}
                              </View>
                              <View style={styles.recipeOptionText}>
                                <AppText
                                  style={styles.recipeOptionName} variant="cardTitle"
                                  numberOfLines={2}
                                >
                                  {recipe.name}
                                </AppText>
                                <AppText
                                  style={styles.recipeOptionMeta} variant="helper"
                                  numberOfLines={1}
                                >
                                  {recipe.categoryName || "Recipe"} · Base{" "}
                                  {recipe.baseServings}
                                </AppText>
                              </View>
                              {isSelected && (
                                <View style={styles.selectedCheck}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color="#267653"
                                  />
                                </View>
                              )}
                            </Pressable>

                            {isSelected && (
                              <View style={styles.servingsEditor}>
                                <AppText style={styles.servingsLabel} variant="label">
                                  Required servings
                                </AppText>
                                <View style={styles.stepper}>
                                  <Pressable
                                    style={styles.stepButton}
                                    onPress={() =>
                                      adjustServings(recipe.id, -1)
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`Decrease servings for ${recipe.name}`}
                                  >
                                    <Ionicons
                                      name="remove"
                                      size={18}
                                      color="#267653"
                                    />
                                  </Pressable>
                                  <TextInput
                                    value={
                                      selected[recipe.id] > 0
                                        ? String(selected[recipe.id])
                                        : ""
                                    }
                                    onChangeText={(value) =>
                                      updateServings(recipe.id, value)
                                    }
                                    onBlur={() => {
                                      if (
                                        !selected[recipe.id] ||
                                        selected[recipe.id] < 1
                                      ) {
                                        setSelected((current) => ({
                                          ...current,
                                          [recipe.id]: 10,
                                        }));
                                      }
                                    }}
                                    keyboardType="number-pad"
                                    style={styles.servingsInput}
                                    accessibilityLabel={`Required servings for ${recipe.name}`}
                                  />
                                  <Pressable
                                    style={styles.stepButton}
                                    onPress={() => adjustServings(recipe.id, 1)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Increase servings for ${recipe.name}`}
                                  >
                                    <Ionicons
                                      name="add"
                                      size={18}
                                      color="#267653"
                                    />
                                  </Pressable>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.scrollHint}>
                      <Ionicons
                        name="swap-vertical-outline"
                        size={14}
                        color="#78867D"
                      />
                      <AppText style={styles.scrollHintText} variant="helper">
                        Scroll to browse all {filteredRecipes.length} recipes
                      </AppText>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.footerSummary}>
                <AppText style={styles.footerSummaryTitle} variant="cardTitle">
                  {selectedRecipeRows.length} recipes selected
                </AppText>
                <AppText style={styles.footerSummaryText} variant="helper">
                  {selectedRecipeRows
                    .reduce((sum, item) => sum + item.requiredServings, 0)
                    .toLocaleString()}{" "}
                  total servings
                </AppText>
              </View>
              <Pressable
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={saveFunction}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                    <AppText style={styles.saveButtonText} variant="button">
                      {editingPlan ? "Update function" : "Save function"}
                    </AppText>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const}
            onPress={() => setCalendarVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close calendar"
          />
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View>
                <AppText style={styles.calendarTitle} variant="sectionTitle">Choose event date</AppText>
                <AppText style={styles.calendarSubtitle} variant="subtitle">
                  Today or a future date
                </AppText>
              </View>
              <Pressable
                style={styles.calendarCloseButton}
                onPress={() => setCalendarVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
              >
                <Ionicons name="close" size={20} color="#33463A" />
              </Pressable>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable
                style={[
                  styles.calendarNavButton,
                  displayedMonth.getFullYear() === today.getFullYear() &&
                  displayedMonth.getMonth() === today.getMonth() &&
                  styles.calendarNavButtonDisabled,
                ]}
                disabled={
                  displayedMonth.getFullYear() === today.getFullYear() &&
                  displayedMonth.getMonth() === today.getMonth()
                }
                onPress={() =>
                  setDisplayedMonth(
                    new Date(
                      displayedMonth.getFullYear(),
                      displayedMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Ionicons name="chevron-back" size={18} color="#267653" />
              </Pressable>
              <AppText style={styles.calendarMonthText} variant="cardTitle">
                {displayedMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </AppText>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() =>
                  setDisplayedMonth(
                    new Date(
                      displayedMonth.getFullYear(),
                      displayedMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Ionicons name="chevron-forward" size={18} color="#267653" />
              </Pressable>
            </View>

            <View style={styles.calendarWeekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <AppText key={day} style={styles.calendarWeekday} variant="label">
                  {day}
                </AppText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((cell) => {
                if (cell.day === null) {
                  return <View key={cell.key} style={styles.calendarDayCell} />;
                }
                const isPast = cell.date < todayISO;
                const isToday = cell.date === todayISO;
                const isSelected = cell.date === eventDate;
                return (
                  <Pressable
                    key={cell.key}
                    style={[
                      styles.calendarDayCell,
                      isToday && styles.calendarTodayCell,
                      isSelected && styles.calendarSelectedCell,
                      isPast && styles.calendarPastCell,
                    ]}
                    disabled={isPast}
                    onPress={() => {
                      setEventDate(cell.date);
                      setCalendarVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${cell.date}${isPast ? ", unavailable" : ""}`}
                    accessibilityState={{
                      disabled: isPast,
                      selected: isSelected,
                    }}
                  >
                    <AppText
                      style={[
                        styles.calendarDayText,
                        isToday && styles.calendarTodayText,
                        isSelected && styles.calendarSelectedText,
                        isPast && styles.calendarPastText,
                      ]} variant="body"
                    >
                      {cell.day}
                    </AppText>
                    {isToday && !isSelected && (
                      <View style={styles.calendarTodayDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.calendarLegend}>
              <View style={styles.calendarLegendItem}>
                <View style={styles.calendarLegendTodayDot} />
                <AppText style={styles.calendarLegendText} variant="helper">Today</AppText>
              </View>
              <AppText style={styles.calendarHint} variant="helper">
                Past dates cannot be selected
              </AppText>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F8F5" },
  modalSafeArea: { flex: 1, backgroundColor: "#F6F8F5" },
  page: { flex: 1, backgroundColor: "#F6F8F5" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDE8",
    gap: 11,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EFF4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: "#267653",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.25,
    marginBottom: 4,
  },
  pageTitle: {
    color: "#182A20",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#758278",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  addButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "#267653",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#1A573B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  pageContent: { padding: 16, paddingBottom: 36 },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { color: "#1B2D22", fontSize: 18, fontWeight: "800" },
  muted: { color: "#7C897F", fontSize: 12, lineHeight: 18, marginTop: 4 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF3ED",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6EBE5",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5EBE5",
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginTop: 4,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { color: "#1D3024", fontSize: 17, fontWeight: "800" },
  emptyDescription: {
    color: "#758278",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#267653",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  emptyActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  functionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EBE5",
    padding: 15,
    marginBottom: 13,
    shadowColor: "#173C2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },
  functionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  functionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  functionTitleWrap: { flex: 1 },
  functionName: { color: "#1C2F23", fontSize: 16, fontWeight: "800" },
  functionDate: { color: "#7B887E", fontSize: 11, marginTop: 4 },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFF1F0",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 15,
    marginBottom: 11,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: "#F7F9F6",
    borderRadius: 11,
  },
  metric: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricText: { color: "#59685D", fontSize: 11, fontWeight: "700" },
  metricDivider: { height: 17, width: 1, backgroundColor: "#DCE4DC" },
  planRecipeList: { gap: 1 },
  planRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  recipeBullet: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#EFF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  planRecipeName: {
    flex: 1,
    color: "#2A3A30",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  servingBadge: {
    backgroundColor: "#EAF4ED",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  servingBadgeText: { color: "#267653", fontSize: 10, fontWeight: "800" },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F7F9F6",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  notesText: { flex: 1, color: "#637167", fontSize: 11, lineHeight: 17 },
  shoppingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#267653",
    marginTop: 13,
    paddingHorizontal: 12,
  },
  shoppingButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  shoppingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE9DF",
    marginTop: 8,
  },
  shoppingHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EFF3EF",
    alignItems: "center",
    justifyContent: "center",
  },
  listSummary: {
    color: "#267653",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 5,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2ED",
  },
  ingredientName: { color: "#26372B", fontSize: 13, fontWeight: "800" },
  quantity: {
    color: "#267653",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 120,
    textAlign: "right",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7ECE7",
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0F4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { color: "#1A2D21", fontSize: 19, fontWeight: "800" },
  modalSubtitle: { color: "#7B887E", fontSize: 11, marginTop: 3 },
  modalContent: { padding: 16, paddingBottom: 24 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EBE5",
    padding: 15,
    marginBottom: 20,
  },
  formSectionTitle: {
    color: "#1B2D22",
    fontSize: 15,
    fontWeight: "800",
    marginVertical: 4,
    paddingBottom: 2,
  },
  label: {
    color: "#4F6054",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 15,
    marginBottom: 7,
  },
  requiredMark: { color: "#D33636", fontWeight: "900" },
  input: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: "#DCE4DC",
    backgroundColor: "#FBFCFA",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: "#1D2D22",
  },
  inputWithIcon: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#DCE4DC",
    backgroundColor: "#FBFCFA",
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  iconInput: { flex: 1, color: "#1D2D22", fontSize: 13, paddingVertical: 10 },
  datePlaceholder: { color: "#929D95" },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 28, 19, 0.42)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#102719",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  calendarTitle: { color: "#1B2D22", fontSize: 18, fontWeight: "800" },
  calendarSubtitle: { color: "#7C897F", fontSize: 12, marginTop: 4 },
  calendarCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F0F4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavButtonDisabled: { opacity: 0.3 },
  calendarMonthText: { color: "#22372A", fontSize: 15, fontWeight: "800" },
  calendarWeekRow: { flexDirection: "row", marginBottom: 7 },
  calendarWeekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#7C897F",
    fontSize: 11,
    fontWeight: "700",
    paddingVertical: 7,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginBottom: 2,
  },
  calendarDayText: { color: "#26382C", fontSize: 13, fontWeight: "600" },
  calendarTodayCell: { borderWidth: 1, borderColor: "#267653" },
  calendarTodayText: { color: "#267653", fontWeight: "900" },
  calendarSelectedCell: { backgroundColor: "#267653", borderColor: "#267653" },
  calendarSelectedText: { color: "#FFFFFF", fontWeight: "900" },
  calendarPastCell: { backgroundColor: "transparent" },
  calendarPastText: { color: "#C7CEC8" },
  calendarTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#267653",
    marginTop: 2,
  },
  calendarLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEF2ED",
    marginTop: 12,
    paddingTop: 13,
  },
  calendarLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  calendarLegendTodayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#267653",
  },
  calendarLegendText: { color: "#657368", fontSize: 11, fontWeight: "600" },
  calendarHint: { color: "#8A958D", fontSize: 10 },
  helperText: { color: "#879289", fontSize: 10, lineHeight: 15, marginTop: 5 },
  notesInput: { minHeight: 88, textAlignVertical: "top" },
  characterCount: {
    textAlign: "right",
    color: "#879289",
    fontSize: 10,
    marginTop: 5,
  },
  recipePickerSection: { marginBottom: 6 },
  pickerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  selectedPill: {
    backgroundColor: "#EAF4ED",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  selectedPillText: { color: "#267653", fontSize: 10, fontWeight: "800" },
  searchContainer: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#1D2D22", fontSize: 12, paddingVertical: 10 },
  recipeLoading: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EBE5",
    borderRadius: 14,
  },
  noRecipes: {
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EBE5",
    borderRadius: 14,
  },
  noRecipesTitle: {
    color: "#3B4C40",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  recipeListFrame: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3EAE3",
    borderRadius: 14,
    overflow: "hidden",
  },
  recipeListScroll: { maxHeight: 520 },
  recipeOption: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EFF2EE",
  },
  recipeOptionSelected: { backgroundColor: "#F2F8F3" },
  recipeOptionMain: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    gap: 10,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#C7D2C8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: "#267653", borderColor: "#267653" },
  recipeOptionText: { flex: 1 },
  recipeOptionName: {
    color: "#24362A",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  recipeOptionMeta: { color: "#849087", fontSize: 10, marginTop: 3 },
  selectedCheck: { marginLeft: 2 },
  servingsEditor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 33,
    paddingTop: 7,
    paddingBottom: 3,
  },
  servingsLabel: { color: "#647368", fontSize: 11, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 7 },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  servingsInput: {
    width: 56,
    height: 32,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#DCE5DC",
    borderRadius: 9,
    color: "#1D3325",
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 0,
  },
  scrollHint: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F7F9F6",
    borderTopWidth: 1,
    borderTopColor: "#E8EEE7",
  },
  scrollHintText: { color: "#78867D", fontSize: 10, fontWeight: "600" },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E4EAE3",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerSummary: { flex: 1 },
  footerSummaryTitle: { color: "#26382C", fontSize: 12, fontWeight: "800" },
  footerSummaryText: { color: "#7A887E", fontSize: 10, marginTop: 3 },
  saveButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#267653",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minWidth: 145,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  buttonDisabled: { opacity: 0.65 },
});
