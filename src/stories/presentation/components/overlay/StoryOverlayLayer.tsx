// Description: Redraws a story's filter and overlay items in the viewer; mentions and links are tappable.
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type {
  StoryOverlay,
  StoryOverlayItem,
} from '../../../domain/types/stories.types';
import { StoryFilterLayer } from './StoryFilterLayer';
import { StoryOverlayItemView } from './StoryOverlayItemView';
import {
  fitStoryFrame,
  storyFrameUnit,
  type StoryFrameRect,
} from './storyFrame';

const MAX_ITEM_WIDTH_RATIO = 0.86;

function PositionedOverlayItem({
  item,
  frame,
  onPress,
}: {
  item: StoryOverlayItem;
  frame: StoryFrameRect;
  onPress?: () => void;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current =>
      current && current.width === width && current.height === height
        ? current
        : { width, height },
    );
  };
  const content = (
    <StoryOverlayItemView
      item={item}
      unit={storyFrameUnit(frame)}
      maxWidth={frame.width * MAX_ITEM_WIDTH_RATIO}
    />
  );

  return (
    <View
      onLayout={handleLayout}
      pointerEvents={onPress ? 'box-none' : 'none'}
      style={[
        styles.item,
        {
          // Laid out at the frame origin (so text wraps the same wherever the
          // item sits, exactly as in the editor) and moved by transform to
          // centre it on its stored point. Hidden until its size is known.
          opacity: size ? 1 : 0,
          transform: [
            { translateX: item.x * frame.width - (size?.width ?? 0) / 2 },
            { translateY: item.y * frame.height - (size?.height ?? 0) / 2 },
            { rotate: `${item.rotation}rad` },
            { scale: item.scale },
          ],
        },
      ]}
    >
      {onPress ? (
        <Pressable onPress={onPress} hitSlop={8}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

export function StoryOverlayLayer({
  overlay,
  idSuffix,
  onPressMention,
  onPressLink,
}: {
  overlay?: StoryOverlay;
  idSuffix: string;
  onPressMention?: (userId: string) => void;
  onPressLink?: (url: string) => void;
}) {
  const [container, setContainer] = useState({ width: 0, height: 0 });
  if (!overlay) return null;
  const frame = fitStoryFrame(container.width, container.height);

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setContainer({ width, height });
      }}
    >
      {frame.width > 0 ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.frame,
            {
              left: frame.left,
              top: frame.top,
              width: frame.width,
              height: frame.height,
            },
          ]}
        >
          <StoryFilterLayer filter={overlay.filter} idSuffix={idSuffix} />
          {overlay.items.map(item => (
            <PositionedOverlayItem
              key={item.id}
              item={item}
              frame={frame}
              onPress={
                item.kind === 'mention' && onPressMention
                  ? () => onPressMention(item.userId)
                  : item.kind === 'link' && onPressLink
                  ? () => onPressLink(item.url)
                  : undefined
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
  },
  item: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
