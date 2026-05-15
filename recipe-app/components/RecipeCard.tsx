import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { Recipe } from '@/lib/data/recipes';

interface RecipeCardProps {
  recipe: Recipe;
  style?: object;
  horizontal?: boolean;
}

export function RecipeCard({ recipe, style, horizontal = false }: RecipeCardProps) {
  const router = useRouter();
  const colors = useColors();

  const totalTime = recipe.cookTimeMinutes + recipe.prepTimeMinutes;

  if (horizontal) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.horizontalCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.85 },
          style,
        ]}
        onPress={() => router.push(`/recipe/${recipe.id}` as any)}
      >
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.horizontalImage}
          resizeMode="cover"
        />
        <View style={styles.horizontalContent}>
          <View style={styles.tagRow}>
            {recipe.tasteTags.slice(0, 1).map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: getTagColor(tag, colors) }]}>
                <Text style={[styles.tagText, { color: '#fff' }]}>{formatTag(tag)}</Text>
              </View>
            ))}
            {recipe.isPremium && (
              <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                <Text style={[styles.tagText, { color: '#fff' }]}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.horizontalTitle, { color: colors.foreground }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          <View style={styles.metaRow}>
            <IconSymbol name="clock" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{totalTime} min</Text>
            <IconSymbol name="star.fill" size={13} color={colors.accent} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.rating}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
        style,
      ]}
      onPress={() => router.push(`/recipe/${recipe.id}` as any)}
    >
      <Image
        source={{ uri: recipe.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      {recipe.isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: colors.accent }]}>
          <IconSymbol name="crown.fill" size={10} color="#fff" />
          <Text style={styles.premiumText}>PRO</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.tagRow}>
          {recipe.tasteTags.slice(0, 2).map(tag => (
            <View key={tag} style={[styles.tag, { backgroundColor: getTagColor(tag, colors) }]}>
              <Text style={[styles.tagText, { color: '#fff' }]}>{formatTag(tag)}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.metaRow}>
          <IconSymbol name="clock" size={13} color={colors.muted} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{totalTime} min</Text>
          <View style={styles.dot} />
          <IconSymbol name="star.fill" size={13} color={colors.accent} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.rating}</Text>
          <View style={styles.dot} />
          <Text style={[styles.metaText, { color: colors.muted }]}>{recipe.difficulty}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getTagColor(tag: string, colors: any): string {
  switch (tag) {
    case 'spicy': return '#E8572A';
    case 'sweet': return '#F5A623';
    case 'savory': return '#2D9B4E';
    case 'not-spicy': return '#5B8DB8';
    case 'sour': return '#9B6B2D';
    default: return colors.muted;
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: 180,
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 3,
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 12,
    gap: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginHorizontal: 2,
  },
  // Horizontal card
  horizontalCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    height: 100,
  },
  horizontalImage: {
    width: 100,
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  horizontalTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
