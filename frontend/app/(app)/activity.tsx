import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows, Fonts } from '../../constants/theme';
import SplitModal from '../../components/SplitModal';

const API_BASE_URL = 'https://shut-dance-essay-pulling.trycloudflare.com';

const CATEGORIES = ['All', 'Food & Drink', 'Groceries', 'Transport', 'Shopping', 'Travel', 'Entertainment', 'Healthcare', 'Other'];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'All': 'list',
  'Food & Drink': 'restaurant',
  'Groceries': 'cart',
  'Transport': 'car',
  'Shopping': 'bag',
  'Travel': 'airplane',
  'Entertainment': 'film',
  'Healthcare': 'medical',
  'Other': 'cube',
};

type Expense = {
  id: string;
  merchantName: string;
  totalAmount: number;
  date: string;
  category: string;
  createdAt: string;
};

export default function ActivityScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Split modal state
  const [splitExpense, setSplitExpense] = useState<Expense | null>(null);

  const didLoad = useRef(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success) setExpenses(json.data);
      } catch {}
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={styles.expenseCard}>
      <TouchableOpacity
        style={styles.expenseMain}
        onPress={() => router.push({ pathname: '/(app)/expense-detail', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.expenseLeft}>
          <View style={styles.expenseIcon}>
            <Ionicons name={CATEGORY_ICONS[item.category] ?? 'cube'} size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expenseMerchant} numberOfLines={1}>{item.merchantName}</Text>
            <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>₹ {Number(item.totalAmount).toFixed(2)}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.splitBtn}
        onPress={() => setSplitExpense(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="people-outline" size={14} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Activity</Text>
          <Text style={styles.headerSubtitle}>{expenses.length} receipts scanned</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/manual-entry')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.outline} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search merchants..."
          placeholderTextColor={Colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchExpenses}
          returnKeyType="search"
        />
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
              <Ionicons name={CATEGORY_ICONS[cat] ?? 'cube'} size={14} color={selectedCategory === cat ? '#fff' : Colors['on-surface-variant']} /> {cat}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Expense List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={64} color={Colors['on-surface-variant']} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Expenses Yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan your first receipt or add one manually
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => router.push('/(app)/manual-entry')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.emptyAddText}>Add Manually</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        />
      )}

      {/* Split Modal */}
      {splitExpense && (
        <SplitModal
          visible={!!splitExpense}
          onClose={() => setSplitExpense(null)}
          expenseId={splitExpense.id}
          merchantName={splitExpense.merchantName}
          totalAmount={Number(splitExpense.totalAmount)}
          apiBaseUrl={API_BASE_URL}
          getToken={getToken}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 32, fontFamily: Fonts.headlineExtra, letterSpacing: -1, color: Colors['on-surface'] },
  headerSubtitle: { fontSize: 13, color: Colors['on-surface-variant'], marginTop: 4, fontFamily: Fonts.bodyMedium },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadows.fab,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: Colors['surface-container-highest'],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: Colors['on-surface'] },

  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12, height: 40 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors['surface-container-low'],
    borderWidth: 1,
    borderColor: Colors['outline-variant'] + '30',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  filterChipTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  expenseCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    ...Shadows.card,
  },
  expenseMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  expenseIcon: {
    width: 48, height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center',
  },
  expenseMerchant: { fontSize: 15, fontFamily: Fonts.label, color: Colors['on-surface'] },
  expenseDate: { fontSize: 12, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 2 },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 17, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.sm, marginTop: 4,
  },
  categoryBadgeText: { fontSize: 10, fontFamily: Fonts.label, color: Colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' },
  splitBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  emptyTitle: { fontSize: 20, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: Fonts.body, color: Colors['on-surface-variant'], textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
  },
  emptyAddText: { fontSize: 14, fontFamily: Fonts.headline, color: '#fff' },
});
