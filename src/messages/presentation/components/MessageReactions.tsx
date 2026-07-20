import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FEED_REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../../../feed/presentation/components/FeedReactionAssets';
import type { ReactionType } from '../../../shared-kernel/domain/reactions/reactionCatalog';
import type { MessageReactionSummary } from '../../domain/types/messages.types';

const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

export function MessageReactionPicker({
  currentReaction,
  disabled = false,
  onSelect,
}: {
  currentReaction: ReactionType | null;
  disabled?: boolean;
  onSelect: (reaction: ReactionType | null) => void;
}) {
  return (
    <View style={styles.picker} testID="message-reaction-picker">
      {FEED_REACTION_TYPES.map(reaction => {
        const selected = currentReaction === reaction;
        return (
          <TouchableOpacity
            key={reaction}
            testID={`message-reaction-option-${reaction}`}
            accessibilityRole="button"
            accessibilityLabel={REACTION_LABELS[reaction]}
            accessibilityState={{ selected, disabled }}
            activeOpacity={0.72}
            disabled={disabled}
            onPress={() => onSelect(selected ? null : reaction)}
            style={[styles.option, selected && styles.selectedOption]}
          >
            <Image
              source={FEED_REACTION_IMAGES[reaction]}
              style={styles.optionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MessageReactionBadge({
  summary,
  isSentByMe = false,
}: {
  summary: MessageReactionSummary;
  isSentByMe?: boolean;
}) {
  if (summary.total <= 0 || summary.topReactions.length === 0) return null;

  return (
    <View
      style={[
        styles.badge,
        isSentByMe ? styles.badgeSent : styles.badgeReceived,
      ]}
      accessibilityLabel={`${summary.total} cảm xúc`}
    >
      <View style={styles.badgeIcons}>
        {summary.topReactions.slice(0, 3).map((reaction, index) => (
          <Image
            key={reaction}
            testID={`message-reaction-badge-icon-${reaction}`}
            source={FEED_REACTION_IMAGES[reaction]}
            style={[styles.badgeIcon, index > 0 && styles.overlappedBadgeIcon]}
            resizeMode="contain"
          />
        ))}
      </View>
      <Text testID="message-reaction-count" style={styles.badgeCount}>
        {String(summary.total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  option: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  selectedOption: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  optionIcon: {
    height: 30,
    width: 30,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: -3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeSent: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  badgeReceived: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  badgeIcons: {
    flexDirection: 'row',
  },
  badgeIcon: {
    height: 14,
    width: 14,
  },
  overlappedBadgeIcon: {
    marginLeft: -3,
  },
  badgeCount: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
});
