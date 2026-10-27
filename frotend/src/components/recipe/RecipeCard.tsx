import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import type { RecipeResponse } from "../../types/recipe";
import { categoryColor, categoryLetter } from "../../utils/categoryColors";
import { statusLabel } from "../../utils/format";

interface Props {
  recipe: RecipeResponse;
  index?: number;
  onPress: () => void;
  admin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function RecipeCard({
  recipe,
  index = 0,
  onPress,
  admin = false,
  onEdit,
  onDelete,
}: Props) {
  const status = statusLabel(recipe.status);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row rounded-3xl border border-recipe-border bg-white p-3 active:opacity-80"
    >
      <View
        style={{ backgroundColor: categoryColor(index) }}
        className="h-24 w-24 items-center justify-center overflow-hidden rounded-2xl"
      >
        {recipe.photoUrl ? (
          <Image
            source={{ uri: recipe.photoUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-3xl font-bold text-recipe-dark">
            {categoryLetter(recipe.name)}
          </Text>
        )}
      </View>

      <View className="ml-4 flex-1 justify-center">
        <Text numberOfLines={2} className="text-lg font-bold text-recipe-dark">
          {recipe.name}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-sm text-recipe-muted">
          {recipe.categoryName} · Serves {recipe.baseServings}
        </Text>
        <View className="mt-2 flex-row items-center">
          <View
            className={`rounded-full px-3 py-1 ${status === "Published" ? "bg-recipe-soft" : "bg-amber-100"}`}
          >
            <Text
              className={`text-xs font-bold ${status === "Published" ? "text-recipe-primary" : "text-amber-800"}`}
            >
              {status}
            </Text>
          </View>
        </View>
      </View>

      {admin ? (
        <View className="ml-2 justify-center">
          <Pressable onPress={onEdit} className="mb-3 p-2">
            <Ionicons name="create-outline" size={22} color="#53605A" />
          </Pressable>
          <Pressable onPress={onDelete} className="p-2">
            <Ionicons name="trash-outline" size={22} color="#B33B31" />
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}
