import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows, Fonts } from '../../constants/theme';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const fullName = user?.fullName ?? user?.firstName ?? 'User';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const avatarUrl = user?.imageUrl;
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currency, setCurrency] = useState('USD');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{fullName[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>
                  Member since {joinedDate}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.settingsCard}>
          {/* Currency */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="cash" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Currency</Text>
                <Text style={styles.settingSubtitle}>Display currency for amounts</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.currencyToggle}
              onPress={() => setCurrency(currency === 'USD' ? 'INR' : currency === 'INR' ? 'EUR' : 'USD')}
            >
              <Text style={styles.currencyText}>{currency}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Receipt scan alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors['surface-container-high'], true: Colors.primary + '60' }}
              thumbColor={notificationsEnabled ? Colors.primary : Colors.outline}
            />
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="receipt" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Receipt Flow</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="hardware-chip" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Powered by AI</Text>
                <Text style={styles.settingSubtitle}>Google Gemini 1.5 Flash</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data Section */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert('Export', 'Export feature coming soon! Your data will be exported as CSV.')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="cloud-download" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Export Data</Text>
                <Text style={styles.settingSubtitle}>Download your expenses as CSV</Text>
              </View>
            </View>
            <Text style={styles.chevron}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Made with ❤️ for smarter spending
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  headerTitle: { fontSize: 32, fontFamily: Fonts.headlineExtra, letterSpacing: -1, color: Colors['on-surface'], marginBottom: 20 },

  // Profile card
  profileCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.card,
    padding: 24,
    marginBottom: 24,
    ...Shadows.editorial,
  },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.primary + '30' },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28, fontFamily: Fonts.headlineExtra, color: '#fff' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  profileEmail: { fontSize: 13, fontFamily: Fonts.body, color: Colors['on-surface-variant'] },
  memberBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  memberBadgeText: { fontSize: 11, fontFamily: Fonts.label, color: Colors.primary },

  // Section labels
  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.label, letterSpacing: 1.5, textTransform: 'uppercase',
    color: Colors['on-surface-variant'], marginBottom: 10, paddingLeft: 4,
  },

  // Settings card
  settingsCard: {
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xxl,
    marginBottom: 24,
    overflow: 'hidden',
    ...Shadows.card,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  settingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center',
  },
  settingTitle: { fontSize: 15, fontFamily: Fonts.headline, color: Colors['on-surface'] },
  settingSubtitle: { fontSize: 12, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors['outline-variant'] + '20', marginHorizontal: 16 },
  chevron: { fontSize: 12, fontFamily: Fonts.label, color: Colors['on-surface-variant'] },

  currencyToggle: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  currencyText: { fontSize: 13, fontFamily: Fonts.headline, color: Colors.primary },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.error + '12',
    gap: 10,
    marginBottom: 16,
  },
  signOutText: { fontSize: 16, fontFamily: Fonts.headlineExtra, color: Colors.error },

  footerText: {
    textAlign: 'center', fontSize: 12, fontFamily: Fonts.bodyMedium, color: Colors['on-surface-variant'],
    marginBottom: 16,
  },
});
