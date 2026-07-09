import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function RecordScreen() {
  const router = useRouter();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);

  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const player = useAudioPlayer(recordedUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);


  // Ask for mic permission on mount
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow microphone access to record audio."
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    })();
  }, []);

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleStart = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setHasStarted(true);
      setIsPaused(false);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Couldn't start recording.");
    }
  };
  
  const handlePause = () => {
    if (!hasStarted) return;

    if (isPaused) {
      audioRecorder.record(); // resume
      setIsPaused(false);
    } else {
      audioRecorder.pause();
      setIsPaused(true);
    }
  };

  const handleStop = async () => {
    if (!hasStarted) return;

    try {
      await audioRecorder.stop();
      setRecordedUri(audioRecorder.uri ?? null);
      setHasStarted(false);
      setIsPaused(false);
      router.push("/transcript");
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Couldn't stop recording.");
    }
  };
  const handlePlayback = () => {
    if (!recordedUri) return;

    if (playerStatus.playing) {
      player.pause();
    } else {
      if (playerStatus.didJustFinish) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <LinearGradient
      colors={["#1438C9", "#081A63", "#020A28"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Back Button */}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Record Audio</Text>
          <Text style={styles.subtitle}>
            Record your lecture, meeting or class.
          </Text>
        </View>

       {/* Recording Area */}
<View style={styles.micContainer}>

  <Pressable
    style={styles.outerCircle}
    onPress={hasStarted ? handlePause : handleStart}
  >
    <View style={styles.innerCircle}>
      <Text style={styles.mic}>🎵</Text>
    </View>
  </Pressable>

  <View style={styles.statusPill}>
    <View
      style={[
        styles.statusDot,
        {
          backgroundColor: !hasStarted
            ? "#4B84FF"
            : isPaused
            ? "#FFC107"
            : "#FF3B30",
        },
      ]}
    />

    <Text style={styles.statusText}>
      {!hasStarted
        ? "Ready to Record"
        : isPaused
        ? "Recording Paused"
        : "Recording..."}
    </Text>
  </View>

</View>

        {/* Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Recording Time</Text>
          <Text style={styles.timer}>
            {formatTime(recorderState.durationMillis ?? 0)}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.controls}>

  <Pressable
    style={styles.startButton}
    onPress={handleStart}
  >
    <Text style={styles.startText}>
      {hasStarted ? "Continue Recording" : "Start Recording"}
    </Text>
  </Pressable>

  <View style={styles.bottomControls}>

    <Pressable
      style={styles.controlButton}
      onPress={handlePause}
    >
      <Text style={styles.controlText}>
        {isPaused ? "Resume" : "Pause"}
      </Text>
    </Pressable>

    <Pressable
      style={styles.stopButton}
      onPress={handleStop}
    >
      <Text style={styles.controlText}>
        Stop
      </Text>
    </Pressable>

  </View>

</View>
        {/* Playback */}
        {recordedUri && (
          <Pressable style={styles.playbackButton} onPress={handlePlayback}>
            <Text style={styles.controlText}>
              {playerStatus.playing ? "⏸ Pause Playback" : "▶ Play Recording"}
            </Text>
          </Pressable>
        )}

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

  back: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  header: {
    marginTop: 20,
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

  micContainer: {
    alignItems: "center",
  },

  outerCircle: {
  width: 300,
  height: 300,
  borderRadius: 150,
  backgroundColor: "rgba(75,132,255,0.12)",
  justifyContent: "center",
  alignItems: "center",
},

  innerCircle: {
  width: 210,
  height: 210,
  borderRadius: 105,
  backgroundColor: "#4B84FF",
  justifyContent: "center",
  alignItems: "center",

  shadowColor: "#4B84FF",
  shadowOpacity: 0.7,
  shadowRadius: 30,
  shadowOffset: {
    width: 0,
    height: 0,
  },
  elevation: 20,
},

 mic: {
  fontSize: 85,
  color: "white",
},

  statusPill: {
  marginTop: 24,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.08)",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 30,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
},

statusDot: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginRight: 10,
},

statusText: {
  color: "white",
  fontWeight: "700",
  fontSize: 16,
},
  timerCard: {
  backgroundColor: "rgba(255,255,255,0.06)",
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
  paddingVertical: 28,
  alignItems: "center",
},

  timerLabel: {
    color: "#BFD2FF",
    fontSize: 15,
  },

  timer: {
  color: "white",
  fontSize: 50,
  fontWeight: "900",
  marginTop: 8,
  letterSpacing: 3,
},

  controls: {
  gap: 18,
},

startButton: {
  backgroundColor: "#4B84FF",
  height: 62,
  borderRadius: 31,
  justifyContent: "center",
  alignItems: "center",

  shadowColor: "#4B84FF",
  shadowOpacity: 0.6,
  shadowRadius: 18,
  elevation: 10,
},

startText: {
  color: "white",
  fontWeight: "800",
  fontSize: 18,
},

bottomControls: {
  flexDirection: "row",
  justifyContent: "space-between",
},

  controlButton: {
  backgroundColor: "#355EF4",
  width: "47%",
  height: 58,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
},

 stopButton: {
  backgroundColor: "#E34B4B",
  width: "47%",
  height: 58,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
},

  playbackButton: {
    backgroundColor: "#2E7D32",
    height: 55,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  controlText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});