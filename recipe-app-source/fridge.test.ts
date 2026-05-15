import { describe, it, expect } from 'vitest';
import {
  matchRecipesToFridge,
  getIngredientSuggestions,
  COMMON_INGREDIENTS,
} from '../lib/fridge';
import { RECIPES } from '../lib/data/recipes';

describe('Fridge Matching', () => {
  it('returns empty array when no fridge ingredients', () => {
    const results = matchRecipesToFridge([]);
    expect(results).toEqual([]);
  });

  it('returns matches when ingredients are provided', () => {
    const results = matchRecipesToFridge(['eggs', 'butter', 'milk']);
    expect(results.length).toBeGreaterThan(0);
  });

  it('each match has required fields', () => {
    const results = matchRecipesToFridge(['chicken', 'garlic', 'olive oil']);
    for (const m of results) {
      expect(m.recipe).toBeDefined();
      expect(typeof m.matchPercent).toBe('number');
      expect(m.matchPercent).toBeGreaterThan(0);
      expect(m.matchPercent).toBeLessThanOrEqual(100);
      expect(Array.isArray(m.availableIngredients)).toBe(true);
      expect(Array.isArray(m.missingIngredients)).toBe(true);
      expect(m.availableIngredients.length).toBeGreaterThan(0);
    }
  });

  it('results are sorted by matchPercent descending', () => {
    const results = matchRecipesToFridge(['eggs', 'butter', 'flour', 'sugar', 'milk', 'vanilla', 'baking powder']);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].matchPercent).toBeGreaterThanOrEqual(results[i].matchPercent);
    }
  });

  it('does not include recipes with zero matching ingredients', () => {
    // Use a very obscure ingredient unlikely to match anything
    const results = matchRecipesToFridge(['zzz_nonexistent_ingredient_xyz']);
    expect(results.length).toBe(0);
  });

  it('matchPercent is 100 when all ingredients are available', () => {
    // Find a recipe with few ingredients and provide all of them
    const recipe = RECIPES.reduce((a, b) =>
      a.ingredients.length <= b.ingredients.length ? a : b
    );
    const allIngredients = recipe.ingredients.map(i => i.name);
    const results = matchRecipesToFridge(allIngredients);
    const fullMatch = results.find(r => r.recipe.id === recipe.id);
    expect(fullMatch).toBeDefined();
    expect(fullMatch!.matchPercent).toBe(100);
    expect(fullMatch!.missingIngredients.length).toBe(0);
  });

  it('partial ingredient names still match (e.g. "chicken" matches "chicken breast")', () => {
    const results = matchRecipesToFridge(['chicken']);
    expect(results.length).toBeGreaterThan(0);
    // All matched recipes should have an ingredient containing "chicken"
    for (const m of results) {
      const hasChicken = m.availableIngredients.some(i =>
        i.toLowerCase().includes('chicken')
      );
      expect(hasChicken).toBe(true);
    }
  });
});

describe('Ingredient Suggestions', () => {
  it('returns empty array for empty query', () => {
    const results = getIngredientSuggestions('', []);
    expect(results).toEqual([]);
  });

  it('returns suggestions matching the query', () => {
    const results = getIngredientSuggestions('egg', []);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.toLowerCase().includes('egg'))).toBe(true);
  });

  it('excludes ingredients already in the fridge', () => {
    const fridge = ['Eggs'];
    const results = getIngredientSuggestions('egg', fridge);
    expect(results.every(s => s.toLowerCase() !== 'eggs')).toBe(true);
  });

  it('respects the limit parameter', () => {
    const results = getIngredientSuggestions('a', [], 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('COMMON_INGREDIENTS has at least 20 items', () => {
    expect(COMMON_INGREDIENTS.length).toBeGreaterThanOrEqual(20);
  });
});
