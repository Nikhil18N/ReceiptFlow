import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows } from '../../constants/theme';

const API_BASE_URL = 'https://necessary-goes-ours-walnut.trycloudflare.com';

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Drink': '🍽️',
  'Groceries': '🥗',
  'Transport': '🚗',
  'Shopping': '🛍️',
  'Travel': '✈️',
  'Entertainment': '🎬',
  'Healthcare': '❤️‍🩹',
  'Other': '📦',
};

type Stats = {
  monthlyTotal: number;
  allTimeTotal: number;
  totalReceipts: number;
  categoryBreakdown: { name: string; amount: number }[];
  dailyTotals: { date: string; label: string; amount: number }[];
  recentExpenses: {
    id: string;
    merchantName: string;
    totalAmount: number;
    date: string;
    category: string;
  }[];
};

export default function DashboardScreen() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const firstName = user?.firstName ?? 'there';
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/expenses/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const maxDaily = stats ? Math.max(...stats.dailyTotals.map(d => d.amount), 1) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerGreeting}>Welcome back,</Text>
            <Text style={styles.headerName}>{firstName}</Text>
          </View>
        </View>
        <Text style={styles.brandName}>Receipt Flow</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* ── Hero spending card ───────────────────────────────────── */}
            <View style={styles.heroCard}>
              <View style={styles.heroBlob1} />
              <View style={styles.heroBlob2} />

              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    Active Period: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroLabel}>This Month's Spending</Text>
              <View style={styles.heroAmountRow}>
                <Text style={styles.heroAmount}>
                  ${Math.floor(stats?.monthlyTotal ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.heroAmountCents}>
                  .{((stats?.monthlyTotal ?? 0) % 1).toFixed(2).split('.')[1]}
                </Text>
              </View>

              {/* Mini bar chart */}
              <View style={styles.miniChart}>
                {stats?.dailyTotals.map((day, i) => (
                  <View
                    key={day.date}
                    style={[
                      styles.bar,
                      { height: Math.max(60 * (day.amount / maxDaily), 4) },
                      i === (stats?.dailyTotals.length ?? 1) - 1 && styles.barActive,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.heroTrend}>
                {stats?.totalReceipts ?? 0} receipts scanned • All-time: ${stats?.allTimeTotal?.toFixed(2) ?? '0.00'}
              </Text>
            </View>

            {/* ── Quick Stats Row ──────────────────────────────────────── */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { flex: 1.4 }]}>
                <Text style={styles.statCardTitle}>Top Categories</Text>
                {(stats?.categoryBreakdown ?? []).slice(0, 2).map((cat) => (
                  <View key={cat.name} style={{ gap: 6, marginTop: 8 }}>
                    <View style={styles.catRow}>
                      <View style={styles.catIconWrap}>
                        <Text>{CATEGORY_ICONS[cat.name] ?? '📦'}</Text>
                      </View>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catAmount}>${cat.amount.toFixed(0)}</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, {
                        width: `${(cat.amount / ((stats?.categoryBreakdown[0]?.amount) || 1)) * 100}%`
                      }]} />
                    </View>
                  </View>
                ))}
                {(stats?.categoryBreakdown ?? []).length === 0 && (
                  <Text style={styles.emptyText}>Scan a receipt to see categories</Text>
                )}
              </View>

              <View style={[styles.insightCard, { flex: 1 }]}>
                <Text style={styles.insightLabel}>Quick Stats</Text>
                <Text style={styles.insightText}>
                  <Text style={{ fontWeight: '700', fontSize: 24, color: Colors.primary }}>
                    {stats?.totalReceipts ?? 0}
                  </Text>
                  {'\n'}receipts scanned
                </Text>
              </View>
            </View>

            {/* ── Recent expenses ──────────────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/activity')}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>

            {(stats?.recentExpenses ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the camera button below to scan your first receipt
                </Text>
              </View>
            ) : (
              stats?.recentExpenses.map((item) => (
                <View key={item.id} style={styles.expenseCard}>
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseIcon}>
                      <Text style={{ fontSize: 22 }}>{CATEGORY_ICONS[item.category] ?? '📦'}</Text>
                    </View>
                    <View>
                      <Text style={styles.expenseMerchant}>{item.merchantName}</Text>
                      <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>${Number(item.totalAmount).toFixed(2)}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  center: { paddingTop: 100, alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(248,249,250,0.9)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerGreeting: { fontSize: 11, color: Colors['on-surface-variant'] },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors['on-surface'] },
  brandName: { fontSize: 18, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5 },

  // Hero card
  heroCard: {
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.primary,
    padding: 24, marginBottom: 16,
    overflow: 'hidden',
    ...Shadows.fab,
  },
  heroBlob1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBlob2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(80,200,120,0.15)',
  },
  heroTopRow: { marginBottom: 12 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroLabel: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 4 },
  heroAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroAmount: { fontSize: 52, fontWeight: '800', color: '#fff', letterSpacing: -2 },
  heroAmountCents: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 60, marginTop: 20 },
  bar: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barActive: { backgroundColor: 'rgba(255,255,255,0.5)' },
  heroTrend: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, fontWeight: '700' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    backgroundColor: Colors['surface-container-low'],
    borderRadius: BorderRadius.xxl, padding: 18,
  },
  statCardTitle: { fontSize: 13, fontWeight: '700', color: Colors['on-surface-variant'] },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIconWrap: {
    width: 30, height: 30, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors['on-surface'] },
  catAmount: { fontSize: 13, fontWeight: '700', color: Colors['on-surface'] },
  progressBg: { height: 4, backgroundColor: Colors['surface-container-high'], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  insightCard: {
    backgroundColor: Colors['tertiary-fixed'],
    borderRadius: BorderRadius.xxl, padding: 18,
    justifyContent: 'center',
  },
  insightLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: Colors['on-tertiary-fixed'], opacity: 0.65, marginBottom: 8 },
  insightText: { fontSize: 13, fontWeight: '500', color: Colors['on-tertiary-fixed'], lineHeight: 22 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: Colors['on-surface'] },
  viewAll: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Expense cards
  expenseCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, ...Shadows.card,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  expenseIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.xl,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center',
  },
  expenseMerchant: { fontSize: 15, fontWeight: '700', color: Colors['on-surface'] },
  expenseDate: { fontSize: 12, color: Colors['on-surface-variant'], marginTop: 2 },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 17, fontWeight: '800', color: Colors['on-surface'] },
  categoryBadge: {
    marginTop: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' },

  // Empty state
  emptyCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card, padding: 40,
    alignItems: 'center', ...Shadows.card,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors['on-surface'], marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors['on-surface-variant'], textAlign: 'center', lineHeight: 20 },
  emptyText: { fontSize: 12, color: Colors['on-surface-variant'], marginTop: 12, fontStyle: 'italic' },
});
