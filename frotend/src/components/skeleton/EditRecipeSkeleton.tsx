
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../common/AppText";

const SkeletonField = ({
  translateX,
  height = 48,
  width = "100%",
  radius = 12,
}: {
  translateX: Animated.Value;
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
}) => (
  <View
    style={[
      styles.skeletonField,
      { height, width, borderRadius: radius },
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

const Field = ({
  label,
  translateX,
  height = 48,
}: {
  label: string;
  translateX: Animated.Value;
  height?: number;
}) => (
  <View style={styles.fieldGroup}>
    <AppText style={styles.label}>{label}</AppText>
    <SkeletonField translateX={translateX} height={height} />
  </View>
);

export default function EditRecipeSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;



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

  return (
    <SafeAreaView
      style={styles.container}
      edges={
        Platform.OS === "web"
          ? ["top"]
          : ["left", "right", "bottom"]
      }
    >
      {/* Normal header - no skeleton effect */}
      <View style={styles.header}>
        <View style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#17231E" />
        </View>

        <AppText style={styles.headerTitle}>Edit Recipe</AppText>

        <AppText style={styles.saveText}>Save</AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
          <Field label="Recipe Title" translateX={translateX} />

          {/* Category label stays visible */}
          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>Category</AppText>
            <View style={styles.chipRow}>
              {[90, 105, 85, 100].map((width, index) => (
                <SkeletonField
                  key={index}
                  translateX={translateX}
                  height={38}
                  width={width}
                  radius={12}
                />
              ))}
            </View>
          </View>

          {/* Base servings and status */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field
                label="Base Servings"
                translateX={translateX}
              />
            </View>

            <View style={styles.flex1}>
              <AppText style={styles.label}>Status</AppText>
              <View style={styles.statusToggle}>
                <View style={styles.statusButton}>
                  <AppText style={styles.statusText}>Draft</AppText>
                </View>
                <View style={[styles.statusButton, styles.statusActive]}>
                  <AppText style={styles.statusTextActive}>
                    Published
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          <Field
            label="Base Cooked Weight (grams)"
            translateX={translateX}
          />

          <AppText style={styles.helperText}>
            Total weight of the cooked recipe for the base servings.
          </AppText>

          {/* Keep the section heading and descriptive text normal */}
          <View style={styles.detailsHero}>
            <View style={styles.detailsIcon}>
              <Ionicons
                name="options-outline"
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.flex1}>
              <AppText style={styles.detailsTitle}>
                Recipe details
              </AppText>
              <AppText style={styles.detailsSubtitle}>
                Make this recipe easier to discover
              </AppText>
            </View>
            <AppText style={styles.detailsToggle}>Edit</AppText>
          </View>

          {/* Nutrition */}
          <View style={styles.sectionHeader}>
            <AppText style={styles.metadataTitle}>
              Nutrition
              <AppText style={styles.helperText}> (Optional)</AppText>
            </AppText>
            <AppText style={styles.outlineButton}>Add</AppText>
          </View>

          <AppText style={styles.helperText}>
            Add nutritional information for this recipe.
          </AppText>

          {/* Recipe image */}
          <View style={styles.fieldGroup}>
            <AppText style={styles.label}>Recipe Image</AppText>
            <SkeletonField
              translateX={translateX}
              height={150}
              radius={16}
            />
            <View style={styles.imageButton}>
              <SkeletonField
                translateX={translateX}
                height={44}
                width="100%"
              />
            </View>
          </View>

          <Field
            label="Description"
            translateX={translateX}
            height={88}
          />

          {/* Ingredients */}
          <AppText style={styles.sectionTitle}>Ingredients</AppText>

          <View style={styles.searchRow}>
            <View style={styles.flex1}>
              <SkeletonField
                translateX={translateX}
                height={48}
              />
            </View>
            <SkeletonField
              translateX={translateX}
              height={48}
              width={82}
            />
          </View>

          {/* Ingredient cards */}
          {[1, 2].map((item) => (
            <View key={item} style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText style={styles.ingredientLabel}>
                  Ingredient {item}
                </AppText>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="#68736D"
                />
              </View>

              <SkeletonField
                translateX={translateX}
                height={42}
              />

              <View style={styles.quantityRow}>
                <SkeletonField
                  translateX={translateX}
                  height={44}
                  width={80}
                />
                <SkeletonField
                  translateX={translateX}
                  height={44}
                  width={70}
                />
                <SkeletonField
                  translateX={translateX}
                  height={44}
                  width={70}
                />
              </View>
            </View>
          ))}

          <SkeletonField
            translateX={translateX}
            height={48}
          />

          {/* Procedures */}
          <AppText style={styles.sectionTitle}>Procedure</AppText>

          {[1, 2].map((step) => (
            <View key={step} style={styles.card}>
              <View style={styles.procedureHeader}>
                <View style={styles.stepBadge}>
                  <AppText style={styles.stepText}>
                    {step}
                  </AppText>
                </View>
                <AppText style={styles.ingredientLabel}>
                  Step {step}
                </AppText>
              </View>

              <AppText style={styles.label}>Step Title</AppText>
              <SkeletonField
                translateX={translateX}
                height={44}
              />

              <View style={styles.descriptionLabel}>
                <AppText style={styles.label}>
                  Description
                </AppText>
              </View>
              <SkeletonField
                translateX={translateX}
                height={88}
              />
            </View>
          ))}

          <SkeletonField
            translateX={translateX}
            height={50}
          />

          <SkeletonField
            translateX={translateX}
            height={50}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F5",
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECE8",
  },
  backButton: {
    width: 36,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },
  saveText: {
    color: "#1F7655",
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  form: {
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#17231E",
    marginBottom: 8,
  },
  skeletonField: {
    backgroundColor: "#E5EAE6",
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  statusToggle: {
    flexDirection: "row",
    backgroundColor: "#E7F1EA",
    borderRadius: 12,
    padding: 4,
    minHeight: 44,
  },
  statusButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: "#FFFFFF",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#68736D",
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: "700",
    color: "#17231E",
  },
  helperText: {
    fontSize: 12,
    color: "#68736D",
  },
  detailsHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: "#174F3B",
  },
  detailsIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#2B7557",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  detailsSubtitle: {
    color: "#C8E4D5",
    fontSize: 11,
    marginTop: 3,
  },
  detailsToggle: {
    color: "#176747",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metadataTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17231E",
  },
  outlineButton: {
    color: "#1F7655",
    borderWidth: 1,
    borderColor: "#C9D9D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "800",
  },
  imageButton: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17231E",
    marginTop: 16,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E8E3",
    padding: 15,
    marginBottom: 4,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ingredientLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17231E",
  },
  quantityRow: {
    flexDirection: "row",
    gap: 8,
  },
  procedureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1F7655",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  descriptionLabel: {
    marginTop: 4,
  },
});
