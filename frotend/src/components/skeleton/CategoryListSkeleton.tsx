
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../components/common/AppText";
import SearchBar from "../../components/common/SearchBar";

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

export default function CategoryListSkeleton() {
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

  const renderCategoryCard = (key: number) => (
    <View key={key} style={styles.categoryCard}>

      {/* CATEGORY IMAGE */}
      <SkeletonBlock
        width={56}
        height={56}
        radius={16}
        translateX={translateX}
      />

      {/* CATEGORY INFORMATION */}
      <View style={styles.categoryInfo}>
        <SkeletonBlock
          width="65%"
          height={16}
          translateX={translateX}
        />

        <SkeletonBlock
          width="90%"
          height={11}
          style={{ marginTop: 9 }}
          translateX={translateX}
        />
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.categoryActions}>
        <SkeletonBlock
          width={25}
          height={25}
          radius={7}
          translateX={translateX}
          style={{ marginBottom: 9 }}
        />

        <SkeletonBlock
          width={25}
          height={25}
          radius={7}
          translateX={translateX}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ACTUAL CATEGORY HEADER */}
      <View style={styles.header}>

        {/* HEADER TITLE AND ADD BUTTON */}
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <AppText
              variant="pageTitle"
              style={styles.title}
            >
              Recipe Categories
            </AppText>

            <AppText
              variant="label"
              style={styles.brandCaption}
            >
              ADMIN WORKSPACE
            </AppText>
          </View>

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

        {/* ACTUAL SEARCH BAR */}
        <View style={styles.searchContainer}>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="Search categories..."
          />
        </View>

      </View>

      {/* CATEGORY CARD SKELETONS ONLY */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {Array.from({ length: 5 }).map((_, index) =>
          renderCategoryCard(index)
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

  /* HEADER */

  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    zIndex: 10,
  },

  headerTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },

  headerTitle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minWidth: 0,
    marginRight: 12,
  },

  title: {
    color: "#17231E",
    flexShrink: 1,
  },

  brandCaption: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#829087",
    marginTop: 2,
  },

  addButton: {
    flexDirection: "row",
    flexShrink: 0,
    marginLeft: "auto",
    alignItems: "center",
    backgroundColor: "#1F7655",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  searchContainer: {
    marginBottom: 10,
  },

  /* CATEGORY SKELETONS */

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 12,
    marginBottom: 12,
    overflow: "hidden",
  },

  categoryInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  categoryActions: {
    marginLeft: 8,
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
