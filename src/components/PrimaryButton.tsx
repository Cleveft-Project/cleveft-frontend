import { COLORS } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
};

export default function PrimaryButton({
  title,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 320,
    height: 60,
    borderRadius: 30,

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#3F72FF",
    shadowOpacity: 0.45,
    shadowRadius: 15,
    elevation: 10,
  },

  text: {
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: "700",
  letterSpacing: 1,
},
});