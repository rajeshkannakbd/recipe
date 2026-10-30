
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
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

export default function MetadataSkeleton() {
  const translateX = useRef(
    new Animated.Value(-120)
  ).current;

  // Continuously repeating shimmer animation
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

  const renderItemCard = (key: number) => (
    <View key={key} style={styles.itemCard}>
      {/* Item icon */}
      <SkeletonBlock
        width={40}
        height={40}
        radius={13}
        translateX={translateX}
      />

      {/* Item details */}
      <View style={styles.itemDetails}>
        {/* Item name */}
        <SkeletonBlock
          width="65%"
          height={14}
          translateX={translateX}
        />

        {/* Description */}
        <SkeletonBlock
          width="90%"
          height={10}
          style={{ marginTop: 7 }}
          translateX={translateX}
        />

        {/* Recipe count */}
        <SkeletonBlock
          width={55}
          height={9}
          style={{ marginTop: 7 }}
          translateX={translateX}
        />
      </View>

      {/* Edit and delete actions */}
      <View style={styles.itemActions}>
        <SkeletonBlock
          width={20}
          height={20}
          radius={6}
          style={styles.actionPlaceholder}
          translateX={translateX}
        />

        <SkeletonBlock
          width={20}
          height={20}
          radius={6}
          style={styles.actionPlaceholder}
          translateX={translateX}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, index) =>
        renderItemCard(index)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7EBE5",
    padding: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemActions: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionPlaceholder: {
    margin: 4,
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
