// This file defines the tab bar itself — which tabs exist,
// their labels, icons, and colors. Each <Tabs.Screen name="X">
// points to a file called X.tsx in this same folder.

import { Pressable } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // icon set that ships with Expo

import { colors, spacing } from "@/constants/theme";

function SettingsButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/settings")}
      hitSlop={8}
      style={{ marginRight: spacing.sm }}
      accessibilityLabel="Settings"
      accessibilityRole="button"
    >
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Colors for the tab bar. Change these to your brand later.
        tabBarActiveTintColor: colors.text, // selected tab (soft lavender)
        tabBarInactiveTintColor: colors.muted, // unselected tabs (muted)
        tabBarStyle: { backgroundColor: colors.bg }, // dark bar
        headerStyle: { backgroundColor: colors.bg }, // dark top header
        headerTintColor: colors.text, // header text color
      }}
    >
      {/* Each Tabs.Screen = one tab. "name" must match a filename below. */}
      <Tabs.Screen
        name="index" // index.tsx = the default/home tab
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: "Chart",
          headerRight: () => <SettingsButton />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
