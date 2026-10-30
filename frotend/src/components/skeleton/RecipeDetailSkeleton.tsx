
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

type SkeletonBlockProps = {
  style?: ViewStyle;
  translateX: Animated.Value;
};

// Reusable skeleton block
export const SkeletonBlock = ({
  style,
  translateX,
}: SkeletonBlockProps) => {
  return (
    <View style={[styles.skeletonBlock, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [
              { translateX },
              { skewX: "-18deg" },
            ],
          },
        ]}
      />
    </View>
  );
};

// Ingredient skeleton row
const IngredientSkeletonRow = ({
  translateX,
}: {
  translateX: Animated.Value;
}) => (
  <View style={styles.ingredientRow}>
    <SkeletonBlock
      style={styles.ingredientImage}
      translateX={translateX}
    />

    <View style={styles.ingredientInfo}>
      <SkeletonBlock
        style={{ width: "65%", height: 13 }}
        translateX={translateX}
      />

      <SkeletonBlock
        style={{ width: "45%", height: 10, marginTop: 8 }}
        translateX={translateX}
      />
    </View>

    <View style={styles.quantityInfo}>
      <SkeletonBlock
        style={{ width: 55, height: 13 }}
        translateX={translateX}
      />

      <SkeletonBlock
        style={{ width: 40, height: 10, marginTop: 7 }}
        translateX={translateX}
      />
    </View>
  </View>
);

export default function RecipeDetailSkeleton() {
  // One shared animation for all skeleton blocks
  const translateX = useRef(
    new Animated.Value(-150)
  ).current;

  // Continuously repeat shimmer animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 450,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),

        Animated.timing(translateX, {
          toValue: -150,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [translateX]);

  return (
    <ScrollView
      style={styles.mainScroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Recipe image */}
      <SkeletonBlock
        style={styles.heroImage}
        translateX={translateX}
      />

      {/* Recipe overview */}
      <View style={styles.recipeOverview}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock
              style={{ width: "75%", height: 25 }}
              translateX={translateX}
            />

            <SkeletonBlock
              style={{
                width: "95%",
                height: 11,
                marginTop: 10,
              }}
              translateX={translateX}
            />

            <SkeletonBlock
              style={{
                width: "65%",
                height: 11,
                marginTop: 6,
              }}
              translateX={translateX}
            />
          </View>

          <SkeletonBlock
            style={styles.infoButton}
            translateX={translateX}
          />
        </View>

        {/* Category, meal type, cooking time and rating */}
        <View style={styles.metaRow}>
          <SkeletonBlock
            style={{ width: 65, height: 13 }}
            translateX={translateX}
          />

          <SkeletonBlock
            style={{ width: 75, height: 13 }}
            translateX={translateX}
          />

          <SkeletonBlock
            style={{ width: 85, height: 13 }}
            translateX={translateX}
          />

          <SkeletonBlock
            style={{ width: 55, height: 13 }}
            translateX={translateX}
          />
        </View>

        {/* Review button */}
        <SkeletonBlock
          style={{
            width: 115,
            height: 25,
            marginTop: 12,
          }}
          translateX={translateX}
        />

        {/* Tags */}
        <View style={styles.tagsRow}>
          <SkeletonBlock
            style={styles.tag}
            translateX={translateX}
          />

          <SkeletonBlock
            style={styles.tag}
            translateX={translateX}
          />

          <SkeletonBlock
            style={styles.tag}
            translateX={translateX}
          />
        </View>
      </View>

      {/* Sticky controls placeholder */}
      <View style={styles.stickyControls}>
        {/* Scaling card */}
        <View style={styles.scalingCard}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock
              style={{ width: 90, height: 17 }}
              translateX={translateX}
            />

            <SkeletonBlock
              style={{
                width: 135,
                height: 10,
                marginTop: 6,
              }}
              translateX={translateX}
            />
          </View>

          <View style={styles.servingControls}>
            <SkeletonBlock
              style={styles.servingButton}
              translateX={translateX}
            />

            <SkeletonBlock
              style={styles.servingCount}
              translateX={translateX}
            />

            <SkeletonBlock
              style={styles.servingButton}
              translateX={translateX}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <SkeletonBlock
            style={styles.tab}
            translateX={translateX}
          />

          <SkeletonBlock
            style={styles.tab}
            translateX={translateX}
          />
        </View>

        {/* Section heading */}
        <SkeletonBlock
          style={{
            width: 190,
            height: 16,
            marginTop: 5,
          }}
          translateX={translateX}
        />
      </View>

      {/* Ingredient rows */}
      <View style={styles.ingredientsContent}>
        {Array.from({ length: 7 }).map((_, index) => (
          <IngredientSkeletonRow
            key={index}
            translateX={translateX}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  skeletonBlock: {
    backgroundColor: "#E5EAE5",
    borderRadius: 8,
    overflow: "hidden",
  },

  shimmer: {
    position: "absolute",
    top: -5,
    bottom: -5,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.75)",
  },

  mainScroll: {
    flex: 1,
    marginTop: 58,
  },

  content: {
    paddingBottom: 20,
  },

  heroImage: {
    width: "100%",
    height: 170,
    borderRadius: 0,
    backgroundColor: "#E7F1EA",
  },

  recipeOverview: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  infoButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },

  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  tag: {
    width: 65,
    height: 23,
    borderRadius: 12,
  },

  stickyControls: {
    backgroundColor: "#F7F8F3",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E3",
  },

  scalingCard: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  servingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  servingButton: {
    width: 29,
    height: 29,
    borderRadius: 9,
  },

  servingCount: {
    width: 42,
    height: 30,
    borderRadius: 9,
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E9EDE8",
    borderRadius: 9,
    padding: 3,
    marginTop: 7,
    marginBottom: 8,
    gap: 5,
  },

  tab: {
    flex: 1,
    height: 30,
    borderRadius: 9,
  },

  ingredientsContent: {
    paddingHorizontal: 10,
    paddingVertical: 1,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E3E3E3",
    gap: 10,
  },

  ingredientImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },

  ingredientInfo: {
    flex: 1,
    minWidth: 0,
  },

  quantityInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
