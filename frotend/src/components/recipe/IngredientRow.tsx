import { Image, Text, View } from "react-native";
import type { CalculatedIngredientResponse } from "../../types/recipe";
import { formatQuantity } from "../../utils/format";

interface Props {
  ingredient: CalculatedIngredientResponse;
}

export default function IngredientRow({ ingredient }: Props) {
  return (
    <View className="flex-row items-center border-b border-recipe-border py-4">
      <View className="h-12 w-12 overflow-hidden rounded-full bg-recipe-soft">
        {ingredient.ingredientPhotoUrl ? (
          <Image
            source={{ uri: ingredient.ingredientPhotoUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : null}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-recipe-dark">
          {ingredient.ingredientName}
        </Text>
        <Text className="mt-1 text-xs text-recipe-muted">
          base {formatQuantity(ingredient.baseQuantity)} {ingredient.unit}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-bold text-recipe-primary">
          {formatQuantity(ingredient.requiredQuantity)} {ingredient.unit}
        </Text>
      </View>
    </View>
  );
}
