// Description: Renders photos and videos sent together as one Messenger-style stack of tilted preview cards.
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { LayoutGrid, Play, Video } from 'lucide-react-native';
import type { MessageItem } from '../../domain/types/messages.types';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';
import { DoubleTapTouchable } from './DoubleTapTouchable';
import { MessageReactionBadge } from './MessageReactions';

const CARD_WIDTH = Math.min(
  Math.round(Dimensions.get('window').width * 0.5),
  210,
);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.28);
// Room around the front card for the tilted cards behind it.
const STACK_GUTTER_X = 24;
const STACK_GUTTER_Y = 22;
const MAX_VISIBLE_CARDS = 3;

// Index 0 is the front card; the two behind it fan out to either side,
// peeking above its top edge like Messenger's photo stacks.
const CARD_LAYOUTS = [
  { rotate: -2, offsetX: 0, offsetY: 0 },
  { rotate: 6, offsetX: 9, offsetY: -11 },
  { rotate: -7, offsetX: -9, offsetY: -14 },
];

function useCardPreviewUri(message: MessageItem) {
  const mediaUri = message.media ?? '';
  const isVideo = message.mediaType === 'video';
  const [generatedPoster, setGeneratedPoster] = useState(() =>
    isVideo && !message.thumbnail
      ? getCachedVideoPosterThumbnail(mediaUri, message.id)?.uri ?? ''
      : '',
  );

  useEffect(() => {
    if (!isVideo || message.thumbnail || !mediaUri) return;
    const cachedPoster = getCachedVideoPosterThumbnail(mediaUri, message.id);
    if (cachedPoster?.uri) {
      setGeneratedPoster(cachedPoster.uri);
      return;
    }

    let cancelled = false;
    createCachedVideoPosterThumbnail(mediaUri, message.id).then(poster => {
      if (!cancelled && poster?.uri) setGeneratedPoster(poster.uri);
    });
    return () => {
      cancelled = true;
    };
  }, [isVideo, mediaUri, message.id, message.thumbnail]);

  if (!isVideo) return mediaUri;
  return message.thumbnail || generatedPoster;
}

function StackCard({
  message,
  layer,
  isSentByMe,
}: {
  message: MessageItem;
  layer: number;
  isSentByMe: boolean;
}) {
  const previewUri = useCardPreviewUri(message);
  const layout = CARD_LAYOUTS[layer] ?? CARD_LAYOUTS[CARD_LAYOUTS.length - 1];
  // Received stacks mirror the fan so the stack reads toward the sender.
  const direction = isSentByMe ? 1 : -1;
  const isVideo = message.mediaType === 'video';

  return (
    <View
      style={[
        styles.cardShadow,
        {
          zIndex: MAX_VISIBLE_CARDS - layer,
          transform: [
            { translateX: layout.offsetX * direction },
            { translateY: layout.offsetY },
            { rotate: `${layout.rotate * direction}deg` },
          ],
        },
      ]}
    >
      <View style={styles.card}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={styles.cardImage}
            resizeMode="cover"
            fadeDuration={120}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardPlaceholder]}>
            {isVideo ? <Video size={30} color="rgba(255,255,255,0.45)" /> : null}
          </View>
        )}
        {isVideo && layer === 0 ? (
          <View style={styles.playOverlay}>
            {message.mediaStatus ? (
              <Text className="rounded-full bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white">
                {message.mediaStatus === 'processing'
                  ? 'Đang xử lý video'
                  : 'Không xử lý được video'}
              </Text>
            ) : (
              <View style={styles.playButton}>
                <Play size={22} color="#111827" fill="#111827" style={styles.playIcon} />
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ChatMediaStack({
  messages,
  isSentByMe,
  label,
  onOpen,
  onLongPress,
  onDoubleTap,
}: {
  /** Messages in the order they were picked; the first one is on top. */
  messages: MessageItem[];
  isSentByMe: boolean;
  label: string;
  onOpen: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
}) {
  const visibleMessages = messages.slice(0, MAX_VISIBLE_CARDS);
  const reactedMessage = messages.find(message => message.reactions.total > 0);

  return (
    <View style={isSentByMe ? styles.alignEnd : styles.alignStart}>
      <DoubleTapTouchable
        activeOpacity={0.85}
        onSingleTap={onOpen}
        style={styles.labelRow}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <LayoutGrid size={15} color="#64748B" />
        <Text className="ml-1.5 text-[14px] font-semibold text-slate-500">
          {label}
        </Text>
      </DoubleTapTouchable>
      <DoubleTapTouchable
        activeOpacity={0.9}
        delayLongPress={320}
        onSingleTap={onOpen}
        onDoubleTap={onDoubleTap}
        onLongPress={onLongPress}
        style={styles.stack}
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
      >
        {visibleMessages
          .map((message, layer) => (
            <StackCard
              key={message.id}
              message={message}
              layer={layer}
              isSentByMe={isSentByMe}
            />
          ))
          .reverse()}
        {reactedMessage ? (
          <View
            style={[
              styles.reactionBadge,
              isSentByMe ? styles.reactionBadgeSent : styles.reactionBadgeReceived,
            ]}
          >
            <MessageReactionBadge
              summary={reactedMessage.reactions}
              isSentByMe={isSentByMe}
            />
          </View>
        ) : null}
      </DoubleTapTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  alignEnd: {
    alignItems: 'flex-end',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
  },
  cardImage: {
    height: '100%',
    width: '100%',
  },
  cardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  cardShadow: {
    position: 'absolute',
    left: STACK_GUTTER_X,
    top: STACK_GUTTER_Y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: STACK_GUTTER_X,
    paddingVertical: 2,
  },
  playButton: {
    height: 46,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  playIcon: {
    marginLeft: 3,
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  reactionBadge: {
    position: 'absolute',
    bottom: 2,
    zIndex: MAX_VISIBLE_CARDS + 1,
  },
  reactionBadgeReceived: {
    right: STACK_GUTTER_X + 6,
  },
  reactionBadgeSent: {
    left: STACK_GUTTER_X + 6,
  },
  stack: {
    width: CARD_WIDTH + STACK_GUTTER_X * 2,
    height: CARD_HEIGHT + STACK_GUTTER_Y + 12,
  },
});
