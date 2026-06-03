// Description: Live streams list screen - shows friends live and all live streams.
import React, { useCallback } from 'react';
import {
  FlatList,
  Image,
  StatusBar,
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

type LiveNav = NativeStackNavigationProp<any>;

function LiveStreamCard({
  item,
  onPress,
}: {
  item: LiveStreamItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="surface-card mx-2 mb-3 overflow-hidden"
    >
      {/* Thumbnail / Preview */}
      <View className="relative h-48 bg-gray-300">
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-gradient-to-b from-gray-600 to-gray-900">
            <View className="absolute top-3 right-3 flex-row items-center gap-1 rounded-full bg-red-500 px-2 py-1">
              <View className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <Text className="text-[10px] font-semibold text-white">LIVE</Text>
            </View>
          </View>
        )}

        {/* Viewer count */}
        <View className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full bg-black/60 px-2 py-1">
          <Users size={12} color="#ffffff" />
          <Text className="text-[10px] font-medium text-white">
            {item.viewerCount}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View className="p-3">
        <View className="flex-row items-center gap-3">
          <Image
            source={{ uri: item.publisher.avatarUrl }}
            className="h-10 w-10 rounded-full"
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
        <View className="rounded-full bg-[#0000ff]/10 px-2 py-0.5">
          <Text className="text-[10px] font-medium text-[#0000ff]">{count}</Text>
        </View>
      )}
    </View>
  );
}

export default function LiveScreen() {
  const navigation = useNavigation<LiveNav>();
  const { liveStreams, friendsLive, isLoading } = useLiveViewModel();

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
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="surface-topbar flex-row items-center justify-between px-5 py-3">
        <View className="flex-row items-center gap-2">
          <Radio size={22} color="#0000ff" />
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
          <Text className="text-[12px] font-semibold text-white">Go Live</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Friends Live Section */}
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
                  contentContainerStyle={{ paddingLeft: 10 }}
                />
              </View>
            )}

            {/* All Live Streams */}
            <SectionHeader title="Tất cả live" count={liveStreams.length} />
          </>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View className="mb-4 rounded-full bg-gray-100 p-6">
              <Radio size={48} color="#94a3b8" />
            </View>
            <Text className="text-[16px] font-semibold text-[#1a1c1e]">
              Không có ai đang live
            </Text>
            <Text className="mt-1 text-[14px] text-[#64748b]">
              Hãy là người đầu tiên!
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}