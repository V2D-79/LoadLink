/**
 * app/(factory)/notifications.tsx
 * Factory notification feed — real-time from RTDB.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuthContext } from '../../src/hooks/AuthContext';
import { useNotifications } from '../../src/hooks/useNotifications';
import { NotificationList } from '../../src/ui';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../src/constants/theme';

export default function FactoryNotificationsScreen() {
  const { firebaseUser } = useAuthContext();
  const { notifications, loading, unreadCount, markRead, markAllRead } =
    useNotifications(firebaseUser?.uid);

  return (
    <View style={s.root}>
      <StatusBar style="dark" backgroundColor={COLORS.offWhite} />
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={COLORS.ochre} />
        </View>
      ) : (
        <NotificationList
          notifications={notifications}
          loading={loading}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
  },
  title: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.charcoal },
  badge: {
    backgroundColor: COLORS.brick, minWidth: 22, height: 22,
    borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs, color: COLORS.paperWhite },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
