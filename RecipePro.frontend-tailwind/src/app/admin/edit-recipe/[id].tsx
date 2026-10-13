import { useState, useMemo, useCallback, useEffect } from "react";
import {
View,
Text,
Pressable,
ScrollView,
StyleSheet,
Alert,
TextInput,
Image,
KeyboardAvoidingView,
Platform,
Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { categoryApi } from "../../../api/categoryApi";
import { ingredientApi } from "../../../api/ingredientApi";
import { recipeApi } from "../../../api/recipeApi";
import type { CategoryResponse } from "../../../types/category";
import type { IngredientResponse } from "../../../types/ingredient";
import type { RecipeResponse } from "../../../types/recipe";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
RECIPE_STATUS,
type RecipeRequest,
type RecipeStatus,
} from "../../../types/recipe";
import ScreenLoader from "../../../components/common/ScreenLoader";
const UNITS = ["g", "kg", "ml", "l", "pcs", "tbsp", "tsp", "cup"];
function showMessage(title: string, message: string) {
if (Platform.OS === "web" && typeof globalThis.alert === "function") {
globalThis.alert(`${title}\\\\\n\\\\\n${message}`);
return;
}
Alert.alert(title, message);
}
function getErrorMessage(error: unknown): string {
if (error instanceof Error) return error.message;
return "An unexpected error occurred. Check the console for details.";
}
interface FormIngredient {
ingredientId: number;
quantity: string;
unit: string;
}
interface FormProcedure {
stepNumber: number;
title: string;
description: string;
}
export default function EditRecipeScreen() {
const { id } = useLocalSearchParams<{ id: string }>();
const router = useRouter();
const isNew = id === "new";
const [categories, setCategories] = useState<CategoryResponse[]>([]);
const [ingredients, setIngredients] = useState<IngredientResponse[]>([]);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [successModalVisible, setSuccessModalVisible] = useState(false);
const [successTitle, setSuccessTitle] = useState("");
const [successMessage, setSuccessMessage] = useState("");
const [successAction, setSuccessAction] = useState<"back" | "list" | null>(null);
const [deleteModalVisible, setDeleteModalVisible] = useState(false);
const [deleting, setDeleting] = useState(false);
const [name, setName] = useState("");
const [description, setDescription] = useState("");
const [categoryId, setCategoryId] = useState<number>(0);
const [baseServings, setBaseServings] = useState("4");
const [baseCookedWeightGrams, setBaseCookedWeightGrams] =
useState("");
const [photoUrl, setPhotoUrl] = useState("");
const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [status, setStatus] = useState<RecipeStatus>(
RECIPE_STATUS.PUBLISHED
);
const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);
const [ingredientSearch, setIngredientSearch] = useState("");
const [selectedSearchIngredient, setSelectedSearchIngredient] =
useState<IngredientResponse | null>(null);
const [expandedIngredientIndex, setExpandedIngredientIndex] =
useState<number | null>(null);
const [procedures, setProcedures] = useState<FormProcedure[]>([]);
const load = useCallback(async () => {
try {
const [cats, ings] = await Promise.all([
categoryApi.getAll(),
ingredientApi.getAll(),
]);
setCategories(cats);
setIngredients(ings);
if (!isNew) {
const data: RecipeResponse = await recipeApi.getById(Number(id));
setName(data.name);
setDescription(data.description || "");
setCategoryId(data.categoryId);
setBaseServings(String(data.baseServings));
setBaseCookedWeightGrams(
data.baseCookedWeightGrams != null
? String(data.baseCookedWeightGrams)
: ""
);
setPhotoUrl(data.photoUrl || "");
setSelectedImage(null);
setStatus(
data.status.toLowerCase() === "published"
? RECIPE_STATUS.PUBLISHED
: RECIPE_STATUS.DRAFT
);
setFormIngredients(
data.ingredients.map((item) => ({
ingredientId: item.ingredientId,
quantity: String(item.quantity),
unit: item.unit,
}))
);
setProcedures(
data.procedures.map((item) => ({
stepNumber: item.stepNumber,
title: item.title,
description: item.description,
}))
);
} else {
// Reset every field when creating a new recipe.
setName("");
setDescription("");
setCategoryId(cats[0]?.id || 0);
setBaseServings("4");
setBaseCookedWeightGrams("");
setPhotoUrl("");
setSelectedImage(null);
setStatus(RECIPE_STATUS.PUBLISHED);
setFormIngredients([]);
setIngredientSearch("");
setSelectedSearchIngredient(null);
setExpandedIngredientIndex(null);
setProcedures([
{
stepNumber: 1,
title: "",
description: "",
},
]);
}
} catch (error) {
console.error("Unable to load recipe form:", error);
showMessage("Unable to load recipe form", getErrorMessage(error));
} finally {
setLoading(false);
}
}, [id, isNew]);
useFocusEffect(
useCallback(() => {
void load();
}, [load])
);
useEffect(() => {
void load();
}, [load]);
const filteredIngredients = useMemo(() => {
const query = ingredientSearch.trim().toLowerCase();
if (!query) return [];
return ingredients.filter((item) =>
item.name.toLowerCase().includes(query)
);
}, [ingredients, ingredientSearch]);
const chooseRecipeImage = async () => {
try {
const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!permission.granted) {
showMessage("Permission required", "Allow photo library access to choose a recipe image.");
return;
}
const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ["images"],
allowsEditing: true,
aspect: [4, 3],
quality: 0.85,
});
if (!result.canceled && result.assets?.[0]) {
setSelectedImage(result.assets[0]);
}
} catch (error) {
showMessage("Image selection failed", getErrorMessage(error));
}
};
const uploadRecipeImage = async (recipeId: number) => {
if (!selectedImage) return;
const apiBaseUrl =
(process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5204/api").replace(/\/$/, "");
const formData = new FormData();
const uri = selectedImage.uri;
const fileName =
selectedImage.fileName || `recipe-${recipeId}-${Date.now()}.jpg`;
const mimeType = selectedImage.mimeType || "image/jpeg";
if (Platform.OS === "web" && selectedImage.file) {
formData.append("file", selectedImage.file);
} else {
formData.append("file", {
uri,
name: fileName,
type: mimeType,
} as unknown as Blob);
}
const token = (globalThis as typeof globalThis & {
recipeProAuth?: { token?: string };
}).recipeProAuth?.token;
const response = await fetch(`${apiBaseUrl}/recipes/${recipeId}/image`, {
method: "POST",
headers: token ? { Authorization: `Bearer ${token}` } : undefined,
body: formData,
});
if (!response.ok) {
const body = await response.text();
throw new Error(body || `Image upload failed (${response.status}).`);
}
// The backend should return the saved Cloudinary URL.
let uploadedUrl = "";
const responseText = await response.text();
if (responseText) {
  try {
    const payload = JSON.parse(responseText) as {
      imageUrl?: string;
      photoUrl?: string;
      url?: string;
      data?: { imageUrl?: string; photoUrl?: string; url?: string };
    };
    uploadedUrl =
      payload.photoUrl ||
      payload.imageUrl ||
      payload.url ||
      payload.data?.photoUrl ||
      payload.data?.imageUrl ||
      payload.data?.url ||
      "";
  } catch {
    // Some endpoints may return an empty/non-JSON success response.
  }
}
if (uploadedUrl) setPhotoUrl(uploadedUrl);
setSelectedImage(null);
};
const handleSave = async () => {
const recipeId = Number(id);
if (
!isNew &&
(!id || !Number.isInteger(recipeId) || recipeId <= 0)
) {
showMessage(
"Invalid recipe",
"The recipe ID is missing or invalid. Return to the recipe list and open Edit again."
);
console.error("Invalid recipe ID while saving:", id);
return;
}
if (
!name.trim() ||
!categoryId ||
!baseServings ||
Number(baseServings) < 1 ||
!Number.isInteger(Number(baseServings)) ||
formIngredients.length === 0 ||
procedures.length === 0
) {
showMessage(
"Validation",
"Enter a recipe title, valid base servings, select a category, add at least one ingredient and one procedure."
);
return;
}
const request: RecipeRequest = {
name: name.trim(),
description: description.trim() || null,
categoryId,
baseServings: Number(baseServings),
baseCookedWeightGrams:
baseCookedWeightGrams.trim() === ""
? null
: Number(baseCookedWeightGrams),
photoUrl: photoUrl.trim(),
status,
ingredients: formIngredients.map((item) => ({
ingredientId: item.ingredientId,
quantity: Number(item.quantity),
unit: item.unit,
})),
procedures: procedures.map((item, index) => ({
...item,
stepNumber: index + 1,
title: item.title.trim(),
description: item.description.trim(),
})),
};
if (
request.ingredients.some(
(item) =>
!item.ingredientId ||
!Number.isFinite(item.quantity) ||
item.quantity <= 0
) ||
request.procedures.some(
(item) => !item.title.trim() || !item.description.trim()
)
) {
showMessage(
"Validation",
"Check ingredient quantities and ensure every procedure has a title and description."
);
return;
}
if (saving) return;
setSaving(true);
try {
  let savedRecipeId = recipeId;
  if (isNew) {
    const created = await recipeApi.create(request);
    const createdResult = created as unknown as {
      id?: number;
      recipeId?: number;
      data?: { id?: number; recipeId?: number };
    };
    savedRecipeId =
      createdResult?.id ??
      createdResult?.recipeId ??
      createdResult?.data?.id ??
      createdResult?.data?.recipeId ??
      0;
    if (!Number.isInteger(savedRecipeId) || savedRecipeId <= 0) {
      throw new Error(
        "Recipe was created, but the API response did not include its ID. Make recipeApi.create return the created recipe or its ID so the image can be uploaded."
      );
    }
  } else {
    await recipeApi.update(recipeId, request);
  }
  if (selectedImage) {
    setUploadingImage(true);
    await uploadRecipeImage(savedRecipeId);
  }
  setSuccessTitle(isNew ? "Recipe Created!" : "Recipe Updated!");
  setSuccessMessage(
    isNew
      ? `"${name.trim()}" has been created successfully.`
      : `"${name.trim()}" has been updated successfully.`
  );
  setSuccessAction(isNew ? "list" : "back");
  setSuccessModalVisible(true);
} catch (error) {
console.error("Unable to save recipe:", error);
showMessage("Save failed", getErrorMessage(error));
} finally {
setSaving(false);
setUploadingImage(false);
}
};
const handleDelete = () => {
  setDeleteModalVisible(true);
};

const confirmDelete = async () => {
  if (deleting) return;
  setDeleting(true);
  try {
    await recipeApi.delete(Number(id));
    setDeleteModalVisible(false);
    setSuccessTitle("Recipe Deleted!");
    setSuccessMessage(`"${name}" has been deleted successfully.`);
    setSuccessAction("back");
    setSuccessModalVisible(true);
  } catch (error) {
    console.error("Unable to delete recipe:", error);
    showMessage("Delete failed", getErrorMessage(error));
  } finally {
    setDeleting(false);
  }
};

const closeSuccessModal = () => {
  setSuccessModalVisible(false);
  if (successAction === "list") {
    router.replace("/admin/recipes");
  } else if (successAction === "back") {
    router.back();
  }
  setSuccessAction(null);
};
const updateIngredient = (
index: number,
key: keyof FormIngredient,
value: string | number
) => {
setFormIngredients((previous) =>
previous.map((item, itemIndex) =>
itemIndex === index ? { ...item, [key]: value } : item
)
);
};
const addIngredient = () => {
const ingredientToAdd = selectedSearchIngredient;
if (!ingredientToAdd) {
Alert.alert(
"Select Ingredient",
"Search and select an ingredient from the dropdown first."
);
return;
}
if (formIngredients.some((item) => item.ingredientId === ingredientToAdd.id)) {
Alert.alert(
"Ingredient already added",
`${ingredientToAdd.name} is already in this recipe.`
);
return;
}
setFormIngredients((previous) => [
{
ingredientId: ingredientToAdd.id,
quantity: "1",
unit: "g",
},
...previous,
]);
setIngredientSearch("");
setSelectedSearchIngredient(null);
setExpandedIngredientIndex(null);
};
const removeIngredient = (index: number) => {
setFormIngredients((previous) =>
previous.filter((_, itemIndex) => itemIndex !== index)
);
setExpandedIngredientIndex((current) => {
if (current === null || current === index) return null;
return current > index ? current - 1 : current;
});
};
const updateProcedure = (
index: number,
key: keyof FormProcedure,
value: string | number
) => {
setProcedures((previous) =>
previous.map((item, itemIndex) =>
itemIndex === index ? { ...item, [key]: value } : item
)
);
};
const addProcedure = () => {
setProcedures((previous) => [
...previous,
{
stepNumber: previous.length + 1,
title: "",
description: "",
},
]);
};
const removeProcedure = (index: number) => {
setProcedures((previous) =>
previous
.filter((_, itemIndex) => itemIndex !== index)
.map((item, itemIndex) => ({
...item,
stepNumber: itemIndex + 1,
}))
);
};
const handleBack = () => {
  router.back();
};
if (loading) return <ScreenLoader />;
return (
<SafeAreaView style={styles.container} edges={["top"]}>
<KeyboardAvoidingView
behavior={Platform.OS === "ios" ? "padding" : undefined}
style={styles.keyboardView}
>
<ScrollView
showsVerticalScrollIndicator={false}
contentContainerStyle={styles.scrollContent}
keyboardShouldPersistTaps="handled"
>
<View style={styles.header}>
<Pressable
onPress={() => handleBack()}
style={styles.backButton}
>
<Ionicons name="arrow-back" size={24} color="#17231E" />
</Pressable>
<Text style={styles.headerTitle}>
{isNew ? "Create Recipe" : "Edit Recipe"}
</Text>
<Pressable onPress={handleSave} disabled={saving}>
<Text style={styles.saveText}>
{saving ? (uploadingImage ? "Uploading image..." : "Saving...") : "Save"}
</Text>
</Pressable>
</View>
<View style={styles.form}>
<Text style={styles.label}>Recipe Title</Text>
<TextInput
style={styles.input}
value={name}
onChangeText={setName}
placeholder="e.g. Chicken Biryani"
placeholderTextColor="#8A938E"
/>
<Text style={styles.label}>Category</Text>
<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
style={styles.chipScroll}
>
<View style={styles.chipContainer}>
{categories.map((category) => (
<Pressable
key={category.id}
style={[
styles.chip,
categoryId === category.id && styles.chipActive,
]}
onPress={() => setCategoryId(category.id)}
>
<Text
style={[
styles.chipText,
categoryId === category.id && styles.chipTextActive,
]}
>
{category.name}
</Text>
</Pressable>
))}
</View>
</ScrollView>
<View style={styles.row}>
<View style={styles.flex1}>
<Text style={styles.label}>Base Servings</Text>
<TextInput
style={styles.input}
value={baseServings}
onChangeText={setBaseServings}
keyboardType="numeric"
placeholder="4"
placeholderTextColor="#8A938E"
/>
</View>
<View style={styles.flex1}>
<Text style={styles.label}>Status</Text>
<View style={styles.statusToggle}>
<Pressable
style={[
styles.statusBtn,
status === RECIPE_STATUS.DRAFT &&
styles.statusBtnActive,
]}
onPress={() => setStatus(RECIPE_STATUS.DRAFT)}
>
<Text
style={[
styles.statusText,
status === RECIPE_STATUS.DRAFT &&
styles.statusTextActive,
]}
>
Draft
</Text>
</Pressable>
<Pressable
style={[
styles.statusBtn,
status === RECIPE_STATUS.PUBLISHED &&
styles.statusBtnActive,
]}
onPress={() => setStatus(RECIPE_STATUS.PUBLISHED)}
>
<Text
style={[
styles.statusText,
status === RECIPE_STATUS.PUBLISHED &&
styles.statusTextActive,
]}
>
Published
</Text>
</Pressable>
</View>
</View>
</View>
<Text style={styles.label}>
Base Cooked Weight (grams)
</Text>
<TextInput
style={styles.input}
value={baseCookedWeightGrams}
onChangeText={setBaseCookedWeightGrams}
keyboardType="decimal-pad"
placeholder="e.g. 260"
placeholderTextColor="#8A938E"
/>
<Text style={styles.helperText}>
Total weight of the cooked recipe for the base servings.
</Text>
<Text style={styles.label}>Recipe Image</Text>
{(selectedImage?.uri || photoUrl) ? (
<View style={styles.imagePreviewContainer}>
<Image
source={{ uri: selectedImage?.uri || photoUrl }}
style={styles.imagePreview}
resizeMode="cover"
/>
<Pressable
style={styles.removeImageButton}
onPress={() => setSelectedImage(null)}
accessibilityRole="button"
accessibilityLabel="Cancel selected image"
>
<Ionicons name="close-circle" size={24} color="#B33B31" />
<Text style={styles.removeImageText}>
{selectedImage ? "Cancel selected image" : "Keep current image"}
</Text>
</Pressable>
</View>
) : (
<Text style={styles.imageHelperText}>Choose a photo from your device. JPG, PNG or WebP, up to 5 MB.</Text>
)}
<Pressable style={styles.chooseImageButton} onPress={chooseRecipeImage}>
<Ionicons name="image-outline" size={20} color="#1F7655" />
<Text style={styles.chooseImageButtonText}>
{selectedImage ? "Choose a different image" : photoUrl ? "Replace image" : "Browse image"}
</Text>
</Pressable>
<Text style={styles.label}>Description</Text>
<TextInput
style={[styles.input, styles.textArea]}
value={description}
onChangeText={setDescription}
placeholder="Describe the recipe..."
placeholderTextColor="#8A938E"
multiline
numberOfLines={3}
/>
<Text style={styles.sectionTitle}>Ingredients</Text>
<View style={styles.ingredientSearchRow}>
<View style={styles.ingredientSearchContainer}>
<Ionicons
name="search-outline"
size={20}
color="#68736D"
/>
<TextInput
style={styles.ingredientSearchInput}
value={ingredientSearch}
onChangeText={(value) => {
setIngredientSearch(value);
setSelectedSearchIngredient(null);
}}
placeholder="Search ingredients..."
placeholderTextColor="#8A938E"
autoCapitalize="none"
autoCorrect={false}
/>
{ingredientSearch.length > 0 && (
<Pressable
onPress={() => {
setIngredientSearch("");
setSelectedSearchIngredient(null);
}}
>
<Ionicons
name="close-circle"
size={20}
color="#8A938E"
/>
</Pressable>
)}
</View>
<Pressable
style={styles.addIngredientButton}
onPress={addIngredient}
>
<Ionicons name="add" size={20} color="#FFFFFF" />
<Text style={styles.addIngredientButtonText}>Add</Text>
</Pressable>
</View>
{ingredientSearch.trim().length > 0 && (
<View style={styles.searchResultsContainer}>
{filteredIngredients.length > 0 ? (
<ScrollView
nestedScrollEnabled
keyboardShouldPersistTaps="handled"
style={styles.searchResultsList}
>
{filteredIngredients.map((ingredient) => {
const isSelected =
selectedSearchIngredient?.id === ingredient.id;
return (
<Pressable
key={ingredient.id}
style={[
styles.searchResultItem,
isSelected && styles.searchResultItemSelected,
]}
onPress={() => {
const alreadyAdded = formIngredients.some(
(item) => item.ingredientId === ingredient.id
);
if (alreadyAdded) {
Alert.alert(
"Ingredient already added",
`${ingredient.name} is already in this recipe.`
);
return;
}
setFormIngredients((previous) => [
{
ingredientId: ingredient.id,
quantity: "1",
unit: "g",
},
...previous,
]);
setIngredientSearch("");
setSelectedSearchIngredient(null);
setExpandedIngredientIndex(null);
}}
>
<Text
style={[
styles.searchResultText,
isSelected &&
styles.searchResultTextSelected,
]}
>
{ingredient.name}
</Text>
<Ionicons
name={
isSelected
? "checkmark-circle"
: "add-circle-outline"
}
size={20}
color={isSelected ? "#1F7655" : "#68736D"}
/>
</Pressable>
);
})}
</ScrollView>
) : (
<Text style={styles.noIngredientsText}>
No matching ingredients found.
</Text>
)}
</View>
)}
{formIngredients.map((item, index) => {
const selectedIngredient = ingredients.find(
(ingredient) => ingredient.id === item.ingredientId
);
const isExpanded = expandedIngredientIndex === index;
const availableIngredients = ingredients.filter(
(ingredient) =>
ingredient.id !== item.ingredientId &&
ingredient.name
.toLowerCase()
.includes(ingredientSearch.trim().toLowerCase())
);
return (
<View
key={`${item.ingredientId}-${index}`}
style={styles.ingredientCard}
>
<View style={styles.ingredientHeader}>
<Text style={styles.ingredientLabel}>
Ingredient {index + 1}
</Text>
<Pressable
onPress={() => removeIngredient(index)}
accessibilityRole="button"
accessibilityLabel="Remove ingredient"
>
<Ionicons
name="trash-outline"
size={20}
color="#B33B31"
/>
</Pressable>
</View>
<View style={styles.selectedIngredientRow}>
<View
style={[
styles.chip,
styles.chipActive,
styles.selectedChip,
]}
>
<Text
style={[styles.chipText, styles.chipTextActive]}
numberOfLines={1}
>
{selectedIngredient?.name ?? "Select ingredient"}
</Text>
</View>
<Pressable
style={styles.toggleIngredientButton}
onPress={() =>
setExpandedIngredientIndex((current) =>
current === index ? null : index
)
}
accessibilityRole="button"
accessibilityLabel={
isExpanded
? "Hide ingredient choices"
: "Show ingredient choices"
}
>
<Ionicons
name={isExpanded ? "close" : "chevron-down"}
size={18}
color="#1F7655"
/>
</Pressable>
</View>
{isExpanded && (
<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
style={styles.expandedIngredientList}
keyboardShouldPersistTaps="handled"
>
<View style={styles.chipContainer}>
{availableIngredients.map((ingredient) => (
<Pressable
key={ingredient.id}
style={styles.chip}
onPress={() => {
updateIngredient(
index,
"ingredientId",
ingredient.id
);
setExpandedIngredientIndex(null);
setIngredientSearch("");
setSelectedSearchIngredient(null);
}}
>
<Text style={styles.chipText} numberOfLines={1}>
{ingredient.name}
</Text>
</Pressable>
))}
</View>
</ScrollView>
)}
{isExpanded && availableIngredients.length === 0 && (
<Text style={styles.noIngredientsText}>
No other ingredients available.
</Text>
)}
<View style={styles.quantityRow}>
<TextInput
style={styles.quantityInput}
value={item.quantity}
onChangeText={(value) =>
updateIngredient(index, "quantity", value)
}
keyboardType="decimal-pad"
placeholder="Qty"
placeholderTextColor="#8A938E"
/>
<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
keyboardShouldPersistTaps="handled"
>
<View style={styles.unitContainer}>
{UNITS.map((unit) => (
<Pressable
key={unit}
style={[
styles.unitChip,
item.unit === unit && styles.unitChipActive,
]}
onPress={() =>
updateIngredient(index, "unit", unit)
}
>
<Text
style={[
styles.unitText,
item.unit === unit && styles.unitTextActive,
]}
>
{unit}
</Text>
</Pressable>
))}
</View>
</ScrollView>
</View>
</View>
);
})}
<Text style={styles.sectionTitle}>Procedure</Text>
{procedures.map((item, index) => (
<View key={index} style={styles.procedureCard}>
<View style={styles.procedureHeader}>
<View style={styles.stepBadge}>
<Text style={styles.stepBadgeText}>
{item.stepNumber}
</Text>
</View>
<Text style={styles.procedureLabel}>
Step {item.stepNumber}
</Text>
<Pressable onPress={() => removeProcedure(index)}>
<Ionicons
name="trash-outline"
size={20}
color="#B33B31"
/>
</Pressable>
</View>
<TextInput
style={styles.input}
value={item.title}
onChangeText={(value) =>
updateProcedure(index, "title", value)
}
placeholder="Step title"
placeholderTextColor="#8A938E"
/>
<TextInput
style={[styles.input, styles.textArea, { marginTop: 8 }]}
value={item.description}
onChangeText={(value) =>
updateProcedure(index, "description", value)
}
placeholder="Step description"
placeholderTextColor="#8A938E"
multiline
numberOfLines={2}
/>
</View>
))}
<Pressable style={styles.addButton} onPress={addProcedure}>
<Ionicons name="add" size={20} color="#1F7655" />
<Text style={styles.addButtonText}>Add Step</Text>
</Pressable>
<Pressable
style={styles.saveButton}
onPress={handleSave}
disabled={saving}
>
<Text style={styles.saveButtonText}>
{saving
? (uploadingImage ? "Uploading image..." : "Saving...")
: isNew
? "Create Recipe"
: "Save Changes"}
</Text>
</Pressable>
{!isNew && (
<Pressable
style={styles.deleteButton}
onPress={handleDelete}
>
<Text style={styles.deleteButtonText}>Delete Recipe</Text>
</Pressable>
)}
</View>
</ScrollView>
</KeyboardAvoidingView>

<Modal
  visible={deleteModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setDeleteModalVisible(false)}
>
  <View style={styles.popupOverlay}>
    <View style={styles.popupCard}>
      <View style={styles.deleteIconCircle}>
        <Ionicons name="trash-outline" size={28} color="#B33B31" />
      </View>
      <Text style={styles.popupTitle}>Delete Recipe?</Text>
      <Text style={styles.popupMessage}>
        Are you sure you want to delete "{name}"?
      </Text>
      <View style={styles.popupActions}>
        <Pressable
          style={styles.cancelPopupButton}
          onPress={() => setDeleteModalVisible(false)}
          disabled={deleting}
        >
          <Text style={styles.cancelPopupText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmDeleteButton, deleting && styles.disabledButton]}
          onPress={confirmDelete}
          disabled={deleting}
        >
          <Text style={styles.confirmDeleteText}>
            {deleting ? "Deleting..." : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal
  visible={successModalVisible}
  transparent
  animationType="fade"
  onRequestClose={closeSuccessModal}
>
  <View style={styles.popupOverlay}>
    <View style={styles.popupCard}>
      <View style={styles.successIconCircle}>
        <Ionicons name="checkmark-circle" size={34} color="#1F7655" />
      </View>
      <Text style={styles.popupTitle}>{successTitle}</Text>
      <Text style={styles.popupMessage}>{successMessage}</Text>
      <Pressable style={styles.successPopupButton} onPress={closeSuccessModal}>
        <Text style={styles.successPopupText}>Continue</Text>
      </Pressable>
    </View>
  </View>
</Modal>

</SafeAreaView>
);
}
const styles = StyleSheet.create({
popupOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 24,
},
popupCard: {
  width: "100%",
  maxWidth: 400,
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  padding: 24,
  alignItems: "center",
},
deleteIconCircle: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: "#FCEBEA",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
},
successIconCircle: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: "#E7F1EA",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
},
popupTitle: {
  fontSize: 20,
  fontWeight: "800",
  color: "#17231E",
  textAlign: "center",
},
popupMessage: {
  fontSize: 14,
  lineHeight: 21,
  color: "#68736D",
  textAlign: "center",
  marginTop: 8,
},
popupActions: {
  flexDirection: "row",
  width: "100%",
  gap: 10,
  marginTop: 22,
},
cancelPopupButton: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 14,
  backgroundColor: "#E7F1EA",
  alignItems: "center",
  justifyContent: "center",
},
cancelPopupText: {
  color: "#17231E",
  fontSize: 14,
  fontWeight: "700",
},
confirmDeleteButton: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 14,
  backgroundColor: "#B83B32",
  alignItems: "center",
  justifyContent: "center",
},
confirmDeleteText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
},
disabledButton: {
  opacity: 0.65,
},
successPopupButton: {
  width: "100%",
  marginTop: 24,
  paddingVertical: 14,
  borderRadius: 14,
  backgroundColor: "#1F7655",
  alignItems: "center",
},
successPopupText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#FFFFFF",
},
container: {
flex: 1,
backgroundColor: "#F7F8F3",
},
keyboardView: {
flex: 1,
},
scrollContent: {
paddingHorizontal: 20,
paddingBottom: 40,
},
header: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingTop: 8,
paddingBottom: 16,
},
backButton: {
width: 44,
height: 44,
borderRadius: 14,
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: "#E5E8E3",
alignItems: "center",
justifyContent: "center",
},
headerTitle: {
fontSize: 18,
fontWeight: "700",
color: "#17231E",
},
saveText: {
fontSize: 16,
fontWeight: "700",
color: "#1F7655",
},
form: {
flex: 1,
},
label: {
fontSize: 14,
fontWeight: "700",
color: "#17231E",
marginBottom: 8,
marginTop: 16,
},
input: {
backgroundColor: "#FFFFFF",
borderRadius: 16,
borderWidth: 1,
borderColor: "#E5E8E3",
paddingHorizontal: 16,
paddingVertical: 14,
fontSize: 16,
color: "#17231E",
},
textArea: {
height: 80,
textAlignVertical: "top",
},
row: {
flexDirection: "row",
gap: 12,
},
flex1: {
flex: 1,
},
chipScroll: {
marginBottom: 8,
},
chipContainer: {
flexDirection: "row",
gap: 8,
},
chip: {
paddingHorizontal: 16,
paddingVertical: 10,
borderRadius: 12,
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: "#E5E8E3",
},
chipActive: {
backgroundColor: "#1F7655",
borderColor: "#1F7655",
},
chipText: {
fontSize: 14,
fontWeight: "600",
color: "#68736D",
},
chipTextActive: {
color: "#FFFFFF",
},
statusToggle: {
flexDirection: "row",
backgroundColor: "#E7F1EA",
borderRadius: 12,
padding: 4,
},
statusBtn: {
flex: 1,
paddingVertical: 10,
alignItems: "center",
borderRadius: 8,
},
statusBtnActive: {
backgroundColor: "#FFFFFF",
},
statusText: {
fontSize: 14,
fontWeight: "600",
color: "#68736D",
},
statusTextActive: {
color: "#17231E",
},
sectionTitle: {
fontSize: 20,
fontWeight: "800",
color: "#17231E",
marginTop: 24,
marginBottom: 12,
},
ingredientSearchRow: {
flexDirection: "row",
alignItems: "center",
gap: 8,
marginBottom: 12,
},
ingredientSearchContainer: {
flex: 1,
minWidth: 0,
flexDirection: "row",
alignItems: "center",
backgroundColor: "#FFFFFF",
borderRadius: 14,
borderWidth: 1,
borderColor: "#E5E8E3",
paddingHorizontal: 12,
minHeight: 48,
gap: 8,
},
ingredientSearchInput: {
flex: 1,
minWidth: 0,
paddingVertical: 10,
fontSize: 14,
color: "#17231E",
},
addIngredientButton: {
minHeight: 48,
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: 4,
paddingHorizontal: 12,
borderRadius: 14,
backgroundColor: "#1F7655",
},
addIngredientButtonText: {
color: "#FFFFFF",
fontSize: 14,
fontWeight: "700",
},
searchResultsContainer: {
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: "#E5E8E3",
borderRadius: 14,
marginTop: -4,
marginBottom: 12,
overflow: "hidden",
},
searchResultsList: {
maxHeight: 220,
},
searchResultItem: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: 14,
paddingVertical: 12,
borderBottomWidth: 1,
borderBottomColor: "#F0F1ED",
gap: 8,
},
searchResultItemSelected: {
backgroundColor: "#E7F1EA",
},
searchResultText: {
flex: 1,
fontSize: 14,
color: "#17231E",
},
searchResultTextSelected: {
color: "#1F7655",
fontWeight: "700",
},
noIngredientsText: {
fontSize: 12,
color: "#68736D",
padding: 12,
},
ingredientCard: {
backgroundColor: "#FFFFFF",
borderRadius: 20,
borderWidth: 1,
borderColor: "#E5E8E3",
padding: 16,
marginBottom: 12,
},
ingredientHeader: {
flexDirection: "row",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 12,
},
ingredientLabel: {
fontSize: 14,
fontWeight: "700",
color: "#17231E",
},
selectedIngredientRow: {
flexDirection: "row",
alignItems: "center",
gap: 6,
marginBottom: 4,
},
selectedChip: {
flex: 1,
minWidth: 0,
},
toggleIngredientButton: {
width: 30,
height: 30,
borderRadius: 15,
backgroundColor: "#E7F1EA",
alignItems: "center",
justifyContent: "center",
},
expandedIngredientList: {
marginTop: 8,
marginBottom: 4,
},
quantityRow: {
flexDirection: "row",
gap: 8,
marginTop: 8,
},
quantityInput: {
width: 80,
backgroundColor: "#F7F8F3",
borderRadius: 12,
borderWidth: 1,
borderColor: "#E5E8E3",
paddingHorizontal: 12,
paddingVertical: 10,
fontSize: 16,
color: "#17231E",
},
unitContainer: {
flexDirection: "row",
gap: 6,
},
unitChip: {
paddingHorizontal: 12,
paddingVertical: 10,
borderRadius: 10,
backgroundColor: "#F7F8F3",
borderWidth: 1,
borderColor: "#E5E8E3",
},
unitChipActive: {
backgroundColor: "#1F7655",
borderColor: "#1F7655",
},
unitText: {
fontSize: 13,
fontWeight: "600",
color: "#68736D",
},
unitTextActive: {
color: "#FFFFFF",
},
addButton: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
backgroundColor: "#FFFFFF",
borderRadius: 16,
borderWidth: 1,
borderColor: "#1F7655",
borderStyle: "dashed",
paddingVertical: 14,
gap: 8,
},
addButtonText: {
fontSize: 15,
fontWeight: "700",
color: "#1F7655",
},
procedureCard: {
backgroundColor: "#FFFFFF",
borderRadius: 20,
borderWidth: 1,
borderColor: "#E5E8E3",
padding: 16,
marginBottom: 12,
},
procedureHeader: {
flexDirection: "row",
alignItems: "center",
marginBottom: 12,
gap: 12,
},
stepBadge: {
width: 32,
height: 32,
borderRadius: 16,
backgroundColor: "#1F7655",
alignItems: "center",
justifyContent: "center",
},
stepBadgeText: {
fontSize: 14,
fontWeight: "700",
color: "#FFFFFF",
},
procedureLabel: {
flex: 1,
fontSize: 14,
fontWeight: "700",
color: "#17231E",
},
saveButton: {
backgroundColor: "#1F7655",
borderRadius: 16,
paddingVertical: 16,
alignItems: "center",
marginTop: 24,
},
saveButtonText: {
color: "#FFFFFF",
fontSize: 16,
fontWeight: "700",
},
deleteButton: {
backgroundColor: "#FFFFFF",
borderRadius: 16,
borderWidth: 1,
borderColor: "#F5D5D0",
paddingVertical: 16,
alignItems: "center",
marginTop: 12,
},
deleteButtonText: {
color: "#B33B31",
fontSize: 16,
fontWeight: "700",
},
helperText: {
fontSize: 12,
color: "#68736D",
marginTop: 6,
},
imageHelperText: {
fontSize: 13,
color: "#68736D",
lineHeight: 19,
marginBottom: 10,
},
imagePreviewContainer: {
marginBottom: 10,
},
imagePreview: {
width: "100%",
height: 190,
borderRadius: 16,
backgroundColor: "#E7F1EA",
},
removeImageButton: {
flexDirection: "row",
alignItems: "center",
alignSelf: "flex-start",
gap: 6,
marginTop: 8,
},
removeImageText: {
fontSize: 13,
fontWeight: "600",
color: "#B33B31",
},
chooseImageButton: {
minHeight: 48,
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
gap: 8,
paddingHorizontal: 14,
borderRadius: 14,
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: "#1F7655",
borderStyle: "dashed",
},
chooseImageButtonText: {
fontSize: 14,
fontWeight: "700",
color: "#1F7655",
},
});
