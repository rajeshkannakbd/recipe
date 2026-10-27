import { Tabs, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import AuthGuard from "../../components/AuthGuard";

export default function AdminLayout() {
  const segments = useSegments();


  // Keep Recipes active while viewing the edit recipe screen.
  const isRecipeSection = segments.some(
    (segment) =>
      segment === "recipes" || segment === "edit-recipe"
  );

  return (
    <AuthGuard>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#1F7655",
            tabBarInactiveTintColor: "#7A837E",
            tabBarStyle: {
              height: 74,
              paddingTop: 7,
              paddingBottom: 9,
              backgroundColor: "#FFFFFF",
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
                <Ionicons
                  name="grid-outline"
                  size={size}
                  color={color as string}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="edit-recipe/[id]"
            options={{
              href: null,
              tabBarStyle: isRecipeSection
                ? {
                    height: 74,
                    paddingTop: 7,
                    paddingBottom: 9,
                    backgroundColor: "#FFFFFF",
                    borderTopColor: "#E5E8E3",
                  }
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
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="restaurant-outline"
                  size={size}
                  color={isRecipeSection ? "#1F7655" : (color as string)}
                />
              ),
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "700",
                color: isRecipeSection ? "#1F7655" : undefined,
              },
            }}
          />

          <Tabs.Screen
            name="categories"
            options={{
              title: "Categories",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="albums-outline"
                  size={size}
                  color={color as string}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="ingredients"
            options={{
              title: "Ingredients",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="leaf-outline"
                  size={size}
                  color={color as string}
                />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },
});