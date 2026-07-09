import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function HistoryScreen() {
  const router = useRouter();

  const recordings = [
    {
      title: "Software Engineering Lecture",
      date: "Today • 10:35 AM",
      duration: "23 min",
    },
    {
      title: "Database Systems",
      date: "Yesterday • 2:10 PM",
      duration: "18 min",
    },
    {
      title: "Operating Systems",
      date: "Monday • 9:15 AM",
      duration: "41 min",
    },
    {
      title: "Artificial Intelligence",
      date: "Last Week",
      duration: "52 min",
    },
  ];

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
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            Your previous recordings
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {recordings.map((item, index) => (
            <Pressable
              key={index}
              style={styles.card}
              onPress={() => router.push("/transcript")}
            >
              <View>
                <Text style={styles.cardTitle}>
                  🎙 {item.title}
                </Text>

                <Text style={styles.cardSubtitle}>
                  {item.date}
                </Text>
              </View>

              <Text style={styles.duration}>
                {item.duration}
              </Text>
            </Pressable>
          ))}

        </ScrollView>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  safeArea: {
    flex: 1,
    padding: 22,
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
    marginVertical: 20,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "#BFD2FF",
    marginTop: 6,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cardTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },

  cardSubtitle: {
    color: "#BFD2FF",
    marginTop: 6,
  },

  duration: {
    color: "#6EA8FF",
    fontWeight: "700",
  },
});