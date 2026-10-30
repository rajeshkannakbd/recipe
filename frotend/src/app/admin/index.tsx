import AdminDashboardSkeleton from "@/components/skeleton/AdminDashboardSkeleton";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { categoryApi } from "../../api/categoryApi";
import { ingredientApi } from "../../api/ingredientApi";
import { recipeApi } from "../../api/recipeApi";
import AppText from "../../components/common/AppText";
import type { CategoryResponse } from "../../types/category";
import type { IngredientResponse } from "../../types/ingredient";
import type { RecipeResponse } from "../../types/recipe";
import { clearAuthData } from "../../utils/authStorage";

type ActionItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  tone: string;
  tint: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  // Entrance animation for dashboard content; the top bar remains fixed.
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(14)).current;

  // Hero slideshow: changes image every 4 seconds with a smooth crossfade.
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const heroImageOpacity = useRef(new Animated.Value(1)).current;
  const heroImages = [
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1400&q=85",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=85",
  ];

  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [ingredients, setIngredients] = useState<IngredientResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (loading) return;

    screenOpacity.setValue(0);
    screenTranslateY.setValue(14);

    const entrance = Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();
    return () => entrance.stop();
  }, [loading, screenOpacity, screenTranslateY]);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      Animated.timing(heroImageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;

        setHeroImageIndex((current) => (current + 1) % heroImages.length);

        Animated.timing(heroImageOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => {
      clearInterval(interval);
      heroImageOpacity.stopAnimation();
    };
  }, [loading, heroImageOpacity, heroImages.length]);

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    try {
      const [recipeData, ingredientData, categoryData] = await Promise.all([
        recipeApi.getAll(),
        ingredientApi.getAll(),
        categoryApi.getAll(),
      ]);
      setRecipes(recipeData);
      setIngredients(ingredientData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Unable to load admin dashboard:", error);
      if (Platform.OS === "web" && typeof globalThis.alert === "function") {
        globalThis.alert("Unable to refresh dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  const performLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await clearAuthData();
      setLogoutModalVisible(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      if (Platform.OS === "web" && typeof globalThis.alert === "function") {
        globalThis.alert("Unable to logout. Please try again.");
      } else {
        Alert.alert("Error", "Unable to logout. Please try again.");
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const actions: ActionItem[] = [
    {
      title: "Create a recipe",
      subtitle: "Add a new recipe to your collection",
      icon: "add-circle-outline",
      route: "/admin/edit-recipe/new",
      tone: "#176747",
      tint: "#E5F3E9",
    },
    {
      title: "Manage recipes",
      subtitle: "Edit recipes and publishing status",
      icon: "restaurant-outline",
      route: "/admin/recipes",
      tone: "#9A5B17",
      tint: "#FFF1DA",
    },
    {
      title: "Manage ingredients",
      subtitle: "Maintain ingredient names and data",
      icon: "leaf-outline",
      route: "/admin/ingredients",
      tone: "#2874A6",
      tint: "#E6F2FC",
    },
    {
      title: "Manage categories",
      subtitle: "Organize your recipe collection",
      icon: "grid-outline",
      route: "/admin/categories",
      tone: "#7854A5",
      tint: "#F0EAFE",
    },
    {
      title: "Recipe & Chef Directory",
      subtitle: "Manage chefs, cooking styles, cuisines and recipe tags",
      icon: "options-outline",
      route: "/admin/metadata",
      tone: "#0F766E",
      tint: "#DDF5F0",
    },
  ];

  const recentRecipes = [...recipes].slice(-4).reverse();
  const publishedCount = recipes.filter(
    (recipe) =>
      String((recipe as any).status).toLowerCase() === "published" ||
      Number((recipe as any).status) === 2,
  ).length;

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: Platform.OS === "web" ? 8 : 8 },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Image source={require('../../../assets/logo1.png')} style={styles.logoImage} />
          </View>
          <View>
            <AppText variant="pageTitle" style={styles.brandName}>RecipePro</AppText>
            <AppText variant="label" style={styles.brandCaption}>ADMIN WORKSPACE</AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={styles.topLogoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Ionicons name="log-out-outline" size={19} color="#f17618" />
        </Pressable>
      </View>

      <Animated.ScrollView
        style={{
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor="#176747"
            colors={["#176747"]}
          />
        }
      >
        <View style={styles.greetingBlock}>
          <AppText variant="label" style={styles.eyebrow}>OVERVIEW</AppText>
          <AppText variant="pageTitle" style={styles.pageTitle}>Good to see you, Admin.</AppText>
          <AppText variant="subtitle" style={styles.pageSubtitle}>
            Here’s what’s happening with your recipe platform.
          </AppText>
        </View>

        <View style={styles.heroBanner}>
          <Animated.Image
            source={{ uri: heroImages[heroImageIndex] }}
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const,
              styles.heroImage,
              { opacity: heroImageOpacity },
            ]}
            resizeMode="cover"
          />
          <View style={styles.heroShade}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles-outline" size={13} color="#E4F6E9" />
                <AppText variant="label" style={styles.heroBadgeText}>
                  YOUR KITCHEN, ORGANIZED
                </AppText>
              </View>
              <AppText variant="pageTitle"
                style={[styles.heroTitle, compact && styles.heroTitleCompact]}
              >
                Build something{"\n"}delicious today.
              </AppText>
              <AppText variant="body" style={styles.heroDescription}>
                Create, organize and publish recipes in one place.
              </AppText>
              <Pressable
                style={styles.heroButton}
                onPress={() => router.push("/admin/edit-recipe/new" as any)}
              >
                <AppText variant="button" style={styles.heroButtonText}>Create recipe</AppText>
                <Ionicons name="chevron-forward" size={16} color="#174A34" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>Platform overview</AppText>
            <AppText variant="subtitle" style={styles.sectionSubtitle}>Your content at a glance</AppText>
          </View>
          {/* <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText variant="label" style={styles.liveBadgeText}>LIVE DATA</AppText>
          </View> */}
        </View>

        <View style={styles.statsGrid}>
          <Pressable
            style={[styles.statCard, styles.statCardGreen]}
            onPress={() => router.push("/admin/recipes" as any)}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIcon, { backgroundColor: "#D8EDE0" }]}>
                <Ionicons name="restaurant-outline" size={20} color="#176747" />
              </View>
              <Feather name="arrow-up-right" size={18} color="#719080" />
            </View>
            <AppText variant="sectionTitle" style={styles.statValue}>{recipes.length}</AppText>
            <AppText variant="label" style={styles.statLabel}>Total recipes</AppText>
            <AppText variant="helper" style={styles.statFoot}>{publishedCount} published</AppText>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => router.push("/admin/ingredients" as any)}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIcon, { backgroundColor: "#E2EFFC" }]}>
                <Ionicons name="leaf-outline" size={20} color="#2874A6" />
              </View>
              <Feather name="arrow-up-right" size={18} color="#9BA69F" />
            </View>
            <AppText variant="sectionTitle" style={styles.statValue}>{ingredients.length}</AppText>
            <AppText variant="label" style={styles.statLabel}>Ingredients</AppText>
            <AppText variant="helper" style={styles.statFoot}>Available in your library</AppText>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => router.push("/admin/categories" as any)}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIcon, { backgroundColor: "#F0EAFE" }]}>
                <Ionicons name="grid-outline" size={20} color="#7854A5" />
              </View>
              <Feather name="arrow-up-right" size={18} color="#9BA69F" />
            </View>
            <AppText variant="sectionTitle" style={styles.statValue}>{categories.length}</AppText>
            <AppText variant="label" style={styles.statLabel}>Categories</AppText>
            <AppText variant="helper" style={styles.statFoot}>Organize your recipes</AppText>
          </Pressable>

          <View style={[styles.statCard, styles.statCardWarm]}>
            <View style={styles.statTopRow}>
              <View style={[styles.statIcon, { backgroundColor: "#FFF0D8" }]}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={20}
                  color="#9A5B17"
                />
              </View>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#B59A73"
              />
            </View>
            <AppText variant="sectionTitle" style={styles.statValue}>{publishedCount}</AppText>
            <AppText variant="label" style={styles.statLabel}>Published recipes</AppText>
            <AppText variant="helper" style={styles.statFoot}>Visible to your audience</AppText>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>Quick actions</AppText>
            <AppText variant="subtitle" style={styles.sectionSubtitle}>
              Jump straight into your workflow
            </AppText>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.title}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={styles.actionRowContent}>
                <View
                  style={[styles.actionIcon, { backgroundColor: action.tint }]}
                >
                  <Ionicons name={action.icon} size={22} color={action.tone} />
                </View>
                <View style={styles.actionCopy}>
                  <AppText variant="cardTitle" style={styles.actionTitle}>{action.title}</AppText>
                  <AppText variant="subtitle" style={styles.actionSubtitle}>{action.subtitle}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9AA69F" />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>Recently added recipes</AppText>
            <AppText variant="subtitle" style={styles.sectionSubtitle}>
              Your latest recipe collection
            </AppText>
          </View>
          <Pressable
            style={styles.viewAllButton}
            onPress={() => router.push("/admin/recipes" as any)}
          >
            <AppText variant="button" style={styles.viewAllText}>View all</AppText>
            <Ionicons name="chevron-forward" size={14} color="#176747" />
          </Pressable>
        </View>

        {recentRecipes.length > 0 ? (
          <View style={styles.recentList}>
            {recentRecipes.map((recipe, index) => {
              const recipeImage = (recipe as any).photoUrl;
              const categoryName = (recipe as any).categoryName || "Recipe";
              const isPublished =
                String((recipe as any).status).toLowerCase() === "published" ||
                Number((recipe as any).status) === 2;
              return (
                <Pressable
                  key={recipe.id}
                  style={({ pressed }) => [
                    styles.recentItem,
                    index === recentRecipes.length - 1 && styles.recentItemLast,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() =>
                    router.push(`/admin/edit-recipe/${recipe.id}` as any)
                  }
                >
                  <View style={styles.recentRowContent}>
                    {recipeImage ? (
                      <Image
                        source={{ uri: recipeImage }}
                        style={styles.recentImage}
                      />
                    ) : (
                      <View
                        style={[styles.recentImage, styles.recentImageFallback]}
                      >
                        <Ionicons
                          name="restaurant-outline"
                          size={24}
                          color="#6C9A7D"
                        />
                      </View>
                    )}
                    <View style={styles.recentCopy}>
                      <AppText variant="cardTitle" style={styles.recentName} numberOfLines={1}>
                        {recipe.name}
                      </AppText>
                      <AppText variant="subtitle" style={styles.recentCategory} numberOfLines={1}>
                        {categoryName}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isPublished ? styles.statusPublished : styles.statusDraft,
                      ]}
                    >
                      <AppText variant="label"
                        style={[
                          styles.statusPillText,
                          isPublished
                            ? styles.statusPublishedText
                            : styles.statusDraftText,
                        ]}
                      >
                        {isPublished ? "Published" : "Draft"}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#A0AAA4" />
                  </View>

                  {index < recentRecipes.length - 1 && (
                    <View style={styles.recentSeparator} />
                  )}

                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant-outline" size={25} color="#176747" />
            </View>
            <AppText variant="sectionTitle" style={styles.emptyTitle}>
              Your recipe collection starts here
            </AppText>
            <AppText variant="body" style={styles.emptyText}>
              Create your first recipe and it will appear here for quick access.
            </AppText>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push("/admin/edit-recipe/new" as any)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <AppText variant="button" style={styles.emptyButtonText}>Create first recipe</AppText>
            </Pressable>
          </View>
        )}

        <Pressable
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={19} color="#B33B31" />
          <AppText variant="button" style={styles.logoutButtonText}>Sign out of RecipePro</AppText>
        </Pressable>

        <AppText variant="helper" style={styles.footerText}>
          RecipePro Admin · Content management workspace
        </AppText>
      </Animated.ScrollView>

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
              <Ionicons name="log-out-outline" size={28} color="#B33B31" />
            </View>
            <AppText variant="sectionTitle" style={styles.logoutModalTitle}>Sign out?</AppText>
            <AppText variant="body" style={styles.logoutModalMessage}>
              Are you sure you want to sign out of your RecipePro admin account?
            </AppText>
            <View style={styles.logoutModalActions}>
              <Pressable
                style={styles.logoutCancelButton}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <AppText variant="button" style={styles.logoutCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                style={styles.logoutConfirmButton}
                onPress={() => void performLogout()}
                disabled={loggingOut}
                accessibilityRole="button"
              >
                <AppText variant="button" style={styles.logoutConfirmText}>
                  {loggingOut ? "Signing out..." : "Sign out"}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F2",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxWidth: 1120,
    width: "100%",
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  brandMark: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // Keeps your logo's original aspect ratio
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B3025",
    letterSpacing: -0.3,
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#829087",
    marginTop: 2,
  },
  topLogoutButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE3",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingBlock: {
    marginBottom: 20,
    paddingTop: 4,
  },
  eyebrow: {
    color: "#27845B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 8,
  },
  pageTitle: {
    color: "#172B20",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    color: "#718077",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  heroBanner: {
    minHeight: 238,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 29,
    backgroundColor: "#1C4C35",
  },
  heroImage: {
    borderRadius: 24,
  },
  heroShade: {
    flex: 1,
    minHeight: 238,
    padding: 22,
    justifyContent: "center",
    backgroundColor: "rgba(13, 45, 29, 0.68)",
  },
  heroCopy: {
    maxWidth: 470,
    alignItems: "flex-start",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: "#E4F6E9",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 35,
  },
  heroTitleCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  heroDescription: {
    color: "#E0EDE4",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 17,
    maxWidth: 300,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  heroButtonText: {
    color: "#174A34",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 1,
  },
  sectionTitle: {
    // color: "#1B3025",
    // fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  sectionSubtitle: {
    color: "#87938B",
    fontSize: 11,
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E7F5EB",
    borderRadius: 30,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#27845B",
  },
  liveBadgeText: {
    color: "#26744E",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 29,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 135,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E7ECE5",
    padding: 15,
    minHeight: 153,
  },
  statCardGreen: {
    backgroundColor: "#F0F8F1",
    borderColor: "#D8E9DA",
  },
  statCardWarm: {
    backgroundColor: "#FFFBF4",
    borderColor: "#F1E7D4",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#1A3024",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  statLabel: {
    color: "#36483D",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  statFoot: {
    color: "#8A968D",
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  actionsGrid: {
    gap: 10,
    marginBottom: 29,
  },
  actionRowContent: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 12,
    // The outer actionCard owns the border; avoid a second dark border on web.
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 3,
    borderRadius: 0,

  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7ECE5",
    padding: 14,
    minHeight: 79,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    // color: "#313030",
    // fontSize: 13,
    fontWeight: "100",

  },
  actionSubtitle: {
    color: "#859188",
    fontSize: 10,
    lineHeight: 15,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingLeft: 8,
  },
  viewAllText: {
    color: "#176747",
    fontSize: 11,
    fontWeight: "800",
  },
  recentSeparator: {
    // Use one explicit separator between rows on both native and web.
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E1E7E0",
    marginHorizontal: 16,
  },
  recentList: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE5",
    borderRadius: 19,
    paddingHorizontal: 13,
    marginBottom: 8,
    overflow: "hidden",
  },
  recentItem: {
    minHeight: 77,
    paddingVertical: 12,
    // Do not add a second border; recentSeparator draws the only row divider.
    borderBottomWidth: 0,
  },
  recentRowContent: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 3
  },
  recentItemLast: {
    borderBottomWidth: 0,
  },
  recentImage: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#E8F1E9",
  },
  recentImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  recentName: {
    // color: "#2e2e2e",
    // fontSize: 13,
    fontWeight: "800",
  },
  recentCategory: {
    color: "#89958C",
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 30,
  },
  statusPublished: {
    backgroundColor: "#E7F5EB",
  },
  statusDraft: {
    backgroundColor: "#FFF2DE",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusPublishedText: {
    color: "#26744E",
  },
  statusDraftText: {
    color: "#9A641B",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE5",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 8,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#E7F5EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  emptyTitle: {
    color: "#26392D",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    color: "#859188",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#176747",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 17,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 14,
    marginTop: 22,
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B33B31",
  },
  footerText: {
    color: "#A0AAA3",
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 31, 23, 0.48)",
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
    borderRadius: 19,
    backgroundColor: "#FFF0EE",
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
    fontSize: 13,
    lineHeight: 20,
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
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#EEF3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#26392D",
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#B33B31",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutConfirmText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
