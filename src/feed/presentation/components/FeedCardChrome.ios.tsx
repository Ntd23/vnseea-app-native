import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type ViewProps,
} from 'react-native';
import AdaptiveGlassSurface from '../../../shared-kernel/presentation/components/AdaptiveGlassSurface';

export const FEED_CARD_CLASS = 'mb-2 border-y border-[#dddfe2] bg-white';
export const FEED_CARD_PADDING_CLASS = 'px-3 py-3';
export const FEED_MEDIA_CLASS = 'w-full bg-black';

type ClassNameProp = {
  className?: string;
};

type FeedCardSurfaceProps = ViewProps & ClassNameProp;
type FeedTouchableCardSurfaceProps = TouchableOpacityProps & ClassNameProp;
type FeedGlassActionButtonProps = TouchableOpacityProps & ClassNameProp;

function mergeClassName(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

function CardInner({ children }: { children?: React.ReactNode }) {
  return <View style={styles.cardInner}>{children}</View>;
}

export function FeedCardSurface({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View
      {...viewProps}
      className={className}
      style={[styles.cardOuter, style]}
    >
      <CardInner>{children}</CardInner>
    </View>
  );
}

export const FeedTouchableCardSurface = React.forwardRef<
  any,
  FeedTouchableCardSurfaceProps
>(function FeedTouchableCardSurface(
  { children, className, style, ...touchableProps },
  ref,
) {
  return (
    <TouchableOpacity
      {...touchableProps}
      ref={ref}
      className={className}
      style={[styles.cardOuter, style]}
    >
      <CardInner>{children}</CardInner>
    </TouchableOpacity>
  );
});

export function FeedCardContent({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View
      {...viewProps}
      className={className}
      style={[styles.cardContent, style]}
    >
      {children}
    </View>
  );
}

export function FeedMediaFrame({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View
      {...viewProps}
      className={className}
      style={[styles.mediaFrame, style]}
    >
      {children}
    </View>
  );
}

export function FeedGlassActionBar({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <AdaptiveGlassSurface
      {...viewProps}
      effect="regular"
      interactive={false}
      fallbackColor="rgba(255, 255, 255, 0.68)"
      blurAmount={24}
      blurType="light"
      style={[styles.actionBar, style]}
    >
      <View
        className={className}
        style={styles.actionBarContent}
      >
        {children}
      </View>
    </AdaptiveGlassSurface>
  );
}

export function FeedReactionPickerSurface({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <AdaptiveGlassSurface
      {...viewProps}
      className={className}
      effect="regular"
      interactive={false}
      fallbackColor="rgba(255, 255, 255, 0.72)"
      blurAmount={28}
      blurType="light"
      style={[styles.reactionPickerSurface, style]}
    >
      {children}
    </AdaptiveGlassSurface>
  );
}

export function FeedReactionPickerPointer({
  children,
  className,
  style,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <AdaptiveGlassSurface
      {...viewProps}
      effect="regular"
      interactive={false}
      fallbackColor="rgba(255, 255, 255, 0.72)"
      blurAmount={18}
      blurType="light"
      style={[styles.reactionPickerPointer, style]}
    >
      <View className={className}>{children}</View>
    </AdaptiveGlassSurface>
  );
}

export const FeedGlassActionButton = React.forwardRef<
  any,
  FeedGlassActionButtonProps
>(function FeedGlassActionButton(
  { children, className, style, ...touchableProps },
  ref,
) {
  return (
    <TouchableOpacity
      {...touchableProps}
      ref={ref}
      className={mergeClassName('flex-row items-center', className)}
      style={[styles.actionButton, style]}
    >
      {children}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardOuter: {
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  cardInner: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
  },
  cardContent: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  mediaFrame: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  actionBar: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
  actionBarContent: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 7,
  },
  actionButton: {
    minHeight: 36,
    flex: 1,
    justifyContent: 'center',
    borderRadius: 19,
  },
  reactionPickerSurface: {
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  reactionPickerPointer: {
    overflow: 'hidden',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    shadowColor: '#1f2a44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
});
