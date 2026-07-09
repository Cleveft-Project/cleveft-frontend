import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function UploadScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Background Glow */}
        <View style={styles.topGlow} />
        <View style={styles.bottomGlow} />

        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Audio</Text>
          <Text style={styles.subtitle}>
            Import an existing recording for transcription.
          </Text>
        </View>

        {/* Upload Card */}
        <View style={styles.uploadCard}>

          <Text style={styles.uploadIcon}>📁</Text>

          <Text style={styles.uploadTitle}>
            Select an Audio File
          </Text>

          <Text style={styles.uploadSubtitle}>
            MP3 • WAV • M4A • AAC
          </Text>

          <Pressable
             style={styles.primaryButton}
             onPress={() => router.push("/transcript")}
          >
            <Text style={styles.primaryButtonText}>
              Browse Files
            </Text>
          </Pressable>

        </View>

        {/* Divider */}
        <Text style={styles.orText}>OR</Text>

        {/* Record Instead */}
        <Pressable
          style={styles.recordButton}
          onPress={() => router.push("/record")}
        >
          <Text style={styles.recordText}>
            🎤 Record New Audio
          </Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>
          Supported file size: up to 100 MB
        </Text>

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
    justifyContent: "space-between",
  },

  topGlow: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(90,130,255,0.10)",
  },

  bottomGlow: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(90,130,255,0.08)",
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
    marginTop: 10,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "#BFD2FF",
    marginTop: 8,
    fontSize: 16,
  },

  uploadCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
    paddingVertical: 50,
    alignItems: "center",
  },

  uploadIcon: {
    fontSize: 72,
    marginBottom: 20,
  },

  uploadTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
  },

  uploadSubtitle: {
    color: "#BFD2FF",
    marginTop: 8,
    marginBottom: 30,
    fontSize: 16,
  },

  primaryButton: {
    backgroundColor: "#4B84FF",
    width: 240,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#4B84FF",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 17,
  },

  orText: {
    color: "#AFC7FF",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },

  recordButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  recordText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  footer: {
    color: "#8EA7E8",
    textAlign: "center",
    marginBottom: 10,
  },
});