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

  Pressable,

  StyleSheet,

  Alert,

  Modal,

  TextInput,

  Image,

  Platform,

} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { categoryApi } from "../../api/categoryApi";

import type { CategoryResponse } from "../../types/category";

import SearchBar from "../../components/common/SearchBar";

import ScreenLoader from "../../components/common/ScreenLoader";

import { useRouter } from "expo-router";

import * as ImagePicker from "expo-image-picker";

/* =====================================================

   CATEGORY IMAGES

===================================================== */

const CATEGORY_IMAGES: Record<string, string> = {

  tiffin:

    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_6.jpg",

  meals:

    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379593/images_5.jpg",

  snacks:

    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379592/images_7.jpg",

  beverages:

    "https://res.cloudinary.com/ktlem6cf/image/upload/v1791379591/images_4.jpg",

};

export default function AdminCategoriesScreen() {

  const [categories, setCategories] =

    useState<CategoryResponse[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] =

    useState(false);

  const [editingId, setEditingId] =

    useState<number | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] =

    useState("");

  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [editConfirmModalVisible, setEditConfirmModalVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deletingCategoryName, setDeletingCategoryName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const router = useRouter();

  /* =====================================================

     LOAD CATEGORIES

  ===================================================== */

  const load = useCallback(async () => {

    try {

      setCategories(

        await categoryApi.getAll()

      );

    } catch (e) {

      Alert.alert(

        "Error",

        "Unable to load categories."

      );

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    load();

  }, [load]);

  /* =====================================================

     SEARCH FILTER

  ===================================================== */

  const filtered = useMemo(

    () =>

      categories.filter((c) =>

        c.name

          .toLowerCase()

          .includes(search.toLowerCase())

      ),

    [categories, search]

  );

  /* =====================================================

     OPEN ADD / EDIT MODAL

  ===================================================== */

  const openModal = (id?: number) => {

    if (id) {

      const cat = categories.find(

        (c) => c.id === id

      );

      setEditingId(id);

      setName(cat?.name || "");

      setDescription(

        cat?.description || ""

      );

      setCurrentImageUrl(cat?.imageUrl || null);

      setSelectedImage(null);

    } else {

      setEditingId(null);

      setName("");

      setDescription("");

      setCurrentImageUrl(null);

      setSelectedImage(null);

    }

    setModalVisible(true);

  };

  /* =====================================================

     SAVE CATEGORY

  ===================================================== */

  const pickImage = async () => {

    try {

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {

        Alert.alert("Permission required", "Allow photo library access to choose a category image.");

        return;

      }

      const result = await ImagePicker.launchImageLibraryAsync({

        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.85,

      });

      if (!result.canceled && result.assets.length > 0) setSelectedImage(result.assets[0]);

    } catch (error) {

      console.error("Image picker error:", error);

      Alert.alert("Image picker error", "Unable to open the photo library.");

    }

  };

  const uploadCategoryImage = async (categoryId: number, asset: ImagePicker.ImagePickerAsset) => {

    const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5204/api").replace(/\/$/, "");

    const formData = new FormData();

    const fileName = asset.fileName || `category-${categoryId}-${Date.now()}.jpg`;

    const mimeType = asset.mimeType || "image/jpeg";

    if (Platform.OS === "web") {

      const imageResponse = await fetch(asset.uri);

      if (!imageResponse.ok) throw new Error("Unable to read the selected image.");

      formData.append("file", await imageResponse.blob(), fileName);

    } else {

      formData.append("file", { uri: asset.uri, name: fileName, type: mimeType } as any);

    }

    const token = (globalThis as any).recipeProAuth?.token;

    const response = await fetch(`${apiBaseUrl}/categories/${categoryId}/image`, {

      method: "POST",

      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },

      body: formData,

    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) throw new Error(responseData?.message || responseData?.title || `Image upload failed (${response.status}).`);

    return responseData as CategoryResponse;

  };

  const handleSave = () => {
    if (editingId !== null) {
      setEditConfirmModalVisible(true);
      return;
    }
    void performSave();
  };

  const performSave = async () => {

    if (!name.trim()) {

      Alert.alert(

        "Validation",

        "Category name is required"

      );

      return;

    }

    setSaving(true);

    try {

      let savedCategory: CategoryResponse;

      if (editingId) {

        savedCategory = await categoryApi.update(editingId, {

          name: name.trim(),

          description: description.trim() || null,

        });

      } else {

        savedCategory = await categoryApi.create({

          name: name.trim(),

          description: description.trim() || null,

        });

      }

      const wasEditing = editingId !== null;
      if (selectedImage) await uploadCategoryImage(savedCategory.id, selectedImage);
      setModalVisible(false);
      setSelectedImage(null);
      await load();
      setSuccessTitle(wasEditing ? "Category Updated!" : "Category Created!");
      setSuccessMessage(
        wasEditing
          ? `"${savedCategory.name}" has been updated successfully.`
          : `"${savedCategory.name}" has been created successfully.`
      );
      setSuccessModalVisible(true);

    } catch (e) {

      console.error("Unable to save category:", e);

      Alert.alert(

        "Error",

        e instanceof Error ? e.message : "Unable to save category."

      );

    } finally {

      setSaving(false);

    }

  };

const handleDelete = (id: number, categoryName: string) => {
  setDeletingCategoryId(id);
  setDeletingCategoryName(categoryName);
  setDeleteConfirmModalVisible(true);
};

const confirmDeleteCategory = async () => {
  if (deletingCategoryId === null) return;

  setDeleting(true);
  try {
    await categoryApi.delete(deletingCategoryId);
    setDeleteConfirmModalVisible(false);
    setSuccessTitle("Category Deleted!");
    setSuccessMessage(`"${deletingCategoryName}" has been deleted successfully.`);
    setDeletingCategoryId(null);
    setDeletingCategoryName("");
    await load();
    setSuccessModalVisible(true);
  } catch (error) {
    console.error("Unable to delete category:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    setDeleteConfirmModalVisible(false);
    if (Platform.OS === "web") {
      globalThis.alert(`Delete failed: ${message}`);
    } else {
      Alert.alert("Delete Failed", message);
    }
  } finally {
    setDeleting(false);
  }
};

  /* =====================================================

     LOADING

  ===================================================== */

  if (loading) {

    return <ScreenLoader />;

  }

  /* =====================================================

     SCREEN

  ===================================================== */

  return (

    <SafeAreaView

      style={styles.container}

      edges={["top"]}

    >

      <FlatList

        data={filtered}

        keyExtractor={(item) =>

          String(item.id)

        }

        showsVerticalScrollIndicator={false}

        contentContainerStyle={

          styles.listContent

        }

        /* =================================================

           HEADER

        ================================================== */

        ListHeaderComponent={

          <View style={styles.header}>

            {/* HEADER TOP */}

            <View style={styles.headerTop}>

              <Text style={styles.title}>

                Categories

              </Text>

              <Pressable

                style={styles.addButton}

                onPress={() =>

                  openModal()

                }

              >

                <Ionicons

                  name="add"

                  size={20}

                  color="#fff"

                />

                <Text

                  style={styles.addButtonText}

                >

                  Add

                </Text>

              </Pressable>

            </View>

            {/* SEARCH */}

            <View

              style={styles.searchContainer}

            >

              <SearchBar

                value={search}

                onChangeText={setSearch}

                placeholder="Search categories..."

              />

            </View>

          </View>

        }

        /* =================================================

           CATEGORY CARD

        ================================================== */

        renderItem={({ item }) => {

          const categoryKey = item.name

            .trim()

            .toLowerCase();

          const categoryImageUrl = item.imageUrl?.trim() || null;

          return (

            <Pressable   style={styles.categoryCard}

            onPress={() =>

              router.push({

                pathname: "/admin/category-recipes",

                params: {

                  categoryId: String(item.id),

                  categoryName: item.name,

                },

              })

              }>

              {/* CATEGORY IMAGE */}

              <View

                style={styles.categoryIcon}

              >

                {categoryImageUrl ? (

                  <Image

                    source={{

                      uri: categoryImageUrl,

                    }}

                    style={styles.categoryImage}

                    resizeMode="cover"

                  />

                ) : (

                  <Text

                    style={styles.categoryEmoji}

                  >

                    {item.name === "Tiffin"

                      ? "🍳"

                      : item.name === "Meals"

                      ? "🍽"

                      : item.name === "Dinner"

                      ? "🌙"

                      : item.name === "Snacks"

                      ? "🍿"

                      : item.name === "Desserts"

                      ? "🍰"

                      : "🍚"}

                  </Text>

                )}

              </View>

              {/* CATEGORY INFORMATION */}

              <View

                style={styles.categoryInfo}

              >

                <Text

                  style={styles.categoryName}

                >

                  {item.name}

                </Text>

                <Text

                  style={

                    styles.categoryDescription

                  }

                  numberOfLines={1}

                >

                  {item.description}

                </Text>

              </View>

              {/* ACTIONS */}

              <View

                style={styles.categoryActions}

              >

                {/* EDIT */}

                <Pressable

                  style={styles.actionButton}

                  onPress={() =>

                    openModal(item.id)

                  }

                >

                  <Ionicons

                    name="create-outline"

                    size={20}

                    color="#53605A"

                  />

                </Pressable>

                {/* DELETE */}

                <Pressable

                  style={styles.actionButton}

                  onPress={() =>

                    handleDelete(

                      item.id,

                      item.name

                    )

                  }

                >

                  <Ionicons

                    name="trash-outline"

                    size={20}

                    color="#B33B31"

                  />

                </Pressable>

              </View>

            </Pressable>

          );

        }}

        /* =================================================

           EMPTY STATE

        ================================================== */

        ListEmptyComponent={

          <View style={styles.emptyState}>

            <Ionicons

              name="grid-outline"

              size={48}

              color="#C5C9C4"

            />

            <Text

              style={styles.emptyTitle}

            >

              No categories found

            </Text>

          </View>

        }

      />

      {/* ===================================================

          ADD / EDIT MODAL

      ==================================================== */}

      <Modal

        visible={modalVisible}

        transparent

        animationType="slide"

        onRequestClose={() =>

          setModalVisible(false)

        }

      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalContent}>

            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>

              <Text

                style={styles.modalTitle}

              >

                {editingId

                  ? "Edit Category"

                  : "New Category"}

              </Text>

              <Pressable

                onPress={() =>

                  setModalVisible(false)

                }

              >

                <Ionicons

                  name="close"

                  size={28}

                  color="#17231E"

                />

              </Pressable>

            </View>

            {/* NAME */}

            <Text

              style={styles.inputLabel}

            >

              Name

            </Text>

            <TextInput

              style={styles.input}

              value={name}

              onChangeText={setName}

              placeholder="Category name"

              placeholderTextColor="#8A938E"

            />

            {/* CATEGORY IMAGE */}

            <Text style={styles.inputLabel}>Category Image</Text>

            <View style={styles.imagePickerRow}>

              <View style={styles.imagePreview}>

                {selectedImage?.uri || currentImageUrl ? (

                  <Image source={{ uri: selectedImage?.uri || currentImageUrl || undefined }} style={styles.imagePreviewImage} resizeMode="cover" />

                ) : (

                  <Ionicons name="image-outline" size={30} color="#7B8981" />

                )}

              </View>

              <View style={styles.imagePickerActions}>

                <Pressable style={styles.chooseImageButton} onPress={pickImage} disabled={saving}>

                  <Ionicons name="cloud-upload-outline" size={18} color="#1F7655" />

                  <Text style={styles.chooseImageText}>{selectedImage ? "Choose another image" : currentImageUrl ? "Change image" : "Choose image"}</Text>

                </Pressable>

                <Text style={styles.imageHint}>JPG, PNG or WebP · Maximum 5 MB</Text>

                {selectedImage ? <Pressable onPress={() => setSelectedImage(null)} disabled={saving}><Text style={styles.removeImageText}>Remove selected image</Text></Pressable> : null}

              </View>

            </View>

            {/* DESCRIPTION */}

            <Text

              style={styles.inputLabel}

            >

              Description

            </Text>

            <TextInput

              style={[

                styles.input,

                styles.textArea,

              ]}

              value={description}

              onChangeText={setDescription}

              placeholder="Description"

              placeholderTextColor="#8A938E"

              multiline

              numberOfLines={3}

            />

            {/* SAVE */}

            <Pressable

              style={styles.saveButton}

              onPress={handleSave}

              disabled={saving}

            >

              <Text

                style={styles.saveButtonText}

              >

                {saving

                  ? "Saving..."

                  : editingId

                  ? "Save Changes"

                  : "Create Category"}

              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>

      {/* EDIT CONFIRMATION MODAL */}
      <Modal
        visible={editConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditConfirmModalVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="create-outline" size={34} color="#1F7655" />
            </View>
            <Text style={styles.successTitle}>Confirm Changes</Text>
            <Text style={styles.successMessage}>
              Are you sure you want to update "{name.trim()}"?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelConfirmButton}
                onPress={() => setEditConfirmModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.successButton}
                onPress={() => {
                  setEditConfirmModalVisible(false);
                  void performSave();
                }}
                disabled={saving}
              >
                <Text style={styles.successButtonText}>Confirm Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteConfirmModalVisible(false);
        }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.deleteConfirmModal}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={30} color="#B83A30" />
            </View>
            <Text style={styles.successTitle}>Delete Category?</Text>
            <Text style={styles.successMessage}>
              Are you sure you want to delete "{deletingCategoryName}"?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.deleteCancelButton}
                onPress={() => setDeleteConfirmModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.deleteConfirmButton}
                onPress={() => void confirmDeleteCategory()}
                disabled={deleting}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUCCESS POPUP MODAL */}
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
            <Text style={styles.successTitle}>{successTitle}</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Pressable
              style={styles.successButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </SafeAreaView>

  );

}

