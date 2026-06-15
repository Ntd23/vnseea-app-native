// Description: Offer discount badge component.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Offer } from '../../domain/types/offer.types';

const TYPE_LABELS: Record<string, { text: string; bg: string }> = {
  discount_percent: { text: 'GIẢM GIÁ', bg: '#EF4444' },
  discount_amount: { text: 'GIẢM TIỀN', bg: '#F59E0B' },
  buy_get_discount: { text: 'MUA TẶNG', bg: '#8B5CF6' },
  spend_get_off: { text: 'HOÀN TIỀN', bg: '#10B981' },
  free_shipping: { text: 'FREE SHIP', bg: '#3B82F6' },
};

interface Props {
  offer: Offer;
}

export default function OfferDiscountBadge({ offer }: Props) {
  const meta = TYPE_LABELS[offer.discountType] ?? TYPE_LABELS.discount_percent;

  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={styles.badgeText}>{meta.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
