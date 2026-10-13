import { useState, useCallback, useEffect } from "react";

import {

  View,

  Text,

  Pressable,

  StyleSheet,

  ScrollView,

  ImageBackground,

} from "react-native";

import { Alert, Platform, Modal } from "react-native";

import { clearAuthData } from "../../utils/authStorage";



import { useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";



import { recipeApi } from "../../api/recipeApi";

import { ingredientApi } from "../../api/ingredientApi";

import { categoryApi } from "../../api/categoryApi";



import type { RecipeResponse } from "../../types/recipe";

import type { IngredientResponse } from "../../types/ingredient";

import type { CategoryResponse } from "../../types/category";



import ScreenLoader from "../../components/common/ScreenLoader";



export default function AdminDashboardScreen() {

  const router = useRouter();





  const [recipes, setRecipes] =

    useState<RecipeResponse[]>([]);



  const [ingredients, setIngredients] =

    useState<IngredientResponse[]>([]);



  const [categories, setCategories] =

    useState<CategoryResponse[]>([]);



  const [loading, setLoading] = useState(true);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);



  /* =====================================================

     ADMIN LOGOUT

  ===================================================== */



  const performLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await clearAuthData();
      setLogoutModalVisible(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Unable to logout. Please try again.");
      } else {
        Alert.alert("Error", "Unable to logout. Please try again.");
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const load = useCallback(async () => {

    try {

      const [recs, ings, cats] = await Promise.all([

        recipeApi.getAll(),

        ingredientApi.getAll(),

        categoryApi.getAll(),

      ]);



      setRecipes(recs);

      setIngredients(ings);

      setCategories(cats);

    } catch (e) {

      console.error(e);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    load();

  }, [load]);



  /* =====================================================

     LOADING

  ===================================================== */



  if (loading) {

    return <ScreenLoader />;

  }



  /* =====================================================

     DASHBOARD STATS

  ===================================================== */



const stats = [

  {

    label: "Total Recipes",

    value: recipes.length,

    route: "/admin/recipes",

    imageUrl:

      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",

  },

  {

    label: "Total Ingredients",

    value: ingredients.length,

    route: "/admin/ingredients",

    imageUrl:

      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80",

  },

  {

    label: "Total Users",

    value: 40,

    route: null,

    imageUrl:

      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",

  },

  {

    label: "Active Categories",

    value: categories.length,

    route: "/admin/categories",

    imageUrl:

      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=80",

  },

];



  /* =====================================================

     QUICK ACTIONS

  ===================================================== */



  const quickActions = [

    {

      label: "Create New Recipe",

      icon: "add-circle-outline",

      color: "#E91E63",

      bgColor: "#FCE4EC",

      route: "/admin/edit-recipe/new",

    },



    {

      label: "Manage Ingredients",

      icon: "leaf-outline",

      color: "#1F7655",

      bgColor: "#E7F1EA",

      route: "/admin/ingredients",

    },



    {

      label: "Manage Categories",

      icon: "grid-outline",

      color: "#FF9800",

      bgColor: "#FFF3E0",

      route: "/admin/categories",

    },



    {

      label: "Manage Recipies",

      icon: "restaurant-outline",

      color: "#2196F3",

      bgColor: "#E3F2FD",

      route: "/admin/recipes",

    },



    // {

    //   label: "Roles & Permissions",

    //   icon: "shield-checkmark-outline",

    //   color: "#9C27B0",

    //   bgColor: "#F3E5F5",

    //   route: "/admin/roles",

    // },

  ];



  /* =====================================================

     SCREEN

  ===================================================== */



  return (

    <SafeAreaView

      style={styles.container}

      edges={["top"]}

    >

      <ScrollView

        showsVerticalScrollIndicator={false}

        contentContainerStyle={styles.scrollContent}

      >



        {/* =================================================

            HEADER

        ================================================== */}



        <View style={styles.header}>

          <View>

            <Text style={styles.title}>

              Admin Dashboard

            </Text>



            <Text style={styles.subtitle}>

              Manage your recipe platform

            </Text>

          </View>



          {/* <Pressable

            style={styles.notificationButton}

          >

            <Ionicons

              name="notifications-outline"

              size={24}

              color="#17231E"

            />

          </Pressable> */}

        </View>



        {/* =================================================

            STATISTICS

        ================================================== */}



<View style={styles.statsGrid}>

  {stats.map((stat, index) => (

    <Pressable

      key={index}

      style={styles.statCard}

      onPress={() => {

        if (stat.route) {

          router.push(stat.route as any);

        }

      }}

      disabled={!stat.route}

    >

      <ImageBackground

        source={{ uri: stat.imageUrl }}

        style={styles.statCard}

        imageStyle={styles.statCardImage}

        resizeMode="cover"

      >

        <View style={styles.statOverlay}>

          <Text style={styles.statValue}>

            {stat.value}

          </Text>



          <Text style={styles.statLabel}>

            {stat.label}

          </Text>

        </View>

      </ImageBackground>

    </Pressable>

  ))}

</View>

        {/* =================================================

            QUICK ACTIONS HEADER

        ================================================== */}



        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>

            Quick Actions

          </Text>

        </View>



        {/* =================================================

            QUICK ACTIONS

        ================================================== */}



        <View style={styles.actionsList}>

          {quickActions.map(

            (action, index) => (

              <Pressable

                key={index}

                style={styles.actionItem}

                onPress={() =>

                  router.push(

                    action.route as any

                  )

                }

              >



                {/* ACTION ICON */}



                <View

                  style={[

                    styles.actionIcon,

                    {

                      backgroundColor:

                        action.bgColor,

                    },

                  ]}

                >

                  <Ionicons

                    name={action.icon as any}

                    size={22}

                    color={action.color}

                  />

                </View>



                {/* ACTION NAME */}



                <Text

                  style={styles.actionLabel}

                >

                  {action.label}

                </Text>



                {/* ARROW */}



                <Ionicons

                  name="chevron-forward"

                  size={20}

                  color="#C5C9C4"

                />



              </Pressable>

            )

          )}

        </View>



        {/* LOGOUT BUTTON */}

        <Pressable

          style={styles.logoutButton}

          onPress={handleLogout}

          accessibilityRole="button"

        >

          <Ionicons

            name="log-out-outline"

            size={22}

            color="#D32F2F"

          />



          <Text style={styles.logoutButtonText}>

            Logout

          </Text>

        </Pressable>



      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!loggingOut) setLogoutModalVisible(false);
        }}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={30} color="#B33B31" />
            </View>

            <Text style={styles.logoutModalTitle}>Logout?</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.logoutModalActions}>
              <Pressable
                style={styles.logoutCancelButton}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.logoutConfirmButton}
                onPress={() => void performLogout()}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <Text style={styles.logoutConfirmText}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>

  );

}



