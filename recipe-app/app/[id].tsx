import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, Pressable,
  StyleSheet, Alert, Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { RECIPES, Recipe } from '@/lib/data/recipes';
import { saveRecipe, unsaveRecipe, isRecipeSaved } from '@/lib/store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [useMetric, setUseMetric] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'nutrition'>('ingredients');

  const recipe = RECIPES.find(r => r.id === id);

  useEffect(() => {
    if (recipe) {
      isRecipeSaved(recipe.id).then(setSaved);
    }
  }, [recipe]);

  const toggleSave = useCallback(async () => {
    if (!recipe) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (saved) {
      await unsaveRecipe(recipe.id);
      setSaved(false);
    } else {
      await saveRecipe(recipe.id);
      setSaved(true);
    }
  }, [recipe, saved]);

  if (!recipe) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Recipe not found</Text>
      </View>
    );
  }

  const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;
  const scaledIngredients = recipe.ingredients.map(ing => ({
    ...ing,
    amount: Math.round(ing.amount * servingMultiplier * 10) / 10,
  }));

  const convertAmount = (amount: number, unit: string) => {
    if (!useMetric) return `${amount} ${unit}`;
    // Basic conversions
    const conversions: Record<string, { factor: number; unit: string }> = {
      'cup': { factor: 240, unit: 'ml' },
      'cups': { factor: 240, unit: 'ml' },
      'tbsp': { factor: 15, unit: 'ml' },
      'tsp': { factor: 5, unit: 'ml' },
      'oz': { factor: 28.35, unit: 'g' },
      'lb': { factor: 453.6, unit: 'g' },
    };
    const conv = conversions[unit.toLowerCase()];
    if (conv) {
      return `${Math.round(amount * conv.factor)} ${conv.unit}`;
    }
    return `${amount} ${unit}`;
  };

  const difficultyColor = recipe.difficulty === 'easy' ? colors.success :
    recipe.difficulty === 'medium' ? colors.warning : colors.error;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <View style={[styles.heroOverlay]} />
          {/* Back button */}
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: 'rgba(0,0,0,0.4)' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={22} color="#fff" />
          </Pressable>
          {/* Action buttons */}
          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: 'rgba(0,0,0,0.4)' },
                pressed && { opacity: 0.7 },
              ]}
              onPress={toggleSave}
            >
              <IconSymbol name={saved ? "heart.fill" : "heart"} size={22} color={saved ? '#FF4B6E' : '#fff'} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: 'rgba(0,0,0,0.4)' },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => Share.share({ message: `Check out this recipe: ${recipe.title}` })}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
          {/* Tags */}
          <View style={styles.tagRow}>
            {recipe.tasteTags.map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: getTagColor(tag) }]}>
                <Text style={styles.tagText}>{formatTag(tag)}</Text>
              </View>
            ))}
            {recipe.dietTags.slice(0, 2).map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.muted }]}>{formatDietTag(tag)}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>{recipe.title}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{recipe.description}</Text>

          {/* Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <IconSymbol name="clock" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{totalTime}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>min</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <IconSymbol name="star.fill" size={20} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{recipe.rating}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>({recipe.ratingCount.toLocaleString()})</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <IconSymbol name="bolt.fill" size={20} color={difficultyColor} />
              <Text style={[styles.statValue, { color: colors.foreground, textTransform: 'capitalize' }]}>{recipe.difficulty}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>level</Text>
            </View>
          </View>

          {/* Serving Scaler */}
          <View style={[styles.scalerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scalerLabel, { color: colors.foreground }]}>Servings</Text>
            <View style={styles.scalerControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.scalerBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setServingMultiplier(m => Math.max(0.5, Math.round((m - 0.5) * 10) / 10))}
              >
                <IconSymbol name="minus" size={16} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.scalerValue, { color: colors.foreground }]}>
                {Math.round(recipe.servings * servingMultiplier * 10) / 10} servings
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.scalerBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setServingMultiplier(m => Math.round((m + 0.5) * 10) / 10)}
              >
                <IconSymbol name="plus" size={16} color={colors.foreground} />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.unitToggle,
                { backgroundColor: useMetric ? colors.primary : colors.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setUseMetric(m => !m)}
            >
              <Text style={[styles.unitToggleText, { color: useMetric ? '#fff' : colors.muted }]}>
                {useMetric ? 'Metric' : 'Imperial'}
              </Text>
            </Pressable>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['ingredients', 'steps', 'nutrition'] as const).map(tab => (
              <Pressable
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.muted },
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Ingredients Tab */}
          {activeTab === 'ingredients' && (
            <View style={styles.tabContent}>
              {scaledIngredients.map((ing, i) => (
                <View key={i} style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.ingredientDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.ingredientName, { color: colors.foreground }]}>{ing.name}</Text>
                  <Text style={[styles.ingredientAmount, { color: colors.muted }]}>
                    {convertAmount(ing.amount, ing.unit)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Steps Tab */}
          {activeTab === 'steps' && (
            <View style={styles.tabContent}>
              {recipe.steps.map((step) => (
                <View key={step.stepNumber} style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepText, { color: colors.foreground }]}>{step.instruction}</Text>
                    {step.timerMinutes && (
                      <View style={[styles.timerBadge, { backgroundColor: colors.warning + '20' }]}>
                        <IconSymbol name="timer" size={13} color={colors.warning} />
                        <Text style={[styles.timerText, { color: colors.warning }]}>{step.timerMinutes} min timer</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {recipe.tips.length > 0 && (
                <View style={[styles.tipsCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
                  <Text style={[styles.tipsTitle, { color: colors.accent }]}>💡 Chef's Tips</Text>
                  {recipe.tips.map((tip, i) => (
                    <Text key={i} style={[styles.tipText, { color: colors.foreground }]}>• {tip}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Nutrition Tab */}
          {activeTab === 'nutrition' && (
            <View style={styles.tabContent}>
              <Text style={[styles.nutritionNote, { color: colors.muted }]}>
                Per serving ({Math.round(recipe.servings * servingMultiplier * 10) / 10} servings total)
              </Text>
              <View style={styles.nutritionGrid}>
                {[
                  { label: 'Calories', value: Math.round(recipe.nutrition.calories * servingMultiplier), unit: 'kcal', color: colors.primary },
                  { label: 'Protein', value: Math.round(recipe.nutrition.protein * servingMultiplier), unit: 'g', color: '#5B8DB8' },
                  { label: 'Carbs', value: Math.round(recipe.nutrition.carbs * servingMultiplier), unit: 'g', color: colors.warning },
                  { label: 'Fat', value: Math.round(recipe.nutrition.fat * servingMultiplier), unit: 'g', color: '#E8572A' },
                  { label: 'Fiber', value: Math.round(recipe.nutrition.fiber * servingMultiplier), unit: 'g', color: colors.success },
                ].map(item => (
                  <View key={item.label} style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.nutritionValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={[styles.nutritionUnit, { color: colors.muted }]}>{item.unit}</Text>
                    <Text style={[styles.nutritionLabel, { color: colors.muted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Start Cooking Button */}
      <View style={[styles.cookingButtonContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cookingButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => router.push(`/cooking/${recipe.id}` as any)}
        >
          <IconSymbol name="play.fill" size={20} color="#fff" />
          <Text style={styles.cookingButtonText}>Start Cooking</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getTagColor(tag: string): string {
  switch (tag) {
    case 'spicy': return '#E8572A';
    case 'sweet': return '#F5A623';
    case 'savory': return '#2D9B4E';
    case 'not-spicy': return '#5B8DB8';
    case 'sour': return '#9B6B2D';
    default: return '#888';
  }
}

function formatTag(tag: string): string {
  switch (tag) {
    case 'not-spicy': return 'Mild';
    case 'spicy': return '🌶 Spicy';
    case 'sweet': return '🍯 Sweet';
    case 'savory': return 'Savory';
    case 'sour': return 'Sour';
    default: return tag;
  }
}

function formatDietTag(tag: string): string {
  const map: Record<string, string> = {
    'vegan': '🌱 Vegan',
    'vegetarian': '🥗 Vegetarian',
    'keto': '🥑 Keto',
    'gluten-free': 'GF',
    'dairy-free': 'DF',
    'high-protein': '💪 High Protein',
  };
  return map[tag] || tag;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: { position: 'relative', height: 300 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  backButton: {
    position: 'absolute', top: 56, left: 16,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  heroActions: {
    position: 'absolute', top: 56, right: 16,
    flexDirection: 'row', gap: 10,
  },
  actionButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 16, gap: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  description: { fontSize: 14, lineHeight: 21 },
  statsRow: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: 'center', justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 36 },
  scalerCard: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  scalerLabel: { fontSize: 14, fontWeight: '600' },
  scalerControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scalerBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scalerValue: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'center' },
  unitToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  unitToggleText: { fontSize: 12, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabContent: { gap: 10 },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, gap: 10,
  },
  ingredientDot: { width: 8, height: 8, borderRadius: 4 },
  ingredientName: { flex: 1, fontSize: 14 },
  ingredientAmount: { fontSize: 13, fontWeight: '600' },
  stepCard: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 12, alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepContent: { flex: 1, gap: 8 },
  stepText: { fontSize: 14, lineHeight: 21 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start',
  },
  timerText: { fontSize: 12, fontWeight: '600' },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 19 },
  nutritionNote: { fontSize: 12, textAlign: 'center' },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutritionCard: {
    flex: 1, minWidth: '28%', borderRadius: 14, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 2,
  },
  nutritionValue: { fontSize: 22, fontWeight: '800' },
  nutritionUnit: { fontSize: 11 },
  nutritionLabel: { fontSize: 12, fontWeight: '600' },
  cookingButtonContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
  },
  cookingButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
  },
  cookingButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
