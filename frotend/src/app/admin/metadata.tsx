import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { chefApi, ChefRecord } from "../../api/chefApi";
import { cookingStyleApi, CookingStyleRecord } from "../../api/cookingStyleApi";
import { cuisineApi, CuisineRecord } from "../../api/cuisineApi";
import { recipeTagApi, RecipeTagRecord } from "../../api/recipeTagApi";
import AppText from "../../components/common/AppText";

type TabKey = "chefs" | "styles" | "cuisines" | "tags";
type MetadataRecord =
  | ChefRecord
  | CookingStyleRecord
  | CuisineRecord
  | RecipeTagRecord;

const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  {
    key: "chefs",
    label: "Chefs",
    subtitle: "Manage recipe authors and chef details.",
  },
  {
    key: "styles",
    label: "Cooking styles",
    subtitle: "Manage cooking techniques and styles.",
  },
  {
    key: "cuisines",
    label: "Cuisines",
    subtitle: "Manage cuisine categories used by recipes.",
  },
  {
    key: "tags",
    label: "Recipe tags",
    subtitle: "Manage searchable recipe tags.",
  },
];

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

export default function MetadataScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("chefs");
  const [chefs, setChefs] = useState<ChefRecord[]>([]);
  const [stylesList, setStylesList] = useState<CookingStyleRecord[]>([]);
  const [cuisines, setCuisines] = useState<CuisineRecord[]>([]);
  const [tags, setTags] = useState<RecipeTagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [biography, setBiography] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const router = useRouter();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MetadataRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setLoadError("");
    const results = await Promise.allSettled([
      chefApi.getAll(),
      cookingStyleApi.getAll(),
      cuisineApi.getAll(),
      recipeTagApi.getAll(),
    ]);
    if (results[0].status === "fulfilled") setChefs(results[0].value);
    if (results[1].status === "fulfilled") setStylesList(results[1].value);
    if (results[2].status === "fulfilled") setCuisines(results[2].value);
    if (results[3].status === "fulfilled") setTags(results[3].value);

    const failed = results
      .map((result, index) => ({ result, tab: TABS[index] }))
      .filter((item) => item.result.status === "rejected");
    if (failed.length) {
      const cuisineFailed = failed.some((item) => item.tab.key === "cuisines");
      const otherFailed = failed.some((item) => item.tab.key !== "cuisines");
      const messages = [
        otherFailed
          ? "Some metadata could not be loaded. Check your API connection and permissions."
          : "",
        cuisineFailed
          ? "Cuisine management needs the backend /api/cuisines endpoint and database migration."
          : "",
      ].filter(Boolean);
      setLoadError(messages.join("\n"));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const currentItems: MetadataRecord[] = useMemo(() => {
    if (activeTab === "chefs") return chefs;
    if (activeTab === "styles") return stylesList;
    if (activeTab === "cuisines") return cuisines;
    return tags;
  }, [activeTab, chefs, stylesList, cuisines, tags]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return currentItems;
    return currentItems.filter((item) => {
      const extra =
        "description" in item
          ? item.description
          : "biography" in item
            ? item.biography
            : "";
      return `${item.name} ${extra ?? ""}`.toLowerCase().includes(term);
    });
  }, [currentItems, search]);

  const resetForm = () => {
    setFormModalVisible(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setBiography("");
    setPhotoUrl("");
    setSourceUrl("");
  };

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setBiography("");
    setPhotoUrl("");
    setSourceUrl("");
    setFormModalVisible(true);
  };

  const startEdit = (item: MetadataRecord) => {
    setEditingId(item.id);
    setName(item.name ?? "");
    setDescription("description" in item ? (item.description ?? "") : "");
    setBiography("biography" in item ? (item.biography ?? "") : "");
    setPhotoUrl("photoUrl" in item ? (item.photoUrl ?? "") : "");
    setSourceUrl("sourceUrl" in item ? (item.sourceUrl ?? "") : "");
    setFormModalVisible(true);
  };

  const saveItem = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert("Name required", "Enter a name before saving.");
      return;
    }
    setSaving(true);
    try {
      if (activeTab === "chefs") {
        const payload = {
          name: cleanName,
          biography: biography.trim() || null,
          photoUrl: photoUrl.trim() || null,
          sourceUrl: sourceUrl.trim() || null,
        };
        if (editingId === null) await chefApi.create(payload);
        else await chefApi.update(editingId, payload);
      } else if (activeTab === "styles") {
        const payload = {
          name: cleanName,
          description: description.trim() || null,
        };
        if (editingId === null) await cookingStyleApi.create(payload);
        else await cookingStyleApi.update(editingId, payload);
      } else if (activeTab === "cuisines") {
        const payload = { name: cleanName };
        if (editingId === null) await cuisineApi.create(payload);
        else await cuisineApi.update(editingId, payload);
      } else {
        const payload = { name: cleanName };
        if (editingId === null) await recipeTagApi.create(payload);
        else await recipeTagApi.update(editingId, payload);
      }
      resetForm();
      await loadAll(false);
      Alert.alert(
        "Success",
        `${TABS.find((tab) => tab.key === activeTab)?.label} ${editingId === null ? "created" : "updated"} successfully.`,
      );
    } catch (error) {
      Alert.alert("Could not save", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (item: MetadataRecord) => {
    setDeleteTarget(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      if (activeTab === "chefs") await chefApi.delete(deleteTarget.id);
      else if (activeTab === "styles")
        await cookingStyleApi.delete(deleteTarget.id);
      else if (activeTab === "cuisines")
        await cuisineApi.delete(deleteTarget.id);
      else await recipeTagApi.delete(deleteTarget.id);

      if (editingId === deleteTarget.id) resetForm();
      setDeleteModalVisible(false);
      setDeleteTarget(null);
      await loadAll(false);
      Alert.alert("Deleted!", "The item has been deleted successfully.");
    } catch (error) {
      Alert.alert("Could not delete", errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const changeTab = (key: TabKey) => {
    setActiveTab(key);
    setSearch("");
    resetForm();
    setLoadError("");
  };

  const activeSubtitle =
    TABS.find((tab) => tab.key === activeTab)?.subtitle ?? "";

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <View style={s.headerTop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/admin");
              }}
              style={s.backButton}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={22} color="#17231D" />
            </Pressable>
            <View style={s.headerTextContainer}>
              <AppText variant="pageTitle" style={s.title}>Recipe & Chef Directory</AppText>
              <AppText variant="label" style={s.brandCaption}>ADMIN WORKSPACE</AppText>
            </View>
          </View>
          {/* <AppText variant="body" style={s.headerDescription}>
            Manage the reusable details that appear across recipes.
          </AppText> */}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabRow}
          style={{ flexGrow: 0, flexShrink: 0, height: 56 }}
          keyboardShouldPersistTaps="handled"
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => changeTab(tab.key)}
              style={[s.tab, activeTab === tab.key && s.activeTab]}
            >
              <AppText variant="body"
                style={[s.tabText, activeTab === tab.key && s.activeTabText]}
              >
                {tab.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.contentHeader}>
          <View style={s.flex}>
            <AppText variant="sectionTitle" style={s.sectionTitle}>
              {TABS.find((tab) => tab.key === activeTab)?.label}
            </AppText>
            <AppText variant="subtitle" style={s.subtitle}>{activeSubtitle}</AppText>
          </View>
          <View style={s.countPill}>
            <AppText variant="label" style={s.countText}>{currentItems.length}</AppText>
          </View>
        </View>

        {loadError ? (
          <View style={s.notice}>
            <AppText variant="cardTitle" style={s.noticeTitle}>Some data is unavailable</AppText>
            <AppText variant="body" style={s.noticeText}>{loadError}</AppText>
          </View>
        ) : null}

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadAll(false);
              }}
            />
          }
        >
          <View style={s.listHeader}>
            <View style={s.listHeadingGroup}>
              <AppText variant="cardTitle" style={s.listTitle}>Existing items</AppText>
              <AppText variant="helper" style={s.listCount}>{filteredItems.length} shown</AppText>
            </View>
            <Pressable style={s.addButton} onPress={openAdd}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <AppText variant="button" style={s.addButtonText}>Add</AppText>
            </Pressable>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items..."
            placeholderTextColor="#929A94"
            style={s.searchInput}
            returnKeyType="search"
          />

          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color="#1F7655" />
              <AppText variant="helper" style={s.loadingText}>Loading metadata...</AppText>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={s.emptyBox}>
              <AppText variant="sectionTitle" style={s.emptyTitle}>No items found</AppText>
              <AppText variant="body" style={s.emptyText}>
                {search
                  ? "Try another search term."
                  : "Add the first item using the form above."}
              </AppText>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => `${activeTab}-${item.id}`}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const extra =
                  "description" in item
                    ? item.description
                    : "biography" in item
                      ? item.biography
                      : null;
                return (
                  <View style={s.itemCard}>
                    <View style={s.itemIcon}>
                      <AppText variant="body" style={s.itemIconText}>
                        {item.name.trim().charAt(0).toUpperCase() || "•"}
                      </AppText>
                    </View>
                    <View style={s.itemDetails}>
                      <AppText variant="cardTitle" style={s.itemName}>{item.name}</AppText>
                      {extra ? (
                        <AppText variant="body" style={s.itemDescription} numberOfLines={2}>
                          {extra}
                        </AppText>
                      ) : null}
                      <AppText variant="helper" style={s.itemMeta}>
                        {item.recipeCount ?? 0}{" "}
                        {(item.recipeCount ?? 0) === 1 ? "recipe" : "recipes"}
                      </AppText>
                    </View>
                    <View style={s.itemActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${item.name}`}
                        onPress={() => startEdit(item)}
                        style={s.actionButton}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#53605A"
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${item.name}`}
                        onPress={() => deleteItem(item)}
                        style={s.actionButton}
                        hitSlop={6}
                        disabled={deleting}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#B33B31"
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </ScrollView>

        <Modal
          visible={formModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!saving) resetForm();
          }}
        >
          <View style={s.formOverlay}>
            <KeyboardAvoidingView
              style={s.formKeyboardAvoiding}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={s.formModal}>
                <View style={s.formModalHeader}>
                  <AppText variant="sectionTitle" style={s.formTitle}>
                    {editingId === null
                      ? `Add ${activeTab === "styles" ? "Cooking style" : activeTab === "cuisines" ? "Cuisine" : activeTab === "tags" ? "Recipe tag" : "Chef"}`
                      : `Edit ${activeTab === "styles" ? "Cooking style" : activeTab === "cuisines" ? "Cuisine" : activeTab === "tags" ? "Recipe tag" : "Chef"}`}
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close form"
                    onPress={resetForm}
                    disabled={saving}
                    hitSlop={8}
                    style={s.closeFormButton}
                  >
                    <Ionicons name="close" size={26} color="#17231E" />
                  </Pressable>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={s.formModalScroll}
                >
                  <AppText variant="label" style={s.fieldLabel}>Name *</AppText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={
                      activeTab === "chefs"
                        ? "Chef name"
                        : activeTab === "styles"
                          ? "Cooking style name"
                          : activeTab === "cuisines"
                            ? "Cuisine name"
                            : "Tag name"
                    }
                    placeholderTextColor="#929A94"
                    style={s.input}
                    autoCapitalize="words"
                    maxLength={activeTab === "tags" ? 100 : 150}
                  />

                  {activeTab === "styles" ? (
                    <>
                      <AppText variant="label" style={s.fieldLabel}>Description</AppText>
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Short description (optional)"
                        placeholderTextColor="#929A94"
                        style={[s.input, s.multiline]}
                        multiline
                      />
                    </>
                  ) : null}

                  {activeTab === "chefs" ? (
                    <>
                      <AppText variant="label" style={s.fieldLabel}>Biography</AppText>
                      <TextInput
                        value={biography}
                        onChangeText={setBiography}
                        placeholder="Short biography (optional)"
                        placeholderTextColor="#929A94"
                        style={[s.input, s.multiline]}
                        multiline
                      />
                      <AppText variant="label" style={s.fieldLabel}>Photo URL</AppText>
                      <TextInput
                        value={photoUrl}
                        onChangeText={setPhotoUrl}
                        placeholder="https://..."
                        placeholderTextColor="#929A94"
                        style={s.input}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                      <AppText variant="label" style={s.fieldLabel}>Source URL</AppText>
                      <TextInput
                        value={sourceUrl}
                        onChangeText={setSourceUrl}
                        placeholder="https://..."
                        placeholderTextColor="#929A94"
                        style={s.input}
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </>
                  ) : null}

                  {activeTab === "cuisines" ? (
                    <AppText variant="helper" style={s.helperText}>
                      Cuisines must be supported by the backend Cuisine entity
                      and database migration.
                    </AppText>
                  ) : null}

                  <View style={s.formActions}>
                    <Pressable
                      style={s.cancelButton}
                      onPress={resetForm}
                      disabled={saving}
                    >
                      <AppText variant="button" style={s.cancelButtonText}>Cancel</AppText>
                    </Pressable>
                    <Pressable
                      style={[s.saveButton, saving && s.disabledButton]}
                      onPress={saveItem}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <AppText variant="button" style={s.saveButtonText}>
                          {editingId === null ? "Add item" : "Save changes"}
                        </AppText>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!deleting) {
              setDeleteModalVisible(false);
              setDeleteTarget(null);
            }
          }}
        >
          <View style={s.deleteOverlay}>
            <View style={s.deleteModal}>
              <View style={s.deleteIconContainer}>
                <Ionicons name="trash-outline" size={28} color="#B33B31" />
              </View>
              <AppText variant="sectionTitle" style={s.deleteTitle}>Delete item?</AppText>
              <AppText variant="body" style={s.deleteMessage}>
                Are you sure you want to delete "
                {deleteTarget?.name ?? "this item"}"?
              </AppText>
              <View style={s.deleteActions}>
                <Pressable
                  style={s.deleteCancelButton}
                  onPress={() => {
                    if (!deleting) {
                      setDeleteModalVisible(false);
                      setDeleteTarget(null);
                    }
                  }}
                  disabled={deleting}
                >
                  <AppText variant="button" style={s.deleteCancelText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  style={s.deleteConfirmButton}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <AppText variant="button" style={s.deleteConfirmText}>Delete</AppText>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7F3" },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F4F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    color: "#1F7655",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  title: { color: "#17231D", fontSize: 26, fontWeight: "800" },
  headerDescription: {
    color: "#66736B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginLeft: 52,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#E8ECE7",
    borderWidth: 1,
    borderColor: "#E0E5DF",
    justifyContent: "center",
  },
  activeTab: { backgroundColor: "#1F7655", borderColor: "#1F7655" },
  tabText: { color: "#536159", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#FFFFFF" },
  contentHeader: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: { color: "#1A2820", fontSize: 19, fontWeight: "800" },
  subtitle: { color: "#718077", fontSize: 12, lineHeight: 17, marginTop: 4 },
  countPill: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDEDE4",
  },
  countText: { color: "#1F7655", fontSize: 13, fontWeight: "800" },
  notice: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#FFF5E4",
    borderColor: "#F0D9A8",
    borderWidth: 1,
    borderRadius: 12,
  },
  noticeTitle: {
    color: "#79531A",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 4,
  },
  noticeText: { color: "#79531A", fontSize: 12, lineHeight: 18 },
  body: { paddingHorizontal: 16, paddingBottom: 36 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EBE5",
    marginBottom: 22,
  },
  formTitle: {
    color: "#1A2820",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 15,
  },
  fieldLabel: {
    color: "#4D5B52",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDE3DC",
    backgroundColor: "#FBFCFA",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1D2A22",
  },
  multiline: { minHeight: 78, textAlignVertical: "top" },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  saveButton: {
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D7DED7",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { color: "#536159", fontWeight: "700", fontSize: 13 },
  disabledButton: { opacity: 0.65 },
  helperText: { color: "#7A6A4B", fontSize: 11, lineHeight: 16, marginTop: 12 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  listHeadingGroup: {
    flex: 1,
    gap: 3,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#1F7655",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  listTitle: { color: "#1A2820", fontSize: 17, fontWeight: "800" },
  listCount: { color: "#7B877E", fontSize: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E0E5DE",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#1D2A22",
    fontSize: 14,
    marginBottom: 10,
  },
  loadingBox: { padding: 28, alignItems: "center", gap: 10 },
  loadingText: { color: "#77837B", fontSize: 12 },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7EBE5",
  },
  emptyTitle: { color: "#26342B", fontSize: 14, fontWeight: "800" },
  emptyText: {
    color: "#7B877E",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7EBE5",
    padding: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#E5F1E9",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconText: { color: "#1F7655", fontSize: 16, fontWeight: "800" },
  itemDetails: { flex: 1 },
  itemName: { color: "#1D2A22", fontSize: 14, fontWeight: "800" },
  itemDescription: {
    color: "#738077",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  itemMeta: { color: "#89948C", fontSize: 10, marginTop: 5 },
  itemActions: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  formKeyboardAvoiding: {
    width: "100%",
    justifyContent: "flex-end",
  },
  formModal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#F7F8F3",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
  },
  formModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9E3",
  },
  closeFormButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  formModalScroll: {
    paddingTop: 8,
    paddingBottom: 12,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    textAlign: "center",
  },
  deleteMessage: {
    fontSize: 14,
    lineHeight: 21,
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
    justifyContent: "center",
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17231E",
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#B33B31",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#829087",
    marginTop: 2,
  },
});
