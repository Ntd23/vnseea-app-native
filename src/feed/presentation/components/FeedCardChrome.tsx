import React from 'react';
import {
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type ViewProps,
} from 'react-native';

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

export function FeedCardSurface({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View {...viewProps} className={mergeClassName(FEED_CARD_CLASS, className)}>
      {children}
    </View>
  );
}

export const FeedTouchableCardSurface = React.forwardRef<
  any,
  FeedTouchableCardSurfaceProps
>(function FeedTouchableCardSurface(
  { children, className, ...touchableProps },
  ref,
) {
  return (
    <TouchableOpacity
      {...touchableProps}
      ref={ref}
      className={mergeClassName(FEED_CARD_CLASS, className)}
    >
      {children}
    </TouchableOpacity>
  );
});

export function FeedCardContent({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View
      {...viewProps}
      className={mergeClassName(FEED_CARD_PADDING_CLASS, className)}
    >
      {children}
    </View>
  );
}

export function FeedMediaFrame({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View {...viewProps} className={mergeClassName(FEED_MEDIA_CLASS, className)}>
      {children}
    </View>
  );
}

export function FeedGlassActionBar({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View
      {...viewProps}
      className={mergeClassName(
        'flex-row items-center justify-between border-t border-slate-200 pt-4',
        className,
      )}
    >
      {children}
    </View>
  );
}

export function FeedReactionPickerSurface({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View {...viewProps} className={className}>
      {children}
    </View>
  );
}

export function FeedReactionPickerPointer({
  children,
  className,
  ...viewProps
}: FeedCardSurfaceProps) {
  return (
    <View {...viewProps} className={className}>
      {children}
    </View>
  );
}

export const FeedGlassActionButton = React.forwardRef<
  any,
  FeedGlassActionButtonProps
>(function FeedGlassActionButton(
  { children, className, ...touchableProps },
  ref,
) {
  return (
    <TouchableOpacity
      {...touchableProps}
      ref={ref}
      className={mergeClassName('flex-row items-center', className)}
    >
      {children}
    </TouchableOpacity>
  );
});
