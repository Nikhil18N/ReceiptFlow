import { useAuth } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows, Fonts } from '../../constants/theme';

const API_BASE_URL = 'https://televisions-numerical-pipeline-ver.trycloudflare.com';

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

const SPENDING_TIPS = [
  { icon: 'bulb', text: 'Track daily spending to stay within your monthly goals' },
  { icon: 'disc', text: 'Set category budgets to identify where you overspend' },
  { icon: 'bar-chart', text: 'Review weekly trends to catch spending patterns early' },
  { icon: 'pricetag', text: 'Scan every receipt to build a complete financial picture' },
];

type Stats = {
  monthlyTotal: number;
  allTimeTotal: number;
  totalReceipts: number;
  categoryBreakdown: { name: string; amount: number }[];
  topMerchants: { name: string; amount: number }[];
  dailyTotals: { date: string; label: string; amount: number }[];
};

export default function InsightsScreen() {
  const { getToken } = useAuth();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const maxDaily = stats ? Math.max(...stats.dailyTotals.map(d => d.amount), 1) : 1;
  const maxCategory = stats ? Math.max(...stats.categoryBreakdown.map(c => c.amount), 1) : 1;

  const randomTip = SPENDING_TIPS[Math.floor(Math.random() * SPENDING_TIPS.length)];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>Your spending intelligence</Text>

        {/* Summary Cards Row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryPrimary]}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryAmountWhite}>
              ₹ {stats?.monthlyTotal?.toFixed(2) ?? '0.00'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>All Time</Text>
            <Text style={styles.summaryAmount}>
              ₹ {stats?.allTimeTotal?.toFixed(2) ?? '0.00'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receipts</Text>
            <Text style={styles.summaryAmount}>{stats?.totalReceipts ?? 0}</Text>
          </View>
        </View>

        {/* 7-Day Spending Trend */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7-Day Spending</Text>
          <View style={styles.chartContainer}>
            {stats?.dailyTotals.map((day, i) => (
              <View key={day.date} style={styles.chartColumn}>
                <Text style={styles.chartBarValue}>
                  {day.amount > 0 ? `₹ ${day.amount.toFixed(0)}` : ''}
                </Text>
                <View style={styles.chartBarBg}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${Math.max((day.amount / maxDaily) * 100, 4)}%`,
                      },
                      i === stats.dailyTotals.length - 1 && styles.chartBarFillActive,
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {stats?.categoryBreakdown.length === 0 ? (
            <Text style={styles.emptyText}>No data yet. Scan some receipts!</Text>
          ) : (
            stats?.categoryBreakdown.map((cat) => (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIconWrap}>
                    <Ionicons name={CATEGORY_ICONS[cat.name] ?? 'cube'} size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${(cat.amount / maxCategory) * 100}%` }]} />
                    </View>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>₹ {cat.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Top Merchants */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Merchants</Text>
          {stats?.topMerchants.length === 0 ? (
            <Text style={styles.emptyText}>No data yet</Text>
          ) : (
            stats?.topMerchants.map((m, i) => (
              <View key={m.name} style={styles.merchantRow}>
                <View style={styles.merchantRank}>
                  <Text style={styles.merchantRankText}>{i + 1}</Text>
                </View>
                <Text style={styles.merchantName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.merchantAmount}>₹ {m.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <Ionicons name={randomTip.icon as any} size={28} color={Colors['on-tertiary-fixed']} style={{ opacity: 0.8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipLabel}>SMART TIP</Text>
            <Text style={styles.tipText}>{randomTip.text}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  headerTitle: { fontSize: 32, fontFamily: Fonts.headlineExtra, letterSpacing: -1, color: Colors['on-surface'] },
  headerSubtitle: { fontSize: 13, color: Colors['on-surface-variant'], marginTop: 4, fontFamily: Fonts.bodyMedium, marginBottom: 20 },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors['surface-container-low'],
    borderRadius: BorderRadius.xxl,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  summaryPrimary: { backgroundColor: Colors.primary },
  summaryLabel: { fontSize: 10, fontFamily: Fonts.label, textTransform: 'uppercase', letterSpacing: 1, color: Colors['on-surface-variant'] },
  summaryAmount: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  summaryAmountWhite: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: '#fff' },

  // Section card
  sectionCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card,
    padding: 20,
    marginBottom: 16,
    ...Shadows.card,
  },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 16 },

  // Chart
  chartContainer: { flexDirection: 'row', gap: 6, height: 140, alignItems: 'flex-end' },
  chartColumn: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarBg: {
    flex: 1, width: '100%',
    backgroundColor: Colors['surface-container-high'],
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: { width: '100%', backgroundColor: Colors.primary + '60', borderRadius: 6 },
  chartBarFillActive: { backgroundColor: Colors.primary },
  chartBarValue: { fontSize: 8, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  chartLabel: { fontSize: 10, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },

  // Category breakdown
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoryIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  categoryName: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 4 },
  categoryAmount: { fontSize: 15, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  progressBg: { height: 4, backgroundColor: Colors['surface-container-high'], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  // Merchants
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  merchantRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center',
  },
  merchantRankText: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  merchantName: { flex: 1, fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  merchantAmount: { fontSize: 14, fontFamily: Fonts.headlineExtra, color: Colors.primary },

  // Tip
  tipCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: Colors['tertiary-fixed'],
    borderRadius: BorderRadius.xxl,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  tipLabel: { fontSize: 9, fontFamily: Fonts.label, letterSpacing: 1.5, color: Colors['on-tertiary-fixed'], opacity: 0.6, marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors['on-tertiary-fixed'], lineHeight: 18 },

  emptyText: { fontSize: 14, color: Colors['on-surface-variant'], fontFamily: Fonts.body, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});
