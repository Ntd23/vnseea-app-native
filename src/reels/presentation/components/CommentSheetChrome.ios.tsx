import React from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';

export type CommentSheetChromeProps = ViewProps & {
  children?: React.ReactNode;
};

type GlassSurfaceProps = CommentSheetChromeProps & {
  fallbackColor?: string;
  blurAmount?: number;
};

function GlassSurface({
  children,
  style,
  fallbackColor = 'rgba(255, 255, 255, 0.72)',
  blurAmount = 24,
  ...viewProps
}: GlassSurfaceProps) {
  return (
    <AdaptiveGlassSurface
      {...viewProps}
      effect="regular"
      interactive={false}
      fallbackColor={fallbackColor}
      blurAmount={blurAmount}
      blurType="light"
      style={[styles.glassSurface, style]}
    >
      {children}
    </AdaptiveGlassSurface>
  );
}

export function CommentSheetHeaderBadge({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.82)"
      blurAmount={18}
    >
      {children}
    </GlassSurface>
  );
}

export function CommentSheetControlSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.76)"
      blurAmount={18}
    >
      {children}
    </GlassSurface>
  );
}

export function CommentSheetReactionBadgeSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.82)"
      blurAmount={18}
    >
      {children}
    </GlassSurface>
  );
}

export function CommentSheetComposerDock({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.68)"
      blurAmount={24}
    >
      {children}
    </GlassSurface>
  );
}

export function CommentSheetComposerInputSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.58)"
      blurAmount={18}
    >
      {children}
    </GlassSurface>
  );
}

export function CommentSheetReactionPickerSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return (
    <GlassSurface
      {...viewProps}
      fallbackColor="rgba(255, 255, 255, 0.78)"
      blurAmount={28}
    >
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  glassSurface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
});
