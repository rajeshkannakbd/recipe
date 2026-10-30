
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

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

export default function AdminCategoryRecipesSkeleton() {
  const translateX = useRef(
    new Animated.Value(-120)
  ).current;

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
        width={76}
        height={76}
        radius={14}
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

        {/* Recipe description */}
        <SkeletonBlock
          width="95%"
          height={11}
          style={{ marginTop: 9 }}
          translateX={translateX}
        />

        <SkeletonBlock
          width="65%"
          height={11}
          style={{ marginTop: 6 }}
          translateX={translateX}
        />

        {/* Recipe status */}
        <SkeletonBlock
          width={55}
          height={10}
          style={{ marginTop: 9 }}
          translateX={translateX}
        />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 6 }).map((_, index) =>
        renderRecipeCard(index)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },

  recipeInfo: {
    flex: 1,
    minWidth: 0,
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
