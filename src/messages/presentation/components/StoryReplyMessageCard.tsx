import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Play, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import type { StoryReplyMessageReference } from '../../domain/types/messages.types';
import { DoubleTapTouchable } from './DoubleTapTouchable';

type StoryReplyMessageCardProps = {
  reference: StoryReplyMessageReference;
  replyText: string;
  isSentByMe: boolean;
  conversationName?: string;
  statusText: string;
  statusIsError?: boolean;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
};

type StoryReplyNavigation = NativeStackNavigationProp<RootStackParamList>;

const storiesRepository = createStoriesRepository();

export function StoryReplyMessageCard({
  reference,
  replyText,
  isSentByMe,
  conversationName,
  statusText,
  statusIsError = false,
  onLongPress,
  onDoubleTap,
}: StoryReplyMessageCardProps) {
  const navigation = useNavigation<StoryReplyNavigation>();
  const { isDark } = useAppTheme();
  const [isOpening, setIsOpening] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(!reference.available);

  useEffect(() => {
    setIsUnavailable(!reference.available);
  }, [reference.available, reference.storyId]);

  const isAvailable = reference.available && !isUnavailable;
  const referenceName = reference.publisherName.trim();
  const publisherName =
    referenceName && referenceName !== 'Người dùng'
      ? referenceName
      : conversationName?.trim() || '';
  const contextText = isSentByMe
    ? publisherName
      ? `Bạn đã trả lời tin của ${publisherName}`
      : 'Bạn đã trả lời một tin'
    : 'Đã trả lời tin của bạn';

  const openStory = useCallback(async () => {
    if (!isAvailable || isOpening) return;
    setIsOpening(true);
    try {
      const stories = await storiesRepository.getStories();
      const storyIndex = stories.findIndex(
        story =>
          story.id === reference.storyId ||
          story.media.some(
            segment =>
              segment.storyId === reference.storyId ||
              segment.id === reference.storyId,
          ),
      );
      if (storyIndex < 0) {
        setIsUnavailable(true);
        return;
      }

      const initialSegmentIndex = Math.max(
        0,
        stories[storyIndex].media.findIndex(
          segment =>
            segment.storyId === reference.storyId ||
            segment.id === reference.storyId,
        ),
      );
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories,
        initialUserIndex: storyIndex,
        initialSegmentIndex,
      });
    } catch {
      setIsUnavailable(true);
    } finally {
      setIsOpening(false);
    }
  }, [isAvailable, isOpening, navigation, reference.storyId]);

  const colors = {
    sentBubble: '#2563EB',
    receivedBubble: isDark ? '#1F2937' : '#F1F5F9',
    sentQuote: 'rgba(255, 255, 255, 0.14)',
    receivedQuote: isDark ? '#111827' : '#FFFFFF',
    sentPrimary: '#FFFFFF',
    receivedPrimary: isDark ? '#F8FAFC' : '#0F172A',
    sentSecondary: '#DBEAFE',
    receivedSecondary: isDark ? '#94A3B8' : '#64748B',
    fallback: isDark ? '#334155' : '#E2E8F0',
  };
  const primaryColor = isSentByMe
    ? colors.sentPrimary
    : colors.receivedPrimary;
  const secondaryColor = isSentByMe
    ? colors.sentSecondary
    : colors.receivedSecondary;

  return (
    <DoubleTapTouchable
      accessibilityRole="button"
      accessibilityLabel="Mở tin được trả lời"
      activeOpacity={isAvailable ? 0.88 : 1}
      onSingleTap={openStory}
      onLongPress={onLongPress}
      onDoubleTap={onDoubleTap}
      style={[
        styles.bubble,
        {
          backgroundColor: isSentByMe
            ? colors.sentBubble
            : colors.receivedBubble,
        },
      ]}
    >
      <View
        style={[
          styles.storyQuote,
          {
            backgroundColor: isSentByMe
              ? colors.sentQuote
              : colors.receivedQuote,
          },
        ]}
      >
        <View style={styles.body}>
          <Text
            numberOfLines={2}
            style={[styles.publisher, { color: primaryColor }]}
          >
            {contextText}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.caption, { color: secondaryColor }]}
          >
            {isAvailable
              ? reference.caption || 'Bấm để xem tin'
              : 'Tin không còn khả dụng'}
          </Text>
        </View>

        <View style={[styles.preview, { backgroundColor: colors.fallback }]}>
          {isAvailable && reference.thumbnailUrl ? (
            <Image
              source={{ uri: reference.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Sparkles size={28} color={secondaryColor} />
          )}
          {isAvailable && reference.mediaType === 'video' ? (
            <View style={styles.playButton}>
              <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          ) : null}
          {isOpening ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </View>

      {replyText ? (
        <Text style={[styles.replyText, { color: primaryColor }]}>
          {replyText}
        </Text>
      ) : null}
      <Text
        style={[
          styles.status,
          { color: statusIsError ? '#FCA5A5' : secondaryColor },
        ]}
      >
        {statusText}
      </Text>
    </DoubleTapTouchable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: 270,
    overflow: 'hidden',
    borderRadius: 18,
    padding: 7,
  },
  storyQuote: {
    minHeight: 92,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 12,
  },
  preview: {
    width: 68,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  publisher: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  caption: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 16,
  },
  replyText: {
    marginTop: 8,
    paddingHorizontal: 5,
    fontSize: 15,
    lineHeight: 20,
  },
  status: {
    marginTop: 3,
    paddingHorizontal: 5,
    textAlign: 'right',
    fontSize: 10,
  },
});
