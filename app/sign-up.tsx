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

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Back */}
        <Pressable onPress={() => router.back()}>
          <Image source={IMAGES.back} style={styles.backIcon} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to start learning
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#BFCBFF"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#BFCBFF"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#BFCBFF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

        </View>

        {/* Button */}
        <Pressable>
          <LinearGradient
            colors={["#4B84FF", "#2960FF"]}
            style={styles.button}
          >
            <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
          </LinearGradient>
        </Pressable>

        {/* Bottom */}
        <View style={styles.bottom}>
          <Text style={{ color: "#C9D8FF" }}>
            Already have an account?
          </Text>

          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.link}>Login</Text>
          </Pressable>
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
    justifyContent: "space-between",
  },

  backIcon: {
    width: 24,
    height: 24,
    tintColor: "white",
  },

  header: {
    marginTop: 10,
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

  form: {
    gap: 14,
    marginTop: 20,
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
    fontSize: 16,
  },

  bottom: {
    alignItems: "center",
    gap: 8,
  },

  link: {
    color: "#6EA9FF",
    fontWeight: "700",
  },
});