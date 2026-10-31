import { Ionicons } from "@expo/vector-icons";
import { TextInput, View, StyleSheet } from "react-native";

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color="#68736D" />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A938E"
        style={styles.input}
        multiline={false}
        numberOfLines={1}
        scrollEnabled={false}
        underlineColorAndroid="transparent"
        textAlignVertical="center"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    marginLeft: 10,
    padding: 0,
    fontSize: 14,
    color: "#25332B",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});