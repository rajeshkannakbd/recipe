
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
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
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

export default function CategoryRecipesSkeleton() {
  const translateX = useRef(
    new Animated.Value(-120)
  ).current;

  // Shared continuous shimmer animation
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
      {/* Recipe image */}
      <SkeletonBlock
        width={64}
        height={64}
        radius={16}
        translateX={translateX}
      />

      {/* Recipe information */}
      <View style={styles.recipeInfo}>
        {/* Recipe name */}
        <SkeletonBlock
          width="75%"
          height={16}
          translateX={translateX}
        />

        {/* Servings */}
        <SkeletonBlock
          width={65}
          height={12}
          style={{ marginTop: 7 }}
          translateX={translateX}
        />

        {/* Status badge */}
        <SkeletonBlock
          width={72}
          height={20}
          radius={8}
          style={{ marginTop: 7 }}
          translateX={translateX}
        />
      </View>

      {/* Arrow */}
      <SkeletonBlock
        width={18}
        height={18}
        radius={5}
        translateX={translateX}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* CATEGORY HEADER */}
      <View style={styles.header}>
        {/* Category image */}
        <SkeletonBlock
          width={80}
          height={80}
          radius={24}
          style={{ marginBottom: 12 }}
          translateX={translateX}
        />

        {/* Category name */}
        <SkeletonBlock
          width={175}
          height={25}
          style={{ marginBottom: 9 }}
          translateX={translateX}
        />

        {/* Category description */}
        <SkeletonBlock
          width="75%"
          height={13}
          style={{ marginBottom: 7 }}
          translateX={translateX}
        />

        {/* Recipe count */}
        <SkeletonBlock
          width={85}
          height={12}
          style={{ marginTop: 5 }}
          translateX={translateX}
        />
      </View>

      {/* SEARCH BAR */}
      <SkeletonBlock
        width="100%"
        height={48}
        radius={14}
        style={styles.searchPlaceholder}
        translateX={translateX}
      />

      {/* RECIPE CARDS */}
      <View style={styles.recipeList}>
        {Array.from({ length: 6 }).map((_, index) =>
          renderRecipeCard(index)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },

  searchPlaceholder: {
    marginTop: 8,
    marginBottom: 16,
  },

  recipeList: {
    width: "100%",
  },

  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },

  recipeInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 0,
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
