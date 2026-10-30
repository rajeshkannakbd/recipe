
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../components/common/AppText";
import SearchBar from "../../components/common/SearchBar";

const SkeletonCard = ({
  translateX,
}: {
  translateX: Animated.Value;
}) => (
  <View style={styles.card}>
    <View style={styles.image} />

    <View style={styles.info}>
      <View style={styles.name} />
      <View style={styles.meta} />
      <View style={styles.customization} />
    </View>

    <View style={styles.heart} />

    {/* Left-to-right shimmer */}
    <View
      style={styles.shimmerContainer}
      pointerEvents="none"
    >
      <Animated.View
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
  </View>
);

export default function FavoritesScreenSkeleton() {
  const translateX = useRef(
    new Animated.Value(-150)
  ).current;

useEffect(() => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: 400,
        duration: 1200,
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

  return () => animation.stop();
}, [translateX]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      {/* Actual header */}
      <View style={styles.header}>
        <AppText
          variant="pageTitle"
          style={styles.title}
        >
          My Favourites
        </AppText>

        <AppText
          variant="subtitle"
          style={styles.subtitle}
        >
          Your saved recipes
        </AppText>

        {/* Actual search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value=""
            onChangeText={() => {}}
            placeholder="Search saved recipes..."
          />
        </View>
      </View>

      {/* Skeleton cards */}
      <View style={styles.listContent}>
        {[1, 2, 3, 4].map((item) => (
          <SkeletonCard
            key={item}
            translateX={translateX}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8F3",
  },

  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    zIndex: 10,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#17231E",
  },

  subtitle: {
    fontSize: 14,
    color: "#68736D",
    marginTop: 4,
  },

  searchContainer: {
    marginTop: 14,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  card: {
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

  image: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#E2E8E2",
  },

  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },

  name: {
    width: "75%",
    height: 15,
    borderRadius: 5,
    backgroundColor: "#DDE3DD",
    marginBottom: 9,
  },

  meta: {
    width: "60%",
    height: 11,
    borderRadius: 5,
    backgroundColor: "#E5E9E4",
  },

  customization: {
    width: "48%",
    height: 9,
    borderRadius: 5,
    backgroundColor: "#E5E9E4",
    marginTop: 10,
  },

  heart: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3DDE5",
    marginLeft: 8,
  },

shimmerContainer: {
  ...StyleSheet.absoluteFill,
  overflow: "hidden",
  borderRadius: 20,
},

  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
