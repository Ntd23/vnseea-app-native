// Description: Draws one story overlay item (text, sticker, @mention or link) at its unscaled size.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link2 } from 'lucide-react-native';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../../shared-kernel/presentation/theme/appColors';
import { storyLinkLabel } from '../../../application/overlay/storyOverlay';
import type { StoryOverlayItem } from '../../../domain/types/stories.types';

/** Black or white, whichever reads better on a solid text background. */
export function contrastingTextColor(background: string) {
  const hex = background.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(char => char + char)
          .join('')
      : hex;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
}

export function StoryOverlayItemView({
  item,
  unit,
  maxWidth,
}: {
  item: StoryOverlayItem;
  /** Frame width / design width; keeps sizes proportional to the frame. */
  unit: number;
  maxWidth: number;
}) {
  switch (item.kind) {
    case 'text': {
      const isSolid = item.textStyle === 'solid';
      const isSoft = item.textStyle === 'soft';
      return (
        <View
          style={[
            styles.textBox,
            {
              maxWidth,
              borderRadius: 10 * unit,
              paddingHorizontal: (isSolid || isSoft ? 12 : 4) * unit,
              paddingVertical: (isSolid || isSoft ? 6 : 2) * unit,
            },
            isSolid && { backgroundColor: item.color },
            isSoft && styles.softTextBox,
          ]}
        >
          <Text
            style={[
              styles.text,
              {
                fontSize: 28 * unit,
                lineHeight: 34 * unit,
                color: isSolid ? contrastingTextColor(item.color) : item.color,
              },
              !isSolid && !isSoft && styles.textShadow,
            ]}
          >
            {item.text}
          </Text>
        </View>
      );
    }
    case 'sticker':
      return (
        <Text style={{ fontSize: 64 * unit, lineHeight: 76 * unit }}>
          {item.emoji}
        </Text>
      );
    case 'mention':
      return (
        <View
          style={[
            styles.pill,
            {
              maxWidth,
              borderRadius: 10 * unit,
              paddingHorizontal: 12 * unit,
              paddingVertical: 7 * unit,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.mention, { fontSize: 20 * unit }]}
          >
            @{(item.name || item.username).toUpperCase()}
          </Text>
        </View>
      );
    case 'link':
      return (
        <View
          style={[
            styles.pill,
            styles.linkPill,
            {
              maxWidth,
              borderRadius: 10 * unit,
              paddingHorizontal: 12 * unit,
              paddingVertical: 7 * unit,
            },
          ]}
        >
          <Link2 size={18 * unit} color={APP_COLORS.status.info} />
          <Text
            numberOfLines={1}
            style={[styles.link, { fontSize: 17 * unit, marginLeft: 6 * unit }]}
          >
            {storyLinkLabel(item.url).toUpperCase()}
          </Text>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  textBox: {
    alignItems: 'center',
  },
  softTextBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  text: {
    fontWeight: '800',
    textAlign: 'center',
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  linkPill: {
    flexShrink: 1,
  },
  mention: {
    color: APP_BRAND_COLOR,
    fontWeight: '900',
  },
  link: {
    flexShrink: 1,
    color: APP_COLORS.status.info,
    fontWeight: '800',
  },
});
