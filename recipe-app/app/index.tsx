import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, Pressable, StyleSheet, TextInput, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RecipeCard } from '@/components/RecipeCard';
import { useColors } from '@/hooks/use-colors';
import {
  RECIPES, getFeaturedRecipes, getTrendingRecipes, getRecipesByMealType,
  getQuickRecipes, MealType, TasteTag, ALL_RECIPES
} from '@/lib/data/recipes';
import { NEW_RECIPES } from '@/lib/data/recipes-new';
import { isOnboardingDone } from '@/lib/store';
import { AdBanner } from '@/components/AdBanner';

const MEAL_CATEGORIES: { label: string; type: MealType; emoji: string }[] = [
  { label: 'Breakfast', type: 'breakfast', emoji: '🌅' },
  { label: 'Lunch', type: 'lunch', emoji: '☀️' },
  { label: 'Dinner', type: 'dinner', emoji: '🌙' },
  { label: 'Snacks', type: 'snack', emoji: '🍿' },
  { label: 'Desserts', type: 'dessert', emoji: '🍰' },
];

type CuisineTag = 'japanese' | 'chinese' | 'korean' | 'thai' | 'vietnamese' | 'indian' | 'mediterranean' | 'mexican' | 'italian' | 'american';

const CUISINE_FILTERS: { label: string; tag: CuisineTag; emoji: string; color: string }[] = [
  { label: 'Japanese', tag: 'japanese', emoji: '🍱', color: '#C62828' },
  { label: 'Mexican', tag: 'mexican', emoji: '🌮', color: '#E65100' },
  { label: 'Indian', tag: 'indian', emoji: '🍛', color: '#F57F17' },
  { label: 'Italian', tag: 'italian', emoji: '🍝', color: '#2E7D32' },
  { label: 'Thai', tag: 'thai', emoji: '🥢', color: '#1565C0' },
  { label: 'Korean', tag: 'korean', emoji: '🥩', color: '#6A1B9A' },
  { label: 'Chinese', tag: 'chinese', emoji: '🥡', color: '#AD1457' },
  { label: 'Mediterranean', tag: 'mediterranean', emoji: '🫒', color: '#00695C' },
];

// Map cuisine tags to recipe IDs for fast lookup
const CUISINE_RECIPE_IDS: Record<CuisineTag, string[]> = {
  japanese: ['r021','r022','r023','r061','r062'],
  chinese: ['r024','r025','r026'],
  korean: ['r027','r028','r064'],
  thai: ['r029','r030','r063'],
  vietnamese: ['r031','r032'],
  indian: ['r033','r034','r035','r036','r037','r073','r074'],
  mediterranean: ['r038','r039','r040','r041','r042','r065','r066','r067','r080'],
  mexican: ['r043','r044','r045','r046','r047','r071','r072'],
  italian: ['r048','r049','r050','r051','r052','r068','r069','r070'],
  american: ['r053','r054','r055','r056','r057','r058','r059','r060','r081','r082','r083','r084','r085'],
};


// ALL_RECIPES is exported from recipes.ts

