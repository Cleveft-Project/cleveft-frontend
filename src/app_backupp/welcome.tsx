import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WelcomeLogo } from '@/components/welcome-logo';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#131D8C', '#0B1353']}
        start={[0.2, 0]}
        end={[0.8, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.backgroundShapeTop} />
          <View style={styles.backgroundShapeBottom} />

          <View style={styles.logoContainer}>
            <WelcomeLogo size={220} />
          </View>

          <ThemedText type="title" style={styles.welcomeText}>
            welcome
          </ThemedText>
        </SafeAreaView>
      </LinearGradient>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
  },
  backgroundShapeTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 180,
    backgroundColor: 'rgba(161, 123, 255, 0.22)',
  },
  backgroundShapeBottom: {
    position: 'absolute',
    bottom: -130,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 180,
    backgroundColor: 'rgba(72, 108, 255, 0.24)',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  welcomeText: {
    color: '#E9F0FF',
    fontSize: 48,
    fontWeight: '800',
    textTransform: 'lowercase',
    marginBottom: Spacing.four,
  },
});
