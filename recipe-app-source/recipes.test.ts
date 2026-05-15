import { describe, it, expect } from 'vitest';
import {
  RECIPES,
  getFeaturedRecipes,
  getTrendingRecipes,
  getRecipesByMealType,
  getQuickRecipes,
  searchRecipes,
  getRecipesByDiet,
} from '../lib/data/recipes';

describe('Recipe Data', () => {
  it('should have at least 15 recipes', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(15);
  });

  it('each recipe should have required fields', () => {
    for (const recipe of RECIPES) {
      expect(recipe.id).toBeTruthy();
      expect(recipe.title).toBeTruthy();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.nutrition.calories).toBeGreaterThan(0);
      expect(recipe.rating).toBeGreaterThanOrEqual(1);
      expect(recipe.rating).toBeLessThanOrEqual(5);
    }
  });

  it('getFeaturedRecipes returns only featured recipes', () => {
    const featured = getFeaturedRecipes();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every(r => r.isFeatured === true)).toBe(true);
  });

  it('getTrendingRecipes returns only trending recipes', () => {
    const trending = getTrendingRecipes();
    expect(trending.length).toBeGreaterThan(0);
    expect(trending.every(r => r.isTrending === true)).toBe(true);
  });

  it('getRecipesByMealType filters correctly', () => {
    const breakfast = getRecipesByMealType('breakfast');
    expect(breakfast.length).toBeGreaterThan(0);
    expect(breakfast.every(r => r.mealType.includes('breakfast'))).toBe(true);

    const dinner = getRecipesByMealType('dinner');
    expect(dinner.length).toBeGreaterThan(0);
    expect(dinner.every(r => r.mealType.includes('dinner'))).toBe(true);
  });

  it('getQuickRecipes returns recipes under the time limit', () => {
    const quick = getQuickRecipes(30);
    expect(quick.length).toBeGreaterThan(0);
    expect(quick.every(r => r.prepTimeMinutes + r.cookTimeMinutes <= 30)).toBe(true);
  });

  it('searchRecipes finds by title', () => {
    const results = searchRecipes('salmon');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.toLowerCase().includes('salmon'))).toBe(true);
  });

  it('searchRecipes finds by ingredient', () => {
    const results = searchRecipes('avocado');
    expect(results.length).toBeGreaterThan(0);
  });

  it('getRecipesByDiet filters by diet tag', () => {
    const vegan = getRecipesByDiet('vegan');
    expect(vegan.length).toBeGreaterThan(0);
    expect(vegan.every(r => r.dietTags.includes('vegan'))).toBe(true);

    const keto = getRecipesByDiet('keto');
    expect(keto.length).toBeGreaterThan(0);
    expect(keto.every(r => r.dietTags.includes('keto'))).toBe(true);
  });

  it('all recipe IDs are unique', () => {
    const ids = RECIPES.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
