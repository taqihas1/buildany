import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch, Image, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/lib/theme-provider';
import {
  getSavedRecipeIds, getDietaryPrefs, saveDietaryPrefs, getTastePrefs, saveTastePrefs,
  getIsPremium, setIsPremium, getUnitPref, saveUnitPref, DietaryPrefs, TastePrefs
} from '@/lib/store';
import { RECIPES } from '@/lib/data/recipes';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { colorScheme: currentScheme, setColorScheme } = useThemeContext();
  const toggleColorScheme = () => setColorScheme(currentScheme === 'dark' ? 'light' : 'dark');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<DietaryPrefs>({
    vegan: false, vegetarian: false, keto: false, glutenFree: false, dairyFree: false,
  });
  const [tastePrefs, setTastePrefs] = useState<TastePrefs>({
    likesSpicy: true, likesSweet: true, likesSavory: true,
  });
  const [isPremium, setIsPremiumState] = useState(false);
  const [unitPref, setUnitPrefState] = useState<'metric' | 'imperial'>('imperial');

  useEffect(() => {
    getSavedRecipeIds().then(setSavedIds);
    getDietaryPrefs().then(setDietaryPrefs);
    getTastePrefs().then(setTastePrefs);
    getIsPremium().then(setIsPremiumState);
    getUnitPref().then(setUnitPrefState);
  }, []);

  const savedRecipes = savedIds.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);

  const updateDietaryPref = async (key: keyof DietaryPrefs, value: boolean) => {
    const updated = { ...dietaryPrefs, [key]: value };
    setDietaryPrefs(updated);
    await saveDietaryPrefs(updated);
  };

  const updateTastePref = async (key: keyof TastePrefs, value: boolean) => {
    const updated = { ...tastePrefs, [key]: value };
    setTastePrefs(updated);
    await saveTastePrefs(updated);
  };

  const toggleUnit = async () => {
    const newPref = unitPref === 'imperial' ? 'metric' : 'imperial';
    setUnitPrefState(newPref);
    await saveUnitPref(newPref);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* Premium Banner */}
        {!isPremium ? (
          <Pressable
            style={({ pressed }) => [
              styles.premiumBanner,
              { backgroundColor: colors.accent },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.push('/premium' as any)}
          >
            <IconSymbol name="crown.fill" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumSubtitle}>Unlock meal planning, nutrition tracking & more</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#fff" />
          </Pressable>
        ) : (
          <View style={[styles.premiumBanner, { backgroundColor: colors.success }]}>
            <IconSymbol name="crown.fill" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Premium Active ✓</Text>
              <Text style={styles.premiumSubtitle}>All features unlocked</Text>
            </View>
          </View>
        )}

        {/* Saved Recipes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            ❤️ Saved Recipes ({savedRecipes.length})
          </Text>
          {savedRecipes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No saved recipes yet. Tap the heart on any recipe to save it!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {savedRecipes.map((recipe: any) => (
                <Pressable
                  key={recipe.id}
                  style={({ pressed }) => [
                    styles.savedCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => router.push(`/recipe/${recipe.id}` as any)}
                >
                  <Image source={{ uri: recipe.imageUrl }} style={styles.savedImage} />
                  <Text style={[styles.savedTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Dietary Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🥗 Dietary Preferences</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { key: 'vegan' as const, label: '🌱 Vegan' },
              { key: 'vegetarian' as const, label: '🥗 Vegetarian' },
              { key: 'keto' as const, label: '🥑 Keto' },
              { key: 'glutenFree' as const, label: 'Gluten-Free' },
              { key: 'dairyFree' as const, label: 'Dairy-Free' },
            ].map((item, i, arr) => (
              <View
                key={item.key}
                style={[
                  styles.settingRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Switch
                  value={dietaryPrefs[item.key]}
                  onValueChange={v => updateDietaryPref(item.key, v)}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={dietaryPrefs[item.key] ? colors.primary : colors.muted}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Taste Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👅 Taste Preferences</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { key: 'likesSpicy' as const, label: '🌶 I like spicy food' },
              { key: 'likesSweet' as const, label: '🍯 I like sweet dishes' },
              { key: 'likesSavory' as const, label: '🧂 I like savory food' },
            ].map((item, i, arr) => (
              <View
                key={item.key}
                style={[
                  styles.settingRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Switch
                  value={tastePrefs[item.key]}
                  onValueChange={v => updateTastePref(item.key, v)}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={tastePrefs[item.key] ? colors.primary : colors.muted}
                />
              </View>
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⚙️ Settings</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                  {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleColorScheme}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={isDark ? colors.primary : colors.muted}
              />
            </View>
            <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  📏 Units: {unitPref === 'metric' ? 'Metric' : 'Imperial'}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                  {unitPref === 'metric' ? 'ml, g, °C' : 'cups, oz, °F'}
                </Text>
              </View>
              <Switch
                value={unitPref === 'metric'}
                onValueChange={toggleUnit}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={unitPref === 'metric' ? colors.primary : colors.muted}
              />
            </View>
            {/* Demo: toggle premium */}
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  👑 Premium Status (Demo)
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                  Toggle to test premium features
                </Text>
              </View>
              <Switch
                value={isPremium}
                onValueChange={async (v) => {
                  setIsPremiumState(v);
                  await setIsPremium(v);
                }}
                trackColor={{ false: colors.border, true: colors.accent + '80' }}
                thumbColor={isPremium ? colors.accent : colors.muted}
              />
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Version</Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/premium' as any)}
            >
              <Text style={[styles.settingLabel, { color: colors.primary }]}>Upgrade to Premium</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  premiumBanner: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  premiumTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  premiumSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingLabel: { fontSize: 14, fontWeight: '500' },
  settingSubtitle: { fontSize: 11, marginTop: 2 },
  settingValue: { fontSize: 13 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  savedCard: {
    width: 130, borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  savedImage: { width: '100%', height: 90 },
  savedTitle: { fontSize: 12, fontWeight: '600', padding: 8, lineHeight: 16 },
});
