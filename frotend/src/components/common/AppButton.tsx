import { ActivityIndicator, Pressable, Text } from "react-native";
import AppText from "./AppText";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  loading?: boolean;
  disabled?: boolean;
}

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: Props) {
  const bg =
    variant === "primary"
      ? "bg-recipe-primary"
      : variant === "secondary"
        ? "bg-recipe-soft"
        : variant === "danger"
          ? "bg-red-50"
          : "bg-white";

  const text =
    variant === "danger"
      ? "text-red-700"
      : variant === "outline"
        ? "text-recipe-primary"
        : variant === "secondary"
          ? "text-recipe-primary"
          : "text-white";

  const border = variant === "outline" ? "border border-recipe-primary" : "";

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-12 items-center justify-center rounded-2xl px-5 ${bg} ${border} ${disabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#1F7655"} />
      ) : (
        <AppText variant="button" className={`text-base font-bold ${text}`}>{title}</AppText>
      )}
    </Pressable>
  );
}
