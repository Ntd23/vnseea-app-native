import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const DEFAULT_LEVELS = [
  0.34, 0.58, 0.82, 0.46, 0.68, 0.92, 0.54, 0.74, 0.42, 0.88, 0.62, 0.38,
  0.72, 1, 0.56, 0.84, 0.48, 0.66, 0.9, 0.52, 0.76, 0.4, 0.7, 0.94, 0.6,
  0.44, 0.8, 0.5, 0.86, 0.64, 0.36, 0.74,
];

type Props = {
  progress?: number;
  animated?: boolean;
  color?: string;
  inactiveColor?: string;
  height?: number;
  barCount?: number;
};

function AudioWaveformBase({
  progress = 0,
  animated = false,
  color = '#2563eb',
  inactiveColor = '#bfdbfe',
  height = 22,
  barCount = 28,
}: Props) {
  const levels = useMemo(
    () =>
      Array.from(
        { length: barCount },
        (_, index) => DEFAULT_LEVELS[index % DEFAULT_LEVELS.length],
      ),
    [barCount],
  );
  const scalesRef = useRef<Animated.Value[]>([]);

  if (scalesRef.current.length !== barCount) {
    scalesRef.current = Array.from(
      { length: barCount },
      () => new Animated.Value(1),
    );
  }

  useEffect(() => {
    if (!animated) {
      scalesRef.current.forEach(scale => scale.setValue(1));
      return;
    }

    const loops = scalesRef.current.map((scale, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((index % 7) * 45),
          Animated.timing(scale, {
            toValue: 0.48 + ((index * 3) % 5) * 0.12,
            duration: 210 + (index % 4) * 45,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.18,
            duration: 220 + (index % 3) * 55,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.76,
            duration: 180 + (index % 5) * 35,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());

    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [animated, barCount]);

  const normalizedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.container, { height }]}>
      {levels.map((level, index) => {
        const isActive = animated || index / barCount <= normalizedProgress;
        return (
          <Animated.View
            key={`${index}-${level}`}
            style={[
              styles.bar,
              {
                height: Math.max(4, height * level),
                backgroundColor: isActive ? color : inactiveColor,
                transform: [{ scaleY: scalesRef.current[index] }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export const AudioWaveform = memo(AudioWaveformBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    flex: 1,
    minWidth: 2,
    maxWidth: 4,
    marginHorizontal: 1,
    borderRadius: 999,
  },
});
