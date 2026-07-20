import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SharedPostPreviewModel } from '../../../feed/domain/types/feed.types';
import { getSharedPostPreviewPrimaryMediaUrl } from '../../../feed/application/sharing/sharedPostPreview';
import { SharedPostPreviewCard } from '../../../feed/presentation/components/SharedPostPreviewCard';
import {
  calculateSharedPostStoryScale,
  calculateSharedPostStoryScaledFrame,
} from '../../application/sharing/sharedPostStoryLayout';
import { sharedPostStoryPreviewLoader } from '../../application/sharing/sharedPostStoryPreview';

type Props = {
  sourcePostId: string;
  note?: string;
  availableWidth: number;
  availableHeight: number;
  onOpenPost: (postId: string) => void;
  onLongPress: () => void;
  onPressOut: () => void;
  onReady: () => void;
};

type PreviewLoadState =
  | { sourcePostId: string; status: 'loading' }
  | { sourcePostId: string; status: 'loaded'; model: SharedPostPreviewModel }
  | { sourcePostId: string; status: 'error' };

type PreviewMeasurement = {
  sourcePostId: string;
  height: number;
};

export function SharedPostStorySegment({
  sourcePostId,
  note,
  availableWidth,
  availableHeight,
  onOpenPost,
  onLongPress,
  onPressOut,
  onReady,
}: Props) {
  const [previewState, setPreviewState] = useState<PreviewLoadState>({
    sourcePostId,
    status: 'loading',
  });
  const [measurement, setMeasurement] = useState<PreviewMeasurement | null>(
    null,
  );
  const readySourceRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setPreviewState({ sourcePostId, status: 'loading' });
    setMeasurement(null);
    readySourceRef.current = null;

    sharedPostStoryPreviewLoader.load(sourcePostId).then(
      nextModel => {
        if (active) {
          setPreviewState({
            sourcePostId,
            status: 'loaded',
            model: nextModel,
          });
        }
      },
      () => {
        if (active) setPreviewState({ sourcePostId, status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [sourcePostId]);

  const model =
    previewState.sourcePostId === sourcePostId &&
    previewState.status === 'loaded'
      ? previewState.model
      : null;
  const error =
    previewState.sourcePostId === sourcePostId &&
    previewState.status === 'error';
  const contentHeight =
    measurement?.sourcePostId === sourcePostId ? measurement.height : 0;

  const scale = useMemo(
    () =>
      calculateSharedPostStoryScale({
        contentWidth: availableWidth,
        contentHeight,
        availableWidth,
        availableHeight,
      }),
    [availableHeight, availableWidth, contentHeight],
  );
  const scaledFrame = useMemo(
    () =>
      calculateSharedPostStoryScaledFrame({
        contentWidth: availableWidth,
        contentHeight,
        scale,
      }),
    [availableWidth, contentHeight, scale],
  );

  useEffect(() => {
    const isReady = error || (Boolean(model) && scale > 0);
    if (!isReady || readySourceRef.current === sourcePostId) return;
    readySourceRef.current = sourcePostId;
    onReady();
  }, [error, model, onReady, scale, sourcePostId]);

  const backgroundUrl = model
    ? getSharedPostPreviewPrimaryMediaUrl(model)
    : undefined;

  return (
    <View
      testID="shared-post-story-segment"
      pointerEvents="box-none"
      style={styles.container}
    >
      {backgroundUrl ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: backgroundUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            blurRadius={28}
          />
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.scrim} />

      <View
        pointerEvents="box-none"
        style={[styles.contentArea, { width: availableWidth, height: availableHeight }]}
      >
        {!model && !error ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.stateText}>Đang tải bài viết...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Bài viết không còn khả dụng</Text>
            <Text style={styles.stateText}>
              Nội dung có thể đã bị xóa hoặc thay đổi quyền riêng tư.
            </Text>
          </View>
        ) : null}

        {model && contentHeight === 0 ? (
          <View
            pointerEvents="none"
            onLayout={event =>
              setMeasurement({
                sourcePostId,
                height: event.nativeEvent.layout.height,
              })
            }
            style={[styles.previewMeasure, { width: availableWidth }]}
          >
            {note?.trim() ? <Text style={styles.note}>{note.trim()}</Text> : null}
            <SharedPostPreviewCard model={model} mode="story" />
          </View>
        ) : null}

        {model && scale > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem bài viết"
            onPress={() => onOpenPost(sourcePostId)}
            onLongPress={onLongPress}
            onPressOut={onPressOut}
            delayLongPress={250}
            style={[
              styles.previewHitArea,
              {
                width: scaledFrame.width,
                height: scaledFrame.height,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.previewCanvas,
                {
                  width: availableWidth,
                  height: contentHeight,
                  left: scaledFrame.canvasOffsetX,
                  top: scaledFrame.canvasOffsetY,
                  transform: [{ scale }],
                },
              ]}
            >
              {note?.trim() ? <Text style={styles.note}>{note.trim()}</Text> : null}
              <SharedPostPreviewCard model={model} mode="story" />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
    backgroundColor: '#10123D',
  },
  scrim: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(7,10,32,0.68)',
  },
  contentArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMeasure: {
    position: 'absolute',
    opacity: 0,
  },
  previewHitArea: {
    alignSelf: 'center',
  },
  previewCanvas: {
    position: 'absolute',
  },
  note: {
    marginBottom: 12,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateCard: {
    width: '86%',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.82)',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    marginTop: 8,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
