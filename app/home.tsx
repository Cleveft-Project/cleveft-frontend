import { IMAGES } from "@/constants/image";
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

export default function HomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Background Glow */}
        <View style={styles.headerGlow} />

        {/* Menu */}
        <Pressable
           style={styles.menuButton}
          onPress={() => router.push("/settings")}
        >
          <Image
            source={IMAGES.menu}
            style={styles.menuIcon}
          />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Welcome Back 👋
          </Text>

          <Text style={styles.subtitle}>
            Ready to continue learning?
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.cards}>

          <Pressable
            style={styles.card}
            onPress={() => router.push("/record")}
>
  <View style={styles.cardLeft}>
    <Image
      source={IMAGES.microphone}
      style={styles.cardIcon}
    />
    <Text style={styles.cardText}>
      Record Audio
    </Text>
  </View>

  <Text style={styles.arrow}>›</Text>
</Pressable>

         <Pressable
  style={styles.card}
  onPress={() => router.push("/upload")}
>
  <View style={styles.cardLeft}>
    <Image
      source={IMAGES.document}
      style={styles.cardIcon}
    />

    <Text style={styles.cardText}>
      Upload File
    </Text>
  </View>

  <Text style={styles.arrow}>›</Text>
</Pressable>

          <Pressable
  style={styles.card}
  onPress={() => router.push("/chat")}
>
  <View style={styles.cardLeft}>
    <Image
      source={IMAGES.robot}
      style={styles.cardIcon}
    />

    <Text style={styles.cardText}>
      AI Assistant
    </Text>
  </View>

  <Text style={styles.arrow}>›</Text>
</Pressable>

<Pressable
  style={styles.card}
  onPress={() => router.push("/history")}
>
  <View style={styles.cardLeft}>
    <Image
      source={IMAGES.history}
      style={styles.cardIcon}
    />
    <Text style={styles.cardText}>History</Text>
  </View>

  <Text style={styles.arrow}>›</Text>
</Pressable>

<Pressable
  style={styles.card}
  onPress={() => router.push("/profile")}
>
  <View style={styles.cardLeft}>
    <Image
      source={IMAGES.profile}
      style={styles.cardIcon}
    />
    <Text style={styles.cardText}>Profile</Text>
  </View>

  <Text style={styles.arrow}>›</Text>
</Pressable>

        </View>

        {/* Recent Activity */}

        <View style={styles.recent}>

          <Text style={styles.sectionTitle}>
            Recent Activity
          </Text>

          <Pressable
          style={styles.item}
          onPress={() => router.push("/transcript")}
>
            <Text style={styles.itemTitle}>
              Machine Learning Lecture.mp3
            </Text>

            <Text style={styles.itemSubtitle}>
              Yesterday • 18 mins
            </Text>
          </Pressable>

          <View style={styles.item}>
            <Text style={styles.itemTitle}>
              Operating Systems Notes.pdf
            </Text>

            <Text style={styles.itemSubtitle}>
              2 days ago • PDF
            </Text>
          </View>

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
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  headerGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(84,132,255,0.16)",
    top: -70,
    left: -70,
  },

  menuButton: {
    position: "absolute",
    top: 55,
    right: 24,

    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "rgba(255,255,255,0.08)",

    justifyContent: "center",
    alignItems: "center",
  },

  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },

  header: {
    marginBottom: 34,
  },

  title: {
    color: "white",
    fontSize: 36,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 6,
    color: "#BFD2FF",
    fontSize: 16,
  },

  cards: {
    gap: 18,
  },

  card: {

    height: 70,

    borderRadius: 20,

    backgroundColor: "#263C9E",

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.08)",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 20,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.2,

    shadowRadius: 12,

    elevation: 8,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardIcon: {
    width: 26,
    height: 26,
    resizeMode: "contain",
    marginRight: 14,
  },

  cardText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },

  arrow: {
    color: "#9BC0FF",
    fontSize: 26,
    fontWeight: "600",
  },

  recent: {
    marginTop: 42,
  },

  sectionTitle: {
    color: "#BFD2FF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  item: {

    backgroundColor: "rgba(255,255,255,0.06)",

    borderRadius: 18,

    padding: 18,

    marginBottom: 14,

    borderWidth: 1,

    borderColor: "rgba(255,255,255,0.05)",
  },

  itemTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  itemSubtitle: {
    color: "#9DB2F5",
    marginTop: 6,
    fontSize: 13,
  },

});