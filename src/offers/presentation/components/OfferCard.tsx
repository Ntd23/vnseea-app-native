// Description: Offer card component - shows one offer in a card.
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, Tag } from 'lucide-react-native';
import type { OfferWithDisplay } from '../../domain/types/offer.types';
import OfferDiscountBadge from './OfferDiscountBadge';
import OfferExpiryBadge from './OfferExpiryBadge';

interface Props {
  offer: OfferWithDisplay;
  onPress?: () => void;
}

export default function OfferCard({ offer, onPress }: Props) {
  const isExpired = offer.isExpired;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, isExpired && styles.cardExpired]}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {offer.image ? (
          <Image
            source={{ uri: offer.image }}
            style={[styles.thumbnail, isExpired && styles.thumbnailExpired]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Tag size={32} color="#94A3B8" />
          </View>
        )}

        {/* Discount Badge (top-left) */}
        <View style={styles.badgeTopLeft}>
          <OfferDiscountBadge offer={offer} />
        </View>

        {/* Discount Text (top-right) */}
        <View style={styles.discountTextContainer}>
          <Text style={styles.discountText}>{offer.discountText}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Expiry Badge */}
        <OfferExpiryBadge daysLeft={offer.daysLeft} isExpired={offer.isExpired} />

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {offer.description}
        </Text>

        {/* Discounted Items */}
        {offer.discountedItems ? (
          <View style={styles.itemsRow}>
            <Text style={styles.itemsLabel}>Áp dụng: </Text>
            <Text style={styles.itemsValue} numberOfLines={1}>
              {offer.discountedItems}
            </Text>
          </View>
        ) : null}

        {/* CTA */}
        <View style={styles.ctaRow}>
          <Text style={[styles.ctaText, isExpired && styles.ctaTextExpired]}>
            {isExpired ? 'Đã hết hạn' : 'Sử dụng ngay'}
          </Text>
          {!isExpired && <ChevronRight size={16} color="#0000FF" strokeWidth={2.5} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardExpired: {
    opacity: 0.7,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F1F4FB',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailExpired: {
    opacity: 0.5,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F4FB',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  discountTextContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    color: '#0000FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  body: {
    padding: 16,
    gap: 8,
  },
  description: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '500',
    lineHeight: 20,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  itemsValue: {
    flex: 1,
    fontSize: 12,
    color: '#1A1C1E',
    fontWeight: '500',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0000FF',
  },
  ctaTextExpired: {
    color: '#9CA3AF',
  },
});
