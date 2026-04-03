import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, Shadows } from '../constants/theme';

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

type BudgetCardProps = {
  category: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
  onPress?: () => void;
};

export default function BudgetCard({ category, monthlyLimit, spent, percentage, onPress }: BudgetCardProps) {
  const isOver = percentage >= 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const barColor = isOver ? Colors.error : isWarning ? '#F59E0B' : Colors.primary;
  const remaining = Math.max(monthlyLimit - spent, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: barColor + '15' }]}>  
          <Ionicons name={CATEGORY_ICONS[category] ?? 'cube'} size={18} color={barColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.categoryName}>{category}</Text>
          <Text style={styles.limitText}>₹{spent.toFixed(0)} / ₹{monthlyLimit.toFixed(0)}</Text>
        </View>
        <View style={styles.percentBadge}>
          <Text style={[styles.percentText, { color: barColor }]}>{Math.round(percentage)}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }]} />
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, isOver && { color: Colors.error }]}>
          {isOver ? `Over by ₹${(spent - monthlyLimit).toFixed(0)}` : `₹${remaining.toFixed(0)} remaining`}
        </Text>
        {isOver && <Ionicons name="alert-circle" size={14} color={Colors.error} />}
        {isWarning && <Ionicons name="warning" size={14} color="#F59E0B" />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryName: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  limitText: { fontSize: 11, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 1 },
  percentBadge: {
    backgroundColor: Colors['surface-container-high'],
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  percentText: { fontSize: 12, fontFamily: Fonts.headlineExtra },
  progressBg: {
    height: 6, backgroundColor: Colors['surface-container-high'],
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerText: { fontSize: 11, fontFamily: Fonts.body, color: Colors['on-surface-variant'] },
});
