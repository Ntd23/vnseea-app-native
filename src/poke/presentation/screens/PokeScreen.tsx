// Description: Renders poke list with poke back and remove functionality.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Hand, RotateCw, Trash2, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePokeViewModel } from '../../application/view-models/usePokeViewModel';
import type { PokeItem } from '../../domain/types/poke.types';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getPokeCopy, getPokeCopyAsString } from '../../application/i18n/pokeCopy';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';

const BRAND = '#0000FF';

function PokeSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="surface-card overflow-hidden p-4">
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-full bg-slate-200" />
            <View className="ml-4 flex-1">
              <View className="h-4 w-32 rounded-full bg-slate-200" />
              <View className="mt-2 h-3 w-24 rounded-full bg-slate-100" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
  copy,
}: {
  error: string | null;
  onRetry: () => void;
  copy: Record<string, string>;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={38} color={BRAND} />
        ) : (
          <Hand size={38} color={BRAND} />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? copy.error : copy.noPokes}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ?? copy.noPokesDesc}
      </Text>
      {error && (
        <TouchableOpacity
          className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
          activeOpacity={0.85}
          onPress={onRetry}
        >
          <RotateCw size={18} color="#FFFFFF" />
          <Text className="text-title-primary text-inverse">Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PokeCard({
  poke,
  onPokeBack,
  onRemove,
  copy,
}: {
  poke: PokeItem;
  onPokeBack: () => void;
  onRemove: () => void;
  copy: Record<string, string>;
}) {
  const userData = poke.user_data;
  const displayName = userData.name || userData.username || 'Người dùng';
  const avatarUrl = userData.avatar;

  return (
    <View className="surface-card mb-4 overflow-hidden p-4">
      <View className="flex-row items-center">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-12 w-12 rounded-full bg-slate-200"
            resizeMode="cover"
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <User size={24} color={BRAND} />
          </View>
        )}

        <View className="ml-4 flex-1">
          <Text className="text-heading" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="mt-1 text-caption-secondary">
            {poke.time || copy.timeAgo}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-blue-50"
            activeOpacity={0.8}
            onPress={onPokeBack}
          >
            <Hand size={18} color={BRAND} />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
            activeOpacity={0.8}
            onPress={onRemove}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PokeScreen() {
  const vm = usePokeViewModel();
  const navigation = useNavigation();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getPokeCopyAsString(language);

  useFocusEffect(
    useCallback(() => {
      void vm.loadPokes();
    }, []),
  );

  const handlePokeBack = useCallback(
    async (poke: PokeItem) => {
      try {
        await vm.createPoke(poke.send_user_id);
        showToast({ message: copy.pokeSuccess, type: 'success' });
        // Refresh the list after poking back to remove the old entry
        await vm.loadPokes();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : copy.pokeError;
        showToast({ message: errorMessage, type: 'warning' });
      }
    },
    [vm, copy],
  );

  const handleRemove = useCallback(
    (poke: PokeItem) => {
      Alert.alert(
        'Xác nhận',
        copy.removeConfirm,
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                await vm.removePoke(poke.id);
                showToast({ message: copy.removeSuccess, type: 'success' });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : copy.error;
                showToast({ message: errorMessage, type: 'warning' });
              }
            },
          },
        ],
      );
    },
    [vm, copy],
  );

  const renderPoke = useCallback(
    ({ item }: ListRenderItemInfo<PokeItem>) => (
      <PokeCard
        poke={item}
        onPokeBack={() => handlePokeBack(item)}
        onRemove={() => handleRemove(item)}
        copy={copy}
      />
    ),
    [handlePokeBack, handleRemove, copy],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="surface-topbar px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              onPress={() => {
                navigation.goBack();
              }}
            >
              <ArrowLeft size={22} color="#0F172A" />
            </TouchableOpacity>
            <Text className="ml-3 text-heading">{copy.pokeTitle}</Text>
          </View>
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={vm.pokes}
        keyExtractor={item => String(item.id)}
        renderItem={renderPoke}
        contentContainerClassName="px-4 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isLoading}
            onRefresh={vm.refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <View className="preview-panel mb-5 flex-row items-center p-4">
            <View className="icon-chip h-14 w-14 items-center justify-center">
              <Hand size={28} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-heading">{copy.pokesReceived}</Text>
              <Text className="mt-1 text-body-secondary">
                Xem và phản hồi các poke từ bạn bè.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <PokeSkeleton />
          ) : vm.pokes.length === 0 ? (
            <EmptyState
              error={vm.error}
              onRetry={vm.refresh}
              copy={copy}
            />
          ) : null
        }
        ListFooterComponent={
          vm.hasMore ? (
            <View className="py-4">
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
      <ToastContainer />
    </SafeAreaView>
  );
}

export default PokeScreen;