/* =====================================================

   STYLES

\===================================================== */



const styles = StyleSheet.create({



  /* ===================================================

     MAIN CONTAINER

  ==================================================== */



  container: {

    flex: 1,

    backgroundColor: "#F7F8F3",

  },



  scrollContent: {

    paddingHorizontal: 20,

    paddingBottom: 40,

  },



  /* ===================================================

     HEADER

  ==================================================== */



  header: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingTop: 8,

    paddingBottom: 20,

  },



  title: {

    fontSize: 28,

    fontWeight: "800",

    color: "#17231E",

  },



  subtitle: {

    fontSize: 14,

    color: "#68736D",

    marginTop: 4,

  },



  /* ===================================================

     NOTIFICATION

  ==================================================== */



  notificationButton: {

    width: 44,

    height: 44,

    borderRadius: 14,

    backgroundColor: "#fff",

    borderWidth: 1,

    borderColor: "#E5E8E3",

    alignItems: "center",

    justifyContent: "center",

  },



  /* ===================================================

     STATS GRID

  ==================================================== */



  statsGrid: {

    flexDirection: "row",

    flexWrap: "wrap",

    gap: 12,

    marginBottom: 24,

  },



  /* ===================================================

     STAT CARD

  ==================================================== */



  statCard: {

    flex: 1,

    minWidth: "47%",

    height: 150,

    borderRadius: 20,

    overflow: "hidden",

    borderWidth: 1,

    borderColor: "#E5E8E3",

  },



  statCardImage: {

    borderRadius: 20,

  },



  statOverlay: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: 16,



    // Dark overlay keeps the text visible

    backgroundColor:

      "rgba(0, 0, 0, 0.42)",

  },



  statIcon: {

    width: 48,

    height: 48,

    borderRadius: 14,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 8,

  },





statValue: {

  fontSize: 32,

  fontWeight: "800",

  color: "#fff",

  textShadow: "0px 1px 3px rgba(0, 0, 0, 0.65)",

},



statLabel: {

  fontSize: 16,

  fontWeight: "700",

  color: "#fff",

  marginTop: 2,

  textAlign: "center",

  textShadow: "0px 1px 3px rgba(0, 0, 0, 0.65)",

},

  /* ===================================================

     SECTION HEADER

  ==================================================== */



  sectionHeader: {

    marginBottom: 12,

  },



  sectionTitle: {

    fontSize: 18,

    fontWeight: "700",

    color: "#17231E",

  },



  /* ===================================================

     ACTIONS

  ==================================================== */



  actionsList: {

    backgroundColor: "#fff",

    borderRadius: 24,

    borderWidth: 1,

    borderColor: "#E5E8E3",

    overflow: "hidden",

  },



  actionItem: {

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 16,

    paddingVertical: 14,

    borderBottomWidth: 1,

    borderBottomColor: "#F0F2ED",

  },



  actionIcon: {

    width: 40,

    height: 40,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,

  },



  actionLabel: {

    flex: 1,

    fontSize: 15,

    fontWeight: "600",

    color: "#17231E",

  },



  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  logoutModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },

  logoutIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  logoutModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    textAlign: "center",
  },

  logoutModalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: "#68736D",
    textAlign: "center",
    marginTop: 8,
  },

  logoutModalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 24,
  },

  logoutCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17231E",
  },

  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#B33B31",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  logoutButton: {

  flexDirection: "row",

  alignItems: "center",

  justifyContent: "center",

  backgroundColor: "#FCE8E6",

  borderWidth: 1,

  borderColor: "#F5C6C2",

  borderRadius: 16,

  paddingVertical: 16,

  marginTop: 20,

  marginBottom: 20,

  gap: 10,

  },



  logoutButtonText: {

    fontSize: 16,

    fontWeight: "700",

    color: "#D32F2F",

  },



});