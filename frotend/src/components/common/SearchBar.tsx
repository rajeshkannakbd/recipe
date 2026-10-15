import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  return (
    <View className="h-10 flex-row items-center rounded-2xl border border-recipe-border bg-white px-4">
      <Ionicons name="search-outline" size={16} color="#68736D " />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A938E"
        className="ml-3 flex-1 text-base text-recipe-dark outline-none"
      />
    </View>
  );
}
