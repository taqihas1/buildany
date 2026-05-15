import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECIPES, Recipe } from './data/recipes';

const FRIDGE_KEY = 'fridgeIngredients';

// ─── Persistence ────────────────────────────────────────────────────────────

export async function getFridgeIngredients(): Promise<string[]> {
  const data = await AsyncStorage.getItem(FRIDGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveFridgeIngredients(ingredients: string[]): Promise<void> {
  await AsyncStorage.setItem(FRIDGE_KEY, JSON.stringify(ingredients));
}

export async function addFridgeIngredient(ingredient: string): Promise<string[]> {
  const current = await getFridgeIngredients();
  const normalized = ingredient.trim().toLowerCase();
  if (!normalized || current.map(i => i.toLowerCase()).includes(normalized)) {
    return current;
  }
  const updated = [...current, ingredient.trim()];
  await saveFridgeIngredients(updated);
  return updated;
}

export async function removeFridgeIngredient(ingredient: string): Promise<string[]> {
  const current = await getFridgeIngredients();
  const updated = current.filter(i => i.toLowerCase() !== ingredient.toLowerCase());
  await saveFridgeIngredients(updated);
  return updated;
}

export async function clearFridgeIngredients(): Promise<void> {
  await AsyncStorage.removeItem(FRIDGE_KEY);
}

// ─── Matching Algorithm ──────────────────────────────────────────────────────

export interface RecipeMatch {
  recipe: Recipe;
  matchCount: number;
  matchPercent: number;
  missingIngredients: string[];
  availableIngredients: string[];
}

/**
 * Checks whether a fridge ingredient string matches a recipe ingredient name.
 * Uses partial/substring matching so "chicken" matches "ground chicken", etc.
 */
function ingredientMatches(fridgeItem: string, recipeIngredientName: string): boolean {
  const f = fridgeItem.toLowerCase().trim();
  const r = recipeIngredientName.toLowerCase().trim();
  // Direct substring match in either direction
  return r.includes(f) || f.includes(r);
}

/**
 * Given a list of fridge ingredients, returns all recipes ranked by how many
 * of their ingredients the user already has, highest match first.
 * Only returns recipes where at least 1 ingredient matches.
 */
export function matchRecipesToFridge(fridgeIngredients: string[]): RecipeMatch[] {
  if (fridgeIngredients.length === 0) return [];

  const results: RecipeMatch[] = [];

  for (const recipe of RECIPES) {
    const available: string[] = [];
    const missing: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const isAvailable = fridgeIngredients.some(fi =>
        ingredientMatches(fi, ingredient.name)
      );
      if (isAvailable) {
        available.push(ingredient.name);
      } else {
        missing.push(ingredient.name);
      }
    }

    if (available.length > 0) {
      const matchPercent = Math.round((available.length / recipe.ingredients.length) * 100);
      results.push({
        recipe,
        matchCount: available.length,
        matchPercent,
        missingIngredients: missing,
        availableIngredients: available,
      });
    }
  }

  // Sort: highest match % first, then by fewest missing ingredients
  results.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
    return a.missingIngredients.length - b.missingIngredients.length;
  });

  return results;
}

// ─── Common Ingredient Suggestions ──────────────────────────────────────────

export const COMMON_INGREDIENTS = [
  // Proteins
  'Eggs', 'Chicken breast', 'Ground beef', 'Salmon', 'Shrimp', 'Tofu',
  // Dairy
  'Butter', 'Milk', 'Heavy cream', 'Parmesan cheese', 'Greek yogurt',
  // Produce
  'Garlic', 'Onion', 'Lemon', 'Avocado', 'Tomatoes', 'Spinach', 'Broccoli',
  // Pantry
  'Olive oil', 'Soy sauce', 'Salt', 'Black pepper', 'Flour', 'Sugar',
  'Honey', 'Rice', 'Pasta', 'Canned tomatoes',
  // Grains
  'Rolled oats', 'Bread', 'Quinoa',
];

/**
 * Returns ingredient suggestions that contain the query string,
 * excluding items already in the fridge.
 */
export function getIngredientSuggestions(
  query: string,
  fridgeIngredients: string[],
  limit = 8
): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const fridgeLower = fridgeIngredients.map(i => i.toLowerCase());

  // First: exact starts-with matches from common list
  const common = COMMON_INGREDIENTS.filter(
    i => i.toLowerCase().includes(q) && !fridgeLower.includes(i.toLowerCase())
  );

  // Also extract unique ingredient names from all recipes
  const recipeIngredients = Array.from(
    new Set(RECIPES.flatMap(r => r.ingredients.map(i => i.name)))
  ).filter(
    name => name.toLowerCase().includes(q) && !fridgeLower.includes(name.toLowerCase())
  );

  // Merge, deduplicate, limit
  const merged = Array.from(new Set([...common, ...recipeIngredients]));
  return merged.slice(0, limit);
}
