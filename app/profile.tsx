import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Image,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { IMAGES } from "@/constants/image";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.header}>
          <Image
            source={IMAGES.avatar}
            style={styles.avatar}
          />

          <Text style={styles.name}>Jason Amoah</Text>

          <Text style={styles.email}>
            jason@example.com
          </Text>
        </View>

        <View style={styles.menu}>

          <Pressable style={styles.item}>
            <Text style={styles.itemText}>👤 Edit Profile</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable style={styles.item}>
            <Text style={styles.itemText}>🔒 Change Password</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => router.push("/history")}
          >
            <Text style={styles.itemText}>📜 Recording History</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.itemText}>⚙ Settings</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

        </View>

        <Pressable style={styles.logout}>
          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </Pressable>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  safeArea: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  header: {
    alignItems: "center",
    marginTop: 20,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  name: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 18,
  },

  email: {
    color: "#BFD2FF",
    marginTop: 6,
    fontSize: 16,
  },

  menu: {
    gap: 16,
  },

  item: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },

  arrow: {
    color: "#6EA8FF",
    fontSize: 22,
  },

  logout: {
    backgroundColor: "#E74C3C",
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    color: "white",
    fontWeight: "800",
    fontSize: 17,
  },
});