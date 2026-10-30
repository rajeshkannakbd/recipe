
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = 8,
  style,
  translateX,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  translateX: Animated.Value;
}) {
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: radius },
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

export default function EditRecipeSkeleton({
  isNew = false,
}: {
  isNew?: boolean;
}) {
  const translateX = useRef(new Animated.Value(-120)).current;

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
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [translateX]);

  const block = (width: number | `${number}%`, height = 14, radius = 8, style?: ViewStyle) => (
    <SkeletonBlock
      width={width}
      height={height}
      radius={radius}
      style={style}
      translateX={translateX}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {block(38, 38, 12)}
        {block(125, 19)}
        {block(42, 18)}
      </View>

      <View style={styles.scrollContent}>
        <View style={styles.form}>
          {/* Recipe title */}
          {block(90, 13)}
          {block("100%", 48, 12, styles.input)}

          {/* Category */}
          {block(65, 13, 6, styles.labelSpacing)}
          <View style={styles.chipRow}>
            {block(82, 34, 18)}
            {block(100, 34, 18)}
            {block(75, 34, 18)}
          </View>

          {/* Servings and status */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              {block(90, 13)}
              {block("100%", 48, 12, styles.input)}
            </View>
            <View style={styles.flex1}>
              {block(45, 13)}
              <View style={styles.statusRow}>
                {block("48%", 38, 10)}
                {block("48%", 38, 10)}
              </View>
            </View>
          </View>

          {/* Cooked weight */}
          {block(190, 13, 6, styles.labelSpacing)}
          {block("100%", 48, 12, styles.input)}
          {block(230, 10, 5, { marginTop: 7 })}

          {/* Recipe details card */}
          <View style={styles.detailsCard}>
            {block(42, 42, 13)}
            <View style={styles.detailsCopy}>
              {block(105, 15)}
              {block(165, 10)}
              <View style={styles.pillRow}>
                {block(48, 20, 12)}
                {block(65, 20, 12)}
              </View>
            </View>
            {block(45, 30, 9)}
          </View>

          {/* Ingredients */}
          <View style={styles.sectionHeading}>
            {block(115, 17)}
            {block(65, 30, 9)}
          </View>
          {block("100%", 45, 12, styles.input)}

          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`ingredient-${index}`} style={styles.itemCard}>
              {block(36, 36, 10)}
              <View style={styles.itemDetails}>
                {block("65%", 13)}
                {block("40%", 10)}
              </View>
              {block(55, 34, 9)}
            </View>
          ))}

          {/* Procedure */}
          {block(90, 17, 6, styles.sectionSpacing)}

          {Array.from({ length: 2 }).map((_, index) => (
            <View key={`procedure-${index}`} style={styles.procedureCard}>
              <View style={styles.procedureHeader}>
                {block(30, 30, 10)}
                {block(75, 13)}
                {block(22, 22, 7)}
              </View>
              {block("100%", 44, 10, styles.procedureInput)}
              {block("100%", 72, 10)}
            </View>
          ))}

          {/* Recipe image */}
          {block(90, 15, 6, styles.sectionSpacing)}
          {block("100%", 48, 12, styles.imageButton)}

          {/* Save button */}
          {block("100%", 52, 14, styles.saveButton)}
        </View>
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
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDE9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 35,
  },
  form: {
    width: "100%",
  },
  block: {
    backgroundColor: "#E5EBE6",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 65,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  input: {
    marginTop: 8,
    marginBottom: 15,
  },
  labelSpacing: {
    marginTop: 2,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 17,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 8,
    marginBottom: 15,
  },
  detailsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 15,
    marginTop: 14,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#174F3B",
  },
  detailsCopy: {
    flex: 1,
    gap: 7,
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 3,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    marginTop: 9,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EDE8",
  },
  itemDetails: {
    flex: 1,
    gap: 7,
  },
  sectionSpacing: {
    marginTop: 22,
    marginBottom: 12,
  },
  procedureCard: {
    padding: 14,
    marginBottom: 11,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EDE8",
    gap: 10,
  },
  procedureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 3,
  },
  procedureInput: {
    marginBottom: 2,
  },
  imageButton: {
    marginTop: 8,
  },
  saveButton: {
    marginTop: 24,
  },
});
