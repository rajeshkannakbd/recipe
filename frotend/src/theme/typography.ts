import { StyleSheet } from "react-native";

export const fontFamily = {
  regular: "BricolageGrotesque_400Regular",
  medium: "BricolageGrotesque_500Medium",
  semibold: "BricolageGrotesque_600SemiBold",
  bold: "BricolageGrotesque_700Bold",
  extraBold: "BricolageGrotesque_800ExtraBold",
};

export const typography = StyleSheet.create({
  pageTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
  },

  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: "#1B3025",
  
  },

  cardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 23,
    color:"#313030",
  },

  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
  },

  helper: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
  },

  button: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
    
  },

  mutedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: "#68736D",
  },
});
