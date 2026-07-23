// Description: Filter tabs bar for the Reels screen, mirrored from the
// FeedScreen's FilterTabs but rendered on a dark background to match the
// reels' immersive video surface.
//
// Why a separate component (vs importing from FeedScreen)?
// • FeedScreen uses Tailwind/NativeWind classes — ReelsScreen uses
// StyleSheet. Re-using the source component would either require
// refactoring FeedScreen to share styles (out of scope here) or
// pulling NativeWind into ReelsScreen just for one bar.
// • The reels variant has a dark surface (#000) and a translucent
// capsule backdrop, which differs from the white card in Feed.
// • The "active" tab is hardcoded to 'videos' on Reels (since Reels IS
// the videos destination), so the prop surface is slightly different.
//
// Tab semantics on Reels:
// • 'all' — filter reels by "tất cả" (default, also the active one)
// • 'locations' — navigates to NEARBY_USERS screen
// • 'photos'  — reserved for future client-side filter (no-op for now)
// • 'videos' — current screen; renders as active, no navigation
// • 'market' — navigates to MARKETPLACE screen
//
// The active tab is decided by `activeSource` and rendered in the brand
// brand red (the same color we use for the Auto-On button on this
// screen). Inactive icons use a muted white (rgba 0.6) so the bar still
// reads on the dark video background.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { memo, useCallback } from 'react';
import {
 StyleSheet,
 Text,
 TouchableOpacity,
 View,
 type StyleProp,
 type ViewStyle,
} from 'react-native';
import { Compass, MapPin, Image as ImageIcon, Video, ShoppingBag } from 'lucide-react-native';
import type { ReelsCopy } from '../../application/i18n/reelsCopy';

export type ReelsFilterSource = 'all' | 'locations' | 'photos' | 'videos' | 'market';

export interface ReelsFilterTabsProps {
 copy: ReelsCopy;
 /** Currently active filter. On Reels, the parent typically passes 'all'. */
 activeSource: ReelsFilterSource;
 /**
 * Invoked when the user taps a tab. The parent decides whether to filter
 * the current list, navigate to another screen, or no-op. This component
 * does NOT do navigation itself — it stays presentational.
 */
 onChangeSource: (source: ReelsFilterSource) => void;
 /** Optional extra padding-top so the bar can clear the safe-area inset. */
 topInset?: number;
 style?: StyleProp<ViewStyle>;
}

interface TabSpec {
 key: ReelsFilterSource;
 Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
 labelKey: keyof ReelsCopy;
}

const TABS: TabSpec[] = [
 { key: 'all', Icon: Compass, labelKey: 'filterAll' },
 { key: 'locations', Icon: MapPin, labelKey: 'filterLocations' },
 { key: 'photos', Icon: ImageIcon, labelKey: 'filterPhotos' },
 { key: 'videos', Icon: Video, labelKey: 'filterVideos' },
 { key: 'market', Icon: ShoppingBag, labelKey: 'filterMarket' },
];

const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.55)';
const ACTIVE_COLOR = APP_BRAND_COLOR;

function ReelsFilterTabsBase({
 copy,
 activeSource,
 onChangeSource,
 topInset = 0,
 style,
}: ReelsFilterTabsProps) {
 const handlePress = useCallback(
 (key: ReelsFilterSource) => () => onChangeSource(key),
 [onChangeSource],
 );

 return (
 <View
 style={[styles.container, { paddingTop: topInset + 4 }, style]}
 pointerEvents="box-none"
 >
 <View style={styles.capsule}>
 {TABS.map((tab, index) => {
 const isActive = tab.key === activeSource;
 const Icon = tab.Icon;
 return (
 <React.Fragment key={tab.key}>
 <TouchableOpacity
 onPress={handlePress(tab.key)}
 activeOpacity={0.7}
 style={styles.tab}
 hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
 accessibilityRole="button"
 accessibilityState={{ selected: isActive }}
 accessibilityLabel={copy[tab.labelKey]}
 >
 <Icon
 size={22}
 color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
 strokeWidth={isActive ? 2.5 : 2.0}
 />
 <Text
 style={[
 styles.label,
 isActive ? styles.labelActive : styles.labelInactive,
 ]}
 numberOfLines={1}
 >
 {copy[tab.labelKey]}
 </Text>
 </TouchableOpacity>
 {/* Vertical divider between tabs — skip after the last one. */}
 {index < TABS.length - 1 ? <View style={styles.divider} /> : null}
 </React.Fragment>
 );
 })}
 </View>
 </View>
 );
}

export const ReelsFilterTabs = memo(ReelsFilterTabsBase);

const styles = StyleSheet.create({
 container: {
 paddingHorizontal: 12,
 paddingBottom: 8,
 backgroundColor: 'transparent',
 },
 capsule: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 height: 52,
 borderRadius: 18,
 // Translucent dark surface — sits on top of the video without
 // blocking it visually. The border is the same blue tint as the
 // design system's translucent brand-border rule.
 backgroundColor: 'rgba(20, 20, 28, 0.55)',
 borderWidth: 1,
 borderColor: 'rgba(255, 255, 255, 0.10)',
 paddingHorizontal: 6,
 // Soft shadow to lift the bar off the video.
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 4 },
 shadowOpacity: 0.3,
 shadowRadius: 8,
 elevation: 6,
 },
 tab: {
 flex: 1,
 height: 44,
 alignItems: 'center',
 justifyContent: 'center',
 paddingHorizontal: 4,
 },
 label: {
 marginTop: 2,
 fontSize: 10,
 fontWeight: '600',
 textAlign: 'center',
 },
 labelActive: {
 color: ACTIVE_COLOR,
 },
 labelInactive: {
 color: INACTIVE_COLOR,
 },
 divider: {
 width: 1,
 height: 22,
 backgroundColor: 'rgba(255, 255, 255, 0.12)',
 marginHorizontal: 2,
 },
});
