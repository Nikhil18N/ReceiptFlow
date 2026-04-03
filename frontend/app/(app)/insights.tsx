import { useAuth } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows, Fonts } from '../../constants/theme';
import BudgetCard from '../../components/BudgetCard';
import CalendarHeatmap from '../../components/CalendarHeatmap';

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

const CATEGORIES = ['Food & Drink', 'Groceries', 'Transport', 'Shopping', 'Travel', 'Entertainment', 'Healthcare', 'Other'];

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

type InflationItem = { itemName: string; merchant: string; percentageChange: number; lastPrice: number; lastDate: string };
type BudgetStatus = { id: string; category: string; monthlyLimit: number; spent: number; percentage: number };
type CalendarDay = { date: string; total: number; count: number; merchants: string[] };
type RecurringItem = { merchant: string; category: string; averageAmount: number; occurrences: number; isConsistent: boolean; lastDate: string; estimatedMonthly: number };

async function safeJsonParse(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

export default function InsightsScreen() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [inflationData, setInflationData] = useState<InflationItem[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [recurringData, setRecurringData] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What-If State
  const [whatIfQuery, setWhatIfQuery] = useState('');
  const [whatIfResponse, setWhatIfResponse] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Budget add state
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  const tipIndex = useRef(Math.floor(Math.random() * SPENDING_TIPS.length));
  const randomTip = SPENDING_TIPS[tipIndex.current];
  const didLoad = useRef(false);

  // ─── Fetch Functions ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('Session expired. Please sign out and sign back in.');
    const res = await fetch(`${API_BASE_URL}/api/expenses/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) throw new Error('Session expired. Please sign out and sign back in.');
    if (!res.ok) throw new Error(`Stats API returned ${res.status}`);
    const json = await safeJsonParse(res);
    if (json?.success) setStats(json.data);
  }, [getToken]);

  const fetchInflation = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/insights/inflation`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await safeJsonParse(res);
      if (json?.success) setInflationData(json.data);
    } catch {}
  }, [getToken]);

  const fetchBudgetStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/budgets/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await safeJsonParse(res);
      if (json?.success) setBudgetStatus(json.data);
    } catch {}
  }, [getToken]);

  const fetchCalendar = useCallback(async (month?: string) => {
    try {
      const m = month || calendarMonth;
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/expenses/calendar?month=${m}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await safeJsonParse(res);
      if (json?.success) setCalendarData(json.data);
    } catch {}
  }, [getToken, calendarMonth]);

  const fetchRecurring = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/expenses/recurring`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const json = await safeJsonParse(res);
      if (json?.success) setRecurringData(json.data);
    } catch {}
  }, [getToken]);

  const submitWhatIf = async (queryToUse?: string) => {
    const finalQuery = queryToUse || whatIfQuery;
    if (!finalQuery.trim()) return;
    setWhatIfLoading(true);
    setWhatIfResponse('');
    try {
      const token = await getToken();
      if (!token) { setWhatIfResponse('Session expired.'); return; }
      const res = await fetch(`${API_BASE_URL}/api/insights/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: finalQuery }),
      });
      if (res.status === 401) { setWhatIfResponse('Session expired. Please sign out and sign back in.'); return; }
      const json = await safeJsonParse(res);
      if (!json) { setWhatIfResponse('Unexpected server response.'); return; }
      if (json.success) { setWhatIfResponse(json.analysis); } else { setWhatIfResponse(json.error || 'AI could not process.'); }
    } catch { setWhatIfResponse('Network error. Please try again.'); }
    finally { setWhatIfLoading(false); }
  };

  const saveBudget = async () => {
    if (!budgetCategory || !budgetLimit) return;
    setBudgetSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: budgetCategory, monthlyLimit: Number(budgetLimit) }),
      });
      const json = await safeJsonParse(res);
      if (json?.success) {
        setShowBudgetForm(false);
        setBudgetCategory('');
        setBudgetLimit('');
        fetchBudgetStatus();
      }
    } catch { Alert.alert('Error', 'Failed to save budget.'); }
    finally { setBudgetSaving(false); }
  };

  // ─── Load All ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchInflation(), fetchBudgetStatus(), fetchCalendar(), fetchRecurring()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [fetchStats, fetchInflation, fetchBudgetStatus, fetchCalendar, fetchRecurring]);

  useEffect(() => {
    if (!didLoad.current) { didLoad.current = true; loadAll(); }
  }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const changeMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const nd = new Date(y, m - 1 + delta, 1);
    const nm = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(nm);
    fetchCalendar(nm);
  };

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading your insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxDaily = stats ? Math.max(...stats.dailyTotals.map(d => d.amount), 1) : 1;
  const maxCategory = stats ? Math.max(...stats.categoryBreakdown.map(c => c.amount), 1) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.headerTitle}>Insights</Text>
        <Text style={styles.headerSubtitle}>Your spending intelligence</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}><Ionicons name="refresh" size={20} color={Colors.primary} /></TouchableOpacity>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryPrimary]}>
            <Text style={[styles.summaryLabel, { color: '#ffffffaa' }]}>This Month</Text>
            <Text style={styles.summaryAmountWhite}>₹{stats?.monthlyTotal?.toFixed(2) ?? '0.00'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>All Time</Text>
            <Text style={styles.summaryAmount}>₹{stats?.allTimeTotal?.toFixed(2) ?? '0.00'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receipts</Text>
            <Text style={styles.summaryAmount}>{stats?.totalReceipts ?? 0}</Text>
          </View>
        </View>

        {/* ── Budget Goals ─────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]}>Budget Goals</Text>
            <TouchableOpacity onPress={() => setShowBudgetForm(!showBudgetForm)}>
              <Ionicons name={showBudgetForm ? 'close' : 'add-circle'} size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {showBudgetForm && (
            <View style={styles.budgetForm}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat}
                      style={[styles.catChip, budgetCategory === cat && styles.catChipActive]}
                      onPress={() => setBudgetCategory(cat)}>
                      <Ionicons name={CATEGORY_ICONS[cat] ?? 'cube'} size={14}
                        color={budgetCategory === cat ? '#fff' : Colors['on-surface-variant']} />
                      <Text style={[styles.catChipText, budgetCategory === cat && { color: '#fff' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={budgetLimit} onChangeText={setBudgetLimit}
                  placeholder="Monthly limit (₹)" placeholderTextColor={Colors['on-surface-variant'] + '60'}
                  keyboardType="decimal-pad" />
                <TouchableOpacity style={styles.saveBudgetBtn} onPress={saveBudget} disabled={budgetSaving || !budgetCategory || !budgetLimit}>
                  {budgetSaving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {budgetStatus.length === 0 ? (
            <Text style={styles.emptyText}>Tap + to set your first budget goal</Text>
          ) : (
            budgetStatus.map(b => (
              <BudgetCard key={b.id} category={b.category} monthlyLimit={b.monthlyLimit} spent={b.spent} percentage={b.percentage} />
            ))
          )}
        </View>

        {/* ── Spending Calendar ────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Spending Calendar</Text>
          </View>
          <CalendarHeatmap data={calendarData} month={calendarMonth}
            onPrevMonth={() => changeMonth(-1)} onNextMonth={() => changeMonth(1)} />
        </View>

        {/* 7-Day Spending */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7-Day Spending</Text>
          <View style={styles.chartContainer}>
            {stats?.dailyTotals.map((day, i) => (
              <View key={day.date} style={styles.chartColumn}>
                <Text style={styles.chartBarValue}>{day.amount > 0 ? `₹${day.amount.toFixed(0)}` : ''}</Text>
                <View style={styles.chartBarBg}>
                  <View style={[styles.chartBarFill, { height: `${Math.max((day.amount / maxDaily) * 100, 4)}%` },
                    i === (stats?.dailyTotals.length ?? 0) - 1 && styles.chartBarFillActive]} />
                </View>
                <Text style={styles.chartLabel}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {(!stats?.categoryBreakdown || stats.categoryBreakdown.length === 0) ? (
            <Text style={styles.emptyText}>No data yet. Scan some receipts!</Text>
          ) : (
            stats.categoryBreakdown.map(cat => (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIconWrap}><Ionicons name={CATEGORY_ICONS[cat.name] ?? 'cube'} size={20} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${(cat.amount / maxCategory) * 100}%` }]} /></View>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>₹{cat.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Top Merchants */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Merchants</Text>
          {(!stats?.topMerchants || stats.topMerchants.length === 0) ? (
            <Text style={styles.emptyText}>No data yet</Text>
          ) : (
            stats.topMerchants.map((m, i) => (
              <View key={m.name} style={styles.merchantRow}>
                <View style={styles.merchantRank}><Text style={styles.merchantRankText}>{i + 1}</Text></View>
                <Text style={styles.merchantName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.merchantAmount}>₹{m.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Recurring Expenses ──────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="repeat" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recurring Expenses</Text>
          </View>
          <Text style={styles.featureSubtext}>Auto-detected subscriptions and regular purchases.</Text>
          {recurringData.length === 0 ? (
            <View style={styles.emptyFeature}>
              <Ionicons name="sync-outline" size={32} color={Colors['on-surface-variant'] + '60'} />
              <Text style={styles.emptyText}>No recurring expenses detected yet. Keep scanning!</Text>
            </View>
          ) : (
            recurringData.map((item, idx) => (
              <View key={item.merchant} style={[styles.recurringRow, idx === recurringData.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.recurringIcon, { backgroundColor: (item.isConsistent ? Colors.primary : '#F59E0B') + '15' }]}>
                  <Ionicons name={CATEGORY_ICONS[item.category] ?? 'cube'} size={18} color={item.isConsistent ? Colors.primary : '#F59E0B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recurringMerchant} numberOfLines={1}>{item.merchant}</Text>
                  <Text style={styles.recurringMeta}>{item.occurrences}x • {item.isConsistent ? 'Consistent' : 'Variable'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recurringAmount}>~₹{item.averageAmount.toFixed(0)}</Text>
                  <Text style={styles.recurringFreq}>/purchase</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Personal Inflation ──────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Personal Inflation</Text>
          </View>
          <Text style={styles.featureSubtext}>Tracks price changes for items you buy repeatedly.</Text>
          {inflationData.length === 0 ? (
            <View style={styles.emptyFeature}>
              <Ionicons name="analytics-outline" size={32} color={Colors['on-surface-variant'] + '60'} />
              <Text style={styles.emptyText}>No repeat purchases found yet.</Text>
            </View>
          ) : (
            inflationData.map((item, idx) => (
              <View key={`${item.itemName}-${item.merchant}-${idx}`} style={[styles.inflationRow, idx === inflationData.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inflationName} numberOfLines={1}>{item.itemName}</Text>
                  <Text style={styles.inflationMerchant}>{item.merchant}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.inflationChange, { color: item.percentageChange > 0 ? Colors.error : Colors.primary }]}>
                    {item.percentageChange > 0 ? '▲' : '▼'} {Math.abs(item.percentageChange)}%
                  </Text>
                  <Text style={styles.inflationPrice}>Last: ₹{item.lastPrice.toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── What-If Budgeter ────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={18} color="#FFD700" />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>What-If Budgeter</Text>
          </View>
          <Text style={styles.featureSubtext}>Ask the AI to forecast savings based on your data.</Text>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="e.g., What if I cut coffee?" placeholderTextColor={Colors['on-surface-variant'] + '80'}
              value={whatIfQuery} onChangeText={setWhatIfQuery} editable={!whatIfLoading} />
            <TouchableOpacity style={[styles.sendBtn, (!whatIfQuery.trim() || whatIfLoading) && { opacity: 0.5 }]}
              onPress={() => submitWhatIf()} disabled={whatIfLoading || !whatIfQuery.trim()}>
              {whatIfLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
          <View style={styles.suggestionRow}>
            {['Stop Dining Out', 'Switch Coffee', 'Cheaper Groceries'].map(s => (
              <TouchableOpacity key={s} style={[styles.suggestionBadge, whatIfLoading && { opacity: 0.5 }]} disabled={whatIfLoading}
                onPress={() => { const q = `What if I ${s.toLowerCase()}?`; setWhatIfQuery(q); submitWhatIf(q); }}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {whatIfLoading && (
            <View style={styles.thinkingCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.thinkingText}>AI is analyzing your spending...</Text>
            </View>
          )}
          {whatIfResponse ? (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}><Ionicons name="bulb" size={16} color={Colors.primary} /><Text style={styles.responseLabel}>AI Analysis</Text></View>
              <Text style={styles.responseText}>{whatIfResponse}</Text>
            </View>
          ) : null}
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
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors['error-container'], borderRadius: BorderRadius.lg, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors['on-error-container'] },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: Colors['surface-container-low'], borderRadius: BorderRadius.xxl, padding: 16, alignItems: 'center', gap: 6 },
  summaryPrimary: { backgroundColor: Colors.primary },
  summaryLabel: { fontSize: 10, fontFamily: Fonts.label, textTransform: 'uppercase', letterSpacing: 1, color: Colors['on-surface-variant'] },
  summaryAmount: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  summaryAmountWhite: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: '#fff' },
  sectionCard: { backgroundColor: Colors['surface-container-lowest'], borderRadius: BorderRadius.card, padding: 20, marginBottom: 16, ...Shadows.card },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  featureSubtext: { fontSize: 12, color: Colors['on-surface-variant'], fontFamily: Fonts.body, marginBottom: 16, lineHeight: 18 },
  emptyFeature: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: Colors['on-surface-variant'], fontFamily: Fonts.body, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  chartContainer: { flexDirection: 'row', gap: 6, height: 140, alignItems: 'flex-end' },
  chartColumn: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarBg: { flex: 1, width: '100%', backgroundColor: Colors['surface-container-high'], borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', backgroundColor: Colors.primary + '60', borderRadius: 6 },
  chartBarFillActive: { backgroundColor: Colors.primary },
  chartBarValue: { fontSize: 8, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  chartLabel: { fontSize: 10, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoryIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 4 },
  categoryAmount: { fontSize: 15, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  progressBg: { height: 4, backgroundColor: Colors['surface-container-high'], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  merchantRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors['surface-container-high'], alignItems: 'center', justifyContent: 'center' },
  merchantRankText: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  merchantName: { flex: 1, fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  merchantAmount: { fontSize: 14, fontFamily: Fonts.headlineExtra, color: Colors.primary },
  tipCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors['tertiary-fixed'], borderRadius: BorderRadius.xxl, padding: 18, marginBottom: 16, alignItems: 'center' },
  tipLabel: { fontSize: 9, fontFamily: Fonts.label, letterSpacing: 1.5, color: Colors['on-tertiary-fixed'], opacity: 0.6, marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors['on-tertiary-fixed'], lineHeight: 18 },
  // Budget
  budgetForm: { backgroundColor: Colors['surface-container-high'] + '40', borderRadius: BorderRadius.lg, padding: 12, marginBottom: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.pill, backgroundColor: Colors['surface-container-low'], borderWidth: 1, borderColor: Colors['outline-variant'] + '30' },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 11, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  saveBudgetBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Inflation
  inflationRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors['surface-container-high'], paddingVertical: 12 },
  inflationName: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 2 },
  inflationMerchant: { fontSize: 12, fontFamily: Fonts.body, color: Colors['on-surface-variant'] },
  inflationChange: { fontSize: 14, fontFamily: Fonts.headlineExtra },
  inflationPrice: { fontSize: 11, fontFamily: Fonts.label, color: Colors['on-surface-variant'], marginTop: 2 },
  // Recurring
  recurringRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors['surface-container-high'], paddingVertical: 12, gap: 12 },
  recurringIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recurringMerchant: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 2 },
  recurringMeta: { fontSize: 11, fontFamily: Fonts.body, color: Colors['on-surface-variant'] },
  recurringAmount: { fontSize: 14, fontFamily: Fonts.headlineExtra, color: Colors.primary },
  recurringFreq: { fontSize: 10, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  // What-If
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { flex: 1, height: 48, backgroundColor: Colors['surface-container-high'], borderRadius: 14, paddingHorizontal: 16, fontFamily: Fonts.body, color: Colors['on-surface'] },
  sendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  suggestionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  suggestionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.primary + '10', borderWidth: 1, borderColor: Colors.primary + '20' },
  suggestionText: { fontSize: 11, fontFamily: Fonts.headline, color: Colors.primary },
  thinkingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.primary + '08', borderRadius: 12, padding: 14, marginBottom: 12 },
  thinkingText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors['on-surface-variant'] },
  responseCard: { backgroundColor: Colors['surface-container-high'], borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  responseLabel: { fontSize: 12, fontFamily: Fonts.label, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  responseText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors['on-surface'], lineHeight: 20 },
});
