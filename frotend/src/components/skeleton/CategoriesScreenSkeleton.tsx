
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  ImageBackground,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppText from "@/components/common/AppText";

const COLORS = {
  background: "#F7F8F3",
  surface: "#FFFFFF",
  primary: "#1F7655",
  primaryDark: "#15543C",
  text: "#17231E",
  muted: "#68736D",
  border: "#E5E8E3",
};

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: object;
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
          position: "relative",
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

export default function CategoriesScreenSkeleton() {
  const router = useRouter();

  const translateX = useRef(
    new Animated.Value(-120)
  ).current;

  // Continuous left-to-right shimmer animation
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
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

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [translateX]);

  // Popular recipe card skeleton
  const renderPopularCard = (index: number) => (
    <View key={index} style={styles.popularCard}>
      <View style={styles.popularImageWrap}>
        <SkeletonBlock
          height={118}
          radius={13}
          translateX={translateX}
        />

        <View style={styles.popularBadge}>
          <SkeletonBlock
            width={48}
            height={9}
            radius={5}
            translateX={translateX}
          />
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 7 }}>
        <SkeletonBlock
          width="90%"
          height={15}
          translateX={translateX}
        />

        <SkeletonBlock
          width="60%"
          height={11}
          translateX={translateX}
        />

        <View style={styles.ratingRow}>
          <SkeletonBlock
            width={14}
            height={14}
            radius={7}
            translateX={translateX}
          />

          <SkeletonBlock
            width={25}
            height={10}
            translateX={translateX}
          />

          <SkeletonBlock
            width={35}
            height={10}
            translateX={translateX}
          />
        </View>
      </View>
    </View>
  );

  // Category card skeleton
  const renderCategoryCard = (index: number) => (
    <View key={index} style={styles.categoryCard}>
      <SkeletonBlock
        height={100}
        radius={14}
        translateX={translateX}
      />

      <View style={{ marginTop: 8, gap: 5 }}>
        <SkeletonBlock
          width="75%"
          height={15}
          translateX={translateX}
        />

        <SkeletonBlock
          width="45%"
          height={11}
          translateX={translateX}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      {/* Fixed actual header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <AppText
            variant="pageTitle"
            style={styles.brandName}
          >
            RecipePro
          </AppText>

          <AppText
            variant="label"
            style={styles.brandCaption}
          >
            PLAN · COOK · SCALE
          </AppText>
        </View>

        <AppText
          variant="sectionTitle"
          style={styles.headingg}
        >
          What are we cooking today?
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Actual hero banner */}
        <View style={styles.heroEntrance}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85",
            }}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                "rgba(13, 45, 29, 0.86)",
                "rgba(13, 45, 29, 0.54)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroShade}
            >
              <View style={styles.heroRow}>
                <View style={styles.heroCopy}>
                  <AppText
                    variant="label"
                    style={styles.heroEyebrow}
                  >
                    YOUR NEXT FAVOURITE
                  </AppText>

                  <AppText
                    variant="pageTitle"
                    style={styles.heroTitle}
                  >
                    Good food,{"\n"}made simple.
                  </AppText>

                  <AppText
                    variant="body"
                    style={styles.heroDescription}
                  >
                    Explore recipes, cooking styles and meal ideas.
                  </AppText>

                  <Pressable
                    style={styles.heroButton}
                    onPress={() =>
                      router.push("/(tabs)/all-recipes")
                    }
                    accessibilityRole="button"
                  >
                    <AppText
                      variant="button"
                      style={styles.heroButtonText}
                    >
                      Explore recipes
                    </AppText>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.primaryDark}
                    />
                  </Pressable>
                </View>

                <View style={styles.heroArt}>
                  <Ionicons
                    name="restaurant-outline"
                    size={62}
                    color="#FFFFFF"
                  />

                  <View style={styles.heroLeaf}>
                    <Ionicons
                      name="leaf"
                      size={23}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Popular Recipes heading */}
        <View style={styles.popularSectionHeader}>
          <View style={styles.popularSectionCopy}>
            <AppText
              variant="sectionTitle"
              style={styles.sectionTitle}
            >
              Popular recipes
            </AppText>

            <AppText
              variant="subtitle"
              style={styles.popularSectionSubtitle}
            >
              Top-rated recipes first
            </AppText>
          </View>

          <Pressable
            onPress={() =>
              router.push("/(tabs)/all-recipes")
            }
            hitSlop={8}
            style={styles.popularViewAll}
          >
            <AppText
              variant="button"
              style={styles.viewAllText}
            >
              View all
            </AppText>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        {/* Popular recipe skeleton cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularCardsContent}
        >
          {Array.from({ length: 4 }).map((_, index) =>
            renderPopularCard(index)
          )}
        </ScrollView>

        {/* Categories heading */}
        <View style={styles.scrollSectionHeader}>
          <AppText
            variant="sectionTitle"
            style={styles.sectionTitle}
          >
            Categories
          </AppText>
        </View>

        {/* Category skeleton cards */}
        <View style={styles.categoryGrid}>
          {Array.from({ length: 6 }).map((_, index) =>
            renderCategoryCard(index)
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 25,
  },

  // Header
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    zIndex: 10,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingTop: 4,
  },

  brandName: {
    color: "#0e5c23",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  brandCaption: {
    color: "#444242",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 3,
  },

  headingg: {
    color: "#313730",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.25,
  },

  // Hero
  heroEntrance: {
    marginHorizontal: 2,
    marginTop: 2,
    marginBottom: 2,
  },

  hero: {
    minHeight: 206,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.primaryDark,
  },

  heroImage: {
    borderRadius: 24,
  },

  heroShade: {
    flex: 1,
    minHeight: 206,
    padding: 20,
    backgroundColor: "rgba(13, 45, 29, 0.22)",
  },

  heroRow: {
    flex: 1,
    minHeight: 164,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroCopy: {
    flex: 1,
    zIndex: 1,
    alignItems: "flex-start",
  },

  heroEyebrow: {
    color: "#D3E8DA",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 8,
  },

  heroDescription: {
    color: "#F0F6F1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 215,
  },

  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
  },

  heroButtonText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  heroArt: {
    width: 82,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    opacity: 0.94,
  },

  heroLeaf: {
    position: "absolute",
    right: 0,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(62, 140, 105, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Popular section
  popularSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },

  popularSectionCopy: {
    flex: 1,
    paddingRight: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  popularSectionSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  popularViewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
  },

  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Popular cards
  popularCardsContent: {
    paddingHorizontal: 2,
    paddingRight: 20,
    paddingBottom: 4,
  },

  popularCard: {
    width: 188,
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  popularImageWrap: {
    height: 118,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#E6EBE6",
    position: "relative",
  },

  popularBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },

  // Categories heading
  scrollSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },

  // Category grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  categoryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
  },

  // Shimmer animation
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
