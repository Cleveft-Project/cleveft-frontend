import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useThemedStyles, type Palette } from '@/theme';

/**
 * The bottom sheet every overlay in Cleveft is built from.
 *
 * <p>Written once because the three bugs it fixes were each being reinvented:
 *
 * <ul>
 *   <li><b>A real {@link Modal}.</b> Sheets used to be absolutely-positioned
 *       children of whatever screen opened them, so the dimmed backdrop only
 *       covered that screen's box — which is why the voice picker greyed out a
 *       band in the middle of the display instead of the display. A Modal is its
 *       own window and always covers everything.
 *   <li><b>The backdrop is a sibling, not a parent.</b> Wrapping the sheet in
 *       the dismiss-on-tap {@link Pressable} put a press responder around the
 *       content, and it swallowed drags before a scroll view inside could see
 *       them. That is why the time wheel would not turn.
 *   <li><b>The keyboard is accounted for.</b> Anything with a text field was
 *       covered by it. Handled by measuring the keyboard rather than with
 *       {@code KeyboardAvoidingView}, whose Android behaviour inside a Modal
 *       depends on window soft-input flags this app does not control.
 * </ul>
 */
export function Sheet({
  visible,
  onClose,
  children,
  /**
   * Whether the body scrolls.
   *
   * <p>Off by default. A scroll view wrapping a sheet that also contains one —
   * the time picker's wheels, for instance — is the nesting problem all over
   * again, so it is opt-in rather than assumed.
   */
  scrollable = false,
  /** Ignored taps on the backdrop. For work in progress that must not be lost. */
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
  dismissable?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);

  /*
   * Measured rather than avoided.
   *
   * `keyboardDidShow` on Android and `keyboardWillShow` on iOS: iOS reports the
   * height before the animation so the sheet moves with the keyboard rather
   * than after it, while Android has no `will` events at all.
   */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) =>
      setKeyboard(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Reset on close, or reopening flashes the sheet lifted for a frame.
  useEffect(() => {
    if (!visible) {
      setKeyboard(0);
    }
  }, [visible]);

  const Body = scrollable ? ScrollView : View;

  /*
   * How tall the scrolling body may be.
   *
   * Lifting the sheet above the keyboard is not enough on its own: a form
   * taller than the space left over just has its upper fields pushed off the
   * top, and no amount of scrolling brings them back because the scroll view
   * itself was never bounded. Capping it to the space actually available makes
   * every field reachable — which is why the name and institution fields could
   * not be seen while the programme field could.
   *
   * The subtraction covers the grabber, the sheet's own padding and a margin
   * above the sheet so it never looks welded to the status bar.
   */
  const bodyLimit = Math.max(180, height - keyboard - insets.top - 140);

  return (
    <Modal
      visible={visible}
      transparent
      /*
       * The platform's own slide, not a Reanimated `entering`.
       *
       * Reanimated animates a transform, and Android hit-tests against the
       * layout position rather than the transformed one — so a button inside a
       * view that slid in can have its touch target sitting where the view used
       * to be. That is the "I have to tap it twice" bug, and it applies to every
       * control in every sheet. A native window animation moves the window, so
       * there is no transform to disagree with.
       */
      animationType="slide"
      // Covers the status bar. Without it Android insets the modal and the dim
      // stops short of the top of the screen.
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Sibling, so no press responder sits between a drag and the content. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Close"
        />

        <View
          style={[
            styles.sheet,
            {
              /*
               * Lift above the keyboard, and pad for the gesture bar only when
               * there is no keyboard to clear it. Adding the keyboard height to
               * both — which the first version did — pushes the sheet up by one
               * keyboard and pads it by another, leaving a keyboard-sized blank
               * block under the buttons.
               */
              marginBottom: keyboard,
              paddingBottom: keyboard > 0 ? spacing.lg : insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={styles.grabber} />
          <Body
            style={scrollable ? [styles.scrollBody, { maxHeight: bodyLimit }] : undefined}
            contentContainerStyle={scrollable ? styles.scrollContent : undefined}
            showsVerticalScrollIndicator={false}
            // A tap on a field while another is focused should move the caret,
            // not just dismiss the keyboard and be swallowed.
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </Body>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  /*
   * Pinned to the bottom rather than merely pushed there by `justifyContent`.
   * Under Android's edge-to-edge mode the modal's own bounds are not always the
   * screen's, and flex-end honours those bounds — which left the sheet floating
   * with a strip of dimmed backdrop beneath it. Absolute positioning anchors it
   * to the bottom edge regardless.
   */
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.surfaceSolid,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
    // Never taller than the screen, whatever is put inside.
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.borderMuted,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
