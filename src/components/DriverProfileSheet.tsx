/**
 * src/components/DriverProfileSheet.tsx
 *
 * Bottom-sheet modal shown to factories after bid is offered/accepted.
 * Shows driver name, rating, truck details, agreed amount, and
 * direct WhatsApp / phone-call contact buttons.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRTDBValue } from '../hooks/useRTDB';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADII } from '../constants/theme';
import { DB_PATHS, VEHICLE_TYPE_LABELS, BODY_TYPE_LABELS } from '../constants/app';

interface Props {
  visible: boolean;
  onClose: () => void;
  driverUid: string;
  truckId?: string;
  bidAmountInr?: number;
  jobStatus?: string;
}

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 16, color: i <= r ? COLORS.ochre : COLORS.hairline }}>★</Text>
      ))}
      <Text style={s.ratingNum}>{rating > 0 ? ` ${rating.toFixed(1)}` : ' No ratings'}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={s.avatar}>
      <Text style={s.avatarText}>{initials || '?'}</Text>
    </View>
  );
}

const POST_OFFER_STATUSES = [
  'offered', 'accepted', 'heading_to_pickup',
  'loaded', 'in_transit', 'delivered', 'completed',
];

export default function DriverProfileSheet({
  visible, onClose, driverUid, truckId, bidAmountInr, jobStatus,
}: Props) {
  const insets = useSafeAreaInsets();

  const { data: profile, loading: profLoad } = useRTDBValue<any>(
    visible && driverUid ? `${DB_PATHS.users}/${driverUid}` : null,
  );
  const { data: priv, loading: privLoad } = useRTDBValue<any>(
    visible && driverUid ? `${DB_PATHS.userPrivate}/${driverUid}` : null,
  );
  const { data: truck, loading: truckLoad } = useRTDBValue<any>(
    visible && driverUid && truckId
      ? `${DB_PATHS.trucks}/${driverUid}/${truckId}`
      : null,
  );

  const loading = profLoad || privLoad || truckLoad;
  const name = profile?.displayName ?? profile?.name ?? 'Driver';
  const phone: string | null = priv?.phone ?? profile?.phone ?? null;
  const isPostOffer = jobStatus ? POST_OFFER_STATUSES.includes(jobStatus) : false;

  const fmtPhone = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return `+${d}`;
  };

  const openWhatsApp = useCallback(() => {
    if (!phone) { Alert.alert('No number', 'Driver has not added a phone number.'); return; }
    const url = `https://wa.me/${fmtPhone(phone).replace('+', '')}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp not available', `Please call: ${phone}`));
  }, [phone]);

  const openCall = useCallback(() => {
    if (!phone) { Alert.alert('No number', 'Driver has not added a phone number.'); return; }
    Linking.openURL(`tel:${fmtPhone(phone)}`).catch(() =>
      Alert.alert('Cannot call', 'Please dial: ' + phone));
  }, [phone]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} />

      <View style={[s.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <View style={s.handle} />

        {/* Header */}
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>Driver Profile</Text>
          <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
            <Text style={s.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.loadBox}>
            <ActivityIndicator size="large" color={COLORS.ochre} />
            <Text style={s.loadTxt}>Loading…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Identity */}
            <View style={s.identity}>
              <Avatar name={name} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.driverName}>{name}</Text>
                <Stars rating={profile?.averageRating ?? 0} />
                <Text style={s.tripCount}>{profile?.ratingCount ?? 0} trips completed</Text>
              </View>
            </View>

            {/* Agreed amount */}
            {bidAmountInr != null && (
              <View style={s.amountBadge}>
                <Text style={s.amountLabel}>AGREED AMOUNT</Text>
                <Text style={s.amountValue}>₹{bidAmountInr.toLocaleString('en-IN')}</Text>
              </View>
            )}

            {/* Truck */}
            {truck && (
              <View style={s.section}>
                <Text style={s.secTitle}>🚛  Vehicle Details</Text>
                <InfoRow
                  label="Type"
                  value={(VEHICLE_TYPE_LABELS as Record<string, string>)[truck.vehicleType]
                    ?? truck.vehicleType?.replace(/_/g, ' ') ?? '—'}
                />
                {truck.registrationNumber && <InfoRow label="Reg. No." value={truck.registrationNumber} />}
                {truck.capacityTonnes != null && <InfoRow label="Capacity" value={`${truck.capacityTonnes} tonnes`} />}
                {truck.bodyType && (
                  <InfoRow
                    label="Body type"
                    value={(BODY_TYPE_LABELS as Record<string, string>)[truck.bodyType]
                      ?? truck.bodyType.replace(/_/g, ' ')}
                  />
                )}
                {truck.make && <InfoRow label="Make / Model" value={`${truck.make} ${truck.model ?? ''}`.trim()} />}
              </View>
            )}

            {/* Contact — only revealed post-offer */}
            {isPostOffer ? (
              <View style={s.section}>
                <Text style={s.secTitle}>📞  Contact Driver</Text>
                {phone ? (
                  <>
                    <Text style={s.phoneNum}>{phone}</Text>
                    <View style={s.contactRow}>
                      {/* WhatsApp */}
                      <Pressable
                        style={({ pressed }) => [s.contactBtn, { backgroundColor: '#25D366' }, pressed && { opacity: 0.8 }]}
                        onPress={openWhatsApp}
                        accessibilityRole="button"
                        accessibilityLabel="Open WhatsApp chat"
                      >
                        <Text style={s.contactEmoji}>💬</Text>
                        <Text style={s.contactBtnTxt}>WhatsApp</Text>
                      </Pressable>

                      {/* Call */}
                      <Pressable
                        style={({ pressed }) => [s.contactBtn, { backgroundColor: COLORS.ochre }, pressed && { opacity: 0.8 }]}
                        onPress={openCall}
                        accessibilityRole="button"
                        accessibilityLabel="Call driver"
                      >
                        <Text style={s.contactEmoji}>📱</Text>
                        <Text style={s.contactBtnTxt}>Call</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={s.noPhone}>Driver has not added a phone number yet.</Text>
                )}
              </View>
            ) : (
              <View style={[s.section, s.lockedSec]}>
                <Text style={{ fontSize: 28 }}>🔒</Text>
                <Text style={s.lockedTxt}>
                  Contact details are shown once the driver accepts your offer.
                </Text>
              </View>
            )}

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.paperWhite,
    borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.hairline,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.sm,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.offWhite, alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  loadBox: { paddingVertical: SPACING.xxl, alignItems: 'center', gap: SPACING.md },
  loadTxt: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  // identity
  identity: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.offWhite, borderRadius: RADII.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.ochre, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: '#fff' },
  driverName: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.lg, color: COLORS.charcoal },
  ratingNum: { fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.sm, color: COLORS.steel },
  tripCount: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.xs, color: COLORS.steel },
  // amount
  amountBadge: {
    backgroundColor: COLORS.olive + '18', borderWidth: 1, borderColor: COLORS.olive,
    borderRadius: RADII.md, padding: SPACING.md, marginBottom: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  amountLabel: {
    fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xxs,
    color: COLORS.olive, letterSpacing: 0.8,
  },
  amountValue: { fontFamily: FONTS.headingBold, fontSize: FONT_SIZES.xl, color: COLORS.olive },
  // section
  section: {
    marginBottom: SPACING.md, backgroundColor: COLORS.offWhite,
    borderRadius: RADII.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.hairline,
  },
  secTitle: {
    fontFamily: FONTS.headingSemiBold, fontSize: FONT_SIZES.sm,
    color: COLORS.charcoal, marginBottom: SPACING.sm,
  },
  // info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.hairline,
  },
  infoLabel: { fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm, color: COLORS.steel, flex: 1 },
  infoValue: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.charcoal, flex: 1, textAlign: 'right' },
  // contact
  phoneNum: {
    fontFamily: FONTS.bodyMedium, fontSize: FONT_SIZES.md,
    color: COLORS.charcoal, marginBottom: SPACING.sm, letterSpacing: 0.5,
  },
  contactRow: { flexDirection: 'row', gap: SPACING.sm },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.md, borderRadius: RADII.md, minHeight: 52,
  },
  contactEmoji: { fontSize: 20 },
  contactBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.md, color: '#fff' },
  noPhone: {
    fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm,
    color: COLORS.steel, textAlign: 'center', lineHeight: 20,
  },
  // locked
  lockedSec: { alignItems: 'center', gap: SPACING.xs },
  lockedTxt: {
    fontFamily: FONTS.bodyRegular, fontSize: FONT_SIZES.sm,
    color: COLORS.steel, textAlign: 'center', lineHeight: 20,
  },
});
