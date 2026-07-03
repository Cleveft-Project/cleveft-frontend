import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WelcomeLogo } from '@/components/welcome-logo';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#0B1B76', '#050E2E']}
        start={[0.2, 0]}
        end={[0.8, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.backgroundShapeTop} />
          <View style={styles.backgroundShapeBottom} />

          <View style={styles.topArea}>
            <ThemedText type="title" style={styles.headerText}>
              CLEVEFT
            </ThemedText>
            <ThemedText type="smallBold" style={styles.subtitleText}>
              effortless mastery
            </ThemedText>
          </View>

          <View style={styles.middleArea}>
            <View style={styles.middleWrapper}>
              <View style={styles.logoBackgroundCircle} />
              <View style={styles.logoContainer}>
                <WelcomeLogo size={220} />
              </View>
            </View>
          </View>

          <View style={styles.bottomArea}>
            <Pressable style={styles.actionButton} onPress={() => router.push('/login')}>
              <LinearGradient
                colors={['#3E6EFF', '#1F48E1']}
                start={[0, 0]}
                end={[1, 1]}
                style={styles.buttonGradient}
              >
                <ThemedText style={styles.actionButtonText}>JOIN NOW</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
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
    paddingHorizontal: Spacing.four,
    paddingTop: 60,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backgroundShapeTop: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 200,
    backgroundColor: 'rgba(159, 129, 255, 0.24)',
  },
  backgroundShapeBottom: {
    position: 'absolute',
    bottom: -170,
    right: -160,
    width: 420,
    height: 420,
    borderRadius: 220,
    backgroundColor: 'rgba(71, 95, 255, 0.22)',
  },
  backgroundGlow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 340,
    height: 340,
    marginLeft: -170,
    borderRadius: 170,
    backgroundColor: 'rgba(96, 132, 255, 0.12)',
  },
  topArea: {
    width: '100%',
    alignItems: 'flex-start',
  },
  headerText: {
    color: '#8CB1FF',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 1.3,
    textShadowColor: 'rgba(56, 106, 255, 0.25)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  subtitleText: {
    color: '#B8C9FF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.one,
    letterSpacing: 1.2,
  },
  middleArea: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleWrapper: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  logoBackgroundCircle: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(96, 132, 255, 0.12)',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: Spacing.five,
  },
  actionButton: {
    width: '100%',
    maxWidth: 340,
  },
  buttonGradient: {
    width: '100%',
    paddingVertical: Spacing.four,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D4EFF',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 18,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
});
