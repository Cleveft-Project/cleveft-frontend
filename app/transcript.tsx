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

export default function TranscriptScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transcript</Text>
          <Text style={styles.subtitle}>
            Lecture Recording • 23 mins
          </Text>
        </View>

        {/* Transcript Card */}
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.transcript}>
              Good morning everyone. Today we are going to discuss the
              fundamentals of software engineering. Software engineering is
              the systematic application of engineering principles to the
              design, development, testing and maintenance of software
              systems.

              {"\n\n"}

              The software development life cycle consists of planning,
              analysis, design, implementation, testing, deployment and
              maintenance. Each phase contributes to producing reliable,
              scalable and maintainable software.

              {"\n\n"}

              Modern software projects also make use of agile methodologies,
              version control systems and continuous integration to improve
              collaboration and product quality.
            </Text>
          </ScrollView>
        </View>

        {/* Buttons */}
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryText}>📋 Copy Transcript</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>⬇ Download PDF</Text>
        </Pressable>

        <Pressable
          style={styles.aiButton}
          onPress={() => router.push("/chat")}
        >
          <Text style={styles.aiText}>🤖 Ask CLEVEFT AI</Text>
        </Pressable>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    padding: 24,
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
    marginTop: 20,
    marginBottom: 20,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "#BFD2FF",
    marginTop: 6,
    fontSize: 15,
  },

  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 20,
    marginBottom: 20,
  },

  transcript: {
    color: "white",
    fontSize: 16,
    lineHeight: 28,
  },

  primaryButton: {
    backgroundColor: "#4B84FF",
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  primaryText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  secondaryText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },

  aiButton: {
    backgroundColor: "#00A86B",
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  aiText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
  },
});