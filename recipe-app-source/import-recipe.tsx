import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Supported platforms with display info
const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', emoji: '📸', color: '#E1306C', hint: 'instagram.com' },
  { id: 'tiktok', name: 'TikTok', emoji: '🎵', color: '#010101', hint: 'tiktok.com' },
  { id: 'youtube', name: 'YouTube', emoji: '▶️', color: '#FF0000', hint: 'youtube.com' },
  { id: 'facebook', name: 'Facebook', emoji: '👥', color: '#1877F2', hint: 'facebook.com' },
  { id: 'pinterest', name: 'Pinterest', emoji: '📌', color: '#E60023', hint: 'pinterest.com' },
  { id: 'web', name: 'Any Recipe Site', emoji: '🌐', color: '#6B7280', hint: 'e.g. allrecipes.com' },
];

function detectPlatform(url: string) {
  if (url.includes('instagram.com')) return PLATFORMS[0];
  if (url.includes('tiktok.com')) return PLATFORMS[1];
  if (url.includes('youtube.com') || url.includes('youtu.be')) return PLATFORMS[2];
  if (url.includes('facebook.com') || url.includes('fb.com')) return PLATFORMS[3];
  if (url.includes('pinterest.com') || url.includes('pin.it')) return PLATFORMS[4];
  return PLATFORMS[5];
}

interface ImportedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  mealType: string[];
  dietTags: string[];
  tasteTags: string[];
  ingredients: Array<{ name: string; amount: number; unit: string; notes?: string }>;
  steps: Array<{ stepNumber: number; instruction: string; timerMinutes: number }>;
  nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  tips: string[];
  sourceUrl: string;
}

