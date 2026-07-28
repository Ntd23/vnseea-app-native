// Description: Adds system top safe-area protection around FeedHeader for stack screens.
import React from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedHeader } from './FeedHeader';

type SafeAreaFeedHeaderProps = {
  safeAreaBackgroundColor?: ColorValue;
};

export function SafeAreaFeedHeader({
  safeAreaBackgroundColor = '#FFFFFF',
}: SafeAreaFeedHeaderProps = {}) {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: safeAreaBackgroundColor }]}
    >
      <FeedHeader />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
});

export default SafeAreaFeedHeader;
