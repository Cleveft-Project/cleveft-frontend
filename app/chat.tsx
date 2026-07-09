import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ChatScreen() {
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
          <Text style={styles.title}>CLEVEFT AI</Text>
          <Text style={styles.subtitle}>
            Ask questions about your recording
          </Text>
        </View>

        {/* Chat Area */}
        <ScrollView
          style={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        >

          {/* AI Message */}
          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>
              👋 Hi! I'm CLEVEFT AI.
            </Text>

            <Text style={styles.aiText}>
              Ask me anything about your transcript.
            </Text>
          </View>

          {/* User Message */}
          <View style={styles.userBubble}>
            <Text style={styles.userText}>
              Summarize today's lecture.
            </Text>
          </View>

          {/* AI Response */}
          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>
              Today's lecture covered the Software Development Life Cycle,
              including planning, analysis, design, implementation, testing,
              deployment and maintenance.
            </Text>
          </View>

        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Ask a question..."
            placeholderTextColor="#9CB6FF"
            style={styles.input}
          />

          <Pressable style={styles.sendButton}>
            <Text style={styles.sendText}>➤</Text>
          </Pressable>
        </View>

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
    padding: 20,
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
    marginTop: 18,
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

  chatContainer: {
    flex: 1,
  },

  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    maxWidth: "85%",
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#4B84FF",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    maxWidth: "85%",
  },

  aiText: {
    color: "white",
    fontSize: 15,
    lineHeight: 24,
  },

  userText: {
    color: "white",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    paddingHorizontal: 14,
  },

  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4B84FF",
    justifyContent: "center",
    alignItems: "center",
  },

  sendText: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
});