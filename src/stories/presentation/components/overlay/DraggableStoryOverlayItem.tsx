// Description: An editor overlay item that can be dragged, pinched, rotated, tapped to edit, or dropped on the trash.
import React, { useEffect } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  STORY_OVERLAY_MAX_SCALE,
  STORY_OVERLAY_MIN_SCALE,
} from '../../../application/overlay/storyOverlay';
import type { StoryOverlayItem } from '../../../domain/types/stories.types';
import { StoryOverlayItemView } from './StoryOverlayItemView';
import { storyFrameUnit, type StoryFrameRect } from './storyFrame';

const MAX_ITEM_WIDTH_RATIO = 0.86;
// The trash target sits at the bottom centre of the frame (see StoryEditor).
export const STORY_TRASH_CENTER_Y_RATIO = 0.9;
const TRASH_HIT_Y_RATIO = 0.82;
const TRASH_HIT_HALF_WIDTH_RATIO = 0.18;

export type StoryOverlayPlacementChange = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export function DraggableStoryOverlayItem({
  item,
  frame,
  onChange,
  onDelete,
  onEdit,
  onDragChange,
  onTrashHoverChange,
}: {
  item: StoryOverlayItem;
  frame: StoryFrameRect;
  onChange: (id: string, placement: StoryOverlayPlacementChange) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onDragChange: (isDragging: boolean) => void;
  onTrashHoverChange: (isOverTrash: boolean) => void;
}) {
  const centerX = useSharedValue(item.x * frame.width);
  const centerY = useSharedValue(item.y * frame.height);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);
  const isOverTrash = useSharedValue(false);
  // Shrinks the item while it hovers the trash, animated only on change so
  // pinch scaling itself stays immediate.
  const trashScale = useSharedValue(1);
  const frameWidth = useSharedValue(frame.width);
  const frameHeight = useSharedValue(frame.height);

  // Re-seed from props after a commit, an edit or a frame resize.
  useEffect(() => {
    centerX.value = item.x * frame.width;
    centerY.value = item.y * frame.height;
    scale.value = item.scale;
    rotation.value = item.rotation;
    frameWidth.value = frame.width;
    frameHeight.value = frame.height;
  }, [
    centerX,
    centerY,
    frame.height,
    frame.width,
    frameHeight,
    frameWidth,
    item.rotation,
    item.scale,
    item.x,
    item.y,
    rotation,
    scale,
  ]);

  const commit = () => {
    'worklet';
    runOnJS(onChange)(item.id, {
      x: centerX.value / frameWidth.value,
      y: centerY.value / frameHeight.value,
      scale: scale.value,
      rotation: rotation.value,
    });
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.value = centerX.value;
      startY.value = centerY.value;
      runOnJS(onDragChange)(true);
    })
    .onUpdate(event => {
      centerX.value = startX.value + event.translationX;
      centerY.value = startY.value + event.translationY;
      const overTrash =
        centerY.value > frameHeight.value * TRASH_HIT_Y_RATIO &&
        Math.abs(centerX.value - frameWidth.value / 2) <
          frameWidth.value * TRASH_HIT_HALF_WIDTH_RATIO;
      if (overTrash !== isOverTrash.value) {
        isOverTrash.value = overTrash;
        trashScale.value = withTiming(overTrash ? 0.45 : 1, { duration: 120 });
        runOnJS(onTrashHoverChange)(overTrash);
      }
    })
    .onEnd(() => {
      if (isOverTrash.value) {
        runOnJS(onDelete)(item.id);
      } else {
        commit();
      }
    })
    .onFinalize(() => {
      if (isOverTrash.value) {
        isOverTrash.value = false;
        trashScale.value = 1;
        runOnJS(onTrashHoverChange)(false);
      }
      runOnJS(onDragChange)(false);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate(event => {
      scale.value = Math.min(
        STORY_OVERLAY_MAX_SCALE,
        Math.max(STORY_OVERLAY_MIN_SCALE, startScale.value * event.scale),
      );
    })
    .onEnd(commit);

  const rotate = Gesture.Rotation()
    .onStart(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate(event => {
      rotation.value = startRotation.value + event.rotation;
    })
    .onEnd(commit);

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_event, success) => {
      if (success) runOnJS(onEdit)(item.id);
    });

  const gesture = Gesture.Race(Gesture.Simultaneous(pan, pinch, rotate), tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: centerX.value - width.value / 2 },
      { translateY: centerY.value - height.value / 2 },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value * trashScale.value },
    ],
    opacity: width.value > 0 ? (isOverTrash.value ? 0.7 : 1) : 0,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
    height.value = event.nativeEvent.layout.height;
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={handleLayout}
        style={[styles.item, animatedStyle]}
      >
        <StoryOverlayItemView
          item={item}
          unit={storyFrameUnit(frame)}
          maxWidth={frame.width * MAX_ITEM_WIDTH_RATIO}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
