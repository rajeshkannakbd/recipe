import { ActivityIndicator, Text, View } from "react-native";

export default function ScreenLoader() {
  return (
    <View className="flex-1 items-center justify-center bg-recipe-background">
      <ActivityIndicator size="large" color="#1F7655" />
      <Text className="mt-3 text-sm text-recipe-muted">Loading...</Text>
    </View>
  );
}
