import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface Props {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <View className="items-center justify-center rounded-3xl border border-recipe-border bg-white px-6 py-12">
      <Ionicons name="restaurant-outline" size={42} color="#1F7655" />
      <Text className="mt-4 text-lg font-bold text-recipe-dark">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm leading-5 text-recipe-muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
