
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

const SkeletonBlock = ({ style }: { style?: ViewStyle }) => {
  const [width, setWidth] = useState(0);
  const shimmer = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!width) return;

    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: width + 100,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [width, shimmer]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.block, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [
              { translateX: shimmer },
              { skewX: "-18deg" },
            ],
          },
        ]}
      />
    </View>
  );
};

const IngredientCardSkeleton = () => (
  <View style={styles.ingredientCard}>
    {/* Ingredient image */}
    <SkeletonBlock style={styles.ingredientImage} />

    {/* Ingredient details */}
    <View style={styles.ingredientInfo}>
      <SkeletonBlock style={styles.name} />

      <View style={styles.badgeRow}>
        <SkeletonBlock style={styles.typeBadge} />
        <SkeletonBlock style={styles.statusBadge} />
      </View>
    </View>

    {/* Edit and delete icons */}
    <View style={styles.actions}>
      <SkeletonBlock style={styles.actionButton} />
      <SkeletonBlock style={styles.actionButton} />
    </View>
  </View>
);

export default function AdminIngredientsSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, index) => (
        <IngredientCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  block: {
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

  ingredientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
  },

  ingredientImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E7F1EA",
  },

  ingredientInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  name: {
    width: "65%",
    height: 16,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 9,
  },

  typeBadge: {
    width: 55,
    height: 20,
    borderRadius: 12,
  },

  statusBadge: {
    width: 62,
    height: 20,
    borderRadius: 12,
  },

  actions: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
});
