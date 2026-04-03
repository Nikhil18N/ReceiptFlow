import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, Shadows } from '../../constants/theme';

const API_BASE_URL = 'https://shut-dance-essay-pulling.trycloudflare.com';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  color: string;
  read: boolean;
  metadata: string;
  created_at: string;
};

const TYPE_SECTIONS: Record<string, string> = {
  budget_exceeded: 'Budget Alerts',
  budget_warning: 'Budget Alerts',
  return_reminder: 'Reminders',
  warranty_reminder: 'Reminders',
  milestone: 'Achievements',
  reminder: 'Reminders',
  expense_added: 'Activity',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const didLoad = useRef(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // First trigger notification generation
      await fetch(`${API_BASE_URL}/api/notifications/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Then fetch all
      const res = await fetch(`${API_BASE_URL}/api/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.success) setNotifications(json.data);
      } catch {}
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!didLoad.current) {
      didLoad.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markAllRead = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const markSingleRead = async (id: string) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconName = (item.icon || 'notifications') as keyof typeof Ionicons.glyphMap;

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => {
          if (!item.read) markSingleRead(item.id);
          // Navigate based on type
          const meta = (() => { try { return JSON.parse(item.metadata); } catch { return {}; } })();
          if (meta.expenseId) {
            router.push({ pathname: '/(app)/expense-detail', params: { id: meta.expenseId } });
          }
        }}
        activeOpacity={0.7}
      >
        {!item.read && <View style={styles.unreadDot} />}
        <View style={[styles.notifIconWrap, { backgroundColor: (item.color || Colors.primary) + '15' }]}>
          <Ionicons name={iconName} size={20} color={item.color || Colors.primary} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.read && { fontFamily: Fonts.headlineExtra }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking for notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors['on-surface']} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
            <Text style={styles.markAllText}>Read All</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors['on-surface-variant'] + '40'} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            No notifications yet. Budget alerts, return reminders, and milestones will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors['surface-container-high'],
  },
  headerTitle: { fontSize: 20, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'] },
  headerSub: { fontSize: 12, fontFamily: Fonts.body, color: Colors.primary, marginTop: 1 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary + '10',
  },
  markAllText: { fontSize: 12, fontFamily: Fonts.headline, color: Colors.primary },

  listContent: { padding: 16, paddingBottom: 100 },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors['surface-container-lowest'],
    borderRadius: BorderRadius.xl,
    padding: 16, marginBottom: 8,
    ...Shadows.card,
  },
  notifCardUnread: {
    backgroundColor: Colors.primary + '06',
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  unreadDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  notifIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: Fonts.headline, color: Colors['on-surface'], marginBottom: 3 },
  notifBody: { fontSize: 13, fontFamily: Fonts.body, color: Colors['on-surface-variant'], lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, fontFamily: Fonts.label, color: Colors['on-surface-variant'] + '80' },

  loadingText: { fontSize: 14, fontFamily: Fonts.body, color: Colors['on-surface-variant'], marginTop: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors['surface-container-high'],
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontFamily: Fonts.headlineExtra, color: Colors['on-surface'], marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, fontFamily: Fonts.body, color: Colors['on-surface-variant'],
    textAlign: 'center', lineHeight: 20,
  },
});
