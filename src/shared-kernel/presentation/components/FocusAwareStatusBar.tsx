import React from 'react';
import { StatusBar, type StatusBarProps } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

function FocusAwareStatusBar(props: StatusBarProps) {
  const isFocused = useIsFocused();

  if (!isFocused) {
    return null;
  }

  return <StatusBar {...props} />;
}

export default FocusAwareStatusBar;
