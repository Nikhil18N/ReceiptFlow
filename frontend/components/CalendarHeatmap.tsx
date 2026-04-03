import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts } from '../constants/theme';

type CalendarDay = {
  date: string;
  total: number;
  count: number;
  merchants: string[];
};

type CalendarHeatmapProps = {
  data: CalendarDay[];
  month: string; // YYYY-MM
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarHeatmap({ data, month, onPrevMonth, onNextMonth }: CalendarHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const [year, mon] = month.split('-').map(Number);
  const monthName = new Date(year, mon - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay();
  const maxSpending = Math.max(...data.map(d => d.total), 1);
  const today = new Date().toISOString().split('T')[0];

  const getIntensity = (total: number) => {
    if (total === 0) return 0;
    const ratio = total / maxSpending;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  };

  const intensityColors = [
    Colors['surface-container-high'],     // 0: no spending
    Colors.primary + '25',               // 1: light
    Colors.primary + '50',               // 2: medium
    Colors.primary + '80',               // 3: heavy
    Colors.primary,                       // 4: max
  ];

  // Build grid with padding for first day offset
  const paddedDays: (CalendarDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...data,
  ];

  return (
    <View>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={onPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={20} color={Colors['on-surface-variant']} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={onNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={20} color={Colors['on-surface-variant']} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {paddedDays.map((day, i) => {
          if (!day) {
            return <View key={`empty-${i}`} style={styles.cell} />;
          }
          const intensity = getIntensity(day.total);
          const isToday = day.date === today;
          const isSelected = selectedDay?.date === day.date;
          const dayNum = parseInt(day.date.split('-')[2]);

          return (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.cell,
                { backgroundColor: intensityColors[intensity] },
                isToday && styles.todayCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => setSelectedDay(isSelected ? null : day)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.cellText,
                intensity >= 3 && { color: '#fff' },
                isToday && { fontFamily: Fonts.headlineExtra },
              ]}>
                {dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Detail */}
      {selectedDay && selectedDay.total > 0 && (
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color={Colors.primary} />
            <Text style={styles.detailDate}>
              {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.detailAmount}>₹{selectedDay.total.toFixed(2)}</Text>
          <Text style={styles.detailMeta}>
            {selectedDay.count} receipt{selectedDay.count !== 1 ? 's' : ''} • {selectedDay.merchants.join(', ')}
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Less</Text>
        {intensityColors.map((c, i) => (
          <View key={i} style={[styles.legendBox, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthTitle: { fontSize: 15, fontFamily: Fonts.headline, color: Colors['on-surface'] },

  dayLabelsRow: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 10, fontFamily: Fonts.label, color: Colors['on-surface-variant'],
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  todayCell: { borderWidth: 2, borderColor: Colors.primary },
  selectedCell: { borderWidth: 2, borderColor: Colors['on-surface'] },
  cellText: { fontSize: 11, fontFamily: Fonts.label, color: Colors['on-surface'] },

  detailCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.lg,
    padding: 12, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailDate: { fontSize: 12, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  detailAmount: { fontSize: 20, fontFamily: Fonts.headlineExtra, color: Colors.primary, marginBottom: 2 },
  detailMeta: { fontSize: 11, fontFamily: Fonts.body, color: Colors['on-surface-variant'] },

  legendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 12,
  },
  legendLabel: { fontSize: 9, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },
  legendBox: { width: 14, height: 14, borderRadius: 3 },
});
