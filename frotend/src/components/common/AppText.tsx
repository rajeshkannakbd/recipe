
import React from "react";
import {
  Text,
  type TextProps,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { typography } from "../../theme/typography";

export type TextVariant =
  | "pageTitle"
  | "sectionTitle"
  | "cardTitle"
  | "subtitle"
  | "body"
  | "label"
  | "helper"
  | "button"
  | "mutedText";

type AppTextProps = TextProps & {
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
};

export default function AppText({
  variant = "body",
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[typography[variant], style]}
    >
      {children}
    </Text>
  );
}
