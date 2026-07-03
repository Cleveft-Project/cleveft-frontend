import { IMAGES } from "@/constants/image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#1438C9", "#081A63", "#020A28"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>

          {/* Decorative circles */}
          <View style={styles.topCircle} />
          <View style={styles.centerCircle} />
          <View style={styles.bottomCircle} />

          {/* Settings */}
          <Pressable style={styles.settingsButton}>
  <Image
    source={IMAGES.menu}
    style={styles.menuIcon}
  />
</Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>CLEVEFT</Text>
            <Text style={styles.subtitle}>effortless mastery</Text>
          </View>

          {/* Student Illustration */}
          <View style={styles.imageContainer}>
            <Image
              source={IMAGES.student}
              style={styles.student}
            />
          </View>

          {/* Join Button */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={() => router.push("/login")}
          >
            <LinearGradient
              colors={["#4E84FF", "#2463FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>JOIN NOW</Text>
            </LinearGradient>
          </Pressable>

        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: 35,
    paddingHorizontal: 25,
  },

  topCircle: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(126,96,255,0.28)",
    top: -90,
    left: -80,
  },

  centerCircle: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(70,125,255,0.22)",
    top: 150,
    alignSelf: "center",
  },

  bottomCircle: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(86,123,255,0.18)",
    bottom: -90,
    right: -80,
  },

  settingsButton: {
    position: "absolute",
    top: 40,
    right: 25,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(30,45,100,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  settingsText: {
    color: "white",
    fontSize: 22,
  },

  header: {
    width: "100%",
    marginTop: 15,
  },

  title: {
  fontSize: 58,
  color: "#78B8FF",
  fontWeight: "900",
  letterSpacing: 2,

  textShadowColor: "rgba(65,140,255,0.55)",
  textShadowOffset: {
    width: 0,
    height: 4,
  },
  textShadowRadius: 22,
},

  subtitle: {
  marginTop: 6,
  fontSize: 18,
  color: "#EAF3FF",
  fontWeight: "600",
  letterSpacing: 0.6,
},

  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -40,
  },

  student: {
    width: 440,
    height: 440,
    resizeMode: "contain",
  },

  buttonWrapper: {
    width: "100%",
    alignItems: "center",
  },

  button: {
  width: 330,
  height: 68,
  borderRadius: 34,

  justifyContent: "center",
  alignItems: "center",

  shadowColor: "#2D65FF",
  shadowOffset: {
    width: 0,
    height: 12,
  },
  shadowOpacity: 0.55,
  shadowRadius: 22,
  elevation: 16,
},

  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },

  menuIcon: {
  width: 22,
  height: 22,
  tintColor: "#FFFFFF",
  resizeMode: "contain",
},

});