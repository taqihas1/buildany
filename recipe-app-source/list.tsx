import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert, Linking, Modal, ScrollView
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import {
  getShoppingList, saveShoppingList, toggleShoppingItem,
  clearCheckedItems, addShoppingItem, ShoppingItem
} from '@/lib/store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Grains & Legumes', 'Pantry', 'Other'];

// Delivery services with affiliate/deep-link URL builders
const DELIVERY_SERVICES = [
  {
    id: 'instacart',
    name: 'Instacart',
    emoji: '🛒',
    color: '#43B02A',
    description: '1-hour delivery from local stores',
    buildUrl: (ingredients: string[]) => {
      const query = ingredients.slice(0, 5).join(', ');
      return `https://www.instacart.com/store/s?k=${encodeURIComponent(query)}`;
    },
  },
  {
    id: 'walmart',
    name: 'Walmart Grocery',
    emoji: '🏪',
    color: '#0071CE',
    description: 'Same-day pickup & delivery',
    buildUrl: (ingredients: string[]) => {
      const query = ingredients.slice(0, 3).join(' ');
      return `https://www.walmart.com/search?q=${encodeURIComponent(query)}&facet=fulfillment_method_in%3APickup`;
    },
  },
  {
    id: 'amazon',
    name: 'Amazon Fresh',
    emoji: '📦',
    color: '#FF9900',
    description: 'Free delivery with Prime',
    buildUrl: (ingredients: string[]) => {
      const query = ingredients.slice(0, 3).join(' ');
      return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=amazonfresh`;
    },
  },
  {
    id: 'kroger',
    name: 'Kroger',
    emoji: '🏬',
    color: '#0066CC',
    description: 'Pickup & delivery available',
    buildUrl: (ingredients: string[]) => {
      const query = ingredients.slice(0, 3).join(' ');
      return `https://www.kroger.com/search?query=${encodeURIComponent(query)}`;
    },
  },
  {
    id: 'wholefoods',
    name: 'Whole Foods',
    emoji: '🌿',
    color: '#00674B',
    description: 'Organic & natural groceries',
    buildUrl: (ingredients: string[]) => {
      const query = ingredients.slice(0, 3).join(' ');
      return `https://www.wholefoodsmarket.com/search?text=${encodeURIComponent(query)}`;
    },
  },
];

export default function ShoppingListScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const list = await getShoppingList();
    setItems(list);
  };

  const handleToggle = useCallback(async (itemId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleShoppingItem(itemId);
    await loadItems();
  }, []);

  const handleAddItem = useCallback(async () => {
    if (!newItem.trim()) return;
    await addShoppingItem({
      name: newItem.trim(),
      amount: 1,
      unit: 'item',
      checked: false,
      category: 'Other',
    });
    setNewItem('');
    setShowAddInput(false);
    await loadItems();
  }, [newItem]);

  const handleClearChecked = useCallback(async () => {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) return;
    Alert.alert(
      'Clear Purchased Items',
      `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCheckedItems();
            await loadItems();
          },
        },
      ]
    );
  }, [items]);

  const handleOrderOnline = () => {
    const unchecked = items.filter(i => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('All done!', 'All items are already checked off.');
      return;
    }
    setShowDeliveryPicker(true);
  };

  const handleSelectService = (serviceId: string) => {
    const service = DELIVERY_SERVICES.find(s => s.id === serviceId);
    if (!service) return;
    const unchecked = items.filter(i => !i.checked).map(i => i.name);
    const url = service.buildUrl(unchecked);
    setShowDeliveryPicker(false);
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open', `Please visit ${service.name} manually.`);
    });
  };

  const groupedItems = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => (i.category || 'Other') === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const uncheckedCount = totalCount - checkedCount;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Shopping List</Text>
          {totalCount > 0 && (
            <Text style={[styles.progress, { color: colors.muted }]}>
              {checkedCount} of {totalCount} items
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {checkedCount > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.clearBtn,
                { borderColor: colors.error },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleClearChecked}
            >
              <IconSymbol name="trash.fill" size={14} color={colors.error} />
              <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => setShowAddInput(s => !s)}
          >
            <IconSymbol name={showAddInput ? "xmark" : "plus"} size={16} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[
            styles.progressFill,
            { backgroundColor: colors.success, width: `${(checkedCount / totalCount) * 100}%` as any }
          ]} />
        </View>
      )}

      {/* Add Item Input */}
      {showAddInput && (
        <View style={[styles.addInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Add item..."
            placeholderTextColor={colors.muted}
            value={newItem}
            onChangeText={setNewItem}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
            autoFocus
          />
          <Pressable
            style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddItem}
          >
            <Text style={styles.addItemBtnText}>Add</Text>
          </Pressable>
        </View>
      )}

      {/* Shopping List */}
      {totalCount === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your list is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add items manually or generate from your meal plan
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.keys(groupedItems)}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: category }) => (
            <View style={styles.categorySection}>
              <Text style={[styles.categoryTitle, { color: colors.muted }]}>{category}</Text>
              {groupedItems[category].map(item => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.listItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    item.checked && { opacity: 0.5 },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleToggle(item.id)}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: item.checked ? colors.success : 'transparent',
                      borderColor: item.checked ? colors.success : colors.border,
                    }
                  ]}>
                    {item.checked && <IconSymbol name="checkmark.circle.fill" size={16} color="#fff" />}
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[
                      styles.itemName,
                      { color: colors.foreground },
                      item.checked && { textDecorationLine: 'line-through' },
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemAmount, { color: colors.muted }]}>
                      {item.amount} {item.unit}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        />
      )}

      {/* Order Online Button */}
      {totalCount > 0 && (
        <View style={[styles.orderContainer, { backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.orderBtn,
              { backgroundColor: '#43B02A' },
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleOrderOnline}
          >
            <Text style={styles.orderBtnEmoji}>🛒</Text>
            <Text style={styles.orderBtnText}>
              Order {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} Online
            </Text>
            <IconSymbol name="chevron.right" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Delivery Service Picker Modal */}
      <Modal
        visible={showDeliveryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeliveryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeliveryPicker(false)}
        >
          <Pressable style={[styles.deliverySheet, { backgroundColor: colors.background }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Choose a Delivery Service</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>
              {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} will be searched
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
              {DELIVERY_SERVICES.map(service => (
                <Pressable
                  key={service.id}
                  style={({ pressed }) => [
                    styles.serviceRow,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleSelectService(service.id)}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color + '18' }]}>
                    <Text style={styles.serviceEmoji}>{service.emoji}</Text>
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
                    <Text style={[styles.serviceDesc, { color: colors.muted }]}>{service.description}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </ScrollView>

            <View style={[styles.affiliateNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.affiliateNoteText, { color: colors.muted }]}>
                💡 Links may include affiliate codes. RecipeWise may earn a small commission on purchases.
              </Text>
            </View>

            <Pressable
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowDeliveryPicker(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  pageTitle: { fontSize: 24, fontWeight: '800' },
  progress: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  addInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  addItemBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addItemBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  categorySection: { marginBottom: 16 },
  categoryTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 6,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500' },
  itemAmount: { fontSize: 12, marginTop: 1 },
  orderContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
  },
  orderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
  },
  orderBtnEmoji: { fontSize: 18 },
  orderBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  deliverySheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32,
    maxHeight: '85%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sheetSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  serviceIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceEmoji: { fontSize: 22 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700' },
  serviceDesc: { fontSize: 12, marginTop: 2 },
  affiliateNote: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4, marginBottom: 12,
  },
  affiliateNoteText: { fontSize: 11, lineHeight: 16 },
  cancelBtn: {
    borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
});
