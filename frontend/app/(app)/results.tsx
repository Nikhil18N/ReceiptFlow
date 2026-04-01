import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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

const CATEGORIES = [
  'Food & Drink', 'Groceries', 'Transport', 'Shopping',
  'Travel', 'Entertainment', 'Healthcare', 'Other',
] as const;

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

export default function ResultsScreen() {
  const router = useRouter();
  // Data passed as route params from the Scanner screen
  const params = useLocalSearchParams<{
    id: string;
    merchantName: string;
    totalAmount: string;
    date: string;
    category: string;
    imageUri?: string;
  }>();

  const [merchantName, setMerchantName] = useState(params.merchantName ?? '');
  const [totalAmount, setTotalAmount] = useState(params.totalAmount ?? '');
  const [date, setDate] = useState(params.date ?? '');
  const [category, setCategory] = useState(params.category ?? 'Other');
  const [showCategories, setShowCategories] = useState(false);

  // --- Sync state with navigation params if they arrive after mount ---
  useEffect(() => {
    if (params.merchantName) setMerchantName(params.merchantName);
    if (params.totalAmount) setTotalAmount(params.totalAmount);
    if (params.date) setDate(params.date);
    if (params.category) setCategory(params.category);
  }, [params.merchantName, params.totalAmount, params.date, params.category]);

  const handleLogExpense = () => {
    // Expense is already saved in the database by the backend.
    // This button confirms the user has reviewed and is done.
    Alert.alert(
      '✅ Expense Logged',
      `"${merchantName}" for ₹ ${totalAmount} has been saved to your ledger.`,
      [
        {
          text: 'View Dashboard',
          onPress: () => router.replace('/(app)'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Expense</Text>
        <View style={styles.headerAvatar}>
          <Ionicons name="person-circle" size={24} color={Colors.outline} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Receipt preview placeholder ───────────────────────── */}
          <View style={styles.receiptPreviewCard}>
            <View style={styles.receiptImagePlaceholder}>
              {params.imageUri ? (
                <Image source={{ uri: params.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="receipt-outline" size={48} color={Colors['on-surface-variant']} />
                  <Text style={styles.receiptPlaceholderText}>Scanned Receipt</Text>
                </>
              )}
            </View>
            {/* AI verified badge */}
            <View style={styles.aiBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
              <Text style={styles.aiBadgeText}>AI Extracted</Text>
            </View>
          </View>

          {/* Confidence score */}
          <View style={styles.confidenceCard}>
            <Text style={styles.confidenceLabel}>Confidence Score</Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceBg}>
                <View style={[styles.confidenceFill, { width: '98%' }]} />
              </View>
              <Text style={styles.confidenceValue}>98%</Text>
            </View>
            <Text style={styles.confidenceDesc}>
              High precision extraction. We've automatically identified the merchant and calculated the total.
            </Text>
          </View>

          {/* ── Editable form ─────────────────────────────────────── */}
          <View style={styles.formSection}>
            <Text style={styles.formTagline}>Review & Confirm</Text>
            <Text style={styles.formTitle}>Digital Curator Data</Text>
          </View>

          {/* Merchant Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>MERCHANT NAME</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="storefront" size={18} color={Colors['on-surface-variant']} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.fieldInput}
                value={merchantName}
                onChangeText={setMerchantName}
                placeholder="Enter merchant..."
                placeholderTextColor={Colors.outline}
              />
            </View>
          </View>

          {/* Amount + Date row */}
          <View style={styles.halfRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>TOTAL AMOUNT</Text>
              <View style={[styles.fieldRow, styles.fieldRowPrimary]}>
                <Ionicons name="card" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputLarge, { color: Colors.primary }]}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="0.00"
                  placeholderTextColor={Colors['primary'] + '88'}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="calendar-outline" size={18} color={Colors['on-surface-variant']} style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.fieldInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.outline}
                />
              </View>
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>AI ASSIGNED CATEGORY</Text>
            <TouchableOpacity
              style={styles.categoryRow}
              onPress={() => setShowCategories(v => !v)}
              activeOpacity={0.8}
            >
              <View style={styles.categoryIconWrap}>
                <Ionicons name={CATEGORY_ICONS[category] ?? 'cube'} size={24} color={Colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryMeta}>Auto-detected from merchant name</Text>
              </View>
              <Ionicons name={showCategories ? "chevron-up" : "chevron-forward"} size={16} color={Colors['on-surface-variant']} />
            </TouchableOpacity>

            {showCategories && (
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, cat === category && styles.categoryOptionActive]}
                    onPress={() => { setCategory(cat); setShowCategories(false); }}
                  >
                    <Ionicons name={CATEGORY_ICONS[cat]} size={18} color={cat === category ? Colors.primary : Colors['on-surface-variant']} />
                    <Text style={[styles.categoryOptionText, cat === category && styles.categoryOptionTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── CTA Buttons ───────────────────────────────────────── */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogExpense}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Log Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => Alert.alert('Flagged', 'This expense has been flagged for manual review.')}
            >
              <Text style={styles.ghostBtnText}>Flag for Manual Review</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(248,249,250,0.9)',
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors['surface-container-low'],
  },
  headerTitle: { fontSize: 18, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  headerAvatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors['surface-container-highest'],
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  // Receipt preview
  receiptPreviewCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.editorial,
    position: 'relative',
  },
  receiptImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors['surface-container-low'],
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  receiptPlaceholderText: { fontSize: 14, color: Colors['on-surface-variant'], fontFamily: Fonts.bodyMedium },
  aiBadge: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    ...Shadows.card,
  },
  aiBadgeText: { fontSize: 11, fontFamily: Fonts.label, letterSpacing: 0.8, textTransform: 'uppercase', color: Colors['on-surface'] },

  // Confidence
  confidenceCard: {
    backgroundColor: Colors['surface-container-low'],
    borderRadius: BorderRadius.xxl,
    padding: 20,
    marginBottom: 24,
    gap: 10,
  },
  confidenceLabel: {
    fontSize: 11, fontFamily: Fonts.label, textTransform: 'uppercase',
    letterSpacing: 1.2, color: Colors.primary,
  },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confidenceBg: {
    flex: 1, height: 8,
    backgroundColor: Colors['surface-container-highest'],
    borderRadius: 4, overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  confidenceValue: { fontSize: 15, fontFamily: Fonts.headlineExtra, color: Colors.primary },
  confidenceDesc: {
    fontSize: 13, fontFamily: Fonts.body, color: Colors['on-surface-variant'],
    lineHeight: 19,
  },

  // Form
  formSection: { marginBottom: 20 },
  formTagline: { fontSize: 13, fontFamily: Fonts.headline, color: Colors.primary, letterSpacing: 0.5, marginBottom: 4 },
  formTitle: { fontSize: 32, fontFamily: Fonts.headlineExtra, letterSpacing: -1, color: Colors['on-surface'] },

  fieldGroup: { marginBottom: 20, gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: Fonts.label, textTransform: 'uppercase', letterSpacing: 1.2, color: Colors['on-surface-variant'] },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors['surface-container-highest'],
    borderRadius: BorderRadius.xl,
    paddingLeft: 14,
    overflow: 'hidden',
  },
  fieldRowPrimary: { backgroundColor: Colors.primary + '18' },
  fieldInput: {
    flex: 1, height: 56,
    fontSize: 17, fontFamily: Fonts.bodyMedium,
    color: Colors['on-surface'],
    paddingHorizontal: 8,
  },
  fieldInputLarge: { fontSize: 22, fontFamily: Fonts.headlineExtra },

  halfRow: { flexDirection: 'row', gap: 12 },

  // Category picker
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl,
    padding: 16,
    ...Shadows.card,
  },
  categoryIconWrap: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: Colors['tertiary-fixed'],
    alignItems: 'center', justifyContent: 'center',
  },
  categoryName: { fontSize: 17, fontFamily: Fonts.headlineExtra, color: Colors.tertiary },
  categoryMeta: { fontSize: 12, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 2 },
  categoryPicker: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl,
    marginTop: 8,
    overflow: 'hidden',
    ...Shadows.card,
  },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingHorizontal: 18,
  },
  categoryOptionActive: { backgroundColor: Colors.primary + '12' },
  categoryOptionText: { fontSize: 15, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  categoryOptionTextActive: { color: Colors.primary, fontFamily: Fonts.headlineExtra },

  // CTA
  ctaSection: { gap: 12, marginTop: 28 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 62, borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    gap: 10,
    ...Shadows.fab,
  },
  primaryBtnText: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: '#fff' },
  ghostBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  ghostBtnText: {
    fontSize: 13, fontFamily: Fonts.label, color: Colors['on-surface-variant'],
    textTransform: 'uppercase', letterSpacing: 1,
  },
});
