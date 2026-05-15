import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  FlatList, Image, Platform, Keyboard, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';
import {
  getFridgeIngredients, saveFridgeIngredients, addFridgeIngredient,
  removeFridgeIngredient, clearFridgeIngredients, matchRecipesToFridge,
  getIngredientSuggestions, COMMON_INGREDIENTS, RecipeMatch,
} from '@/lib/fridge';

// ─── Match Badge ─────────────────────────────────────────────────────────────

function MatchBadge({ percent, colors }: { percent: number; colors: any }) {
  const bg =
    percent >= 80 ? colors.success :
    percent >= 50 ? colors.primary :
    colors.warning;
  return (
    <View style={[styles.matchBadge, { backgroundColor: bg }]}>
      <Text style={styles.matchBadgeText}>{percent}% match</Text>
    </View>
  );
}

// ─── Recipe Match Card ────────────────────────────────────────────────────────

function MatchCard({ match, colors, onPress }: { match: RecipeMatch; colors: any; onPress: () => void }) {
  const { recipe, matchPercent, missingIngredients, availableIngredients } = match;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.matchCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      {/* Image */}
      <Image source={{ uri: recipe.imageUrl }} style={styles.matchImage} resizeMode="cover" />

      {/* Match badge overlay */}
      <View style={styles.badgeOverlay}>
        <MatchBadge percent={matchPercent} colors={colors} />
      </View>

      {/* Content */}
      <View style={styles.matchContent}>
        <Text style={[styles.matchTitle, { color: colors.foreground }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <IconSymbol name="clock" size={13} color={colors.muted} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{totalTime} min</Text>
          <IconSymbol name="star.fill" size={13} color={colors.accent} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.rating}</Text>
          <View style={[styles.difficultyDot, { backgroundColor: colors.muted }]} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.difficulty}</Text>
        </View>

        {/* Available ingredients */}
        <View style={styles.ingredientSection}>
          <Text style={[styles.ingredientLabel, { color: colors.success }]}>
            ✓ You have ({availableIngredients.length})
          </Text>
          <Text style={[styles.ingredientList, { color: colors.muted }]} numberOfLines={2}>
            {availableIngredients.join(', ')}
          </Text>
        </View>

        {/* Missing ingredients */}
        {missingIngredients.length > 0 && (
          <View style={styles.ingredientSection}>
            <Text style={[styles.ingredientLabel, { color: colors.warning }]}>
              ✗ Still need ({missingIngredients.length})
            </Text>
            <Text style={[styles.ingredientList, { color: colors.muted }]} numberOfLines={2}>
              {missingIngredients.join(', ')}
            </Text>
          </View>
        )}

        {missingIngredients.length === 0 && (
          <View style={[styles.canMakeNow, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
            <Text style={[styles.canMakeNowText, { color: colors.success }]}>
              🎉 You can make this right now!
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FridgeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [fridgeItems, setFridgeItems] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [matches, setMatches] = useState<RecipeMatch[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Load saved fridge on mount
  useEffect(() => {
    getFridgeIngredients().then(items => {
      setFridgeItems(items);
      if (items.length > 0) {
        setMatches(matchRecipesToFridge(items));
        setShowResults(true);
      }
    });
  }, []);

  // Update suggestions as user types
  useEffect(() => {
    if (query.trim().length > 0) {
      setSuggestions(getIngredientSuggestions(query, fridgeItems));
    } else {
      setSuggestions([]);
    }
  }, [query, fridgeItems]);

  const handleAddIngredient = useCallback(async (ingredient: string) => {
    const trimmed = ingredient.trim();
    if (!trimmed) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = await addFridgeIngredient(trimmed);
    setFridgeItems(updated);
    setQuery('');
    setSuggestions([]);
    // Recompute matches
    const newMatches = matchRecipesToFridge(updated);
    setMatches(newMatches);
    setShowResults(true);
  }, []);

  const handleRemoveIngredient = useCallback(async (ingredient: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const updated = await removeFridgeIngredient(ingredient);
    setFridgeItems(updated);
    const newMatches = matchRecipesToFridge(updated);
    setMatches(newMatches);
    if (updated.length === 0) setShowResults(false);
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear Fridge',
      'Remove all ingredients from your fridge list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearFridgeIngredients();
            setFridgeItems([]);
            setMatches([]);
            setShowResults(false);
          },
        },
      ]
    );
  }, []);

  const handleFindRecipes = useCallback(() => {
    Keyboard.dismiss();
    if (fridgeItems.length === 0) {
      Alert.alert('Add Ingredients', 'Add at least one ingredient to find matching recipes.');
      return;
    }
    const newMatches = matchRecipesToFridge(fridgeItems);
    setMatches(newMatches);
    setShowResults(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [fridgeItems]);

  // Quick-add chips: show common ingredients not already in fridge
  const quickAddChips = COMMON_INGREDIENTS
    .filter(i => !fridgeItems.map(f => f.toLowerCase()).includes(i.toLowerCase()))
    .slice(0, 12);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>🧊 My Fridge</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {fridgeItems.length > 0
              ? `${fridgeItems.length} ingredient${fridgeItems.length > 1 ? 's' : ''} · ${matches.length} recipe${matches.length !== 1 ? 's' : ''} found`
              : 'Add ingredients to find recipes'}
          </Text>
        </View>
        {fridgeItems.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
            onPress={handleClearAll}
          >
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Type an ingredient (e.g. chicken, eggs...)"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleAddIngredient(query)}
              returnKeyType="done"
              autoCapitalize="words"
            />
            {query.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
                onPress={() => handleAddIngredient(query)}
              >
                <IconSymbol name="plus" size={18} color="#fff" />
              </Pressable>
            )}
          </View>

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.border + '40' },
                  ]}
                  onPress={() => handleAddIngredient(s)}
                >
                  <IconSymbol name="plus.circle.fill" size={16} color={colors.primary} />
                  <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Current Fridge Items */}
        {fridgeItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              In Your Fridge
            </Text>
            <View style={styles.tagsWrap}>
              {fridgeItems.map(item => (
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.fridgeTag,
                    { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleRemoveIngredient(item)}
                >
                  <Text style={[styles.fridgeTagText, { color: colors.primary }]}>{item}</Text>
                  <IconSymbol name="xmark" size={12} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Quick Add Chips */}
        {fridgeItems.length < 15 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Quick Add
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
              {quickAddChips.map(chip => (
                <Pressable
                  key={chip}
                  style={({ pressed }) => [
                    styles.quickChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => handleAddIngredient(chip)}
                >
                  <IconSymbol name="plus" size={12} color={colors.muted} />
                  <Text style={[styles.quickChipText, { color: colors.foreground }]}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Find Recipes Button */}
        {fridgeItems.length > 0 && (
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [
                styles.findBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleFindRecipes}
            >
              <IconSymbol name="magnifyingglass" size={20} color="#fff" />
              <Text style={styles.findBtnText}>Find Matching Recipes</Text>
            </Pressable>
          </View>
        )}

        {/* Results */}
        {showResults && (
          <View style={styles.section}>
            {matches.length > 0 ? (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {matches.length} Recipe{matches.length !== 1 ? 's' : ''} Found
                  </Text>
                  <Text style={[styles.resultsSubtitle, { color: colors.muted }]}>
                    Sorted by best match
                  </Text>
                </View>
                {matches.map(match => (
                  <MatchCard
                    key={match.recipe.id}
                    match={match}
                    colors={colors}
                    onPress={() => router.push(`/recipe/${match.recipe.id}` as any)}
                  />
                ))}
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.emptyEmoji}>🤷</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No matches yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Try adding more ingredients — even pantry staples like garlic, olive oil, or eggs can unlock many recipes.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Empty state when no ingredients */}
        {fridgeItems.length === 0 && (
          <View style={styles.section}>
            <View style={[styles.emptyHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.emptyHeroEmoji}>🧊</Text>
              <Text style={[styles.emptyHeroTitle, { color: colors.foreground }]}>
                What's in your fridge?
              </Text>
              <Text style={[styles.emptyHeroSubtitle, { color: colors.muted }]}>
                Type ingredients above or tap the quick-add chips. We'll find the best recipes you can make right now.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  clearBtn: { padding: 8 },
  inputSection: { paddingHorizontal: 16, paddingTop: 16, zIndex: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionsBox: {
    borderRadius: 12, borderWidth: 1, marginTop: 4,
    overflow: 'hidden', elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionText: { fontSize: 14 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fridgeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  fridgeTagText: { fontSize: 13, fontWeight: '600' },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  quickChipText: { fontSize: 13 },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
  },
  findBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultsHeader: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', marginBottom: 12,
  },
  resultsSubtitle: { fontSize: 12 },
  matchCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 14,
  },
  matchImage: { width: '100%', height: 160 },
  badgeOverlay: { position: 'absolute', top: 12, right: 12 },
  matchBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  matchBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  matchContent: { padding: 14, gap: 8 },
  matchTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  difficultyDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 2 },
  ingredientSection: { gap: 2 },
  ingredientLabel: { fontSize: 12, fontWeight: '700' },
  ingredientList: { fontSize: 12, lineHeight: 18 },
  canMakeNow: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 4,
  },
  canMakeNowText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  emptyState: {
    borderRadius: 16, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 10,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyHero: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: 'center', gap: 12,
  },
  emptyHeroEmoji: { fontSize: 56 },
  emptyHeroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptyHeroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
