import { IMAGES } from "@/constants/image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Image,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        <Pressable onPress={() => router.back()}>
          <Image source={IMAGES.back} style={styles.backIcon} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a reset link
          </Text>
        </View>

        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#BFCBFF"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <Pressable>
          <LinearGradient
            colors={["#4B84FF", "#2960FF"]}
            style={styles.button}
          >
            <Text style={styles.buttonText}>SEND LINK</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Back to Login</Text>
        </Pressable>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  safeArea: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    gap: 20,
  },

  backIcon: {
    width: 24,
    height: 24,
    tintColor: "white",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
  },

  subtitle: {
    color: "#C9D8FF",
    marginTop: 6,
  },

  input: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "white",
  },

  button: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "800",
  },

  link: {
    textAlign: "center",
    color: "#6EA9FF",
    fontWeight: "700",
  },
});