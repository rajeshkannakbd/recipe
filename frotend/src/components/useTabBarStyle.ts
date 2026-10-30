import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_ACTIVE = "#1F7655";
export const TAB_INACTIVE = "#7A837E";

export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  // Android 3-button nav reports its height here; small fallback otherwise.
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 8);

  return {
    height: 60 + bottom,
    paddingTop: 8,
    paddingBottom: bottom,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: "#0B2E22",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 14,
  } as const;
}

export const tabBarLabelStyle = {
  fontFamily: "BricolageGrotesque_600SemiBold",
  fontSize: 11,
  marginTop: 2,
} as const;