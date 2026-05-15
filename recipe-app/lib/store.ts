import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, MealType } from './data/recipes';

// Keys
const KEYS = {
  SAVED_RECIPES: 'savedRecipes',
  MEAL_PLAN: 'mealPlan',
  SHOPPING_LIST: 'shoppingList',
  ONBOARDING_DONE: 'onboardingDone',
  DIETARY_PREFS: 'dietaryPrefs',
  TASTE_PREFS: 'tastePrefs',
  IS_PREMIUM: 'isPremium',
  UNIT_PREF: 'unitPref',
  DAILY_LOG: 'dailyLog',
};

// Types
export interface MealSlot {
  recipeId: string;
  mealType: MealType;
}

export interface MealPlanDay {
  date: string; // ISO date string YYYY-MM-DD
  meals: MealSlot[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  recipeId?: string;
  category?: string;
}

export interface DietaryPrefs {
  vegan: boolean;
  vegetarian: boolean;
  keto: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
}

export interface TastePrefs {
  likesSpicy: boolean;
  likesSweet: boolean;
  likesSavory: boolean;
}

export interface NutritionLogEntry {
  recipeId: string;
  servings: number;
  date: string;
}

// Saved Recipes
export async function getSavedRecipeIds(): Promise<string[]> {
  const data = await AsyncStorage.getItem(KEYS.SAVED_RECIPES);
  return data ? JSON.parse(data) : [];
}

export async function saveRecipe(recipeId: string): Promise<void> {
  const ids = await getSavedRecipeIds();
  if (!ids.includes(recipeId)) {
    await AsyncStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify([...ids, recipeId]));
  }
}

export async function unsaveRecipe(recipeId: string): Promise<void> {
  const ids = await getSavedRecipeIds();
  await AsyncStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(ids.filter(id => id !== recipeId)));
}

export async function isRecipeSaved(recipeId: string): Promise<boolean> {
  const ids = await getSavedRecipeIds();
  return ids.includes(recipeId);
}

// Meal Plan
export async function getMealPlan(): Promise<MealPlanDay[]> {
  const data = await AsyncStorage.getItem(KEYS.MEAL_PLAN);
  return data ? JSON.parse(data) : [];
}

export async function saveMealPlan(plan: MealPlanDay[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.MEAL_PLAN, JSON.stringify(plan));
}

export async function addMealToPlan(date: string, recipeId: string, mealType: MealType): Promise<void> {
  const plan = await getMealPlan();
  const dayIndex = plan.findIndex(d => d.date === date);
  if (dayIndex >= 0) {
    plan[dayIndex].meals.push({ recipeId, mealType });
  } else {
    plan.push({ date, meals: [{ recipeId, mealType }] });
  }
  await saveMealPlan(plan);
}

export async function removeMealFromPlan(date: string, recipeId: string, mealType: MealType): Promise<void> {
  const plan = await getMealPlan();
  const dayIndex = plan.findIndex(d => d.date === date);
  if (dayIndex >= 0) {
    plan[dayIndex].meals = plan[dayIndex].meals.filter(
      m => !(m.recipeId === recipeId && m.mealType === mealType)
    );
    await saveMealPlan(plan);
  }
}

// Shopping List
export async function getShoppingList(): Promise<ShoppingItem[]> {
  const data = await AsyncStorage.getItem(KEYS.SHOPPING_LIST);
  return data ? JSON.parse(data) : [];
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SHOPPING_LIST, JSON.stringify(items));
}

export async function addShoppingItem(item: Omit<ShoppingItem, 'id'>): Promise<void> {
  const items = await getShoppingList();
  const newItem: ShoppingItem = { ...item, id: Date.now().toString() };
  await saveShoppingList([...items, newItem]);
}

export async function toggleShoppingItem(itemId: string): Promise<void> {
  const items = await getShoppingList();
  const updated = items.map(item =>
    item.id === itemId ? { ...item, checked: !item.checked } : item
  );
  await saveShoppingList(updated);
}

export async function clearCheckedItems(): Promise<void> {
  const items = await getShoppingList();
  await saveShoppingList(items.filter(item => !item.checked));
}

// Onboarding
export async function isOnboardingDone(): Promise<boolean> {
  const data = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return data === 'true';
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
}

// Preferences
export async function getDietaryPrefs(): Promise<DietaryPrefs> {
  const data = await AsyncStorage.getItem(KEYS.DIETARY_PREFS);
  return data ? JSON.parse(data) : { vegan: false, vegetarian: false, keto: false, glutenFree: false, dairyFree: false };
}

export async function saveDietaryPrefs(prefs: DietaryPrefs): Promise<void> {
  await AsyncStorage.setItem(KEYS.DIETARY_PREFS, JSON.stringify(prefs));
}

export async function getTastePrefs(): Promise<TastePrefs> {
  const data = await AsyncStorage.getItem(KEYS.TASTE_PREFS);
  return data ? JSON.parse(data) : { likesSpicy: true, likesSweet: true, likesSavory: true };
}

export async function saveTastePrefs(prefs: TastePrefs): Promise<void> {
  await AsyncStorage.setItem(KEYS.TASTE_PREFS, JSON.stringify(prefs));
}

export async function getIsPremium(): Promise<boolean> {
  const data = await AsyncStorage.getItem(KEYS.IS_PREMIUM);
  return data === 'true';
}

export async function setIsPremium(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.IS_PREMIUM, value ? 'true' : 'false');
}

export async function getUnitPref(): Promise<'metric' | 'imperial'> {
  const data = await AsyncStorage.getItem(KEYS.UNIT_PREF);
  return (data as 'metric' | 'imperial') || 'imperial';
}

export async function saveUnitPref(pref: 'metric' | 'imperial'): Promise<void> {
  await AsyncStorage.setItem(KEYS.UNIT_PREF, pref);
}

// Nutrition Log
export async function getDailyLog(date: string): Promise<NutritionLogEntry[]> {
  const data = await AsyncStorage.getItem(`${KEYS.DAILY_LOG}_${date}`);
  return data ? JSON.parse(data) : [];
}

export async function addToNutritionLog(date: string, recipeId: string, servings: number): Promise<void> {
  const log = await getDailyLog(date);
  log.push({ recipeId, servings, date });
  await AsyncStorage.setItem(`${KEYS.DAILY_LOG}_${date}`, JSON.stringify(log));
}
