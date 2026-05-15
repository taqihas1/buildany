import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal, FlatList, Image, Alert
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { RECIPES, MealType } from '@/lib/data/recipes';
import {
  getMealPlan, addMealToPlan, removeMealFromPlan, saveShoppingList,
  getShoppingList, MealPlanDay, ShoppingItem
} from '@/lib/store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const MEAL_SLOTS: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { type: 'lunch', label: 'Lunch', emoji: '☀️' },
  { type: 'dinner', label: 'Dinner', emoji: '🌙' },
];

function getWeekDays(): { date: string; label: string; dayName: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ date: dateStr, label, dayName });
  }
  return days;
}

export default function PlannerScreen() {
  const colors = useColors();
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [pickingForSlot, setPickingForSlot] = useState<MealType | null>(null);
  const weekDays = getWeekDays();

  useEffect(() => {
    getMealPlan().then(setMealPlan);
  }, []);

  const getMealsForDay = useCallback((date: string, mealType: MealType) => {
    const day = mealPlan.find(d => d.date === date);
    if (!day) return [];
    return day.meals.filter(m => m.mealType === mealType).map(m => RECIPES.find(r => r.id === m.recipeId)).filter(Boolean);
  }, [mealPlan]);

  const getDayCalories = useCallback((date: string) => {
    const day = mealPlan.find(d => d.date === date);
    if (!day) return 0;
    return day.meals.reduce((sum, m) => {
      const recipe = RECIPES.find(r => r.id === m.recipeId);
      return sum + (recipe?.nutrition.calories || 0);
    }, 0);
  }, [mealPlan]);

  const handleAddMeal = useCallback(async (recipeId: string) => {
    if (!pickingForSlot) return;
    const date = weekDays[selectedDay].date;
    await addMealToPlan(date, recipeId, pickingForSlot);
    const updated = await getMealPlan();
    setMealPlan(updated);
    setShowRecipePicker(false);
    setPickingForSlot(null);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [pickingForSlot, selectedDay, weekDays]);

  const handleRemoveMeal = useCallback(async (date: string, recipeId: string, mealType: MealType) => {
    await removeMealFromPlan(date, recipeId, mealType);
    const updated = await getMealPlan();
    setMealPlan(updated);
  }, []);

  const generateShoppingList = useCallback(async () => {
    const allMeals: string[] = [];
    weekDays.forEach(day => {
      const dayPlan = mealPlan.find(d => d.date === day.date);
      if (dayPlan) {
        dayPlan.meals.forEach(m => allMeals.push(m.recipeId));
      }
    });

    if (allMeals.length === 0) {
      Alert.alert('No meals planned', 'Add some recipes to your meal plan first!');
      return;
    }

    // Use a counter to guarantee unique IDs even within the same millisecond
    let idCounter = 0;
    const makeId = () => `shop_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;

    const ingredientMap = new Map<string, ShoppingItem>();
    allMeals.forEach(recipeId => {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}_${ing.unit}`;
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          ingredientMap.set(key, { ...existing, amount: existing.amount + ing.amount });
        } else {
          ingredientMap.set(key, {
            id: makeId(),
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            checked: false,
            recipeId,
            category: getCategoryForIngredient(ing.name),
          });
        }
      });
    });

    const newItems = Array.from(ingredientMap.values());
    const existing = await getShoppingList();
    const merged = [...existing];
    let addedCount = 0;
    newItems.forEach(item => {
      if (!merged.find(e => e.name.toLowerCase() === item.name.toLowerCase())) {
        merged.push({ ...item, id: makeId() });
        addedCount++;
      }
    });
    await saveShoppingList(merged);
    Alert.alert(
      '✅ Shopping List Updated!',
      addedCount > 0
        ? `Added ${addedCount} new ingredients from your meal plan.`
        : 'All ingredients are already in your shopping list!'
    );
  }, [mealPlan, weekDays]);

  const currentDate = weekDays[selectedDay].date;
  const dayCalories = getDayCalories(currentDate);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Meal Planner</Text>
          <Pressable
            style={({ pressed }) => [
              styles.shopBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={generateShoppingList}
          >
            <IconSymbol name="cart" size={16} color="#fff" />
            <Text style={styles.shopBtnText}>Generate List</Text>
          </Pressable>
        </View>

        {/* Week Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekRow}
        >
          {weekDays.map((day, i) => {
            const dayCalories = getDayCalories(day.date);
            const isSelected = i === selectedDay;
            return (
              <Pressable
                key={day.date}
                style={({ pressed }) => [
                  styles.dayChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayName, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.muted }]}>
                  {day.dayName}
                </Text>
                <Text style={[styles.dayLabel, { color: isSelected ? '#fff' : colors.foreground }]}>
                  {day.label}
                </Text>
                {dayCalories > 0 && (
                  <Text style={[styles.dayCalories, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.muted }]}>
                    {dayCalories} cal
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Daily Summary */}
        {dayCalories > 0 && (
          <View style={[styles.daySummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total calories today</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{dayCalories} kcal</Text>
          </View>
        )}

        {/* Meal Slots */}
        {MEAL_SLOTS.map(slot => {
          const meals = getMealsForDay(currentDate, slot.type);
          return (
            <View key={slot.type} style={[styles.mealSlot, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                <Text style={[styles.slotTitle, { color: colors.foreground }]}>{slot.label}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.addMealBtn,
                    { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setPickingForSlot(slot.type);
                    setShowRecipePicker(true);
                  }}
                >
                  <IconSymbol name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.addMealText, { color: colors.primary }]}>Add</Text>
                </Pressable>
              </View>

              {meals.length === 0 ? (
                <Pressable
                  style={[styles.emptySlot, { borderColor: colors.border }]}
                  onPress={() => {
                    setPickingForSlot(slot.type);
                    setShowRecipePicker(true);
                  }}
                >
                  <Text style={[styles.emptySlotText, { color: colors.muted }]}>Tap to add a recipe</Text>
                </Pressable>
              ) : (
                <View style={styles.mealsList}>
                  {meals.map((recipe: any) => (
                    <View key={recipe.id} style={[styles.mealItem, { borderColor: colors.border }]}>
                      <Image source={{ uri: recipe.imageUrl }} style={styles.mealThumb} />
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, { color: colors.foreground }]} numberOfLines={1}>
                          {recipe.title}
                        </Text>
                        <Text style={[styles.mealMeta, { color: colors.muted }]}>
                          {recipe.cookTimeMinutes + recipe.prepTimeMinutes} min · {recipe.nutrition.calories} cal
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                        onPress={() => handleRemoveMeal(currentDate, recipe.id, slot.type)}
                      >
                        <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Recipe Picker Modal */}
      <Modal visible={showRecipePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Add to {MEAL_SLOTS.find(s => s.type === pickingForSlot)?.label}
            </Text>
            <Pressable onPress={() => setShowRecipePicker(false)}>
              <IconSymbol name="xmark" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={RECIPES}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.pickerItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleAddMeal(item.id)}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.pickerThumb} />
                <View style={styles.pickerInfo}>
                  <Text style={[styles.pickerName, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.pickerMeta, { color: colors.muted }]}>
                    {item.cookTimeMinutes + item.prepTimeMinutes} min · {item.nutrition.calories} cal
                  </Text>
                </View>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function getCategoryForIngredient(name: string): string {
  const lower = name.toLowerCase();
  if (['chicken', 'beef', 'pork', 'salmon', 'fish', 'bacon', 'shrimp'].some(m => lower.includes(m))) return 'Meat & Seafood';
  if (['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'].some(m => lower.includes(m))) return 'Dairy & Eggs';
  if (['tomato', 'onion', 'garlic', 'pepper', 'carrot', 'lettuce', 'spinach', 'avocado', 'cauliflower', 'cucumber', 'mango', 'banana', 'berry', 'lemon', 'lime'].some(m => lower.includes(m))) return 'Produce';
  if (['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'soy', 'honey', 'maple', 'vanilla', 'baking'].some(m => lower.includes(m))) return 'Pantry';
  if (['rice', 'pasta', 'bread', 'oat', 'lentil', 'quinoa'].some(m => lower.includes(m))) return 'Grains & Legumes';
  return 'Other';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  shopBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  weekRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', minWidth: 80,
  },
  dayName: { fontSize: 11, fontWeight: '600' },
  dayLabel: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  dayCalories: { fontSize: 10, marginTop: 2 },
  daySummary: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  mealSlot: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 14,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slotEmoji: { fontSize: 18 },
  slotTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  addMealBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  addMealText: { fontSize: 12, fontWeight: '600' },
  emptySlot: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  emptySlotText: { fontSize: 13 },
  mealsList: { gap: 8 },
  mealItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  mealThumb: { width: 60, height: 60 },
  mealInfo: { flex: 1, padding: 8 },
  mealName: { fontSize: 13, fontWeight: '600' },
  mealMeta: { fontSize: 11, marginTop: 2 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  pickerThumb: { width: 70, height: 70 },
  pickerInfo: { flex: 1, paddingVertical: 8 },
  pickerName: { fontSize: 14, fontWeight: '600' },
  pickerMeta: { fontSize: 12, marginTop: 2 },
});