export default function ImportRecipeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [importedRecipe, setImportedRecipe] = useState<ImportedRecipe | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const importMutation = trpc.recipe.importFromUrl.useMutation();

  const detectedPlatform = url.trim() ? detectPlatform(url.trim()) : null;

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert('Enter a URL', 'Paste a link from Instagram, TikTok, YouTube, Facebook, Pinterest, or any recipe website.');
      return;
    }

    // Basic URL validation
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please paste a full URL starting with https://');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const result = await importMutation.mutateAsync({ url: trimmed });
      setImportedRecipe(result as ImportedRecipe);
      setIsSaved(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        'Import Failed',
        err.message?.includes('No recipe') || err.message?.includes('Could not extract')
          ? err.message
          : 'Could not import this recipe. Make sure the link is public and contains a recipe.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSave = async () => {
    if (!importedRecipe) return;

    try {
      // Save to user's imported recipes collection in AsyncStorage
      const existing = await AsyncStorage.getItem('importedRecipes');
      const recipes: ImportedRecipe[] = existing ? JSON.parse(existing) : [];

      const newRecipe = {
        ...importedRecipe,
        id: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        imageUrl: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80`,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('importedRecipes', JSON.stringify([newRecipe, ...recipes]));

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsSaved(true);
      Alert.alert(
        '✅ Recipe Saved!',
        `"${importedRecipe.title}" has been added to your imported recipes.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Could not save the recipe. Please try again.');
    }
  };

  const handleClear = () => {
    setUrl('');
    setImportedRecipe(null);
    setIsSaved(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Import Recipe</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Platform chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.platformRow}
        >
          {PLATFORMS.map(p => (
            <View key={p.id} style={[styles.platformChip, { backgroundColor: p.color + '18', borderColor: p.color + '40' }]}>
              <Text style={styles.platformEmoji}>{p.emoji}</Text>
              <Text style={[styles.platformName, { color: p.color }]}>{p.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* URL Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Paste a recipe link</Text>
          <Text style={[styles.inputHint, { color: colors.muted }]}>
            Works with Instagram, TikTok, YouTube, Facebook, Pinterest, and any recipe website
          </Text>

          <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {detectedPlatform && (
              <Text style={styles.detectedEmoji}>{detectedPlatform.emoji}</Text>
            )}
            <TextInput
              style={[styles.urlInput, { color: colors.foreground }]}
              placeholder="https://..."
              placeholderTextColor={colors.muted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleImport}
              multiline={false}
            />
            {url.length > 0 && (
              <Pressable onPress={handleClear} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {detectedPlatform && (
            <View style={[styles.detectedBadge, { backgroundColor: detectedPlatform.color + '15' }]}>
              <Text style={[styles.detectedText, { color: detectedPlatform.color }]}>
                {detectedPlatform.emoji} Detected: {detectedPlatform.name}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.importBtn,
              { backgroundColor: importMutation.isPending ? colors.muted : colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleImport}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.importBtnText}>Extracting recipe with AI...</Text>
              </View>
            ) : (
              <Text style={styles.importBtnText}>
                {importedRecipe ? '🔄 Re-import' : '✨ Import Recipe'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* How it works */}
        {!importedRecipe && !importMutation.isPending && (
          <View style={[styles.howCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.howTitle, { color: colors.foreground }]}>How it works</Text>
            {[
              { emoji: '1️⃣', text: 'Copy a recipe link from Instagram, TikTok, YouTube, Facebook, Pinterest, or any cooking website' },
              { emoji: '2️⃣', text: 'Paste it above and tap Import Recipe' },
              { emoji: '3️⃣', text: 'Our AI reads the page and extracts ingredients, steps, and nutrition info' },
              { emoji: '4️⃣', text: 'Review the recipe and save it to your collection' },
            ].map((step, i) => (
              <View key={i} style={styles.howStep}>
                <Text style={styles.howEmoji}>{step.emoji}</Text>
                <Text style={[styles.howText, { color: colors.muted }]}>{step.text}</Text>
              </View>
            ))}
            <View style={[styles.noteBox, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '40' }]}>
              <Text style={[styles.noteText, { color: colors.foreground }]}>
                ⚠️ Note: Instagram and TikTok require the post to be public. Private posts cannot be imported.
                YouTube recipes must have the recipe written in the video description.
              </Text>
            </View>
          </View>
        )}

        {/* Imported Recipe Preview */}
        {importedRecipe && (
          <View style={[styles.recipePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Recipe Header */}
            <View style={styles.previewHeader}>
              <View style={[styles.successBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.successText, { color: colors.success }]}>✅ Recipe Extracted</Text>
              </View>
              {detectedPlatform && (
                <View style={[styles.sourceBadge, { backgroundColor: detectedPlatform.color + '15' }]}>
                  <Text style={[styles.sourceText, { color: detectedPlatform.color }]}>
                    {detectedPlatform.emoji} {detectedPlatform.name}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.recipeTitle, { color: colors.foreground }]}>{importedRecipe.title}</Text>
            {importedRecipe.description ? (
              <Text style={[styles.recipeDesc, { color: colors.muted }]} numberOfLines={3}>
                {importedRecipe.description}
              </Text>
            ) : null}

            {/* Quick Stats */}
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>⏱</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {(importedRecipe.prepTimeMinutes || 0) + (importedRecipe.cookTimeMinutes || 0)} min
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>👥</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{importedRecipe.servings || '?'}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Servings</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {importedRecipe.nutrition?.calories || '?'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Cal</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>📊</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{importedRecipe.difficulty || 'Medium'}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Level</Text>
              </View>
            </View>

            {/* Tags */}
            {(importedRecipe.dietTags?.length > 0 || importedRecipe.tasteTags?.length > 0) && (
              <View style={styles.tagsRow}>
                {[...(importedRecipe.mealType || []), ...(importedRecipe.dietTags || []), ...(importedRecipe.tasteTags || [])].map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Ingredients */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Ingredients ({importedRecipe.ingredients?.length || 0})
            </Text>
            {(importedRecipe.ingredients || []).slice(0, 8).map((ing, i) => (
              <View key={i} style={[styles.ingredientRow, { borderColor: colors.border }]}>
                <View style={[styles.ingredientDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.ingredientText, { color: colors.foreground }]}>
                  {ing.amount > 0 ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}
                  {ing.notes ? <Text style={{ color: colors.muted }}> ({ing.notes})</Text> : null}
                </Text>
              </View>
            ))}
            {(importedRecipe.ingredients?.length || 0) > 8 && (
              <Text style={[styles.moreText, { color: colors.muted }]}>
                +{importedRecipe.ingredients.length - 8} more ingredients
              </Text>
            )}

            {/* Steps preview */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Steps ({importedRecipe.steps?.length || 0})
            </Text>
            {(importedRecipe.steps || []).slice(0, 3).map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumText}>{step.stepNumber || i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]} numberOfLines={2}>
                  {step.instruction}
                </Text>
              </View>
            ))}
            {(importedRecipe.steps?.length || 0) > 3 && (
              <Text style={[styles.moreText, { color: colors.muted }]}>
                +{importedRecipe.steps.length - 3} more steps
              </Text>
            )}

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: isSaved ? colors.success : colors.primary },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleSave}
              disabled={isSaved}
            >
              <Text style={styles.saveBtnText}>
                {isSaved ? '✅ Saved to My Recipes' : '💾 Save to My Recipes'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  backText: { fontSize: 15, fontWeight: '600' },
  pageTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  platformRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  platformEmoji: { fontSize: 14 },
  platformName: { fontSize: 12, fontWeight: '700' },
  inputCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 10,
  },
  inputLabel: { fontSize: 16, fontWeight: '700' },
  inputHint: { fontSize: 12, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  detectedEmoji: { fontSize: 18 },
  urlInput: { flex: 1, fontSize: 14 },
  detectedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  detectedText: { fontSize: 12, fontWeight: '700' },
  importBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  howTitle: { fontSize: 15, fontWeight: '700' },
  howStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  howEmoji: { fontSize: 16, lineHeight: 22 },
  howText: { flex: 1, fontSize: 13, lineHeight: 20 },
  noteBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  noteText: { fontSize: 12, lineHeight: 18 },
  recipePreview: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  previewHeader: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  successBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  successText: { fontSize: 12, fontWeight: '700' },
  sourceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sourceText: { fontSize: 12, fontWeight: '700' },
  recipeTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  recipeDesc: { fontSize: 13, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    paddingVertical: 12, marginVertical: 4,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statEmoji: { fontSize: 16 },
  statValue: { fontSize: 13, fontWeight: '700' },
  statLabel: { fontSize: 10 },
  statDivider: { width: 1, marginVertical: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4, borderBottomWidth: 0.5 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  ingredientText: { flex: 1, fontSize: 13, lineHeight: 20 },
  moreText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
