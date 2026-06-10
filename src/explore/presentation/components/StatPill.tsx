// Description: Compact stat card shown at the top of the Explore screen.
// Uses the brand-aligned translucent surface so it floats above the page
// background and reads as "primary metric".
import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export interface StatPillProps {
  Icon: LucideIcon;
  value: string;
  label: string;
  brandTint?: boolean;
  style?: ViewStyle;
}

const BRAND = '#0000ff';

function StatPill({ Icon, value, label, brandTint, style }: StatPillProps) {
  return (
    <View
      className="surface-glass-strong flex-1 p-4"
      style={style}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${value} ${label}`}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          brandTint ? 'bg-[#0000ff]/12' : 'bg-[#0000ff]/8'
        }`}
      >
        <Icon size={18} color={BRAND} strokeWidth={2.2} />
      </View>
      <Text className="mt-3 text-heading text-brand">{value}</Text>
      <Text className="mt-1 text-caption-secondary" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export default React.memo(StatPill);
