import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Hello 👋</Text>
          <Text style={styles.subtitle}>
            What do you want to do today?
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.cards}>

          <Pressable style={styles.card}>
            <Text style={styles.cardText}>🎤 Record Audio</Text>
          </Pressable>

          <Pressable style={styles.card}>
            <Text style={styles.cardText}>📁 Upload File</Text>
          </Pressable>

          <Pressable style={styles.card}>
            <Text style={styles.cardText}>🧠 AI Assistant</Text>
          </Pressable>

        </View>

        {/* Recent */}
        <View style={styles.recent}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <View style={styles.item}>
            <Text style={styles.itemText}>Transcript 1</Text>
          </View>

          <View style={styles.item}>
            <Text style={styles.itemText}>Transcript 2</Text>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  safeArea: {
    flex: 1,
    padding: 25,
  },

  header: {
    marginTop: 10,
    marginBottom: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "white",
  },

  subtitle: {
    color: "#C9D8FF",
    marginTop: 6,
  },

  cards: {
    gap: 14,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 18,
    borderRadius: 18,
  },

  cardText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  recent: {
    marginTop: 30,
  },

  sectionTitle: {
    color: "#BFD2FF",
    fontWeight: "700",
    marginBottom: 12,
  },

  item: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },

  itemText: {
    color: "white",
  },
});