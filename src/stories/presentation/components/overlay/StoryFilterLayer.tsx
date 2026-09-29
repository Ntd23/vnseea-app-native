// Description: Draws a story's colour-wash filter over its photo or video.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { StoryFilterId } from '../../../domain/types/stories.types';

type FilterSpec = {
  /** Flat wash over the whole frame. */
  tint?: string;
  /** Top-to-bottom gradient, as [top colour, bottom colour]. */
  gradient?: [string, string];
  /** Darkened edges. */
  vignette?: boolean;
  /** Swatch colour for the filter picker. */
  swatch: string;
};

export const STORY_FILTER_SPECS: Record<StoryFilterId, FilterSpec> = {
  none: { swatch: '#E2E8F0' },
  warm: { tint: 'rgba(255, 140, 0, 0.18)', swatch: '#FDBA74' },
  cool: { tint: 'rgba(0, 120, 255, 0.16)', swatch: '#93C5FD' },
  rose: { tint: 'rgba(255, 64, 129, 0.15)', swatch: '#F9A8D4' },
  vintage: {
    tint: 'rgba(120, 80, 20, 0.2)',
    vignette: true,
    swatch: '#D6B98C',
  },
  dusk: {
    gradient: ['rgba(88, 28, 135, 0.3)', 'rgba(249, 115, 22, 0.24)'],
    swatch: '#C084FC',
  },
};

export function StoryFilterLayer({
  filter,
  idSuffix,
}: {
  filter: StoryFilterId;
  /** Keeps SVG gradient ids unique when several stories are on screen. */
  idSuffix: string;
}) {
  const spec = STORY_FILTER_SPECS[filter];
  if (!spec || filter === 'none') return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {spec.tint ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: spec.tint }]} />
      ) : null}
      {spec.gradient || spec.vignette ? (
        <Svg width="100%" height="100%">
          <Defs>
            {spec.gradient ? (
              <LinearGradient id={`story-filter-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={spec.gradient[0]} />
                <Stop offset="1" stopColor={spec.gradient[1]} />
              </LinearGradient>
            ) : null}
            {spec.vignette ? (
              <RadialGradient id={`story-vignette-${idSuffix}`} cx="50%" cy="50%" r="75%">
                <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
              </RadialGradient>
            ) : null}
          </Defs>
          {spec.gradient ? (
            <Rect width="100%" height="100%" fill={`url(#story-filter-${idSuffix})`} />
          ) : null}
          {spec.vignette ? (
            <Rect width="100%" height="100%" fill={`url(#story-vignette-${idSuffix})`} />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
