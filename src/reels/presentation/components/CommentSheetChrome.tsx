import React from 'react';
import { View, type ViewProps } from 'react-native';

export type CommentSheetChromeProps = ViewProps & {
  children?: React.ReactNode;
};

export function CommentSheetHeaderBadge({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}

export function CommentSheetControlSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}

export function CommentSheetReactionBadgeSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}

export function CommentSheetComposerDock({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}

export function CommentSheetComposerInputSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}

export function CommentSheetReactionPickerSurface({
  children,
  ...viewProps
}: CommentSheetChromeProps) {
  return <View {...viewProps}>{children}</View>;
}
