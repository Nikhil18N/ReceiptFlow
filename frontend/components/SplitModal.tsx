import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Share, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, Shadows } from '../constants/theme';

type SplitModalProps = {
  visible: boolean;
  onClose: () => void;
  expenseId: string;
  merchantName: string;
  totalAmount: number;
  apiBaseUrl: string;
  getToken: () => Promise<string | null>;
};

export default function SplitModal({
  visible, onClose, expenseId, merchantName, totalAmount, apiBaseUrl, getToken,
}: SplitModalProps) {
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [loading, setLoading] = useState(false);
  const [splitData, setSplitData] = useState<any>(null);

  const perPerson = totalAmount / numberOfPeople;

  const handleSplit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiBaseUrl}/api/insights/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expenseId, numberOfPeople }),
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success) {
          setSplitData(json.data);
        }
      } catch {
        console.error('Split response not JSON');
      }
    } catch (err) {
      console.error('Split error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!splitData?.shareText) return;
    try {
      await Share.share({ message: splitData.shareText });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleCopy = async () => {
    if (!splitData?.shareText) return;
    await Clipboard.setStringAsync(splitData.shareText);
    Alert.alert('Copied!', 'Split details copied to clipboard.');
  };

  const resetAndClose = () => {
    setSplitData(null);
    setNumberOfPeople(2);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Split Expense</Text>
            <Text style={styles.subtitle}>{merchantName} • ₹{totalAmount.toFixed(2)}</Text>
          </View>

          {/* People Selector */}
          <Text style={styles.label}>Number of People</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, numberOfPeople <= 2 && { opacity: 0.3 }]}
              onPress={() => setNumberOfPeople(Math.max(2, numberOfPeople - 1))}
              disabled={numberOfPeople <= 2}
            >
              <Ionicons name="remove" size={20} color={Colors['on-surface']} />
            </TouchableOpacity>
            <View style={styles.stepValue}>
              <Text style={styles.stepValueText}>{numberOfPeople}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepBtn, numberOfPeople >= 20 && { opacity: 0.3 }]}
              onPress={() => setNumberOfPeople(Math.min(20, numberOfPeople + 1))}
              disabled={numberOfPeople >= 20}
            >
              <Ionicons name="add" size={20} color={Colors['on-surface']} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Each person pays</Text>
            <Text style={styles.previewAmount}>₹{perPerson.toFixed(2)}</Text>
          </View>

          {/* Split Result */}
          {splitData && (
            <View style={styles.resultCard}>
              {splitData.lineItemSplits?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.resultLabel}>Item Breakdown</Text>
                  {splitData.lineItemSplits.map((item: any, i: number) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemAmount}>₹{item.perPerson.toFixed(2)}/person</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-social" size={16} color="#fff" />
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                  <Ionicons name="copy" size={16} color={Colors.primary} />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Action Button */}
          {!splitData && (
            <TouchableOpacity style={styles.calcBtn} onPress={handleSplit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.calcBtnText}>Calculate Split</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={resetAndClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    padding: 24, paddingBottom: 40,
    ...Shadows.editorial,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors['surface-container-highest'],
    alignSelf: 'center', marginBottom: 16,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  subtitle: { fontSize: 13, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 4 },

  label: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'], marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: {
    width: 60, height: 50, borderRadius: 14,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  stepValueText: { fontSize: 24, fontFamily: Fonts.headlineExtra, color: Colors.primary },

  previewCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.xl, padding: 16,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: Colors.primary + '15',
  },
  previewLabel: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'], marginBottom: 4 },
  previewAmount: { fontSize: 28, fontFamily: Fonts.headlineExtra, color: Colors.primary },

  resultCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl, padding: 16,
    marginBottom: 16, ...Shadows.card,
  },
  resultLabel: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'], marginBottom: 8, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: Colors['on-surface'] },
  itemAmount: { fontSize: 13, fontFamily: Fonts.headline, color: Colors.primary },
  actionRow: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, height: 44, borderRadius: 12,
  },
  shareBtnText: { fontSize: 14, fontFamily: Fonts.headline, color: '#fff' },
  copyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary + '10', height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  copyBtnText: { fontSize: 14, fontFamily: Fonts.headline, color: Colors.primary },

  calcBtn: {
    backgroundColor: Colors.primary, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  calcBtnText: { fontSize: 16, fontFamily: Fonts.headlineExtra, color: '#fff' },
  closeBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface-variant'] },
});