/* =====================================================

   STYLES

===================================================== */

const styles = StyleSheet.create({

  /* ===================================================

     MAIN

  ==================================================== */

  container: {

    flex: 1,

    backgroundColor: "#F7F8F3",

  },

  listContent: {

    paddingHorizontal: 20,

    paddingBottom: 100,

  },

  /* ===================================================

     HEADER

  ==================================================== */

  header: {

    paddingTop: 8,

    paddingBottom: 16,

  },

  headerTop: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 16,

  },

  title: {

    fontSize: 28,

    fontWeight: "800",

    color: "#17231E",

  },

  /* ===================================================

     ADD BUTTON

  ==================================================== */

  addButton: {

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#1F7655",

    paddingHorizontal: 16,

    paddingVertical: 10,

    borderRadius: 12,

    gap: 4,

  },

  addButtonText: {

    color: "#fff",

    fontSize: 14,

    fontWeight: "700",

  },

  /* ===================================================

     SEARCH

  ==================================================== */

  searchContainer: {

    marginBottom: 8,

  },

  /* ===================================================

     CATEGORY CARD

  ==================================================== */

  categoryCard: {

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 12,

    marginBottom: 12,

  },

  /* ===================================================

     CATEGORY IMAGE

  ==================================================== */

  categoryIcon: {

    width: 56,

    height: 56,

    borderRadius: 16,

    backgroundColor: "#E7F1EA",

    alignItems: "center",

    justifyContent: "center",

    overflow: "hidden",

  },

  categoryImage: {

    width: "100%",

    height: "100%",

  },

  categoryEmoji: {

    fontSize: 24,

  },

  /* ===================================================

     CATEGORY INFORMATION

  ==================================================== */

  categoryInfo: {

    flex: 1,

    marginLeft: 12,

  },

  categoryName: {

    fontSize: 16,

    fontWeight: "700",

    color: "#17231E",

  },

  categoryDescription: {

    fontSize: 13,

    color: "#68736D",

    marginTop: 2,

  },

  /* ===================================================

     ACTIONS

  ==================================================== */

  categoryActions: {

    marginLeft: 8,

  },

  actionButton: {

    padding: 8,

  },

  /* ===================================================

     EMPTY STATE

  ==================================================== */

  emptyState: {

    alignItems: "center",

    paddingVertical: 60,

  },

  emptyTitle: {

    fontSize: 18,

    fontWeight: "700",

    color: "#17231E",

    marginTop: 16,

  },

  /* ===================================================

     MODAL

  ==================================================== */

  modalOverlay: {

    flex: 1,

    backgroundColor: "rgba(0,0,0,0.3)",

    justifyContent: "flex-end",

  },

  modalContent: {

    backgroundColor: "#F7F8F3",

    borderTopLeftRadius: 30,

    borderTopRightRadius: 30,

    padding: 24,

    paddingBottom: 40,

  },

  modalHeader: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 20,

  },

  modalTitle: {

    fontSize: 22,

    fontWeight: "800",

    color: "#17231E",

  },

  /* ===================================================

     INPUTS

  ==================================================== */

  inputLabel: {

    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",

    marginBottom: 8,

  },

  input: {

    backgroundColor: "#fff",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    paddingHorizontal: 16,

    paddingVertical: 14,

    fontSize: 16,

    color: "#17231E",

    marginBottom: 16,

  },

  textArea: {

    height: 80,

    textAlignVertical: "top",

  },

  /* ===================================================

     SAVE BUTTON

  ==================================================== */

  imagePickerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },

  imagePreview: { width: 82, height: 82, borderRadius: 14, backgroundColor: "#E7F1EA", borderWidth: 1, borderColor: "#D8E2DA", alignItems: "center", justifyContent: "center", overflow: "hidden" },

  imagePreviewImage: { width: "100%", height: "100%" },

  imagePickerActions: { flex: 1, alignItems: "flex-start", gap: 7 },

  chooseImageButton: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "#B7D4C3", backgroundColor: "#EDF6F0", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },

  chooseImageText: { color: "#1F7655", fontSize: 13, fontWeight: "700" },

  imageHint: { fontSize: 11, color: "#68736D" },

  removeImageText: { fontSize: 12, color: "#B33B31", fontWeight: "600" },

  saveButton: {

    backgroundColor: "#1F7655",

    borderRadius: 16,

    paddingVertical: 16,

    alignItems: "center",

  },

  saveButtonText: {

    color: "#fff",

    fontSize: 16,

    fontWeight: "700",

  },

  /* ===================================================
     SUCCESS POPUP
  ==================================================== */
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  cancelConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DED8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#53605A",
  },
  deleteConfirmModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  deleteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17231E",
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#B83A30",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 21,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

});
