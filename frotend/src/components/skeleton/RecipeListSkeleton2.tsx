
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../common/AppText";

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

export default function AdminRecipeListSkeleton() {
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

  const renderRecipeCard = (key: number) => (
    <View key={key} style={styles.recipeCard}>
      {/* Recipe Image */}
      <SkeletonBlock
        width={112}
        height={150}
        radius={14}
        translateX={translateX}
      />

      {/* Recipe Details */}
      <View style={styles.recipeInfo}>

        {/* Name + Edit/Delete Icons */}
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock
              width="90%"
              height={15}
              translateX={translateX}
            />
          </View>

          <View style={styles.actions}>
            <Ionicons
              name="create-outline"
              size={19}
              color="#DCE3DD"
            />
            <Ionicons
              name="trash-outline"
              size={19}
              color="#E8D9D7"
            />
          </View>
        </View>

        {/* Category + Meal Type */}
        <View style={{ marginTop: 10 }}>
          <SkeletonBlock
            width="85%"
            height={12}
            translateX={translateX}
          />
        </View>

        {/* Servings + Cooked Weight */}
        <View style={[styles.detailRow, { marginTop: 12 }]}>
          <SkeletonBlock
            width={65}
            height={10}
            translateX={translateX}
          />
          <SkeletonBlock
            width={85}
            height={10}
            translateX={translateX}
          />
        </View>

        {/* Preparation + Cooking Time */}
        <View style={[styles.detailRow, { marginTop: 10 }]}>
          <SkeletonBlock
            width={120}
            height={10}
            translateX={translateX}
          />
        </View>

        {/* Published / Draft Badge */}
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock
            width={72}
            height={23}
            radius={8}
            translateX={translateX}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <AppText
              variant="pageTitle"
              style={styles.title}
            >
              Manage Recipes
            </AppText>

            <AppText
              variant="label"
              style={styles.brandCaption}
            >
              ADMIN WORKSPACE
            </AppText>
          </View>

          {/* Add Button Skeleton */}
          <View style={styles.addButton}>
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
            />
            <AppText
              variant="button"
              style={styles.addButtonText}
            >
              Add
            </AppText>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#849087"
          />
          <AppText style={styles.searchPlaceholder}>
            Search recipes...
          </AppText>
        </View>

        {/* Admin Tabs */}
        <View style={styles.tabContainer}>
          <View style={[styles.tab, styles.activeTab]}>
            <AppText style={styles.activeTabText}>
              All
            </AppText>
          </View>

          <View style={styles.tab}>
            <AppText style={styles.tabText}>
              Published
            </AppText>
          </View>

          <View style={styles.tab}>
            <AppText style={styles.tabText}>
              Draft
            </AppText>
          </View>
        </View>
      </View>

      {/* Recipe Cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {Array.from({ length: 5 }).map((_, index) =>
          renderRecipeCard(index)
        )}
      </ScrollView>

      {/* Bottom Navigation Placeholder */}
      <View style={styles.bottomNavigation}>
        {[
          "grid-outline",
          "restaurant-outline",
          "albums-outline",
          "leaf-outline",
        ].map((icon, index) => (
          <View key={index} style={styles.navItem}>
            <Ionicons
              name={icon as any}
              size={23}
              color="#C0C9C2"
            />
            <View style={styles.navLabel} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },

  header: {
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
    zIndex: 10,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    color: "#17231E",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
  },

  brandCaption: {
    letterSpacing: 1.6,
    color: "#829087",
    marginTop: 2,
    fontSize: 10,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F7655",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },

  addButtonText: {
    color: "#FFFFFF",
  },

  searchContainer: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    marginBottom: 10,
  },

  searchPlaceholder: {
    fontSize: 13,
    color: "#929D95",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E7F1EA",
    borderRadius: 12,
    padding: 2,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
  },

  activeTab: {
    backgroundColor: "#FFFFFF",
  },

  tabText: {
    fontSize: 12,
    color: "#68736D",
  },

  activeTabText: {
    fontSize: 12,
    color: "#17231E",
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },

  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 8,
    marginBottom: 12,
  },

  recipeInfo: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
    justifyContent: "center",
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.65)",
  },

  bottomNavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EBE6",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 5,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  navLabel: {
    width: 38,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#E2E8E2",
  },
});
