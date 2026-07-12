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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue learning
          </Text>
        </View>

  <View style={styles.form}>

  {/* Email */}
  <View style={styles.inputContainer}>
    <Image
      source={IMAGES.email}
      style={styles.inputIcon}
    />
    <TextInput
      placeholder="Email Address"
      placeholderTextColor="#AFC4FF"
      value={email}
      onChangeText={setEmail}
      style={styles.input}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>

  {/* Password */}
  <View style={styles.inputContainer}>
    <Image
      source={IMAGES.lock}
      style={styles.inputIcon}
    />
    <TextInput
      placeholder="Password"
      placeholderTextColor="#AFC4FF"
      secureTextEntry
      value={password}
      onChangeText={setPassword}
      style={styles.input}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>

</View>

          <Pressable onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/home")}>
  <LinearGradient
    colors={["#4B84FF", "#2960FF"]}
    style={styles.loginButton}
  >
    <Text style={styles.loginText}>LOGIN</Text>
  </LinearGradient>
</Pressable>

          <Text style={styles.or}>OR CONTINUE WITH</Text>

          <Pressable style={styles.googleButton}>
            <Image source={IMAGES.google} style={styles.googleIcon} />
            <Text style={styles.googleText}>Google</Text>
          </Pressable>

        

        <View style={styles.bottom}>
          <Text style={styles.bottomText}>
            Don't have an account?
          </Text>

          <Pressable onPress={() => router.push("/sign-up")}>
            <Text style={styles.signup}>
              Sign Up
            </Text>
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
    padding: 25,
    justifyContent: "space-between",
  },

  backIcon: {
    width: 24,
    height: 24,
    tintColor: "white",
    resizeMode: "contain",
  },

  header: {
    marginTop: 10,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "800",
  },

  subtitle: {
    color: "#C9D8FF",
    marginTop: 6,
    fontSize: 16,
  },

  form: {
    gap: 18,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 60,
  },

  inputIcon: {
    width: 22,
    height: 22,
    tintColor: "#C8D7FF",
    marginRight: 12,
  },

  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },

  forgot: {
    color: "#6EA9FF",
    textAlign: "right",
    fontWeight: "600",
  },

  loginButton: {
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  loginText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },

  or: {
    textAlign: "center",
    color: "#9FB7FF",
    fontWeight: "700",
    marginVertical: 8,
  },

  googleButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: "contain",
  },

  googleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },

  bottom: {
    alignItems: "center",
    marginBottom: 15,
  },

  bottomText: {
    color: "#C9D8FF",
  },

  signup: {
    marginTop: 6,
    color: "#6EA9FF",
    fontWeight: "700",
    fontSize: 16,
  },
});