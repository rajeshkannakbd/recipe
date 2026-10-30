
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/common/AppText";

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: any;
  translateX: Animated.Value;
};

function SkeletonBlock({
  width = "100%",
  height,
  radius = 8,
  style,
  translateX,
}: SkeletonBlockProps) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#E2E8E2",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [
              { translateX },
              { skewX: "-20deg" },
            ],
          },
        ]}
      />
    </View>
  );
}

export default function AdminDashboardSkeleton() {
  const translateX = useRef(
    new Animated.Value(-120)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 450,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -120,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [translateX]);

  // Statistics skeleton
  const renderStatCard = (index: number) => (
    <View
      key={index}
      style={[
        styles.statCard,
        index === 0 && styles.statCardGreen,
        index === 3 && styles.statCardWarm,
      ]}
    >
      <View style={styles.statTopRow}>
        <SkeletonBlock
          width={39}
          height={39}
          radius={13}
          translateX={translateX}
        />
        <SkeletonBlock
          width={18}
          height={18}
          radius={5}
          translateX={translateX}
        />
      </View>

      <SkeletonBlock
        width={55}
        height={28}
        translateX={translateX}
      />

      <SkeletonBlock
        width="65%"
        height={12}
        style={{ marginTop: 8 }}
        translateX={translateX}
      />

      <SkeletonBlock
        width="85%"
        height={10}
        style={{ marginTop: 8 }}
        translateX={translateX}
      />
    </View>
  );

  // Quick action skeleton
  const renderActionCard = (index: number) => (
    <View key={index} style={styles.actionCard}>
      <View style={styles.actionRowContent}>
        <SkeletonBlock
          width={44}
          height={44}
          radius={14}
          translateX={translateX}
        />

        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock
            width="60%"
            height={13}
            translateX={translateX}
          />

          <SkeletonBlock
            width="85%"
            height={10}
            translateX={translateX}
          />
        </View>

        <SkeletonBlock
          width={17}
          height={17}
          radius={5}
          translateX={translateX}
        />
      </View>
    </View>
  );

  // Recent recipe skeleton
  const renderRecentRecipe = (index: number) => (
    <View key={index} style={styles.recentItem}>
      <View style={styles.recentRowContent}>
        <SkeletonBlock
          width={48}
          height={48}
          radius={13}
          translateX={translateX}
        />

        <View style={styles.recentCopy}>
          <SkeletonBlock
            width="75%"
            height={13}
            translateX={translateX}
          />

          <SkeletonBlock
            width="45%"
            height={10}
            translateX={translateX}
          />
        </View>

        <SkeletonBlock
          width={60}
          height={23}
          radius={20}
          translateX={translateX}
        />

        <SkeletonBlock
          width={15}
          height={15}
          radius={4}
          translateX={translateX}
        />
      </View>

      {index < 3 && <View style={styles.recentSeparator} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>

      {/* Actual Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Image
              source={require("../../../assets/logo1.png")}
              style={styles.logoImage}
            />
          </View>

          <View>
            <AppText variant="pageTitle" style={styles.brandName}>
              RecipePro
            </AppText>

            <AppText variant="label" style={styles.brandCaption}>
              ADMIN WORKSPACE
            </AppText>
          </View>
        </View>

        <View style={styles.topLogoutButton}>
          <Ionicons
            name="log-out-outline"
            size={19}
            color="#f17618"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Actual Greeting */}
        <View style={styles.greetingBlock}>
          <AppText variant="label" style={styles.eyebrow}>
            OVERVIEW
          </AppText>

          <AppText variant="pageTitle" style={styles.pageTitle}>
            Good to see you, Admin.
          </AppText>

          <AppText variant="subtitle" style={styles.pageSubtitle}>
            Here’s what’s happening with your recipe platform.
          </AppText>
        </View>

        {/* Hero Banner - Actual Text */}
        <View style={styles.heroBanner}>
          <View style={styles.heroShade}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}>
                <Ionicons
                  name="sparkles-outline"
                  size={13}
                  color="#E4F6E9"
                />

                <AppText variant="label" style={styles.heroBadgeText}>
                  YOUR KITCHEN, ORGANIZED
                </AppText>
              </View>

              <AppText
                variant="pageTitle"
                style={styles.heroTitle}
              >
                Build something{"\n"}delicious today.
              </AppText>

              <AppText variant="body" style={styles.heroDescription}>
                Create, organize and publish recipes in one place.
              </AppText>

              <View style={styles.heroButton}>
                <AppText variant="button" style={styles.heroButtonText}>
                  Create recipe
                </AppText>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#174A34"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Platform Overview */}
        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>
              Platform overview
            </AppText>

            <AppText variant="subtitle" style={styles.sectionSubtitle}>
              Your content at a glance
            </AppText>
          </View>
        </View>

        {/* Only Stat Cards Loading */}
        <View style={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, index) =>
            renderStatCard(index)
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>
              Quick actions
            </AppText>

            <AppText variant="subtitle" style={styles.sectionSubtitle}>
              Jump straight into your workflow
            </AppText>
          </View>
        </View>

        {/* Only Action Cards Loading */}
        <View style={styles.actionsGrid}>
          {Array.from({ length: 5 }).map((_, index) =>
            renderActionCard(index)
          )}
        </View>

        {/* Recently Added Recipes */}
        <View style={styles.sectionHeading}>
          <View>
            <AppText variant="sectionTitle" style={styles.sectionTitle}>
              Recently added recipes
            </AppText>

            <AppText variant="subtitle" style={styles.sectionSubtitle}>
              Your latest recipe collection
            </AppText>
          </View>

          <View style={styles.viewAllButton}>
            <AppText variant="button" style={styles.viewAllText}>
              View all
            </AppText>

            <Ionicons
              name="chevron-forward"
              size={14}
              color="#176747"
            />
          </View>
        </View>

        {/* Only Recent Recipe Cards Loading */}
        <View style={styles.recentList}>
          {Array.from({ length: 4 }).map((_, index) =>
            renderRecentRecipe(index)
          )}
        </View>

        {/* Actual Footer */}
        <View style={styles.logoutButton}>
          <Ionicons
            name="log-out-outline"
            size={19}
            color="#B33B31"
          />

          <AppText variant="button" style={styles.logoutButtonText}>
            Sign out of RecipePro
          </AppText>
        </View>

        <AppText variant="helper" style={styles.footerText}>
          RecipePro Admin · Content management workspace
        </AppText>

      </ScrollView>
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

  // Header
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
    width: "100%",
    height: "100%",
    resizeMode: "contain",
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

  // Greeting
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

  // Hero
  heroBanner: {
    minHeight: 238,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 29,
    backgroundColor: "#1C4C35",
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

  // Section headings
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 1,
  },

  sectionTitle: {
    fontWeight: "800",
    letterSpacing: -0.35,
  },

  sectionSubtitle: {
    color: "#87938B",
    fontSize: 11,
    marginTop: 4,
  },

  // Stats
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

  // Quick actions
  actionsGrid: {
    gap: 10,
    marginBottom: 29,
  },

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7ECE5",
    padding: 14,
    minHeight: 79,
  },

  actionRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 3,
  },

  // Recent recipes
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
  },

  recentRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 3,
  },

  recentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },

  recentSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E1E7E0",
    marginHorizontal: 0,
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

  // Footer
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

  // Shimmer
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
