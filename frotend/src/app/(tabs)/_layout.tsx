import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useTabBarStyle,
  tabBarLabelStyle,
  TAB_ACTIVE,
  TAB_INACTIVE,
} from "../../components/useTabBarStyle";
  

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const icon =
  (active: IconName, inactive: IconName) =>
  ({ color, size, focused }: { color: string; size: number; focused: boolean }) =>
    <Ionicons name={focused ? active : inactive} size={size} color={color} />;

export default function TabsLayout() {
  const tabBarStyle = useTabBarStyle();

  return (
     
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen name="function-plan-detail" options={{ href: null }} />
      <Tabs.Screen
        name="categories"
        options={{ title: "Home", tabBarIcon: icon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="all-recipes"
        options={{ title: "All Recipes", tabBarIcon: icon("restaurant", "restaurant-outline") }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: "Favorites", tabBarIcon: icon("heart", "heart-outline") }}
      />
      <Tabs.Screen
        name="function-planner"
        options={{ title: "Event's", tabBarIcon: icon("calendar", "calendar-outline") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: icon("person", "person-outline") }}
      />
    </Tabs>
    
  );
}