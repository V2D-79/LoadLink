/**
 * app/(driver)/_layout.tsx
 *
 * Driver tab navigator.
 * Tabs: Find Jobs, My Activity, Route, Profile
 * Auth-guards: redirects to landing if no session.
 */

import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Rect, Path, Circle, Line, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { COLORS, FONTS, FONT_SIZES } from '../../src/constants/theme';

function IconHome({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconFind({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Truck */}
      <Rect x={1} y={9} width={15} height={9} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Path d="M16 13h5l-2-4h-3v4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={5.5} cy={18} r={1.5} stroke={color} strokeWidth={1.5} />
      <Circle cx={18.5} cy={18} r={1.5} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function IconActivity({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconRoute({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={18} r={2.5} stroke={color} strokeWidth={1.5} />
      <Circle cx={18} cy={6} r={2.5} stroke={color} strokeWidth={1.5} />
      <Path d="M8.5 15.5 Q14 14 15.5 8.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3,2" />
    </Svg>
  );
}

function IconProfile({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export default function DriverLayout() {
  const { firebaseUser, role, loading } = useAuthContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  useEffect(() => {
    if (!loading && (firebaseUser === null || role !== 'driver')) {
      router.replace('/(auth)/landing');
    }
  }, [firebaseUser, role, loading, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.charcoal,
          borderTopColor: COLORS.hairline,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.ochre,
        tabBarInactiveTintColor: COLORS.steel,
        tabBarLabelStyle: {
          fontFamily: FONTS.bodyMedium,
          fontSize: FONT_SIZES.xs,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />
      <Tabs.Screen
        name="find"
        options={{
          title: 'Find Jobs',
          tabBarIcon: ({ color }) => <IconFind color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'My Route',
          tabBarIcon: ({ color }) => <IconRoute color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <IconActivity color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconProfile color={color} />,
        }}
      />
      {/* Detail screens — hidden from tab bar */}
      <Tabs.Screen
        name="edit-profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="job/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="reject-job"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="map-select"
        options={{ href: null }}
      />
    </Tabs>
  );
}
