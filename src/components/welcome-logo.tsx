import { StyleSheet, View, type ViewStyle } from 'react-native';

export type WelcomeLogoProps = {
  size?: number;
  style?: ViewStyle;
};

export function WelcomeLogo({ size = 180, style }: WelcomeLogoProps) {
  const accentSize = size * 0.18;
  const headSize = size * 0.64;
  const ribbonWidth = size * 0.48;
  const ribbonHeight = size * 0.16;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View
        style={[
          styles.ribbon,
          {
            width: ribbonWidth,
            height: ribbonHeight,
            top: size * 0.06,
            left: size * 0.26,
            backgroundColor: '#F5B82D',
            transform: [{ rotate: '24deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.ribbon,
          {
            width: ribbonWidth,
            height: ribbonHeight,
            top: size * 0.28,
            left: size * 0.12,
            backgroundColor: '#B36BFF',
            transform: [{ rotate: '-18deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            top: size * 0.18,
            left: size * 0.18,
            backgroundColor: '#3F23D0',
          },
        ]}
      />
      <View
        style={[
          styles.highlight,
          {
            width: accentSize,
            height: accentSize,
            borderRadius: accentSize / 2,
            top: size * 0.22,
            left: size * 0.58,
            backgroundColor: '#FFD660',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbon: {
    position: 'absolute',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  head: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  highlight: {
    position: 'absolute',
  },
});
