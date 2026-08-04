import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHaptics } from '@/components/animated/haptics';
import { useChrome } from '@/state/chrome-context';
import {
  radius,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
  type GlowSet,
  type Palette,
} from '@/theme';

/** Gap between the floating bar and the screen edges. */
const BAR_INSET = spacing.lg;
/** Clearance below the bar when the device has no gesture inset of its own. */
const MIN_BOTTOM_GAP = spacing.md;
/** Diameter of an unselected tab's circle, and the height of the active pill. */
const DOT = 44;

/**
 * Five destinations, matching the five things the product actually does:
 * capture, review, interrogate, prepare, share.
 */
const TABS = [
  { name: 'home', title: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'record', title: 'Record', icon: 'mic', iconOutline: 'mic-outline' },
  {
    name: 'chat',
    title: 'Ask',
    icon: 'chatbubble-ellipses',
    iconOutline: 'chatbubble-ellipses-outline',
  },
  { name: 'examprep', title: 'Exams', icon: 'school', iconOutline: 'school-outline' },
  // "Circle" rather than "Peers": the word a student would say out loud, and
  // the thing the group actually is. "Peers" is what a specification calls it.
  { name: 'collab', title: 'Circle', icon: 'people', iconOutline: 'people-outline' },
] as const;

/**
 * Structurally typed rather than imported.
 *
 * The real `BottomTabBarProps` lives at a deep path inside expo-router's
 * vendored copy of the bottom-tabs navigator, and reaching into
 * `expo-router/build/...` couples this file to that package's internal folder
 * layout. Only these three fields are used, so naming them is both safer and
 * more honest about the dependency.
 */
interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/**
 * The whole bar, drawn here rather than assembled from navigation's slots.
 *
 * Two earlier attempts failed for reasons worth recording, because both were
 * invisible from the code alone:
 *
 * 1. `tabBarButton` receives focus as `aria-selected` in this version, not as
 *    `accessibilityState.selected`. Reading the latter meant every tab believed
 *    it was unselected, so the active pill never appeared at all.
 * 2. Navigation wraps each button in a container hard-coded to `flex: 1`. No
 *    width or `flexGrow` set inside that container can win, so the pill could
 *    never have widened even with focus working — five equal columns was the
 *    only layout on offer, which is why the circles sat oddly spaced.
 *
 * Owning the row settles both: focus comes from `state.index`, which is the
 * navigator's own source of truth and cannot be renamed out from under us, and
 * the flex rules are the ones written below.
 */
function CleveftTabBar({ state, navigation }: TabBarProps) {
  const { colors, glow } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const chrome = useChrome();
  const haptics = useHaptics();

  /*
   * Shrinks away as the student scrolls down, springs back the moment they
   * scroll up.
   *
   * Transforms only — no height, no padding. A transform is composited on the
   * UI thread and never re-lays-out the tree, which matters because this is
   * animating *during* a scroll: touching layout here would make every list in
   * the app stutter, which is precisely the cost that rules out a real blur.
   *
   * It shrinks and sinks rather than sliding fully off. The bar staying
   * partly visible keeps the destinations glanceable, and means the student
   * never has to wonder where navigation went.
   */
  const barStyle = useAnimatedStyle(() => {
    if (!chrome) {
      return {};
    }
    const c = chrome.collapse.value;
    return {
      transform: [{ translateY: c * 14 }, { scale: 1 - c * 0.12 }],
      opacity: 1 - c * 0.25,
    };
  });

  return (
    <Animated.View
      style={[
        styles.barOuter,
        { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_GAP) },
        barStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, glow.accent]}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((candidate) => candidate.name === route.name);
          if (!tab) {
            return null;
          }

          const focused = state.index === index;

          const onPress = () => {
            haptics.tap();
            // The navigator's own event, so anything listening for a tab press
            // — a scroll-to-top handler, say — still fires.
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.title}
              android_ripple={{ borderless: true, color: colors.accentSoft }}
              // No transform on press. Transforms move pixels but not
              // hit-testing regions in React Native, so a scaling button's
              // edges quietly stop responding. Opacity changes no geometry.
              style={({ pressed }) => [
                styles.item,
                focused ? styles.itemActive : styles.itemIdle,
                pressed && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={19}
                color={focused ? colors.textOnAccent : colors.onInkElevated}
              />
              {focused ? (
                <Text style={styles.label} numberOfLines={1}>
                  {tab.title}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
        tabBar={(props) => <CleveftTabBar {...(props as unknown as TabBarProps)} />}
        // Five tabs is cheap to keep mounted. Detaching and reattaching native
        // screens (the default everywhere) makes a freshly reattached Android
        // surface flash its default white background before themed content
        // paints over it.
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
        ))}
    </Tabs>
  );
}

const createStyles = (c: Palette, g: GlowSet) =>
  StyleSheet.create({
    // Kept in normal layout flow rather than absolutely positioned: floating it
    // over the scene would hide the last row of every scrolling list behind it
    // and mean adding matching bottom padding to all five screens.
    barOuter: {
      paddingHorizontal: BAR_INSET,
      backgroundColor: 'transparent',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.pill,
      backgroundColor: c.ink,
      // Padding, not a fixed height. The bar is now exactly the circles plus
      // its own margin, so a circle can never overflow the slab it sits in —
      // which is what the mismatched height did before.
      padding: 6,
      gap: 6,
    },
    item: {
      height: DOT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      gap: 7,
      overflow: 'hidden',
    },
    // Fixed width, so an unselected tab is a circle and not a wide oval.
    itemIdle: {
      width: DOT,
      backgroundColor: c.inkElevated,
    },
    // Takes every pixel the circles leave behind.
    itemActive: {
      flex: 1,
      paddingHorizontal: spacing.md,
      backgroundColor: c.accentVivid,
    },
    itemPressed: {
      opacity: 0.75,
    },
    label: {
      ...typography.micro,
      fontSize: 12.5,
      color: c.textOnAccent,
      letterSpacing: 0.1,
    },
  });
