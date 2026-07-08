// Description: Shared feed-style source filter bar used by feed and page detail screens.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

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
}

export function FeedSourceFilterBar<T extends string>({
  activeKey,
  items,
  onChange,
}: FeedSourceFilterBarProps<T>) {
  return (
    <View className="bg-white px-4 pb-2 pt-2">
      <View className="min-h-[50px] flex-row items-center justify-around rounded-[16px] border border-[#e3e8f2] bg-white px-4 shadow-sm">
        {items.map((item, index) => {
          const active = activeKey === item.key;

          return (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                accessibilityLabel={item.accessibilityLabel}
                activeOpacity={0.75}
                className="h-10 flex-1 items-center justify-center"
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
              {index < items.length - 1 ? <View className="h-7 w-px bg-[#dfe4ef]" /> : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

