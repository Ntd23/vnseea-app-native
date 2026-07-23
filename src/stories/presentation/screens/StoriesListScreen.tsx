// Description: Full-page grid view of every active story.
//
// Layout:
//
//   ┌─────────────────────────────────────────────────┐
//   │  ←  Tất cả tin                       (counter)  │  ← top app bar (surface-topbar)
//   ├─────────────────────────────────────────────────┤
//   │  ┌────────┐  ┌────────┐                          │
//   │  │ avatar │  │ avatar │                          │  ← 2-column FlatList grid
//   │  │ +name  │  │ +name  │                          │
//   │  │ +time  │  │ +time  │                          │
//   │  └────────┘  └────────┘                          │
//   │  ┌────────┐  ┌────────┐                          │
//   │  │  ...   │  │  ...   │                          │
//   │  └────────┘  └────────┘                          │
//   └─────────────────────────────────────────────────┘
//
// Animations:
//   • Header slides down (translateY -40 -> 0) + fades in, 240ms ease-out.
//   • Grid cells fade + scale in (opacity 0 -> 1, scale 0.96 -> 1), 280ms
//     ease-out, staggered 40ms per cell (max 8 cells animate).
//
// Empty state:
//   Friendly Vietnamese / English message + retry CTA. Rendered via the
//   shared surface-panel.
//
// Pull-to-refresh:
//   RefreshControl calls ViewModel.reload(); the spinner is bound to
//   `isRefreshing` so it only appears for that one action.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getStoriesCopy } from '../../application/i18n/storiesCopy';
import {
  useStoriesListViewModel,
  type StoriesListRow,
} from '../../application/view-models/useStoriesListViewModel';
import StoryGridCell from '../components/StoryGridCell';

const HEADER_ANIMATION_MS = 240;
const CELL_FADE_STAGGER_MS = 40;
const ANIMATED_CELL_COUNT = 8;

export default function StoriesListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, typeof ROUTES.STORIES_LIST>>();
  const language = useAppLanguage();
  const copy = getStoriesCopy(language);
  const initialStories = route.params?.stories;
  const title = route.params?.title ?? copy.headerTitle;
  const { rows, pagedStories, isLoading, isRefreshing, reload, hasMore } =
    useStoriesListViewModel({ initialStories });

  const headerTranslateY = useSharedValue(-40);
  const headerOpacity = useSharedValue(0);

  // Slide the top app bar in on mount. We don't tie this to data because
  // the header is part of the screen chrome — it should always animate.
  useEffect(() => {
    headerTranslateY.value = withTiming(0, {
      duration: HEADER_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    headerOpacity.value = withTiming(1, {
      duration: HEADER_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [headerOpacity, headerTranslateY]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: headerOpacity.value,
  }));

  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate(ROUTES.FEED);
    }
  }, [navigation]);

  const handleCellPress = useCallback(
    (row: StoriesListRow) => {
      navigation.navigate(ROUTES.STORY_VIEWER, {
        stories: pagedStories,
        initialUserIndex: row.index,
      });
    },
    [navigation, pagedStories],
  );

  const renderCell = useCallback(
    ({ item, index }: { item: StoriesListRow; index: number }) => {
      // Animate only the first ANIMATED_CELL_COUNT cells to keep the
      // entrance snappy on long lists. Cells beyond that just pop in.
      if (index < ANIMATED_CELL_COUNT) {
        return (
          <Animated.View
            entering={FadeIn.duration(280)
              .delay(index * CELL_FADE_STAGGER_MS)
              .easing(Easing.out(Easing.cubic))}
            className="flex-1"
          >
            <StoryGridCell row={item} copy={copy} onPress={handleCellPress} />
          </Animated.View>
        );
      }
      return (
        <View className="flex-1">
          <StoryGridCell row={item} copy={copy} onPress={handleCellPress} />
        </View>
      );
    },
    [copy, handleCellPress],
  );

  const keyExtractor = useCallback((item: StoriesListRow) => item.key, []);

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center px-6 pt-24">
          <ActivityIndicator color={APP_BRAND_COLOR} />
          <Text className="mt-3 text-[14px] font-semibold text-slate-500">
            {copy.loading}
          </Text>
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center px-6 pt-20">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
          <Sparkles size={36} color={APP_BRAND_COLOR} />
        </View>
        <Text className="mt-4 text-center text-[17px] font-extrabold text-slate-900">
          {copy.emptyTitle}
        </Text>
        <Text className="mt-1.5 text-center text-[13px] font-semibold leading-5 text-slate-500">
          {copy.emptyDescription}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={reload}
          className="mt-5 min-h-[44px] items-center justify-center rounded-full bg-brand px-6"
        >
          <Text className="text-[14px] font-extrabold text-white">
            {copy.retry}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [copy, isLoading, reload]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top', 'left', 'right']}>
      {/* Top app bar — slides down + fades in on mount. */}
      <Animated.View
        style={headerStyle}
        className="surface-topbar flex-row items-center px-4 min-h-[56px] border-b border-slate-100"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={title}
          accessibilityRole="button"
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text
            className="text-[17px] font-extrabold text-slate-900"
            numberOfLines={1}
          >
            {title}
          </Text>
          {rows.length > 0 ? (
            <Text className="mt-0.5 text-[11px] font-semibold text-slate-500">
              {rows.length}
            </Text>
          ) : null}
        </View>
        {/* Spacer to balance the back button so the title stays centered. */}
        <View className="h-10 w-10" />
      </Animated.View>

      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderCell}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
          gap: 12,
        }}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={reload}
            tintColor={APP_BRAND_COLOR}
            colors={[APP_BRAND_COLOR]}
            progressBackgroundColor="#ffffff"
          />
        }
        // The grid is short enough that lazy-loading hooks aren't worth the
        // overhead. If we ever paginate, `onEndReached` can drive `loadMore`
        // (currently a no-op) when `hasMore` becomes true.
        initialNumToRender={10}
        windowSize={5}
        removeClippedSubviews
      />

      {hasMore ? null : null}
    </SafeAreaView>
  );
}
