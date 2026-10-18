/**
 * app/(factory)/_layout.tsx
 *
 * Factory tab navigator.
 * Tabs: Jobs, Find, Track, Profile
 * Auth-guards: redirects to landing if no session.
 */

import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import Svg, { Rect, Path, Circle, Line } from 'react-native-svg';
import { useAuthContext } from '../../src/hooks/AuthContext';
import { COLORS, FONTS, FONT_SIZES } from '../../src/constants/theme';

// ── Minimal inline SVG tab icons ─────────────────────────────────

function IconHome({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconJobs({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={7} width={18} height={14} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth={1.5} />
      <Line x1={8} y1={12} x2={16} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={8} y1={16} x2={13} y2={16} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function IconFind({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.5} />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function IconTrack({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12 Q6 6 12 6 Q18 6 21 12 Q18 18 12 18 Q6 18 3 12"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={12} r={3} fill={color} />
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

export default function FactoryLayout() {
  const { firebaseUser, role, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (firebaseUser === null || role !== 'factory')) {
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
          height: 62,
          paddingBottom: 8,
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
        name="jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color }) => <IconJobs color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post Job',
          tabBarIcon: ({ color }) => <IconFind color={color} />,
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Track',
          tabBarIcon: ({ color }) => <IconTrack color={color} />,
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
        name="job/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="edit-job"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="location-select"
        options={{ href: null }}
      />
    </Tabs>
  );
}
