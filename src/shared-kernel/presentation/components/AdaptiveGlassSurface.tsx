import React from 'react';
import { View, type ColorValue, type ViewProps } from 'react-native';

export type AdaptiveGlassEffect = 'clear' | 'regular' | 'none';
export type AdaptiveGlassColorScheme = 'light' | 'dark' | 'system';

export type AdaptiveGlassSurfaceProps = ViewProps & {
  children?: React.ReactNode;
  interactive?: boolean;
  effect?: AdaptiveGlassEffect;
  animated?: boolean;
  animationDuration?: number;
  tintColor?: ColorValue;
  colorScheme?: AdaptiveGlassColorScheme;
  fallbackColor?: string;
  blurAmount?: number;
  blurType?: string;
};

function AdaptiveGlassSurface({
  children,
  interactive: _interactive,
  effect: _effect,
  animated: _animated,
  animationDuration: _animationDuration,
  tintColor: _tintColor,
  colorScheme: _colorScheme,
  fallbackColor: _fallbackColor,
  blurAmount: _blurAmount,
  blurType: _blurType,
  ...viewProps
}: AdaptiveGlassSurfaceProps) {
  return <View {...viewProps}>{children}</View>;
}

export default AdaptiveGlassSurface;
