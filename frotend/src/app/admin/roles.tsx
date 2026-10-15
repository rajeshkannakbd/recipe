import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

const defaultRoles: Role[] = [
  { id: 1, name: "Admin", description: "Full system access", permissions: ["create", "read", "update", "delete", "manage_users", "manage_roles"] },
  { id: 2, name: "Hotel/Mess", description: "Manage own recipes and inventory", permissions: ["create", "read", "update", "delete"] },
  { id: 3, name: "User", description: "View public recipes only", permissions: ["read"] },
];

export default function AdminRolesScreen() {
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const openModal = (id?: number) => {
    if (id) {
      const role = defaultRoles.find((r) => r.id === id);
      setEditingId(id);
      setRoleName(role?.name || "");
      setRoleDescription(role?.description || "");
    } else {
      setEditingId(null);
      setRoleName("");
      setRoleDescription("");
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!roleName.trim()) {
      Alert.alert("Validation", "Role name is required");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setModalVisible(false);
      Alert.alert("Success", "Role saved successfully");
    }, 500);
  };

  const allPermissions = ["create", "read", "update", "delete", "manage_users", "manage_roles"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => {}} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#17231E" />
        </Pressable>
        <Text style={styles.title}>Roles & Permissions</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabContainer}>
        <Pressable style={[styles.tab, activeTab === "roles" && styles.tabActive]} onPress={() => setActiveTab("roles")}>
          <Text style={[styles.tabText, activeTab === "roles" && styles.tabTextActive]}>Roles</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === "permissions" && styles.tabActive]} onPress={() => setActiveTab("permissions")}>
          <Text style={[styles.tabText, activeTab === "permissions" && styles.tabTextActive]}>Permissions</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === "roles" ? (
          <>
            {defaultRoles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <View style={styles.roleIcon}>
                    <Ionicons name={role.name === "Admin" ? "shield-checkmark" : role.name === "Hotel/Mess" ? "business" : "person"} size={24} color="#1F7655" />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                  <Pressable onPress={() => openModal(role.id)}>
                    <Ionicons name="create-outline" size={20} color="#53605A" />
                  </Pressable>
                </View>
                <View style={styles.permissionsList}>
                  {role.permissions.map((perm) => (
                    <View key={perm} style={styles.permissionChip}>
                      <Text style={styles.permissionText}>{perm}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={() => openModal()}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create Role</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.permissionsCard}>
            <Text style={styles.permissionsTitle}>All Permissions</Text>
            {allPermissions.map((perm) => (
              <View key={perm} style={styles.permissionRow}>
                <Ionicons name="checkmark-circle" size={20} color="#1F7655" />
                <Text style={styles.permissionRowText}>{perm}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Role" : "New Role"}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#17231E" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Role Name</Text>
            <TextInput style={styles.input} value={roleName} onChangeText={setRoleName} placeholder="Role name" placeholderTextColor="#8A938E" />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={roleDescription} onChangeText={setRoleDescription} placeholder="Role description" placeholderTextColor="#8A938E" multiline numberOfLines={3} />
            <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : editingId ? "Save Changes" : "Create Role"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E8E3", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: "#17231E" },
  tabContainer: { flexDirection: "row", marginHorizontal: 20, backgroundColor: "#E7F1EA", borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#68736D" },
  tabTextActive: { color: "#17231E" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  roleCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#E5E8E3", padding: 16, marginBottom: 12 },
  roleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E7F1EA", alignItems: "center", justifyContent: "center", marginRight: 12 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 16, fontWeight: "700", color: "#17231E" },
  roleDescription: { fontSize: 13, color: "#68736D", marginTop: 2 },
  permissionsList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  permissionChip: { backgroundColor: "#E7F1EA", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  permissionText: { fontSize: 12, fontWeight: "600", color: "#1F7655" },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#1F7655", borderRadius: 16, paddingVertical: 16, gap: 8, marginTop: 8 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  permissionsCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#E5E8E3", padding: 20 },
  permissionsTitle: { fontSize: 18, fontWeight: "700", color: "#17231E", marginBottom: 16 },
  permissionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F2ED" },
  permissionRowText: { fontSize: 15, fontWeight: "600", color: "#17231E", textTransform: "capitalize" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#F7F8F3", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#17231E" },
  inputLabel: { fontSize: 14, fontWeight: "700", color: "#17231E", marginBottom: 8 },
  input: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#E5E8E3", paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: "#17231E", marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: "top" },
  saveButton: { backgroundColor: "#1F7655", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
