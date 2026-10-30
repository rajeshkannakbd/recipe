
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

export default function RecipeListSkeleton() {
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
      <SkeletonBlock
        width={112}
        height={150}
        radius={12}
        translateX={translateX}
      />

      <View style={styles.recipeInfo}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock
              width="90%"
              height={15}
              translateX={translateX}
            />
          </View>

          <SkeletonBlock
            width={42}
            height={22}
            radius={7}
            translateX={translateX}
          />
        </View>

        <View style={{ marginTop: 10, gap: 6 }}>
          <SkeletonBlock height={10} width="95%" translateX={translateX} />
          <SkeletonBlock height={10} width="70%" translateX={translateX} />
        </View>

        <View style={[styles.row, { marginTop: 13, gap: 12 }]}>
          <SkeletonBlock width={65} height={10} translateX={translateX} />
          <SkeletonBlock width={55} height={10} translateX={translateX} />
        </View>

        <View style={[styles.row, { marginTop: 11, gap: 12 }]}>
          <SkeletonBlock width={60} height={10} translateX={translateX} />
          <SkeletonBlock width={45} height={10} translateX={translateX} />
        </View>

        <View
          style={[
            styles.row,
            {
              justifyContent: "space-between",
              marginTop: 15,
            },
          ]}
        >
          <SkeletonBlock width={75} height={10} translateX={translateX} />
          <SkeletonBlock width={15} height={15} radius={4} translateX={translateX} />
        </View>

        <View style={[styles.row, { marginTop: 9, gap: 5 }]}>
          <SkeletonBlock width={48} height={18} radius={6} translateX={translateX} />
          <SkeletonBlock width={58} height={18} radius={6} translateX={translateX} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Actual Recipe Header */}
      <View style={styles.header}>

        {/* Title and Refresh */}
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="pageTitle" style={styles.title}>
              Manage Recipes
            </AppText>
          </View>

          <View style={styles.headerIconButton}>
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#1F7655"
            />
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchToolsRow}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#849087"
            />
            <AppText style={styles.searchPlaceholder}>
              Search recipes, ingredients, chefs...
            </AppText>
          </View>

          <View style={styles.headerIconButton}>
            <Ionicons
              name="options-outline"
              size={21}
              color="#1F7655"
            />
          </View>
        </View>

        {/* Food Toggle Buttons */}
        <View style={styles.foodToggleRow}>
          <View style={[styles.foodToggleButton, styles.allActive]}>
            <Ionicons name="restaurant-outline" size={15} color="#FFFFFF" />
            <AppText style={styles.activeToggleText}>All</AppText>
          </View>

          <View style={styles.foodToggleButton}>
            <Ionicons name="leaf-outline" size={15} color="#27834B" />
            <AppText style={styles.foodToggleText}>Veg</AppText>
          </View>

          <View style={styles.foodToggleButton}>
            <Ionicons name="fish-outline" size={15} color="#C44949" />
            <AppText style={styles.foodToggleText}>Non Veg</AppText>
          </View>
        </View>
      </View>

      {/* Recipe Card Skeletons Only */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {Array.from({ length: 5 }).map((_, index) =>
          renderRecipeCard(index)
        )}
      </ScrollView>
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
    paddingBottom: 14,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBE6",
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#17231E",
    letterSpacing: -0.65,
  },

  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3ED",
  },

  searchToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },

  searchContainer: {
    flex: 1,
    minWidth: 0,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F7F8F3",
    borderWidth: 1,
    borderColor: "#E0E7E0",
  },

  searchPlaceholder: {
    fontSize: 12,
    color: "#929D95",
  },

  foodToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  foodToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    backgroundColor: "#FFFFFF",
  },

  allActive: {
    backgroundColor: "#1F7655",
    borderColor: "#1F7655",
  },

  foodToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#68736D",
  },

  activeToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  recipeCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EAE4",
    padding: 10,
    marginBottom: 12,
    overflow: "hidden",
  },

  recipeInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
    minWidth: 0,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
