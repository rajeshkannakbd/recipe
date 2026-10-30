import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/common/AppText";

interface MenuItem {
  id: number;
  name: string;
  enabled: boolean;
  icon: string;
}

const defaultMenuItems: MenuItem[] = [
  { id: 1, name: "Dashboard", enabled: true, icon: "grid-outline" },
  { id: 2, name: "Recipes", enabled: true, icon: "restaurant-outline" },
  { id: 3, name: "Ingredients", enabled: true, icon: "leaf-outline" },
  { id: 4, name: "Inventory", enabled: false, icon: "cube-outline" },
  { id: 5, name: "Users", enabled: true, icon: "people-outline" },
  { id: 6, name: "Reports", enabled: false, icon: "bar-chart-outline" },
  { id: 7, name: "Settings", enabled: true, icon: "settings-outline" },
];

export default function AdminMenuScreen() {
  const [menuItems, setMenuItems] = useState(defaultMenuItems);

  const toggleMenuItem = (id: number) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => { }} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#17231E" />
        </Pressable>
        <AppText variant="pageTitle" style={styles.title}>Menu Management</AppText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.menuCard}>
          <View style={styles.menuHeader}>
            <AppText variant="cardTitle" style={styles.menuTitle}>Dashboard</AppText>
            <View style={styles.toggleActive}>
              <View style={styles.toggleKnob} />
            </View>
          </View>
        </View>

        {menuItems.map((item) => (
          <Pressable
            key={item.id}
            style={styles.menuItem}
            onPress={() => toggleMenuItem(item.id)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color="#1F7655" />
              </View>
              <AppText variant="body" style={styles.menuItemText}>{item.name}</AppText>
            </View>
            <View style={[styles.toggle, item.enabled && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleKnob,
                  item.enabled && styles.toggleKnobActive,
                ]}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E8E3",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#17231E" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 16,
    marginBottom: 16,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuTitle: { fontSize: 16, fontWeight: "700", color: "#17231E" },
  toggleActive: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1F7655",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 16,
    marginBottom: 12,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: { fontSize: 16, fontWeight: "600", color: "#17231E" },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E8E3",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  toggleKnobActive: { backgroundColor: "#fff" },
});
