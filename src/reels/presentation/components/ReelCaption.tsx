import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TextProps,
} from 'react-native';

const COLLAPSED_CAPTION_LINES = 3;

type Props = {
  reelId: string;
  text: string;
  showMoreLabel: string;
  showLessLabel: string;
};

export const ReelCaption = memo(function ReelCaption({
  reelId,
  text,
  showMoreLabel,
  showLessLabel,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
    setCanExpand(false);
    setHasMeasured(false);
  }, [reelId, text]);

  const handleMeasureLayout = useCallback<
    NonNullable<TextProps['onTextLayout']>
  >(event => {
    setCanExpand(event.nativeEvent.lines.length > COLLAPSED_CAPTION_LINES);
    setHasMeasured(true);
  }, []);

  return (
    <View style={styles.container}>
      <Text
        testID="reel-caption-text"
        style={styles.caption}
        numberOfLines={isExpanded ? undefined : COLLAPSED_CAPTION_LINES}
        ellipsizeMode="tail"
      >
        {text}
      </Text>

      {!hasMeasured ? (
        <Text
          testID="reel-caption-measure"
          style={[styles.caption, styles.measurementText]}
          onTextLayout={handleMeasureLayout}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {text}
        </Text>
      ) : null}

      {canExpand ? (
        <TouchableOpacity
          testID="reel-caption-toggle"
          activeOpacity={0.75}
          onPress={() => setIsExpanded(current => !current)}
          style={styles.toggle}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? showLessLabel : showMoreLabel}
          accessibilityState={{ expanded: isExpanded }}
        >
          <Text style={styles.toggleText}>
            {isExpanded ? showLessLabel : showMoreLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  measurementText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  toggle: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  toggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
