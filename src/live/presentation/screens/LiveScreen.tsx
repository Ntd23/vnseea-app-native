// Description: Live streams list screen - shows friends live and all live streams.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radio, Users, Video } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import { useLiveViewModel } from '../../application/view-models/useLiveViewModel';
import type { LiveStreamItem } from '../../domain/types/live.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type LiveNav = NativeStackNavigationProp<any>;

const horizontalListContentStyle = { paddingLeft: 10, paddingRight: 10 };
const liveListContentStyle = { paddingBottom: 100 };

function LiveStreamCard({
  item,
  onPress,
}: {
  item: LiveStreamItem;
  onPress: () => void;
}) {
  const isStale = item.state === 'stale';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="surface-card mx-4 mb-3 overflow-hidden"
    >
      <View className="relative h-48 bg-slate-900">
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-slate-900">
            <Radio size={42} color="#ffffff" />
            <Text className="mt-2 text-[13px] font-semibold text-white/80">
              Đang phát trực tiếp
            </Text>
          </View>
        )}

        <View
          className={`absolute right-3 top-3 flex-row items-center gap-1 rounded-full px-2 py-1 ${
            isStale ? 'bg-orange-500' : 'bg-red-500'
          }`}
        >
          <View className="h-2 w-2 rounded-full bg-white" />
          <Text className="text-[10px] font-semibold text-white">
            {isStale ? 'ĐANG CHỜ' : 'LIVE'}
          </Text>
        </View>

        <View className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1">
          <Users size={12} color="#ffffff" />
          <Text className="text-[10px] font-medium text-white">
            {item.viewerCount}
          </Text>
        </View>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-3">
          <Image
            source={{ uri: item.publisher.avatarUrl }}
            className="h-10 w-10 rounded-full bg-slate-100"
          />
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-[#1a1c1e]" numberOfLines={1}>
              {item.publisher.name}
            </Text>
            <Text className="text-[12px] text-[#64748b]" numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <View className="h-2 w-2 rounded-full bg-red-500" />
      <Text className="text-[14px] font-semibold text-[#1a1c1e]">{title}</Text>
      {count > 0 && (
        <View className="rounded-full bg-brand/10 px-2 py-0.5">
          <Text className="text-[10px] font-medium text-brand">{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function LiveScreen() {
  const navigation = useNavigation<LiveNav>();
  const {
    liveStreams,
    friendsLive,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useLiveViewModel();

  const handleStreamPress = useCallback(
    (postId: number) => {
      navigation.navigate(ROUTES.LIVE_ROOM, { postId });
    },
    [navigation],
  );

  const handleGoLive = useCallback(() => {
    navigation.navigate(ROUTES.GO_LIVE);
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center justify-between px-5 py-3">
        <View className="flex-row items-center gap-2">
          <Radio size={22} color={APP_BRAND_COLOR} />
          <Text className="text-[18px] font-semibold text-[#1a1c1e]">
            Trực tiếp
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleGoLive}
          className="btn-primary flex-row items-center gap-2 px-4 py-2"
        >
          <Video size={16} color="#ffffff" />
          <Text className="text-[12px] font-semibold text-white">Phát live</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={liveStreams}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <LiveStreamCard
            item={item}
            onPress={() => handleStreamPress(item.postId)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={APP_BRAND_COLOR}
          />
        }
        ListHeaderComponent={
          <>
            {error && (
              <View className="mx-4 mt-3 rounded-2xl bg-red-50 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">
                  {error}
                </Text>
              </View>
            )}

            {friendsLive.length > 0 && (
              <View className="mb-2">
                <SectionHeader title="Bạn bè đang live" count={friendsLive.length} />
                <FlatList
                  horizontal
                  data={friendsLive}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View className="w-56">
                      <LiveStreamCard
                        item={item}
                        onPress={() => handleStreamPress(item.postId)}
                      />
                    </View>
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={horizontalListContentStyle}
                />
              </View>
            )}

            <SectionHeader title="Tất cả live" count={liveStreams.length} />
          </>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
                <Text className="mt-3 text-[14px] text-[#64748b]">
                  Đang tải live...
                </Text>
              </>
            ) : (
              <>
                <View className="mb-4 rounded-full bg-gray-100 p-6">
                  <Radio size={48} color="#94a3b8" />
                </View>
                <Text className="text-[16px] font-semibold text-[#1a1c1e]">
                  Không có ai đang live
                </Text>
                <Text className="mt-1 text-[14px] text-[#64748b]">
                  Hãy là người đầu tiên!
                </Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={liveListContentStyle}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
