import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WelcomeLogo } from '@/components/welcome-logo';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#111E82', '#07143D']}
        start={[0.1, 0]}
        end={[0.9, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.backgroundShapeTop} />
          <View style={styles.backgroundShapeBottom} />

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>{'<'} </ThemedText>
          </Pressable>

          <View style={styles.logoContainer}>
            <WelcomeLogo size={96} />
          </View>

          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back!
            </ThemedText>
            <ThemedText type="smallBold" style={styles.subtitle}>
              Enter Your Username & Password
            </ThemedText>
          </View>

          <View style={styles.formCard}>
            <TextInput placeholder="Username" placeholderTextColor="#9FAAE4" style={styles.input} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#9FAAE4"
              secureTextEntry
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={() => router.push('/welcome')}>
              <ThemedText style={styles.primaryButtonText}>LOGIN</ThemedText>
            </Pressable>
          </View>

          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/forgot-password')}>
              <ThemedText type="smallBold" style={styles.linkText}>
                Forgotten Password?
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/sign-up')}>
              <ThemedText type="smallBold" style={styles.linkText}>
                Create a New Account
              </ThemedText>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
  },
  backgroundShapeTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 240,
    height: 240,
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
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  header: {
    marginBottom: Spacing.four,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 40,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    color: '#B6C3FF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formCard: {
    width: '100%',
    padding: Spacing.four,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  input: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)',
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
    marginBottom: Spacing.three,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    marginTop: Spacing.three,
    backgroundColor: '#2E5CFF',
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  linkRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  linkText: {
    color: '#9FB7FF',
    fontWeight: '700',
    marginTop: Spacing.one,
  },
});
