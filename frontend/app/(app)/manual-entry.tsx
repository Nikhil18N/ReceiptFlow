import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, Shadows } from '../../constants/theme';

const API_BASE_URL = 'https://shut-dance-essay-pulling.trycloudflare.com';

const CATEGORIES = [
  'Food & Drink', 'Groceries', 'Transport', 'Shopping',
  'Travel', 'Entertainment', 'Healthcare', 'Other',
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Food & Drink': 'restaurant',
  'Groceries': 'cart',
  'Transport': 'car',
  'Shopping': 'bag',
  'Travel': 'airplane',
  'Entertainment': 'film',
  'Healthcare': 'medical',
  'Other': 'cube',
};

type LineItem = { name: string; price: string };

export default function ManualEntryScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [merchantName, setMerchantName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { name: '', price: '' }]);
  };

  const updateLineItem = (index: number, field: 'name' | 'price', value: string) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!merchantName.trim()) return Alert.alert('Missing', 'Please enter a merchant name.');
    if (!totalAmount || isNaN(Number(totalAmount))) return Alert.alert('Missing', 'Please enter a valid amount.');
    if (!category) return Alert.alert('Missing', 'Please select a category.');

    setSaving(true);
    try {
      const token = await getToken();
      const formattedItems = lineItems
        .filter(i => i.name.trim() && i.price)
        .map(i => ({ name: i.name.trim(), price: Number(i.price) }));

      const res = await fetch(`${API_BASE_URL}/api/expenses/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantName: merchantName.trim(),
          totalAmount: Number(totalAmount),
          date,
          category,
          lineItems: formattedItems,
        }),
      });

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success) {
          Alert.alert('Success!', 'Expense added successfully.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('Error', json.error || 'Failed to save expense.');
        }
      } catch {
        Alert.alert('Error', 'Unexpected server response.');
      }
    } catch (err) {
      console.error('Manual entry error:', err);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors['on-surface']} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Add Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder="0.00"
            placeholderTextColor={Colors['on-surface-variant'] + '40'}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Merchant */}
        <Text style={styles.fieldLabel}>Merchant</Text>
        <TextInput
          style={styles.textField}
          value={merchantName}
          onChangeText={setMerchantName}
          placeholder="e.g., Starbucks, Amazon, Swiggy"
          placeholderTextColor={Colors['on-surface-variant'] + '60'}
        />

        {/* Date */}
        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput
          style={styles.textField}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors['on-surface-variant'] + '60'}
        />

        {/* Category */}
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat] ?? 'cube'}
                size={16}
                color={category === cat ? '#fff' : Colors['on-surface-variant']}
              />
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Line Items */}
        <View style={styles.lineItemsHeader}>
          <Text style={styles.fieldLabel}>Line Items (optional)</Text>
          <TouchableOpacity onPress={addLineItem} style={styles.addItemBtn}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={styles.lineItemRow}>
            <TextInput
              style={[styles.textField, { flex: 2, marginBottom: 0 }]}
              value={item.name}
              onChangeText={(v) => updateLineItem(i, 'name', v)}
              placeholder="Item name"
              placeholderTextColor={Colors['on-surface-variant'] + '60'}
            />
            <TextInput
              style={[styles.textField, { flex: 1, marginBottom: 0, marginLeft: 8 }]}
              value={item.price}
              onChangeText={(v) => updateLineItem(i, 'price', v)}
              placeholder="₹"
              placeholderTextColor={Colors['on-surface-variant'] + '60'}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity onPress={() => removeLineItem(i)} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!merchantName.trim() || !totalAmount || !category) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving || !merchantName.trim() || !totalAmount || !category}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Expense</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  topTitle: { fontSize: 16, fontFamily: Fonts.headline, color: Colors['on-surface'] },

  content: { paddingHorizontal: 20 },

  amountSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, marginBottom: 20,
  },
  currencySymbol: { fontSize: 32, fontFamily: Fonts.headline, color: Colors['on-surface-variant'], marginRight: 4 },
  amountInput: {
    fontSize: 48, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'],
    minWidth: 100, textAlign: 'center',
  },

  fieldLabel: {
    fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'],
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  textField: {
    backgroundColor: Colors['surface-container-high'],
    borderRadius: 14, height: 48,
    paddingHorizontal: 16, marginBottom: 16,
    fontFamily: Fonts.body, fontSize: 15, color: Colors['on-surface'],
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.pill,
    backgroundColor: Colors['surface-container-low'],
    borderWidth: 1, borderColor: Colors['outline-variant'] + '30',
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  categoryChipTextActive: { color: '#fff' },

  lineItemsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: 12, fontFamily: Fonts.headline, color: Colors.primary },

  lineItemRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10,
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 54, borderRadius: 16,
    marginTop: 20, ...Shadows.fab,
  },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.headlineExtra, color: '#fff' },
});
