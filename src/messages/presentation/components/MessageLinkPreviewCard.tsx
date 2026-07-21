import React, { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ExternalLink, Link2 } from 'lucide-react-native';
import type { MessageLinkReference } from '../../domain/types/messages.types';
import { DoubleTapTouchable } from './DoubleTapTouchable';

type MessageLinkPreviewCardProps = {
  reference: MessageLinkReference;
  caption?: string;
  isSentByMe: boolean;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
};

export function MessageLinkPreviewCard({
  reference,
  caption,
  isSentByMe,
  onLongPress,
  onDoubleTap,
}: MessageLinkPreviewCardProps) {
  const openLink = useCallback(() => {
    Linking.openURL(reference.url).catch(() => undefined);
  }, [reference.url]);

  return (
    <View style={styles.wrapper}>
      {caption ? (
        <Text
          style={[styles.caption, isSentByMe && styles.captionSent]}
          selectable
        >
          {caption}
        </Text>
      ) : null}
      <DoubleTapTouchable
        activeOpacity={0.88}
        onSingleTap={openLink}
        onLongPress={onLongPress}
        onDoubleTap={onDoubleTap}
        style={[styles.card, isSentByMe && styles.cardSent]}
      >
        <View style={styles.icon}>
          <Link2 size={19} color="#2563EB" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.host} numberOfLines={1}>
            {reference.host}
          </Text>
          <Text style={styles.url} numberOfLines={1}>
            {reference.url}
          </Text>
        </View>
        <ExternalLink size={17} color="#64748B" />
      </DoubleTapTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: 300,
  },
  caption: {
    marginBottom: 5,
    borderRadius: 14,
    borderBottomLeftRadius: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 19,
  },
  captionSent: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 5,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
  },
  card: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardSent: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  icon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  copy: {
    minWidth: 0,
    flex: 1,
    marginHorizontal: 10,
  },
  host: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  url: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 11.5,
  },
});
