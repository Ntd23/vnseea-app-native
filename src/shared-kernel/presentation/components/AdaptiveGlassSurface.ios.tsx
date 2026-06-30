import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import type { AdaptiveGlassSurfaceProps } from './AdaptiveGlassSurface';

function AdaptiveGlassSurface({
  children,
  interactive = false,
  effect = 'regular',
  animated,
  animationDuration,
  tintColor,
  colorScheme = 'system',
  fallbackColor = 'rgba(255, 255, 255, 0.58)',
  blurAmount = 22,
  blurType = 'light',
  style,
  testID,
  ...viewProps
}: AdaptiveGlassSurfaceProps) {
  if (isLiquidGlassSupported()) {
    return (
      <LiquidGlassView
        {...viewProps}
        testID={testID}
        style={style}
        interactive={interactive}
        effect={effect}
        animated={animated}
        animationDuration={animationDuration}
        tintColor={tintColor}
        colorScheme={colorScheme}
      >
        {children}
      </LiquidGlassView>
    );
  }

  return (
    <View
      {...viewProps}
      testID={testID ?? 'adaptive-glass-fallback'}
      style={[styles.fallbackShell, style, { backgroundColor: fallbackColor }]}
    >
      <BlurView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        blurType={blurType as 'light'}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={fallbackColor}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackShell: {
    overflow: 'hidden',
  },
});

export default AdaptiveGlassSurface;
