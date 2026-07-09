import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

export default function SettingsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your CLEVEFT preferences
          </Text>
        </View>


        {/* Settings Options */}
        <View style={styles.section}>

          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>
                Notifications
              </Text>
              <Text style={styles.itemSubtitle}>
                Receive updates and reminders
              </Text>
            </View>

            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{
                false: "#555",
                true: "#4B84FF",
              }}
            />
          </View>


          <View style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>
                Dark Mode
              </Text>
              <Text style={styles.itemSubtitle}>
                Use dark appearance
              </Text>
            </View>

            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{
                false: "#555",
                true: "#4B84FF",
              }}
            />
          </View>


          <Pressable style={styles.item}>
            <Text style={styles.itemTitle}>
              Language
            </Text>

            <Text style={styles.value}>
              English ›
            </Text>
          </Pressable>


          <Pressable style={styles.item}>
            <Text style={styles.itemTitle}>
              Help & Support
            </Text>

            <Text style={styles.value}>
              ›
            </Text>
          </Pressable>


          <Pressable style={styles.item}>
            <Text style={styles.itemTitle}>
              Privacy Policy
            </Text>

            <Text style={styles.value}>
              ›
            </Text>
          </Pressable>

        </View>


        <Text style={styles.version}>
          CLEVEFT v1.0.0
        </Text>


      </SafeAreaView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({

  container:{
    flex:1,
  },

  safeArea:{
    flex:1,
    padding:24,
  },

  backButton:{
    width:46,
    height:46,
    borderRadius:23,
    backgroundColor:"rgba(255,255,255,0.08)",
    justifyContent:"center",
    alignItems:"center",
  },

  backText:{
    color:"white",
    fontSize:22,
    fontWeight:"700",
  },

  header:{
    marginTop:25,
    marginBottom:30,
  },

  title:{
    color:"white",
    fontSize:34,
    fontWeight:"900",
  },

  subtitle:{
    color:"#BFD2FF",
    marginTop:6,
  },

  section:{
    gap:16,
  },

  item:{
    backgroundColor:"rgba(255,255,255,0.08)",
    padding:18,
    borderRadius:20,
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
  },

  itemTitle:{
    color:"white",
    fontSize:17,
    fontWeight:"700",
  },

  itemSubtitle:{
    color:"#BFD2FF",
    marginTop:5,
    fontSize:13,
  },

  value:{
    color:"#6EA8FF",
    fontSize:16,
    fontWeight:"700",
  },

  version:{
    marginTop:"auto",
    textAlign:"center",
    color:"#8EA7E8",
  },

});