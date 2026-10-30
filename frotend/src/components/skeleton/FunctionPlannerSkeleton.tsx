
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";

const SkeletonBar = ({
  opacity,
  width,
  height = 11,
  color = "#DDE6DE",
}: {
  opacity: Animated.Value;
  width: number | `${number}%`;
  height?: number;
  color?: string;
}) => (
  <Animated.View
    style={[
      styles.skeletonBar,
      { width, height, opacity, backgroundColor: color },
    ]}
  />
);

const FunctionCardSkeleton = ({
  opacity,
  recipeCount = 3,
}: {
  opacity: Animated.Value;
  recipeCount?: number;
}) => (
  <View style={styles.functionCard}>
    {/* Header */}
    <View style={styles.functionCardHeader}>
      <View style={styles.functionIcon}>
        <SkeletonBar opacity={opacity} width={19} height={19} />
      </View>

      <View style={styles.functionTitleWrap}>
        <SkeletonBar opacity={opacity} width="72%" height={16} />
        <View style={{ height: 7 }} />
        <SkeletonBar opacity={opacity} width="66%" height={11} />
      </View>

      <View style={styles.editButton}>
        <SkeletonBar opacity={opacity} width={18} height={18} />
      </View>

      <View style={styles.deleteButton}>
        <SkeletonBar opacity={opacity} width={18} height={18} />
      </View>
    </View>

    {/* Metrics */}
    <View style={styles.metricsRow}>
      <View style={styles.metric}>
        <SkeletonBar opacity={opacity} width={15} height={15} />
        <SkeletonBar opacity={opacity} width={55} height={11} />
      </View>

      <View style={styles.metricDivider} />

      <View style={styles.metric}>
        <SkeletonBar opacity={opacity} width={15} height={15} />
        <SkeletonBar opacity={opacity} width={105} height={11} />
      </View>
    </View>

    {/* Recipe rows */}
    {/* <View style={styles.planRecipeList}>
      {Array.from({ length: recipeCount }).map((_, index) => (
        <View key={index} style={styles.planRecipeRow}>
          <View style={styles.recipeBullet}>
            <SkeletonBar opacity={opacity} width={14} height={14} />
          </View>

          <View style={styles.planRecipeName}>
            <SkeletonBar
              opacity={opacity}
              width={index % 2 === 0 ? "85%" : "70%"}
              height={11}
            />
          </View>

          <View style={styles.servingBadge}>
            <SkeletonBar opacity={opacity} width={48} height={10} />
          </View>
        </View>
      ))}
    </View> */}

    {/* Shopping list button */}
    <View style={styles.shoppingButton}>
      <SkeletonBar
        opacity={opacity}
        width={18}
        height={18}
        color="#6DA58A"
      />

      <View style={{ flex: 1 }}>
        <SkeletonBar
          opacity={opacity}
          width={125}
          height={12}
          color="#6DA58A"
        />
      </View>

      <SkeletonBar
        opacity={opacity}
        width={16}
        height={16}
        color="#6DA58A"
      />
    </View>
  </View>
);

export default function FunctionPlannerSkeleton({
  count = 1,
}: {
  count?: number;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <FunctionCardSkeleton
          key={index}
          opacity={opacity}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "stretch",
  },

  skeletonBar: {
    borderRadius: 5,
  },

  // Matches FunctionPlannerScreen styles.functionCard
  functionCard: {
    width: "100%",
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EBE5",
    padding: 15,
    marginBottom: 13,
    shadowColor: "#173C2A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },

  // Matches actual card header
  functionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  functionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },

  functionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  editButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#EAF4ED",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFF1F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Matches actual metricsRow
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 15,
    marginBottom: 11,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: "#F7F9F6",
    borderRadius: 11,
  },

  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metricDivider: {
    height: 17,
    width: 1,
    backgroundColor: "#DCE4DC",
  },

  // Matches actual planRecipeList and planRecipeRow
  planRecipeList: {
    gap: 1,
  },

  planRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },

  recipeBullet: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#EFF6F0",
    alignItems: "center",
    justifyContent: "center",
  },

  planRecipeName: {
    flex: 1,
    minWidth: 0,
  },

  servingBadge: {
    backgroundColor: "#EAF4ED",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  // Matches actual shoppingButton
  shoppingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#267653",
    marginTop: 13,
    paddingHorizontal: 12,
  },
});
