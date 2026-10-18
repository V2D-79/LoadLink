/**
 * src/ui/NotificationList.tsx
 *
 * Shared notification list component — used by both factory and driver.
 * Shows notification items with type icon, title, body, time, unread dot.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../constants/theme';
import type { Notification } from '../hooks/useNotifications';
import EmptyState from './EmptyState';

// ── Type → icon character ─────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  new_match: '🎯',
  new_bid: '💰',
  bid_revised: '✏️',
  bid_withdrawn: '↩️',
  job_assigned: '📋',
  driver_accepted: '✅',
  driver_rejected: '❌',
  offer_expired: '⏰',
  bid_not_selected: '🔔',
  status_change: '🚛',
  job_completed: '🏁',
  rating_received: '⭐',
  route_match: '📍',
  job_cancelled: '🚫',
};

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Notification item ────────────────────────────────────────

function NotifItem({
  item,
  index,
  onPress,
}: {
  item: Notification;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)}>
      <Pressable
        onPress={onPress}
        style={[ns.item, !item.read && ns.itemUnread]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={ns.iconBox}>
          <Text style={ns.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
        </View>
        <View style={ns.content}>
          <View style={ns.titleRow}>
            <Text style={[ns.title, !item.read && ns.titleBold]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={ns.time}>{relativeTime(item.createdAt)}</Text>
          </View>
          <Text style={ns.body} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.read && <View style={ns.unreadDot} />}
      </Pressable>
    </Animated.View>
  );
}

// ── Export ────────────────────────────────────────────────────

export function NotificationList({
  notifications,
  loading,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: Notification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  if (!loading && notifications.length === 0) {
    return (
      <EmptyState
        heading="No notifications"
        subText="Updates about your jobs, bids, and matches will appear here."
        type="notifications"
      />
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.notificationId}
      renderItem={({ item, index }) => (
        <NotifItem
          item={item}
          index={index}
          onPress={() => onMarkRead(item.notificationId)}
        />
      )}
      contentContainerStyle={{ paddingBottom: SPACING.xxl }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        notifications.some((n) => !n.read) ? (
          <Pressable onPress={onMarkAllRead} style={ns.markAllBtn} accessibilityRole="button">
            <Text style={ns.markAllText}>Mark all as read</Text>
          </Pressable>
        ) : null
      }
    />
  );
}

const ns = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    backgroundColor: COLORS.paperWhite,
    gap: SPACING.sm,
  },
  itemUnread: { backgroundColor: COLORS.ochre + '08' },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.offWhite,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flex: 1, marginRight: SPACING.xs },
  titleBold: { fontFamily: FONTS.bodySemiBold },
  time: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xxs, color: COLORS.steel, flexShrink: 0 },
  body: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.ochre, marginTop: SPACING.xs, flexShrink: 0 },
  markAllBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'flex-end' },
  markAllText: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.xs, color: COLORS.ochre },
});
