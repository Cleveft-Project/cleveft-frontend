import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * The Cleveft mark, rebuilt from primitives rather than shipped as a PNG.
 *
 * The logo is a ring of radial bars broken by a gap, with a glowing node
 * sitting in the mouth — a waveform bent into a "C". Drawing each bar as its
 * own view is what makes the mark animatable: the ring can be swept on bar by
 * bar and then left breathing like live audio, which a flat image cannot do.
 *
 * Every dimension below is authored against a 220pt mark and scaled from
 * there, so `size` is the only knob callers need.
 */

const BASE = 220;

const RAY_COUNT = 44;
/** Degrees of empty arc either side of due-east, where the node sits. */
const GAP_HALF = 26;
const ARC = 360 - GAP_HALF * 2;

const INNER_R = 40;
const RAY_W = 5.5;
const RAY_MIN = 20;
const RAY_MAX = 32;

const NODE_SIZE = 22;
const NODE_R = 54;
const HALO_SIZE = 60;

const INK = '#F1F0FE';
const NODE = '#12E3D1';
const HALO = 'rgba(18, 227, 209, 0.45)';
const TILE_TOP = '#241F4B';
const TILE_BOTTOM = '#12102C';

/** How far each bar stretches at the peak of the idle breath. */
const BREATH = 0.09;

/**
 * Two overlaid sines rather than random lengths: the bar heights need to look
 * like a waveform, and randomness reads as noise instead of signal.
 */
function rayLength(index: number): number {
  const t = index / RAY_COUNT;
  const wave = 0.55 * Math.sin(t * Math.PI * 6) + 0.45 * Math.sin(t * Math.PI * 10 + 1.1);
  return RAY_MIN + (RAY_MAX - RAY_MIN) * ((wave + 1) / 2);
}

const RAYS = Array.from({ length: RAY_COUNT }, (_, index) => ({
  /** 0deg points north; the gap is centred on 90deg (east). */
  angle: 90 + GAP_HALF + (index * ARC) / (RAY_COUNT - 1),
  length: rayLength(index),
  /** Offsets the idle breath so it travels around the ring as a wave. */
  phase: (index / RAY_COUNT) * 2,
}));

/**
 * A looping sine sampled into an interpolation. One driver animates all 44
 * bars — 44 independent loops would each cost a native animation node.
 */
function breathe(driver: Animated.Value, phase: number) {
  const steps = 8;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    inputRange.push(t);
    outputRange.push(1 + BREATH * Math.sin(2 * Math.PI * (t + phase)));
  }
  return driver.interpolate({ inputRange, outputRange });
}

interface CleveftMarkProps {
  size?: number;
  /** Off renders the settled mark — useful for headers and empty states. */
  animate?: boolean;
  /** Draws the rounded app-icon tile behind the ring. */
  tile?: boolean;
  style?: ViewStyle;
}

export function CleveftMark({
  size = BASE,
  animate = true,
  tile = true,
  style,
}: CleveftMarkProps) {
  const scale = size / BASE;

  const tileIn = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const sweep = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const node = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      return;
    }

    const entrance = Animated.parallel([
      Animated.timing(tileIn, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1150,
        delay: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(node, {
        toValue: 1,
        delay: 1120,
        friction: 5,
        tension: 95,
        useNativeDriver: true,
      }),
    ]);

    // Linear, and the sine is sampled so f(0) === f(1) — otherwise the loop
    // snaps at the seam on every repeat.
    const breath = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const ripple = Animated.loop(
      Animated.timing(halo, {
        toValue: 1,
        duration: 1900,
        delay: 1150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );

    entrance.start();
    breath.start();
    ripple.start();

    return () => {
      entrance.stop();
      breath.stop();
      ripple.stop();
    };
  }, [animate, halo, node, pulse, sweep, tileIn]);

  const nodeOpacity = node.interpolate({
    inputRange: [0, 0.4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rays = useMemo(
    () =>
      RAYS.map((ray, index) => {
        // Each bar owns a 25% slice of the sweep, staggered across the first
        // 75% — so the ring draws on progressively instead of all at once.
        const start = (index / RAY_COUNT) * 0.75;
        const end = start + 0.25;

        const entry = sweep.interpolate({
          inputRange: [start, end],
          outputRange: [0.12, 1],
          extrapolate: 'clamp',
        });

        return {
          key: index,
          angle: ray.angle,
          length: ray.length,
          opacity: sweep.interpolate({
            inputRange: [start, end],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
          scaleY: animate ? Animated.multiply(entry, breathe(pulse, ray.phase)) : 1,
        };
      }),
    [animate, pulse, sweep],
  );

  return (
    <Animated.View
      style={[
        { width: size, height: size },
        {
          opacity: tileIn,
          transform: [{ scale: tileIn.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
        },
        style,
      ]}
    >
      {tile ? (
        <LinearGradient
          colors={[TILE_TOP, TILE_BOTTOM]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size * 0.24 }]}
        />
      ) : null}

      {/* Rotating the whole group means the ring winds into place as it draws,
          instead of appearing already settled. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                rotate: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-22deg', '0deg'],
                }),
              },
            ],
          },
        ]}
      >
        {rays.map((ray) => (
          // The outer view is the full mark and rotates about its own centre,
          // which puts the bar on the correct radius without transform-origin
          // maths on the bar itself.
          <View
            key={ray.key}
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${ray.angle}deg` }] }]}
            pointerEvents="none"
          >
            <Animated.View
              style={{
                position: 'absolute',
                left: (size - RAY_W * scale) / 2,
                top: (BASE / 2 - INNER_R - ray.length) * scale,
                width: RAY_W * scale,
                height: ray.length * scale,
                borderRadius: (RAY_W * scale) / 2,
                backgroundColor: INK,
                opacity: ray.opacity,
                // Grows outward from the inner end rather than from its middle.
                transformOrigin: '50% 100%',
                transform: [{ scaleY: ray.scaleY }],
              }}
            />
          </View>
        ))}

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (BASE / 2 + NODE_R) * scale - (HALO_SIZE * scale) / 2,
            top: (BASE / 2) * scale - (HALO_SIZE * scale) / 2,
            width: HALO_SIZE * scale,
            height: HALO_SIZE * scale,
            borderRadius: (HALO_SIZE * scale) / 2,
            backgroundColor: HALO,
            opacity: Animated.multiply(
              nodeOpacity,
              halo.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0, 0.55, 0],
              }),
            ),
            transform: [
              { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.45] }) },
            ],
          }}
        />

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (BASE / 2 + NODE_R) * scale - (NODE_SIZE * scale) / 2,
            top: (BASE / 2) * scale - (NODE_SIZE * scale) / 2,
            width: NODE_SIZE * scale,
            height: NODE_SIZE * scale,
            borderRadius: (NODE_SIZE * scale) / 2,
            backgroundColor: NODE,
            shadowColor: NODE,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 14 * scale,
            elevation: 10,
            opacity: nodeOpacity,
            transform: [{ scale: node }],
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}