const TASTE_FILTERS: { label: string; tag: TasteTag; emoji: string; color: string }[] = [
  { label: 'Spicy', tag: 'spicy', emoji: '🌶', color: '#E8572A' },
  { label: 'Mild', tag: 'not-spicy', emoji: '😊', color: '#5B8DB8' },
  { label: 'Sweet', tag: 'sweet', emoji: '🍯', color: '#F5A623' },
  { label: 'Savory', tag: 'savory', emoji: '🧂', color: '#2D9B4E' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
  const [selectedTaste, setSelectedTaste] = useState<TasteTag | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineTag | null>(null);
  const checkedOnboarding = useRef(false);

  useEffect(() => {
    if (checkedOnboarding.current) return;
    checkedOnboarding.current = true;
    isOnboardingDone().then(done => {
      if (!done) router.replace('/onboarding' as any);
    });
  }, []);

  const featured = getFeaturedRecipes();
  const trending = getTrendingRecipes();
  const quickMeals = getQuickRecipes(30);

  const displayedRecipes = (selectedMeal || selectedTaste || selectedCuisine)
    ? RECIPES.filter(r => {
        const mealOk = !selectedMeal || r.mealType.includes(selectedMeal);
        const tasteOk = !selectedTaste || r.tasteTags.includes(selectedTaste);
        const cuisineOk = !selectedCuisine || CUISINE_RECIPE_IDS[selectedCuisine]?.includes(r.id);
        return mealOk && tasteOk && cuisineOk;
      })
    : null;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 8 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Good morning 👋</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>What are you cooking?</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.notifBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {}}
          >
            <IconSymbol name="bell.fill" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/search')}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <Text style={[styles.searchPlaceholder, { color: colors.muted }]}>Search recipes, ingredients...</Text>
        </Pressable>

        {/* Fridge Banner */}
        <Pressable
          style={({ pressed }) => [
            styles.fridgeBanner,
            { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/fridge' as any)}
        >
          <Text style={styles.fridgeBannerEmoji}>🧊</Text>
          <View style={styles.fridgeBannerText}>
            <Text style={[styles.fridgeBannerTitle, { color: '#1B5E20' }]}>What's in your fridge?</Text>
            <Text style={[styles.fridgeBannerSub, { color: '#388E3C' }]}>Find recipes with ingredients you have</Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#388E3C" />
        </Pressable>

        {/* Import Recipe Banner */}
        <Pressable
          style={({ pressed }) => [
            styles.fridgeBanner,
            { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.push('/import-recipe' as any)}
        >
          <Text style={styles.fridgeBannerEmoji}>📲</Text>
          <View style={styles.fridgeBannerText}>
            <Text style={[styles.fridgeBannerTitle, { color: '#0D47A1' }]}>Import from Social Media</Text>
            <Text style={[styles.fridgeBannerSub, { color: '#1565C0' }]}>TikTok, Instagram, YouTube, Pinterest & more</Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color="#1565C0" />
        </Pressable>

        {/* AdMob Banner — shown only to free users */}
        <AdBanner placement="home_top" />

        {/* Meal Type Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by Meal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {MEAL_CATEGORIES.map(cat => (
              <Pressable
                key={cat.type}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: selectedMeal === cat.type ? colors.primary : colors.surface,
                    borderColor: selectedMeal === cat.type ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedMeal(selectedMeal === cat.type ? null : cat.type)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  { color: selectedMeal === cat.type ? '#fff' : colors.foreground },
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Cuisine Filters */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse by Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CUISINE_FILTERS.map(cf => (
              <Pressable
                key={cf.tag}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCuisine === cf.tag ? cf.color : colors.surface,
                    borderColor: selectedCuisine === cf.tag ? cf.color : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedCuisine(selectedCuisine === cf.tag ? null : cf.tag)}
              >
                <Text style={styles.categoryEmoji}>{cf.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  { color: selectedCuisine === cf.tag ? '#fff' : colors.foreground },
                ]}>
                  {cf.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Taste Filters */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Filter by Taste</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {TASTE_FILTERS.map(tf => (
              <Pressable
                key={tf.tag}
                style={({ pressed }) => [
                  styles.tasteChip,
                  {
                    backgroundColor: selectedTaste === tf.tag ? tf.color : colors.surface,
                    borderColor: selectedTaste === tf.tag ? tf.color : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedTaste(selectedTaste === tf.tag ? null : tf.tag)}
              >
                <Text style={styles.categoryEmoji}>{tf.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  { color: selectedTaste === tf.tag ? '#fff' : colors.foreground },
                ]}>
                  {tf.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Filtered Results */}
        {displayedRecipes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {selectedMeal ? MEAL_CATEGORIES.find(c => c.type === selectedMeal)?.label : ''}{' '}
              {selectedTaste ? TASTE_FILTERS.find(t => t.tag === selectedTaste)?.label : ''} Recipes
              {' '}({displayedRecipes.length})
            </Text>
            <View style={styles.recipeGrid}>
              {displayedRecipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} style={{ marginBottom: 12 }} />
              ))}
            </View>
          </View>
        )}

        {/* Featured Recipes */}
        {!displayedRecipes && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>✨ Featured Today</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {featured.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    style={{ width: 260, marginRight: 12 }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Quick Meals */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⚡ Quick Meals (≤30 min)</Text>
                <Pressable onPress={() => {}}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </Pressable>
              </View>
              {quickMeals.slice(0, 4).map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} horizontal style={{ marginBottom: 10 }} />
              ))}
            </View>

            {/* Trending */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🔥 Trending This Week</Text>
                <Pressable onPress={() => {}}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {trending.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    style={{ width: 220, marginRight: 12 }}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Ad Banner (Free Tier) */}
            <View style={[styles.adBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.adContent}>
                <IconSymbol name="crown.fill" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adTitle, { color: colors.foreground }]}>Unlock Premium</Text>
                  <Text style={[styles.adSubtitle, { color: colors.muted }]}>Ad-free + meal planning + nutrition tracking</Text>
                </View>
                <Pressable
                  style={[styles.adBtn, { backgroundColor: colors.accent }]}
                  onPress={() => router.push('/premium' as any)}
                >
                  <Text style={styles.adBtnText}>Try Free</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  searchPlaceholder: { fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  categoryRow: { paddingRight: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1,
  },
  tasteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '600' },
  horizontalList: { paddingRight: 16 },
  recipeGrid: {},
  adBanner: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  adContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adTitle: { fontSize: 14, fontWeight: '700' },
  adSubtitle: { fontSize: 11, marginTop: 1 },
  adBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  adBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fridgeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  fridgeBannerEmoji: { fontSize: 28 },
  fridgeBannerText: { flex: 1 },
  fridgeBannerTitle: { fontSize: 14, fontWeight: '700' },
  fridgeBannerSub: { fontSize: 12, marginTop: 1 },
});
