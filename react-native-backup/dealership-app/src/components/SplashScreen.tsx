import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Sparkle particle component
function Sparkle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Generate random sparkles
  const sparkles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height * 0.7,
    size: Math.random() * 8 + 2,
    delay: Math.random() * 2000,
  }));

  useEffect(() => {
    // Background color cycling
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgColorAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(bgColorAnim, { toValue: 2, duration: 2000, useNativeDriver: false }),
        Animated.timing(bgColorAnim, { toValue: 3, duration: 2000, useNativeDriver: false }),
        Animated.timing(bgColorAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();

    // Logo entrance
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();

    // Auto-finish after 3.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        onFinish();
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  // Interpolate background color
  const bgColor = bgColorAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['#FF006E', '#FB5607', '#8338EC', '#3A86FF'],
  });

  // Shimmer text color
  const shimmerColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FFD700', '#FFFFFF', '#FFD700'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: fadeAnim }]}>
      {/* Sparkles */}
      {sparkles.map((s) => (
        <Sparkle key={s.id} delay={s.delay} x={s.x} y={s.y} size={s.size} />
      ))}

      {/* Main content */}
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        {/* Bling crown icon */}
        <Text style={styles.crown}>👑</Text>

        {/* App name with shimmer */}
        <Animated.Text style={[styles.title, { color: shimmerColor }]}>
          CarBuying
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { color: shimmerColor }]}>
          Assistant
        </Animated.Text>

        {/* Fashion tagline */}
        <Text style={styles.tagline}>✨ Your Style. Your Ride. ✨</Text>

        {/* Bling dots */}
        <View style={styles.dotsRow}>
          <Text style={styles.dot}>💎</Text>
          <Text style={styles.dot}>🚗</Text>
          <Text style={styles.dot}>💎</Text>
        </View>

        {/* Loading bar */}
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                width: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['20%', '80%'],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  crown: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 5,
    marginTop: -5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 20,
    fontWeight: '600',
    letterSpacing: 2,
    opacity: 0.9,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 25,
    gap: 15,
  },
  dot: {
    fontSize: 28,
  },
  loadingContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 40,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    borderRadius: 50,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
});
