// Description: Adds system top safe-area protection around FeedHeader for stack screens.
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedHeader } from './FeedHeader';

export function SafeAreaFeedHeader() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
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
