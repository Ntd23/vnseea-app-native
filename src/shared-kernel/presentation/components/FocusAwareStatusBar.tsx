import React, { useContext } from 'react';
import { StatusBar, type StatusBarProps } from 'react-native';
import { NavigationContext, useIsFocused } from '@react-navigation/native';

function FocusedStatusBar(props: StatusBarProps) {
  const isFocused = useIsFocused();

  if (!isFocused) {
    return null;
  }

  return <StatusBar {...props} />;
}

function FocusAwareStatusBar(props: StatusBarProps) {
  const navigation = useContext(NavigationContext);

  if (!navigation) {
    return <StatusBar {...props} />;
  }

  return <FocusedStatusBar {...props} />;
}

export default FocusAwareStatusBar;
