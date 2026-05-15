import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { setIsPremium } from '@/lib/store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const FEATURES = [
  { icon: '📵', title: 'Ad-Free Experience', desc: 'Pure cooking focus — no interruptions, ever', premium: true },
  { icon: '📅', title: 'Meal Planning', desc: 'Your whole week planned in minutes, not hours', premium: true },
  { icon: '📊', title: 'Nutrition Tracking', desc: 'Know exactly what you eat, every single day', premium: true },
  { icon: '🔄', title: 'Custom Serving Scaler', desc: 'Scale any recipe to any number of people', premium: true },
  { icon: '📱', title: 'Offline Access', desc: 'Cook anywhere — no Wi-Fi required', premium: true },
  { icon: '🤖', title: 'AI Meal Suggestions', desc: 'Recipes tailored to your taste and pantry', premium: true },
  { icon: '🔍', title: 'Full Recipe Library', desc: 'Explore every cuisine, diet, and occasion', premium: false },
  { icon: '❤️', title: 'Save Recipes', desc: 'Build your personal recipe collection', premium: false },
  { icon: '🍳', title: 'Cooking Mode', desc: 'Guided steps with built-in timers', premium: false },
];

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    period: '/month',
    savings: null,
    popular: false,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$39.99',
    period: '/year',
    savings: 'Save 33%',
    popular: true,
    monthlyEquiv: '$3.33/mo',
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    price: '$99.99',
    period: 'one-time',
    savings: 'Best Value',
    popular: false,
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('annual');

  const handleSubscribe = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Demo: activate premium
    await setIsPremium(true);
    Alert.alert(
      '🎉 Welcome to Premium!',
      'Your 7-day free trial has started. Enjoy all premium features!',
      [{ text: 'Start Cooking!', onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="xmark" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.crownContainer, { backgroundColor: colors.accent + '20' }]}>
            <IconSymbol name="crown.fill" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>RecipeWise Premium</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            Unlock the full cooking experience with meal planning, nutrition tracking, and AI-powered suggestions.
          </Text>
          <View style={[styles.trialBadge, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
            <Text style={[styles.trialText, { color: colors.success }]}>✓ 7-day free trial — cancel anytime</Text>
          </View>
        </View>

        {/* Feature Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What's included</Text>
          <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {FEATURES.map((feature, i) => (
              <View
                key={feature.title}
                style={[
                  styles.featureRow,
                  i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feature.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.muted }]}>{feature.desc}</Text>
                </View>
                <View style={[
                  styles.featureBadge,
                  { backgroundColor: feature.premium ? colors.accent + '20' : colors.border + '60' }
                ]}>
                  <Text style={[
                    styles.featureBadgeText,
                    { color: feature.premium ? colors.accent : colors.muted }
                  ]}>
                    {feature.premium ? 'PRO' : 'Free'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose your plan</Text>
          <View style={styles.plansContainer}>
            {PLANS.map(plan => (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: selectedPlan === plan.id ? colors.primary + '10' : colors.surface,
                    borderColor: selectedPlan === plan.id ? colors.primary : colors.border,
                    borderWidth: selectedPlan === plan.id ? 2 : 1,
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                {plan.savings && (
                  <View style={[styles.savingsBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.savingsText}>{plan.savings}</Text>
                  </View>
                )}
                <View style={[
                  styles.planRadio,
                  {
                    borderColor: selectedPlan === plan.id ? colors.primary : colors.border,
                    backgroundColor: selectedPlan === plan.id ? colors.primary : 'transparent',
                  }
                ]}>
                  {selectedPlan === plan.id && (
                    <View style={styles.planRadioInner} />
                  )}
                </View>
                <Text style={[styles.planLabel, { color: colors.muted }]}>{plan.label}</Text>
                <Text style={[styles.planPrice, { color: colors.foreground }]}>{plan.price}</Text>
                <Text style={[styles.planPeriod, { color: colors.muted }]}>{plan.period}</Text>
                {(plan as any).monthlyEquiv && (
                  <Text style={[styles.planEquiv, { color: colors.primary }]}>{(plan as any).monthlyEquiv}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Social Proof */}
        <View style={styles.section}>
          <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
            <Text style={[styles.reviewText, { color: colors.foreground }]}>
              "Finally a recipe app that actually helps me plan my week. The meal planner and shopping list are game-changers!"
            </Text>
            <Text style={[styles.reviewer, { color: colors.muted }]}>— Sarah K., Premium user</Text>
          </View>
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.subscribeContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [
            styles.subscribeBtn,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSubscribe}
        >
          <IconSymbol name="crown.fill" size={20} color="#fff" />
          <Text style={styles.subscribeBtnText}>
            Start 7-Day Free Trial
          </Text>
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          Cancel anytime. No charges during trial.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-end' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  crownContainer: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  trialBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  trialText: { fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  featuresCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  featureIcon: { fontSize: 20 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '600' },
  featureDesc: { fontSize: 12, marginTop: 1 },
  featureBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  featureBadgeText: { fontSize: 10, fontWeight: '700' },
  plansContainer: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4, position: 'relative',
  },
  popularBadge: {
    position: 'absolute', top: -10, left: '50%',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    transform: [{ translateX: -35 }],
  },
  popularText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  savingsBadge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  savingsText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  planRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  planRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  planLabel: { fontSize: 11, fontWeight: '600' },
  planPrice: { fontSize: 20, fontWeight: '800' },
  planPeriod: { fontSize: 10 },
  planEquiv: { fontSize: 10, fontWeight: '600' },
  reviewCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  stars: { fontSize: 16 },
  reviewText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  reviewer: { fontSize: 12 },
  subscribeContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, alignItems: 'center', gap: 6,
  },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16, width: '100%',
  },
  subscribeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disclaimer: { fontSize: 11 },
});
