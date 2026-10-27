import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userApi } from "../../api/userApi";
import AppText from "../../components/common/AppText";
import ScreenLoader from "../../components/common/ScreenLoader";
import type { User, UserRole } from "../../types/user";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../../types/user";

type FilterKey = "all" | "admin" | "hotel" | "user" | "inactive";

const ROLE_CONFIG: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: "#EBF4FF", text: "#2B6CB0" },
  hotel: { bg: "#FFFAEB", text: "#B54708" },
  user: { bg: "#ECFDF5", text: "#047857" },
};

const AVATAR_COLORS = [
  "#2B6CB0",
  "#B54708",
  "#047857",
  "#6B46C1",
  "#C53030",
  "#2C7A7B",
];

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("user");
  const [formPermissions, setFormPermissions] = useState<string[]>(["read"]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const data = await userApi.getAll();

      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);

      Alert.alert(
        "Error",
        "Failed to load users from the database. Please check your backend API.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("user");
    setFormPermissions(["read"]);
    setModalVisible(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormPermissions(DEFAULT_ROLE_PERMISSIONS[user.role] || ["read"]);
    setModalVisible(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormRole(role);
    setFormPermissions(DEFAULT_ROLE_PERMISSIONS[role] || ["read"]);
  };

  const togglePermission = (permId: string) => {
    setFormPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId],
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      Alert.alert("Validation", "Name and email are required");
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      Alert.alert("Validation", "Password is required for new users");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, {
          name: formName,
          email: formEmail,
          role: formRole,
        });
        await userApi.updatePermissions(editingUser.id, formPermissions);
        Alert.alert("Success", "User updated successfully");
      } else {
        await userApi.create({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        });
        Alert.alert("Success", "User created successfully");
      }
      setModalVisible(false);
      loadUsers();
    } catch {
      Alert.alert("Error", "Failed to save user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await userApi.update(user.id, { isActive: !user.isActive });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u,
        ),
      );
    } catch {
      Alert.alert("Error", "Failed to update user status");
    }
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await userApi.delete(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
            } catch {
              Alert.alert("Error", "Failed to delete user");
            }
          },
        },
      ],
    );
  };

  const toggleExpand = (userId: number) => {
    setExpandedId((prev) => (prev === userId ? null : userId));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId: number) =>
    AVATAR_COLORS[userId % AVATAR_COLORS.length];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (activeFilter) {
      case "all":
        return true;
      case "admin":
        return user.role === "admin";
      case "hotel":
        return user.role === "hotel";
      case "user":
        return user.role === "user";
      case "inactive":
        return !user.isActive;
      default:
        return true;
    }
  });

  const filterCounts: Record<FilterKey, number> = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    hotel: users.filter((u) => u.role === "hotel").length,
    user: users.filter((u) => u.role === "user").length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All ${filterCounts.all}` },
    { key: "admin", label: `Admin ${filterCounts.admin}` },
    { key: "hotel", label: `Hotel ${filterCounts.hotel}` },
    { key: "user", label: `User ${filterCounts.user}` },
    { key: "inactive", label: `Inactive ${filterCounts.inactive}` },
  ];

  if (loading) return <ScreenLoader />;

  const activeCount = users.filter((u) => u.isActive).length;
  const hotelCount = users.filter((u) => u.role === "hotel").length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A202C" />
        </Pressable>
        <AppText variant="pageTitle" style={styles.headerTitle}>Manage Users</AppText>
        <Pressable onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardActive]}>
            <AppText variant="sectionTitle" style={styles.statValue}>{users.length}</AppText>
            <AppText variant="helper" style={styles.statLabel}>Total Users</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText variant="sectionTitle" style={styles.statValue}>{activeCount}</AppText>
            <AppText variant="helper" style={styles.statLabel}>Active</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText variant="sectionTitle" style={styles.statValue}>{hotelCount}</AppText>
            <AppText variant="helper" style={styles.statLabel}>Hotels</AppText>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A0AEC0" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name or email"
            placeholderTextColor="#A0AEC0"
          />
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                activeFilter === f.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <AppText variant="label"
                style={[
                  styles.filterChipText,
                  activeFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        {/* User List */}
        <View style={styles.userList}>
          {filteredUsers.map((user) => {
            const rc = ROLE_CONFIG[user.role];
            const avatarColor = getAvatarColor(user.id);
            const isExpanded = expandedId === user.id;
            return (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userCardTop}>
                  <View
                    style={[
                      styles.userAvatar,
                      { backgroundColor: avatarColor },
                    ]}
                  >
                    <AppText variant="cardTitle" style={styles.userAvatarText}>
                      {getInitials(user.name)}
                    </AppText>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <AppText variant="cardTitle" style={styles.userName}>{user.name}</AppText>
                      <View
                        style={[styles.roleBadge, { backgroundColor: rc.bg }]}
                      >
                        <AppText variant="label"
                          style={[styles.roleBadgeText, { color: rc.text }]}
                        >
                          {user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="subtitle" style={styles.userEmail}>{user.email}</AppText>
                    <View style={styles.userMeta}>
                      <View style={styles.statusItem}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: user.isActive
                                ? "#38A169"
                                : "#E53E3E",
                            },
                          ]}
                        />
                        <AppText variant="helper"
                          style={[
                            styles.statusText,
                            { color: user.isActive ? "#38A169" : "#E53E3E" },
                          ]}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={styles.expandBtn}
                    onPress={() => toggleExpand(user.id)}
                  >
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#A0AEC0"
                    />
                  </Pressable>
                </View>

                {isExpanded && (
                  <View style={styles.userActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => openEditModal(user)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={15}
                        color="#4A5568"
                      />
                      <AppText variant="button" style={styles.actionBtnText}>Edit</AppText>
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleToggleActive(user)}
                    >
                      <Ionicons
                        name="pause-outline"
                        size={15}
                        color="#B54708"
                      />
                      <AppText variant="button" style={styles.actionBtnText}>Deactivate</AppText>
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(user)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#E53E3E"
                      />
                      <AppText variant="button" style={styles.actionBtnText}>Delete</AppText>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle" style={styles.modalTitle}>
                {editingUser ? "Edit User" : "New User"}
              </AppText>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#718096" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              <AppText variant="label" style={styles.fieldLabel}>Full Name</AppText>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. John Doe"
                placeholderTextColor="#A0AEC0"
              />

              <AppText variant="label" style={styles.fieldLabel}>Email Address</AppText>
              <TextInput
                style={styles.input}
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="e.g. john@example.com"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {!editingUser && (
                <>
                  <AppText variant="label" style={styles.fieldLabel}>Password</AppText>
                  <TextInput
                    style={styles.input}
                    value={formPassword}
                    onChangeText={setFormPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#A0AEC0"
                    secureTextEntry
                  />
                </>
              )}

              <AppText variant="label" style={styles.fieldLabel}>Role</AppText>
              <View style={styles.roleGrid}>
                {(["user", "hotel", "admin"] as UserRole[]).map((role) => {
                  const rc = ROLE_CONFIG[role];
                  const isActive = formRole === role;
                  return (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleOption,
                        isActive && {
                          backgroundColor: rc.bg,
                          borderColor: rc.text,
                        },
                      ]}
                      onPress={() => handleRoleChange(role)}
                    >
                      <AppText variant="button"
                        style={[
                          styles.roleOptionText,
                          isActive && { color: rc.text },
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="label" style={styles.fieldLabel}>Permissions</AppText>
              <View style={styles.permGrid}>
                {ALL_PERMISSIONS.map((perm) => {
                  const isSelected = formPermissions.includes(perm.id);
                  return (
                    <Pressable
                      key={perm.id}
                      style={[
                        styles.permChip,
                        isSelected && styles.permChipActive,
                      ]}
                      onPress={() => togglePermission(perm.id)}
                    >
                      <Ionicons
                        name={
                          isSelected ? "checkmark-circle" : "ellipse-outline"
                        }
                        size={14}
                        color={isSelected ? "#38A169" : "#A0AEC0"}
                      />
                      <AppText variant="label"
                        style={[
                          styles.permChipText,
                          isSelected && styles.permChipTextActive,
                        ]}
                      >
                        {perm.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                <AppText variant="button" style={styles.saveBtnText}>
                  {saving
                    ? "Saving..."
                    : editingUser
                      ? "Save Changes"
                      : "Create User"}
                </AppText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F7FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A202C" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 16,
    alignItems: "center",
  },
  statCardActive: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  statValue: {
    color: "#1A202C",
  },
  statLabel: {
    color: "#718096",
    marginTop: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1A202C", padding: 0 },
  filterRow: { gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#718096" },
  filterChipTextActive: { color: "#fff" },
  userList: { gap: 10 },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  userCardTop: { flexDirection: "row", alignItems: "flex-start" },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userAvatarText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontSize: 15, fontWeight: "700", color: "#1A202C" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: {
  },
  userEmail: { fontSize: 13, color: "#718096", marginTop: 2 },
  userMeta: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  expandBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  userActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F7FAFC",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: "#4A5568" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1A202C" },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F7FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { paddingBottom: 8 },
  fieldLabel: {
    color: "#4A5568",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A202C",
  },
  roleGrid: { flexDirection: "row", gap: 8 },
  roleOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F7FAFC",
  },
  roleOptionText: { fontSize: 14, fontWeight: "600", color: "#718096" },
  permGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  permChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F7FAFC",
  },
  permChipActive: { backgroundColor: "#ECFDF5", borderColor: "#38A169" },
  permChipText: { fontSize: 13, fontWeight: "500", color: "#718096" },
  permChipTextActive: { color: "#047857", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#047857",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
