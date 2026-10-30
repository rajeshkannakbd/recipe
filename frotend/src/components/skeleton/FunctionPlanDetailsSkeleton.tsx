
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";

function SkeletonBlock({
  width,
  height,
  radius = 7,
  style,
  opacity,
}: {
  width: number | string;
  height: number;
  radius?: number;
  style?: any;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#DCE7DC",
          opacity,
        },
        style,
      ]}
    />
  );
}

function MealGroupSkeleton({
  opacity,
  recipeCount = 4,
}: {
  opacity: Animated.Value;
  recipeCount?: number;
}) {
  return (
    <View style={styles.menuGroup}>
      <View style={styles.menuHeader}>
        <SkeletonBlock
          width={30}
          height={30}
          radius={10}
          opacity={opacity}
        />
        <SkeletonBlock
          width="42%"
          height={15}
          opacity={opacity}
        />
        <View style={{ flex: 1 }} />
        <SkeletonBlock
          width={24}
          height={24}
          radius={12}
          opacity={opacity}
        />
      </View>

      <View style={styles.recipeGrid}>
        {Array.from({ length: recipeCount }).map((_, index) => (
          <View key={index} style={styles.recipeItem}>
            <View style={styles.recipeNameRow}>
              <SkeletonBlock
                width={6}
                height={6}
                radius={3}
                opacity={opacity}
              />
              <SkeletonBlock
                width={index % 2 === 0 ? "78%" : "62%"}
                height={11}
                opacity={opacity}
              />
            </View>

            {index % 2 === 0 && (
              <SkeletonBlock
                width="45%"
                height={9}
                style={{ marginTop: 7, marginLeft: 12 }}
                opacity={opacity}
              />
            )}

            <SkeletonBlock
              width="38%"
              height={9}
              style={{ marginTop: 7, marginLeft: 12 }}
              opacity={opacity}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function IngredientSkeleton({
  opacity,
  showUsedIn = true,
}: {
  opacity: Animated.Value;
  showUsedIn?: boolean;
}) {
  return (
    <View style={styles.ingredientRow}>
      <View style={styles.ingredientTop}>
        <SkeletonBlock
          width={52}
          height={52}
          radius={17}
          opacity={opacity}
        />

        <View style={styles.ingredientDetails}>
          <SkeletonBlock
            width="58%"
            height={15}
            opacity={opacity}
          />
          <SkeletonBlock
            width={105}
            height={29}
            radius={8}
            style={{ marginTop: 8 }}
            opacity={opacity}
          />
        </View>
      </View>

      {showUsedIn && (
        <View style={styles.usedIn}>
          <SkeletonBlock
            width={14}
            height={14}
            radius={7}
            opacity={opacity}
          />
          <SkeletonBlock
            width="65%"
            height={10}
            opacity={opacity}
          />
        </View>
      )}

      <View style={styles.ingredientDivider} />

      <View style={styles.priceRow}>
        <SkeletonBlock
          width={105}
          height={13}
          opacity={opacity}
        />
        <SkeletonBlock
          width={75}
          height={21}
          opacity={opacity}
        />
      </View>
    </View>
  );
}

export default function FunctionPlanDetailsSkeleton() {
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
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {/* Event summary card */}
      <View style={styles.heroCard}>
        <SkeletonBlock
          width="65%"
          height={25}
          radius={7}
          opacity={opacity}
        />

        <View style={styles.locationRow}>
          <SkeletonBlock
            width={18}
            height={18}
            radius={6}
            opacity={opacity}
          />
          <SkeletonBlock
            width="48%"
            height={11}
            opacity={opacity}
          />
        </View>

        <View style={styles.dateRow}>
          <SkeletonBlock
            width={14}
            height={14}
            radius={7}
            opacity={opacity}
          />
          <SkeletonBlock
            width={95}
            height={11}
            opacity={opacity}
          />
        </View>

        <View style={styles.metricsRow}>
          {[0, 1, 2].map((item) => (
            <React.Fragment key={item}>
              {item > 0 && <View style={styles.metricDivider} />}
              <View style={styles.metric}>
                <SkeletonBlock
                  width={17}
                  height={17}
                  radius={5}
                  opacity={opacity}
                />
                <SkeletonBlock
                  width={15}
                  height={14}
                  opacity={opacity}
                />
                <SkeletonBlock
                  width={item === 1 ? 52 : 45}
                  height={10}
                  opacity={opacity}
                />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Menu overview heading */}
      <View style={styles.sectionHeading}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock
            width={145}
            height={21}
            opacity={opacity}
          />
          <SkeletonBlock
            width={190}
            height={11}
            style={{ marginTop: 7 }}
            opacity={opacity}
          />
        </View>
        <SkeletonBlock
          width={58}
          height={29}
          radius={10}
          opacity={opacity}
        />
      </View>

      {/* Meal groups */}
      <MealGroupSkeleton opacity={opacity} recipeCount={4} />
      <MealGroupSkeleton opacity={opacity} recipeCount={3} />

      {/* Ingredients heading */}
      <View style={[styles.sectionHeading, { marginTop: 4 }]}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock
            width={175}
            height={21}
            opacity={opacity}
          />
          <SkeletonBlock
            width={190}
            height={11}
            style={{ marginTop: 7 }}
            opacity={opacity}
          />
        </View>
        <SkeletonBlock
          width={95}
          height={38}
          radius={11}
          opacity={opacity}
        />
      </View>

      {/* Estimated cost card */}
      <View style={styles.costCard}>
        <SkeletonBlock
          width={46}
          height={46}
          radius={15}
          style={{ backgroundColor: "#416C55" }}
          opacity={opacity}
        />
        <View style={{ flex: 1 }}>
          <SkeletonBlock
            width="65%"
            height={13}
            style={{ backgroundColor: "#64816E" }}
            opacity={opacity}
          />
          <SkeletonBlock
            width="48%"
            height={28}
            style={{ marginTop: 10, backgroundColor: "#64816E" }}
            opacity={opacity}
          />
          <SkeletonBlock
            width="88%"
            height={11}
            style={{ marginTop: 9, backgroundColor: "#64816E" }}
            opacity={opacity}
          />
        </View>
      </View>

      {/* Ingredient list */}
      <IngredientSkeleton opacity={opacity} />
      <IngredientSkeleton opacity={opacity} />
      <IngredientSkeleton opacity={opacity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
  },

  heroCard: {
    backgroundColor: "#E8F3E9",
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 5,
    borderLeftColor: "#176747",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 13,
    marginBottom: 7,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 16,
  },

  metricsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
    minHeight: 68,
  },

  metric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },

  metricDivider: {
    height: 30,
    width: 1,
    backgroundColor: "#DFE7DE",
    marginHorizontal: 3,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
    marginTop: 2,
  },

  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3EAE2",
    padding: 13,
    marginBottom: 10,
  },

  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1EC",
    marginBottom: 2,
  },

  recipeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
    paddingTop: 4,
  },

  recipeItem: {
    width: "50%",
    minWidth: 0,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },

  recipeNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  costCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#173F2D",
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
  },

  ingredientRow: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E9E1",
    paddingHorizontal: 2,
    paddingVertical: 16,
  },

  ingredientTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  ingredientDetails: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },

  usedIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },

  ingredientDivider: {
    height: 1,
    backgroundColor: "transparent",
    marginVertical: 7,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
