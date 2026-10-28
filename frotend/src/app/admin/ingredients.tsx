import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../api/client";

import * as ImagePicker from "expo-image-picker";

import { Platform } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import LottieView from "lottie-react-native";

import { ingredientApi } from "../../api/ingredientApi";

import type { IngredientResponse } from "../../types/ingredient";

import SearchBar from "../../components/common/SearchBar";

import ScreenLoader from "../../components/common/ScreenLoader";

import AppText from "../../components/common/AppText";

import { IngredientStatus, IngredientType } from "../../types/ingredient";

export default function AdminIngredientsScreen() {

  const [ingredients, setIngredients] = useState<IngredientResponse[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");

  const [photoUrl, setPhotoUrl] = useState("");

  const [selectedImage, setSelectedImage] =

    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [purchasePrice, setPurchasePrice] = useState("");

  const [purchaseQuantity, setPurchaseQuantity] = useState("");

  const [purchaseUnit, setPurchaseUnit] = useState("");

  const [purchaseUnitDropdownOpen, setPurchaseUnitDropdownOpen] =

    useState(false);

  const [wastageUnitDropdownOpen, setWastageUnitDropdownOpen] = useState(false);

  const purchaseUnitOptions = ["kg", "g", "litre", "ml", "piece"];

  const wastageUnitOptions = ["kg", "g", "litre", "ml", "piece"];

  const handlePurchaseUnitChange = (unit: string) => {

    setPurchaseUnit(unit);

    setWastageUnit(

      unit === "kg" ? "g" : unit === "litre" || unit === "ml" ? "ml" : "g",

    );

    setPurchaseUnitDropdownOpen(false);

  };

  const [status, setStatus] = useState<1 | 2>(1);

  const [saving, setSaving] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [deleteName, setDeleteName] = useState("");

  const [deleting, setDeleting] = useState(false);

  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const [successTitle, setSuccessTitle] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [ingredientType, setIngredientType] = useState<IngredientType>(

    IngredientType.Veg,

  );

  const [gramsPerMilliliter, setGramsPerMilliliter] = useState("");

  const [gramsPerPiece, setGramsPerPiece] = useState("");

  const [wastageQuantity, setWastageQuantity] = useState("");

  const [wastageUnit, setWastageUnit] = useState("");

  const [isCautionRequired, setIsCautionRequired] = useState(false);

  const [cautionMessage, setCautionMessage] = useState("");

  const [storageInstructions, setStorageInstructions] = useState("");

  const [shelfLifeDays, setShelfLifeDays] = useState("");

  const [brand, setBrand] = useState("");

  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {

    try {

      setIngredients(await ingredientApi.getAll());

    } catch (e) {

      console.error("LOAD INGREDIENTS ERROR:", e);

      Alert.alert("Error", "Unable to load ingredients.");

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    load();

  }, [load]);

  const filtered = useMemo(

    () =>

      ingredients.filter((i) =>

        i.name.toLowerCase().includes(search.toLowerCase()),

      ),

    [ingredients, search],

  );

  const openModal = (id?: number) => {

    if (id) {

      const ing = ingredients.find((i) => i.id === id);

      setEditingId(id);

      setName(ing?.name || "");

      setPhotoUrl(ing?.photoUrl || "");

      setSelectedImage(null);

      const purchaseDetails = ing as

        | (IngredientResponse & {

          purchasePrice?: number | null;

          purchaseQuantity?: number | null;

          purchaseUnit?: string | null;

        })

        | undefined;

      setPurchasePrice(

        purchaseDetails?.purchasePrice != null

          ? String(purchaseDetails.purchasePrice)

          : "",

      );

      setPurchaseQuantity(

        purchaseDetails?.purchaseQuantity != null

          ? String(purchaseDetails.purchaseQuantity)

          : "",

      );

      setPurchaseUnit(purchaseDetails?.purchaseUnit || "");

      setStatus(ing?.status === 2 ? 2 : 1);

      setIngredientType(

        ing?.ingredientType === IngredientType.NonVeg

          ? IngredientType.NonVeg

          : IngredientType.Veg,

      );

      setGramsPerMilliliter(

        ing?.gramsPerMilliliter != null ? String(ing.gramsPerMilliliter) : "",

      );

      setGramsPerPiece(

        ing?.gramsPerPiece != null ? String(ing.gramsPerPiece) : "",

      );

      setWastageQuantity(

        ing?.wastageQuantity != null ? String(ing.wastageQuantity) : "",

      );

      setWastageUnit(ing?.wastageUnit || "");

      setIsCautionRequired(ing?.isCautionRequired ?? false);

      setCautionMessage(ing?.cautionMessage || "");

      setStorageInstructions(ing?.storageInstructions || "");

      setShelfLifeDays(

        ing?.shelfLifeDays != null ? String(ing.shelfLifeDays) : "",

      );

      setBrand(ing?.brand || "");

      setNotes(ing?.notes || "");

    } else {

      setEditingId(null);

      setName("");

      setPhotoUrl("");

      setPurchasePrice("");

      setPurchaseQuantity("");

      setPurchaseUnit("");

      setStatus(1);

      setIngredientType(IngredientType.Veg);

      setGramsPerMilliliter("");

      setGramsPerPiece("");

      setWastageQuantity("");

      setWastageUnit("");

      setIsCautionRequired(false);

      setCautionMessage("");

      setStorageInstructions("");

      setShelfLifeDays("");

      setBrand("");

      setNotes("");

    }

    setModalVisible(true);

  };

  const chooseImage = async () => {

    try {

      const permission =

        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {

        Alert.alert(

          "Permission required",

          "Please allow photo library access to select an ingredient image.",

        );

        return;

      }

      const result = await ImagePicker.launchImageLibraryAsync({

        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.85,

      });

      if (!result.canceled && result.assets.length > 0) {

        setSelectedImage(result.assets[0]);

      }

    } catch (error) {

      console.error("CHOOSE INGREDIENT IMAGE ERROR:", error);

      Alert.alert("Image selection failed", "Unable to select this image.");

    }

  };

  const uploadIngredientImage = async (

    ingredientId: number,

    asset: ImagePicker.ImagePickerAsset,

  ): Promise<IngredientResponse> => {

    const apiBaseUrl = (

      process.env.EXPO_PUBLIC_API_BASE_URL || "https://recipepro-api.onrender.com/api"

    ).replace(/[\\/]+$/, "");

    const formData = new FormData();

    const fileName =

      asset.fileName || `ingredient-${ingredientId}-${Date.now()}.jpg`;

    const mimeType = asset.mimeType || "image/jpeg";

    if (Platform.OS === "web") {

      const imageResponse = await fetch(asset.uri);

      if (!imageResponse.ok) {

        throw new Error("Unable to read the selected image.");

      }

      formData.append("file", await imageResponse.blob(), fileName);

    } else {

      formData.append("file", {

        uri: asset.uri,

        name: fileName,

        type: mimeType,

      } as any);

    }

    const token = (globalThis as any).recipeProAuth?.token;

    const response = await fetch(

      `${apiBaseUrl}/ingredients/${ingredientId}/image`,

      {

        method: "POST",

        headers: {

          Accept: "application/json",

          ...(token ? { Authorization: `Bearer ${token}` } : {}),

        },

        body: formData,

      },

    );

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {

      throw new Error(

        responseData?.message ||

        responseData?.title ||

        `Image upload failed (${response.status}).`,

      );

    }

    return responseData as IngredientResponse;

  };

  const handleSave = async () => {

    if (!name.trim()) {

      Alert.alert("Validation", "Name is required");

      return;

    }

    setSaving(true);

    try {

      let savedIngredient: IngredientResponse;

      const payload = {

        name: name.trim(),

        photoUrl: photoUrl.trim() || null,

        purchasePrice:

          purchasePrice.trim() === "" ? null : Number(purchasePrice),

        purchaseQuantity:

          purchaseQuantity.trim() === "" ? null : Number(purchaseQuantity),

        purchaseUnit: purchaseUnit.trim() || null,

        // Send the selected numeric enum value, not the enum object.

        ingredientType: Number(ingredientType),

        gramsPerMilliliter:

          gramsPerMilliliter.trim() === "" ? null : Number(gramsPerMilliliter),

        gramsPerPiece:

          gramsPerPiece.trim() === "" ? null : Number(gramsPerPiece),

        wastageQuantity:

          wastageQuantity.trim() === "" ? null : Number(wastageQuantity),

        wastageUnit: wastageUnit.trim() || null,

        isCautionRequired,

        cautionMessage: cautionMessage.trim() || null,

        storageInstructions: storageInstructions.trim() || null,

        shelfLifeDays:

          shelfLifeDays.trim() === "" ? null : Number(shelfLifeDays),

        brand: brand.trim() || null,

        notes: notes.trim() || null,

        status: Number(status) as IngredientStatus,

      };

      if (editingId) {

        savedIngredient = await ingredientApi.update(editingId, payload);

      } else {

        savedIngredient = await ingredientApi.create(payload);

      }

      if (selectedImage) {

        await uploadIngredientImage(savedIngredient.id, selectedImage);

      }

      const wasEditing = editingId !== null;

      setModalVisible(false);

      await load();

      setSuccessTitle(

        wasEditing ? "Ingredient Updated!" : "Ingredient Created!",

      );

      setSuccessMessage(

        wasEditing

          ? `"${savedIngredient.name}" has been updated successfully.`

          : `"${savedIngredient.name}" has been created successfully.`,

      );

      setSuccessModalVisible(true);

    } catch (e) {

      console.error("SAVE INGREDIENT ERROR:", e);

      if (e instanceof ApiError) {

        Alert.alert(`Save Failed (${e.status})`, e.message);

      } else if (e instanceof Error) {

        Alert.alert("Save Failed", e.message);

      } else {

        Alert.alert("Error", "Unable to save ingredient.");

      }

    } finally {

      setSaving(false);

    }

  };

  const handleDelete = (id: number, ingredientName: string) => {

    setDeleteId(id);

    setDeleteName(ingredientName);

    setDeleteModalVisible(true);

  };

  const confirmDelete = async () => {

    if (deleteId === null) {

      return;

    }

    try {

      setDeleting(true);

      const deletedIngredientName = deleteName;

      await ingredientApi.delete(deleteId);

      setDeleteModalVisible(false);

      setDeleteId(null);

      setDeleteName("");

      await load();

      setSuccessTitle("Ingredient Deleted!");

      setSuccessMessage(

        `"${deletedIngredientName}" has been deleted successfully.`,

      );

      setSuccessModalVisible(true);

    } catch (error) {

      console.error("DELETE ERROR:", error);

      if (error instanceof ApiError) {

        console.error("DELETE STATUS:", error.status);

        console.error("DELETE RESPONSE:", error.data);

        Alert.alert(`Delete Failed (${error.status})`, error.message);

      } else if (error instanceof Error) {

        Alert.alert("Delete Failed", error.message);

      } else {

        Alert.alert("Delete Failed", "Unable to delete ingredient.");

      }

    } finally {

      setDeleting(false);

    }

  };

  if (loading) {

    return <ScreenLoader />;

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

            <AppText variant="pageTitle" style={styles.title}>Manage Ingredients</AppText>

            <AppText variant="label" style={styles.brandCaption}>ADMIN WORKSPACE</AppText>

          </View>

          <Pressable style={styles.addButton} onPress={() => openModal()}>

            <Ionicons name="add" size={20} color="#fff" />

            <AppText variant="button" style={styles.addButtonText}>Add</AppText>

          </Pressable>

        </View>

        <View style={styles.searchContainer}>

          <SearchBar

            value={search}

            onChangeText={setSearch}

            placeholder="Search ingredients..."

          />

        </View>

      </View>

      <FlatList

        data={filtered}

        keyExtractor={(item) => String(item.id)}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.listContent}

        renderItem={({ item }) => (

          <View style={styles.ingredientCard}>

            <View style={styles.ingredientIcon}>

              {item.photoUrl ? (

                <Image

                  source={{

                    uri: item.photoUrl,

                  }}

                  style={styles.ingredientImage}

                  resizeMode="cover"

                  onError={(error) =>

                    console.log(

                      "ADMIN INGREDIENT IMAGE ERROR:",

                      item.name,

                      item.photoUrl,

                      error.nativeEvent,

                    )

                  }

                />

              ) : (

                <AppText variant="body" style={styles.ingredientEmoji}>

                  {item.name === "Basmati Rice"

                    ? "🌾"

                    : item.name === "Chicken"

                      ? "🍗"

                      : item.name === "Onion"

                        ? "🧅"

                        : item.name === "Tomato"

                          ? "🍅"

                          : item.name === "Paneer"

                            ? "🧀"

                            : "🥘"}

                </AppText>

              )}

            </View>

            <View style={styles.ingredientInfo}>

              <AppText variant="cardTitle" style={styles.ingredientName}>{item.name}</AppText>

              <View style={styles.ingredientMetaRow}>

                <View

                  style={[

                    styles.typeBadge,

                    item.ingredientType === IngredientType.NonVeg

                      ? styles.nonVegTypeBadge

                      : styles.vegTypeBadge,

                  ]}

                >

                  <AppText variant="label"

                    style={[

                      styles.typeBadgeText,

                      item.ingredientType === IngredientType.NonVeg

                        ? styles.nonVegTypeBadgeText

                        : styles.vegTypeBadgeText,

                    ]}

                  >

                    {item.ingredientType === IngredientType.NonVeg

                      ? "Non-Veg"

                      : "Veg"}

                  </AppText>

                </View>

                <View

                  style={[

                    styles.statusBadge,

                    item.status === 2

                      ? styles.inactiveBadge

                      : styles.activeBadge,

                  ]}

                >

                  <AppText variant="label"

                    style={[

                      styles.statusBadgeText,

                      item.status === 2

                        ? styles.inactiveBadgeText

                        : styles.activeBadgeText,

                    ]}

                  >

                    {item.status === 2 ? "Inactive" : "Active"}

                  </AppText>

                </View>

              </View>

            </View>

            <View style={styles.ingredientActions}>

              <Pressable

                style={styles.actionButton}

                onPress={() => openModal(item.id)}

              >

                <Ionicons name="create-outline" size={20} color="#53605A" />

              </Pressable>

              <Pressable

                style={styles.actionButton}

                onPress={() => handleDelete(item.id, item.name)}

              >

                <Ionicons name="trash-outline" size={20} color="#B33B31" />

              </Pressable>

            </View>

          </View>

        )}

        ListEmptyComponent={

          <View style={styles.emptyState}>

            <Ionicons name="leaf-outline" size={48} color="#C5C9C4" />

            <AppText variant="sectionTitle" style={styles.emptyTitle}>No ingredients found</AppText>

          </View>

        }

      />

      <Modal

        visible={modalVisible}

        transparent

        animationType="slide"

        onRequestClose={() => setModalVisible(false)}

      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>

              <AppText variant="sectionTitle" style={styles.modalTitle} numberOfLines={1}>

                {editingId ? "Edit Ingredient" : "New Ingredient"}

              </AppText>

              <Pressable

                style={styles.headerSaveButton}

                onPress={handleSave}

                disabled={saving}

              >

                <AppText variant="button" style={styles.headerSaveButtonText}>

                  {saving ? "Saving..." : "Save"}

                </AppText>

              </Pressable>

              <Pressable

                onPress={() => setModalVisible(false)}

                disabled={saving}

              >

                <Ionicons name="close" size={28} color="#17231E" />

              </Pressable>

            </View>

            <ScrollView

              style={styles.modalScrollView}

              contentContainerStyle={styles.modalScrollContent}

              showsVerticalScrollIndicator

              keyboardShouldPersistTaps="handled"

              keyboardDismissMode="on-drag"

            >

              <AppText variant="label" style={styles.inputLabel}>

                Name <AppText variant="label" style={styles.requiredMark}>*</AppText>

              </AppText>

              <TextInput

                style={styles.input}

                value={name}

                onChangeText={setName}

                placeholder="Ingredient name"

                placeholderTextColor="#8A938E"

              />

              <AppText variant="label" style={styles.inputLabel}>Ingredient Image</AppText>

              <Pressable

                style={styles.imagePickerButton}

                onPress={chooseImage}

                disabled={saving}

              >

                <Ionicons name="image-outline" size={20} color="#1F7655" />

                <AppText variant="button" style={styles.imagePickerButtonText}>

                  {selectedImage ? "Change Selected Image" : "Browse Image"}

                </AppText>

              </Pressable>

              {selectedImage ? (

                <View style={styles.previewContainer}>

                  <AppText variant="label" style={styles.previewLabel}>

                    Selected Image Preview

                  </AppText>

                  <Image

                    source={{ uri: selectedImage.uri }}

                    style={styles.previewImage}

                    resizeMode="cover"

                  />

                  <Pressable

                    onPress={() => setSelectedImage(null)}

                    style={styles.removeImageButton}

                  >

                    <Ionicons name="close-circle" size={18} color="#B33B31" />

                    <AppText variant="helper" style={styles.removeImageText}>Remove selection</AppText>

                  </Pressable>

                </View>

              ) : photoUrl.trim() ? (

                <View style={styles.previewContainer}>

                  <AppText variant="label" style={styles.previewLabel}>Current Image</AppText>

                  <Image

                    source={{ uri: photoUrl.trim() }}

                    style={styles.previewImage}

                    resizeMode="cover"

                  />

                </View>

              ) : null}

              <AppText variant="label" style={styles.inputLabel}>

                Purchase Price (₹) <AppText variant="label" style={styles.requiredMark}>*</AppText>

              </AppText>

              <TextInput

                style={styles.input}

                value={purchasePrice}

                onChangeText={setPurchasePrice}

                placeholder="e.g. 600"

                placeholderTextColor="#8A938E"

                keyboardType="decimal-pad"

              />

              <AppText variant="label" style={styles.inputLabel}>

                Purchase Quantity <AppText variant="label" style={styles.requiredMark}>*</AppText>

              </AppText>

              <TextInput

                style={styles.input}

                value={purchaseQuantity}

                onChangeText={setPurchaseQuantity}

                placeholder="e.g. 4"

                placeholderTextColor="#8A938E"

                keyboardType="decimal-pad"

              />

              <AppText variant="label" style={styles.inputLabel}>

                Purchase Unit <AppText variant="label" style={styles.requiredMark}>*</AppText>

              </AppText>

              <Pressable

                style={styles.dropdown}

                onPress={() => setPurchaseUnitDropdownOpen((open) => !open)}

                disabled={saving}

              >

                <AppText variant="body"

                  style={

                    purchaseUnit

                      ? styles.dropdownValue

                      : styles.dropdownPlaceholder

                  }

                >

                  {purchaseUnit || "Select purchase unit"}

                </AppText>

                <Ionicons

                  name={

                    purchaseUnitDropdownOpen ? "chevron-up" : "chevron-down"

                  }

                  size={18}

                  color="#53605A"

                />

              </Pressable>

              {purchaseUnitDropdownOpen && (

                <View style={styles.dropdownOptions}>

                  {purchaseUnitOptions.map((unit) => (

                    <Pressable

                      key={unit}

                      style={styles.dropdownOption}

                      onPress={() => handlePurchaseUnitChange(unit)}

                    >

                      <AppText variant="body" style={styles.dropdownOptionText}>{unit}</AppText>

                    </Pressable>

                  ))}

                </View>

              )}

              <AppText variant="label" style={styles.inputLabel}>Ingredient Type</AppText>

              <View style={styles.statusSelector}>

                <Pressable

                  style={[

                    styles.statusOption,

                    ingredientType === IngredientType.Veg &&

                    styles.activeStatusOption,

                  ]}

                  onPress={() => setIngredientType(IngredientType.Veg)}

                  disabled={saving}

                >

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      ingredientType === IngredientType.Veg &&

                      styles.selectedStatusOptionText,

                    ]}

                  >

                    Veg

                  </AppText>

                </Pressable>

                <Pressable

                  style={[

                    styles.statusOption,

                    ingredientType === IngredientType.NonVeg &&

                    styles.activeStatusOption,

                  ]}

                  onPress={() => setIngredientType(IngredientType.NonVeg)}

                  disabled={saving}

                >

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      ingredientType === IngredientType.NonVeg &&

                      styles.selectedStatusOptionText,

                    ]}

                  >

                    Non-Veg

                  </AppText>

                </Pressable>

              </View>

              {(["litre", "ml"].includes(purchaseUnit)) && <>

                <AppText variant="label" style={styles.inputLabel}>Grams Per Milliliter (Optional)</AppText>

                <TextInput style={styles.input} value={gramsPerMilliliter} onChangeText={setGramsPerMilliliter} placeholder="e.g. 1.03" keyboardType="decimal-pad" placeholderTextColor="#8A938E" />

              </>}

              {purchaseUnit === "piece" && <>

                <AppText variant="label" style={styles.inputLabel}>Grams Per Piece (Optional)</AppText>

                <TextInput style={styles.input} value={gramsPerPiece} onChangeText={setGramsPerPiece} placeholder="e.g. 120" keyboardType="decimal-pad" placeholderTextColor="#8A938E" />

              </>}

              <AppText variant="label" style={styles.inputLabel}>Wastage Quantity</AppText>

              <TextInput

                style={styles.input}

                value={wastageQuantity}

                onChangeText={setWastageQuantity}

                placeholder="e.g. 10"

                keyboardType="decimal-pad"

                placeholderTextColor="#8A938E"

              />

              <AppText variant="label" style={styles.inputLabel}>Wastage Unit</AppText>

              <Pressable

                style={styles.dropdown}

                onPress={() => setWastageUnitDropdownOpen((open) => !open)}

                disabled={saving}

              >

                <AppText variant="body"

                  style={

                    wastageUnit

                      ? styles.dropdownValue

                      : styles.dropdownPlaceholder

                  }

                >

                  {wastageUnit || "Select wastage unit"}

                </AppText>

                <Ionicons

                  name={wastageUnitDropdownOpen ? "chevron-up" : "chevron-down"}

                  size={18}

                  color="#53605A"

                />

              </Pressable>

              {wastageUnitDropdownOpen && (

                <View style={styles.dropdownOptions}>

                  {wastageUnitOptions.map((unit) => (

                    <Pressable

                      key={unit}

                      style={styles.dropdownOption}

                      onPress={() => {

                        setWastageUnit(unit);

                        setWastageUnitDropdownOpen(false);

                      }}

                    >

                      <AppText variant="body" style={styles.dropdownOptionText}>{unit}</AppText>

                    </Pressable>

                  ))}

                </View>

              )}

              <AppText variant="label" style={styles.inputLabel}>Caution Required? (Optional)</AppText>

              <View style={styles.statusSelector}>

                <Pressable

                  style={[

                    styles.statusOption,

                    isCautionRequired && styles.activeStatusOption,

                  ]}

                  onPress={() => setIsCautionRequired(true)}

                  disabled={saving}

                >

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      isCautionRequired && styles.selectedStatusOptionText,

                    ]}

                  >

                    Yes

                  </AppText>

                </Pressable>

                <Pressable

                  style={[

                    styles.statusOption,

                    !isCautionRequired && styles.activeStatusOption,

                  ]}

                  onPress={() => setIsCautionRequired(false)}

                  disabled={saving}

                >

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      !isCautionRequired && styles.selectedStatusOptionText,

                    ]}

                  >

                    No

                  </AppText>

                </Pressable>

              </View>

              {isCautionRequired && <>

                <AppText variant="label" style={styles.inputLabel}>Caution Message (Optional)</AppText>

                <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} value={cautionMessage} onChangeText={setCautionMessage} placeholder="Enter caution details" placeholderTextColor="#8A938E" multiline />

              </>}

              <AppText variant="label" style={styles.inputLabel}>Storage Instructions (Optional)</AppText>

              <TextInput

                style={styles.input}

                value={storageInstructions}

                onChangeText={setStorageInstructions}

                placeholder="e.g. Store in a cool, dry place"

                placeholderTextColor="#8A938E"

                multiline

              />

              <AppText variant="label" style={styles.inputLabel}>Shelf Life (Days) (Optional)</AppText>

              <TextInput

                style={styles.input}

                value={shelfLifeDays}

                onChangeText={setShelfLifeDays}

                placeholder="e.g. 30"

                keyboardType="number-pad"

                placeholderTextColor="#8A938E"

              />

              <AppText variant="label" style={styles.inputLabel}>Brand (Optional)</AppText>

              <TextInput

                style={styles.input}

                value={brand}

                onChangeText={setBrand}

                placeholder="Enter brand name"

                placeholderTextColor="#8A938E"

              />

              <AppText variant="label" style={styles.inputLabel}>Notes (Optional)</AppText>

              <TextInput

                style={[

                  styles.input,

                  { minHeight: 90, textAlignVertical: "top" },

                ]}

                value={notes}

                onChangeText={setNotes}

                placeholder="Additional notes"

                placeholderTextColor="#8A938E"

                multiline

              />

              {photoUrl.trim() ? (

                <View style={styles.previewContainer}>

                  <AppText variant="label" style={styles.previewLabel}>Preview</AppText>

                  <Image

                    source={{

                      uri: photoUrl.trim(),

                    }}

                    style={styles.previewImage}

                    resizeMode="cover"

                  />

                </View>

              ) : null}

              <AppText variant="label" style={styles.inputLabel}>Status</AppText>

              <View style={styles.statusSelector}>

                <Pressable

                  accessibilityRole="button"

                  accessibilityState={{ selected: status === 1 }}

                  style={[

                    styles.statusOption,

                    status === 1 && styles.activeStatusOption,

                  ]}

                  onPress={() => setStatus(1)}

                  disabled={saving}

                >

                  <Ionicons

                    name="checkmark-circle-outline"

                    size={18}

                    color={status === 1 ? "#FFFFFF" : "#1F7655"}

                  />

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      status === 1 && styles.selectedStatusOptionText,

                    ]}

                  >

                    Active

                  </AppText>

                </Pressable>

                <Pressable

                  accessibilityRole="button"

                  accessibilityState={{ selected: status === 2 }}

                  style={[

                    styles.statusOption,

                    status === 2 && styles.inactiveStatusOption,

                  ]}

                  onPress={() => setStatus(2)}

                  disabled={saving}

                >

                  <Ionicons

                    name="close-circle-outline"

                    size={18}

                    color={status === 2 ? "#FFFFFF" : "#B33B31"}

                  />

                  <AppText variant="button"

                    style={[

                      styles.statusOptionText,

                      status === 2 && styles.selectedStatusOptionText,

                    ]}

                  >

                    Inactive

                  </AppText>

                </Pressable>

              </View>

            </ScrollView>

          </View>

        </View>

      </Modal>

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

            <AppText variant="sectionTitle" style={styles.deleteTitle}>Delete Ingredient?</AppText>

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

    </SafeAreaView >

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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },

  headerTitle: {
    flex: 1,
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

    marginBottom: 10,

  },

  ingredientCard: {

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#fff",

    borderRadius: 20,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    padding: 12,

    marginBottom: 12,

  },

  ingredientIcon: {

    width: 48,

    height: 48,

    borderRadius: 14,

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

    marginLeft: 12,

  },

  ingredientName: {

    fontSize: 16,

    fontWeight: "700",

    color: "#17231E",

  },

  ingredientActions: {

    marginLeft: 8,

    flexDirection: "row",

    alignItems: "center",

  },

  actionButton: {

    padding: 8,

  },

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

  dropdown: {

    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    paddingHorizontal: 16,

    paddingVertical: 14,

    marginBottom: 16,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

  },

  dropdownValue: { color: "#17231E", fontSize: 16 },

  dropdownPlaceholder: { color: "#8A938E", fontSize: 16 },

  dropdownOptions: {

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    borderRadius: 12,

    marginTop: -10,

    marginBottom: 16,

    overflow: "hidden",

  },

  dropdownOption: {

    paddingHorizontal: 16,

    paddingVertical: 12,

    borderBottomWidth: 1,

    borderBottomColor: "#F0F1ED",

  },

  dropdownOptionText: { color: "#17231E", fontSize: 15 },

  headerSaveButton: {

    backgroundColor: "#1F7655",

    paddingHorizontal: 15,

    paddingVertical: 8,

    borderRadius: 10,

    marginLeft: "auto",

    marginRight: 12,

  },

  headerSaveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  ingredientMetaRow: {

    flexDirection: "row",

    alignItems: "center",

    flexWrap: "wrap",

    gap: 6,

    marginTop: 4,

  },

  typeBadge: {

    alignSelf: "flex-start",

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 12,

    marginTop: 8,

  },

  vegTypeBadge: { backgroundColor: "#E7F5EC" },

  nonVegTypeBadge: { backgroundColor: "#FDECEC" },

  typeBadgeText: { fontSize: 11, fontWeight: "700" },

  vegTypeBadgeText: { color: "#1F7655" },

  nonVegTypeBadgeText: { color: "#B33B31" },

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

  requiredMark: {

    color: "#B33B31",

    fontWeight: "800",

  },

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

  imagePickerButton: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 10,

    backgroundColor: "#E7F1EA",

    borderWidth: 1,

    borderColor: "#BFD8C8",

    borderRadius: 16,

    paddingVertical: 14,

    marginBottom: 16,

  },

  imagePickerButtonText: {

    color: "#1F7655",

    fontSize: 15,

    fontWeight: "700",

  },

  removeImageButton: {

    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    marginTop: 8,

    alignSelf: "flex-start",

  },

  removeImageText: {

    color: "#B33B31",

    fontSize: 13,

    fontWeight: "600",

  },

  previewContainer: {

    marginBottom: 16,

  },

  previewLabel: {

    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",

    marginBottom: 8,

  },

  previewImage: {

    width: 80,

    height: 80,

    borderRadius: 16,

    backgroundColor: "#E7F1EA",

  },

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

  deleteOverlay: {

    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.45)",

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

    width: 100,

    height: 100,

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

  },

  deleteConfirmText: {

    fontSize: 15,

    fontWeight: "700",

    color: "#FFFFFF",

  },

  statusBadge: {

    alignSelf: "flex-start",

    marginTop: 7,

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 20,

  },

  activeBadge: {

    backgroundColor: "#E7F5EC",

  },

  inactiveBadge: {

    backgroundColor: "#FDECEC",

  },

  statusBadgeText: {

    fontSize: 11,

    fontWeight: "700",

  },

  activeBadgeText: {

    color: "#1F7655",

  },

  inactiveBadgeText: {

    color: "#B33B31",

  },

  statusSelector: {

    flexDirection: "row",

    gap: 12,

    marginBottom: 18,

  },

  statusOption: {

    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    paddingVertical: 13,

    borderRadius: 14,

    borderWidth: 1,

    borderColor: "#D7DED8",

    backgroundColor: "#FFFFFF",

  },

  activeStatusOption: {

    backgroundColor: "#1F7655",

    borderColor: "#1F7655",

  },

  inactiveStatusOption: {

    backgroundColor: "#B33B31",

    borderColor: "#B33B31",

  },

  statusOptionText: {

    fontSize: 14,

    fontWeight: "700",

    color: "#17231E",

  },

  selectedStatusOptionText: {

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

  modalOverlay: {

    flex: 1,

    backgroundColor: "rgba(0,0,0,0.3)",

    justifyContent: "flex-end",

  },

  modalContent: {

    backgroundColor: "#F7F8F3",

    borderTopLeftRadius: 30,

    borderTopRightRadius: 30,

    paddingHorizontal: 24,

    paddingTop: 24,

    paddingBottom: 0,

    height: "90%",

    maxHeight: "90%",

    overflow: "hidden",

  },

  modalScrollView: {

    flex: 1,

  },

  modalScrollContent: {

    paddingBottom: 40,

  },

  brandCaption: {

    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 1.6,

    color: "#829087",

    marginTop: 2,

  },

});