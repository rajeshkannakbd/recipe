import { Pressable, Text, View } from "react-native";
import type { CategoryResponse } from "../../types/category";
import { categoryColor, categoryLetter } from "../../utils/categoryColors";

interface Props {
  category: CategoryResponse;
  index: number;
  onPress: () => void;
}

export default function CategoryCard({ category, index, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 w-[48%] rounded-3xl border border-recipe-border bg-white p-3 active:opacity-80"
    >
      <View
        style={{ backgroundColor: categoryColor(index) }}
        className="h-24 items-center justify-center rounded-2xl"
      >
        <Text className="text-4xl font-bold text-recipe-dark">
          {categoryLetter(category.name)}
        </Text>
      </View>
      <Text numberOfLines={2} className="mt-3 text-lg font-bold text-recipe-dark">
        {category.name}
      </Text>
      <Text numberOfLines={2} className="mt-1 text-sm leading-5 text-recipe-muted">
        {category.description || "Explore recipes in this category"}
      </Text>
    </Pressable>
  );
}
