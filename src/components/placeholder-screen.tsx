// A simple reusable screen: dark background, a title, a subtitle.
// All five tabs use this until we build each one for real.

import { View, Text, StyleSheet } from "react-native";

import { colors } from "@/constants/theme";

// "Props" = the inputs a component accepts. This one takes two strings.
type Props = {
  title: string;
  subtitle: string;
};

export default function PlaceholderScreen({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

// StyleSheet is React Native's version of CSS. Names are camelCase
// (backgroundColor, not background-color) and layout uses flexbox.
const styles = StyleSheet.create({
  container: {
    flex: 1, // fill the whole screen
    backgroundColor: colors.bg, // same dark as the tab bar
    alignItems: "center", // center horizontally
    justifyContent: "center", // center vertically
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
  },
});
