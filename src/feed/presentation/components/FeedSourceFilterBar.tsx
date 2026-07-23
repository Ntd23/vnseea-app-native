// Description: Shared feed-style source filter bar used by feed and page detail screens.
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export interface FeedSourceFilterBarItem<T extends string> {
  key: T;
  accessibilityLabel?: string;
  icon: (active: boolean) => React.ReactNode;
  onPress?: () => void;
}

interface FeedSourceFilterBarProps<T extends string> {
  activeKey: T;
  items: Array<FeedSourceFilterBarItem<T>>;
  onChange: (key: T) => void;
  variant?: 'default' | 'header';
}

export function FeedSourceFilterBar<T extends string>({
  activeKey,
  items,
  onChange,
  variant = 'default',
}: FeedSourceFilterBarProps<T>) {
  const isHeader = variant === 'header';

  return (
    <View
      className={isHeader ? undefined : 'bg-white px-4 pb-2 pt-2'}
      style={isHeader ? styles.headerOuter : undefined}
    >
      <View
        className={
          isHeader
            ? 'min-h-[66px] flex-row items-center justify-around bg-white px-0'
            : 'min-h-[50px] flex-row items-center justify-around rounded-[16px] border border-[#e3e8f2] bg-white px-4 shadow-sm'
        }
      >
        {items.map((item, index) => {
          const active = activeKey === item.key;

          return (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                accessibilityLabel={item.accessibilityLabel}
                activeOpacity={0.75}
                className={
                  isHeader
                    ? 'h-full flex-1 items-center justify-center'
                    : 'h-10 flex-1 items-center justify-center'
                }
                onPress={() => {
                  if (item.onPress) {
                    item.onPress();
                    return;
                  }
                  onChange(item.key);
                }}
              >
                {item.icon(active)}
              </TouchableOpacity>
              {!isHeader && index < items.length - 1 ? (
                <View className="h-7 w-px bg-[#dfe4ef]" />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerOuter: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#d20f18',
    borderBottomWidth: 2,
    width: '100%',
  },
});
