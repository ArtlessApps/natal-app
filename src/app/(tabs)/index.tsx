import { Pressable, StyleSheet, Text, View } from "react-native";
import PlaceholderScreen from "@/components/placeholder-screen";
import { supabase } from "@/lib/supabase";
import { colors } from "@/constants/theme";

export default function TodayScreen() {
  return (
    <View style={styles.wrap}>
      <PlaceholderScreen
        title="Today"
        subtitle="Your daily reading and journal prompt will live here."
      />
      {__DEV__ && (
        <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>[dev] Sign out</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  signOut: { position: "absolute", bottom: 48, alignSelf: "center" },
  signOutText: { color: colors.accent },
});
