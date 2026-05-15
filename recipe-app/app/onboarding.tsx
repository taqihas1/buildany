import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { setOnboardingDone } from '@/lib/store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🍳',
    title: 'Authentic Flavors, Timeless Recipes',
    subtitle: 'Step-by-step instructions, built-in timers, and serving scalers. Never get lost in the kitchen again.',
    bg: '#FFF5F0',
    accent: '#E8572A',
  },
  {
    emoji: '📅',
    title: 'Plan Your Week',
    subtitle: 'Drag and drop meals onto your weekly calendar. Auto-generate shopping lists from your meal plan in one tap.',
    bg: '#F0FFF4',
    accent: '#2D9B4E',
  },
  {
    emoji: '📊',
    title: 'Track Your Nutrition',
    subtitle: 'See calories, protein, carbs, and fat for every recipe. Log meals and track your daily nutrition goals.',
    bg: '#FFFBF0',
    accent: '#F5A623',
  },
  {
    emoji: '🛒',
    title: 'Smart Shopping List',
    subtitle: 'Your shopping list auto-fills from your meal plan. Check off items as you shop, or order groceries online.',
    bg: '#F0F4FF',
    accent: '#5B8DB8',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)' as any);
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <Pressable
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          onPress={handleGetStarted}
        >
          <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slidesContainer}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.emojiContainer, { backgroundColor: s.bg }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
            </View>
            <Text style={[styles.slideTitle, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.muted }]}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goToSlide(i)}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? slide.accent : colors.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: slide.accent },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleNext}
        >
          <Text style={styles.ctaBtnText}>
            {currentIndex < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          </Text>
        </Pressable>

        {currentIndex === SLIDES.length - 1 && (
          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            Free to use. Premium features available.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  skipRow: { paddingHorizontal: 20, paddingVertical: 8, alignItems: 'flex-end' },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 15, fontWeight: '500' },
  slidesContainer: { flex: 1 },
  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 20,
  },
  emojiContainer: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 72 },
  slideTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  slideSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 20,
  },
  dot: { height: 8, borderRadius: 4 },
  ctaContainer: { paddingHorizontal: 24, gap: 12, alignItems: 'center' },
  ctaBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disclaimer: { fontSize: 12 },
});
