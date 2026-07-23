// Description: Offer expiry badge - shows days left or expired.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, XCircle } from 'lucide-react-native';

interface Props {
  daysLeft: number;
  isExpired: boolean;
}

export default function OfferExpiryBadge({ daysLeft, isExpired }: Props) {
  if (isExpired) {
    return (
      <View style={[styles.badge, styles.expiredBg]}>
        <XCircle size={12} color="#FFFFFF" />
        <Text style={styles.expiredText}>Đã hết hạn</Text>
      </View>
    );
  }

  if (daysLeft <= 3) {
    return (
      <View style={[styles.badge, styles.urgentBg]}>
        <Clock size={12} color="#FFFFFF" />
        <Text style={styles.urgentText}>Còn {daysLeft} ngày</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.normalBg]}>
      <Clock size={12} color="#FFFFFF" />
      <Text style={styles.normalText}>Còn {daysLeft} ngày</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  expiredBg: { backgroundColor: '#9CA3AF' },
  urgentBg: { backgroundColor: '#EF4444' },
  normalBg: { backgroundColor: 'rgba(185, 28, 28, 0.82)' },
  expiredText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  urgentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  normalText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
