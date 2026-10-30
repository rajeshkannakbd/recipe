
import { Tabs, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AuthGuard from "../../components/AuthGuard";


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

export default function AdminLayout() {
  const segments = useSegments();
  const tabBarStyle = useTabBarStyle();

  // Keep Recipes active while viewing the edit recipe screen.
  const isRecipeSection = segments.some(
    (segment) => segment === "recipes" || segment === "edit-recipe"
  );

  return (
    <AuthGuard>
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
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: icon("grid", "grid-outline"),
          }}
        />

        <Tabs.Screen
          name="edit-recipe/[id]"
          options={{
            href: null,
            tabBarStyle: isRecipeSection
              ? tabBarStyle
              : { display: "none" },
          }}
        />

        <Tabs.Screen name="metadata" options={{ href: null }} />
        <Tabs.Screen name="category-recipes" options={{ href: null }} />
        <Tabs.Screen name="menu" options={{ href: null }} />
        <Tabs.Screen name="roles" options={{ href: null }} />
        <Tabs.Screen name="users" options={{ href: null }} />

        <Tabs.Screen
          name="recipes"
          options={{
            title: "Recipes",
            tabBarIcon: ({ size }) => (
              <Ionicons
                name={isRecipeSection ? "restaurant" : "restaurant-outline"}
                size={size}
                color={isRecipeSection ? TAB_ACTIVE : TAB_INACTIVE}
              />
            ),
            tabBarLabelStyle: {
              ...tabBarLabelStyle,
              color: isRecipeSection ? TAB_ACTIVE : TAB_INACTIVE,
            },
          }}
        />

        <Tabs.Screen
          name="categories"
          options={{
            title: "Categories",
            tabBarIcon: icon("albums", "albums-outline"),
          }}
        />

        <Tabs.Screen
          name="ingredients"
          options={{
            title: "Ingredients",
            tabBarIcon: icon("leaf", "leaf-outline"),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
