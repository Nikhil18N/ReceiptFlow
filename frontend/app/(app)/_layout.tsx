import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Shadows } from '../../constants/theme';

/**
 * Protected app group layout.
 * 4 tabs: Dashboard | Activity | Insights | Profile
 * Center FAB: Scanner (opens scanner screen as a push navigation)
 */
export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const isScannerScreen = (segments as string[]).includes('scanner');

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors['on-surface-variant'],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="receipt" focused={focused} />
            ),
          }}
        />
        {/* Invisible placeholder tab for center FAB spacing */}
        <Tabs.Screen
          name="scanner"
          options={{
            title: '',
            tabBarIcon: () => <View style={{ width: 60 }} />,
            tabBarLabel: () => null,
            tabBarStyle: { display: 'none' }, // hide tab bar on scanner
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // Don't navigate via tab
              router.push('/(app)/scanner');
            },
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="stats-chart" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="person" focused={focused} />
            ),
          }}
        />
        {/* Hidden screens — navigated programmatically */}
        <Tabs.Screen
          name="results"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Center Scanner FAB */}
      {!isScannerScreen && (
        <TouchableOpacity
          style={styles.centerFab}
          onPress={() => router.push('/(app)/scanner')}
          activeOpacity={0.85}
        >
          <View style={styles.centerFabInner}>
            <Ionicons name="camera" size={26} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons name={name} size={18} color={focused ? Colors.primary : Colors['on-surface-variant']} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 0,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 20,
  },
  tabBarItem: {
    borderRadius: BorderRadius.xl,
    marginHorizontal: 2,
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primary + '18',
  },
  tabIconText: {
    fontSize: 18,
  },

  // Center FAB
  centerFab: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    marginLeft: -32,
    zIndex: 100,
  },
  centerFabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.fab,
    borderWidth: 4,
    borderColor: '#fff',
  },
  centerFabIcon: {
    fontSize: 26,
  },
});
