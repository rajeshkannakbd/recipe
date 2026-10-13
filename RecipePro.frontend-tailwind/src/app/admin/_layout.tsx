import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1F7655",
        tabBarInactiveTintColor: "#7A837E",
        tabBarStyle: {
          height: 74,
          paddingTop: 7,
          paddingBottom: 9,
          backgroundColor: "#fff",
          borderTopColor: "#E5E8E3",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="edit-recipe/[id]"
        options={{ href: null }}
      />
        <Tabs.Screen
        name="category-recipes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="menu"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="roles"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="users"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ingredients"
        options={{
          title: "Ingredients",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
