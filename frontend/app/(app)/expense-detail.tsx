import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, Shadows } from '../../constants/theme';
import SplitModal from '../../components/SplitModal';

import { API_BASE_URL } from '../../constants/api';

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

type ExpenseDetail = {
  id: string;
  merchantName: string;
  totalAmount: number;
  date: string;
  category: string;
  lineItems: { name: string; price: number }[];
  returnDate: string | null;
  warrantyDate: string | null;
  createdAt: string;
};

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [splitVisible, setSplitVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.success) setExpense(json.data);
        } catch {}
      } catch (err) {
        console.error('Failed to fetch expense detail:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const daysUntil = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Expense not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.errorText, { color: Colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors['on-surface']} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Receipt Detail</Text>
        <TouchableOpacity onPress={() => setSplitVisible(true)}>
          <Ionicons name="people" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={[styles.categoryBadge, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name={CATEGORY_ICONS[expense.category] ?? 'cube'} size={28} color={Colors.primary} />
          </View>
          <Text style={styles.merchantName}>{expense.merchantName}</Text>
          <Text style={styles.totalAmount}>₹{Number(expense.totalAmount).toFixed(2)}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar" size={12} color={Colors['on-surface-variant']} />
              <Text style={styles.metaText}>{formatDate(expense.date)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="pricetag" size={12} color={Colors['on-surface-variant']} />
              <Text style={styles.metaText}>{expense.category}</Text>
            </View>
          </View>
        </View>

        {/* Line Items */}
        {expense.lineItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Items</Text>
            </View>
            {expense.lineItems.map((item, i) => (
              <View key={i} style={[styles.lineItemRow, i === expense.lineItems.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.lineItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.lineItemPrice}>₹{Number(item.price).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{Number(expense.totalAmount).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Return & Warranty */}
        {(expense.returnDate || expense.warrantyDate) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Protection</Text>
            </View>
            {expense.returnDate && (
              <View style={styles.protectionRow}>
                <View style={[styles.protectionIcon, { backgroundColor: '#F59E0B15' }]}>
                  <Ionicons name="arrow-undo" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.protectionTitle}>Return Window</Text>
                  <Text style={styles.protectionDate}>{formatDate(expense.returnDate)}</Text>
                </View>
                {daysUntil(expense.returnDate) > 0 ? (
                  <View style={[styles.daysBadge, { backgroundColor: '#F59E0B15' }]}>
                    <Text style={[styles.daysText, { color: '#F59E0B' }]}>{daysUntil(expense.returnDate)}d left</Text>
                  </View>
                ) : (
                  <View style={[styles.daysBadge, { backgroundColor: Colors.error + '15' }]}>
                    <Text style={[styles.daysText, { color: Colors.error }]}>Expired</Text>
                  </View>
                )}
              </View>
            )}
            {expense.warrantyDate && (
              <View style={styles.protectionRow}>
                <View style={[styles.protectionIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="shield" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.protectionTitle}>Warranty</Text>
                  <Text style={styles.protectionDate}>{formatDate(expense.warrantyDate)}</Text>
                </View>
                {daysUntil(expense.warrantyDate) > 0 ? (
                  <View style={[styles.daysBadge, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={[styles.daysText, { color: Colors.primary }]}>{daysUntil(expense.warrantyDate)}d</Text>
                  </View>
                ) : (
                  <View style={[styles.daysBadge, { backgroundColor: Colors.error + '15' }]}>
                    <Text style={[styles.daysText, { color: Colors.error }]}>Expired</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setSplitVisible(true)}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={styles.actionText}>Split</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <SplitModal
        visible={splitVisible}
        onClose={() => setSplitVisible(false)}
        expenseId={expense.id}
        merchantName={expense.merchantName}
        totalAmount={Number(expense.totalAmount)}
        apiBaseUrl={API_BASE_URL}
        getToken={getToken}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, fontFamily: Fonts.headline, color: Colors['on-surface-variant'] },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  topTitle: { fontSize: 16, fontFamily: Fonts.headline, color: Colors['on-surface'] },

  content: { paddingHorizontal: 20 },

  heroCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card,
    padding: 28, alignItems: 'center',
    marginBottom: 16, ...Shadows.editorial,
  },
  categoryBadge: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  merchantName: { fontSize: 22, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'], marginBottom: 4 },
  totalAmount: { fontSize: 34, fontFamily: Fonts.headlineExtra, color: Colors.primary, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors['surface-container-high'],
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.pill,
  },
  metaText: { fontSize: 11, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },

  sectionCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card, padding: 20,
    marginBottom: 16, ...Shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.headline, color: Colors['on-surface'] },

  lineItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors['surface-container-high'],
  },
  lineItemName: { flex: 1, fontSize: 14, fontFamily: Fonts.body, color: Colors['on-surface'] },
  lineItemPrice: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'] },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12, marginTop: 4,
    borderTopWidth: 2, borderTopColor: Colors.primary + '20',
  },
  totalLabel: { fontSize: 14, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  totalValue: { fontSize: 16, fontFamily: Fonts.headlineExtra, color: Colors.primary },

  protectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
  },
  protectionIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  protectionTitle: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  protectionDate: { fontSize: 12, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 1 },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.pill },
  daysText: { fontSize: 11, fontFamily: Fonts.headlineExtra },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary + '10', height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  actionText: { fontSize: 14, fontFamily: Fonts.headline, color: Colors.primary },
});
