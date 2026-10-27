import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface Props {
  baseServings: number;
  servings: number;
  onChange: (value: number) => void;
}

export default function ServingControl({
  baseServings,
  servings,
  onChange,
}: Props) {
  return (
    <View className="rounded-3xl border border-recipe-border bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-recipe-muted">
            Cooking for
          </Text>
          <Text className="mt-1 text-sm text-recipe-muted">
            Recipe base: {baseServings} servings
          </Text>
        </View>
        <View className="flex-row items-center">
          <Pressable
            disabled={servings <= 1}
            onPress={() => onChange(Math.max(1, servings - 1))}
            className="h-11 w-11 items-center justify-center rounded-full bg-recipe-primary disabled:opacity-40"
          >
            <Ionicons name="remove" size={24} color="#fff" />
          </Pressable>
          <Text className="mx-5 text-2xl font-bold text-recipe-dark">
            {servings}
          </Text>
          <Pressable
            onPress={() => onChange(servings + 1)}
            className="h-11 w-11 items-center justify-center rounded-full bg-recipe-primary"
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
