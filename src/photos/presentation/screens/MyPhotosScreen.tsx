// Description: Shows the current user's real uploaded photos in a lightweight grid.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Image as ImageIcon, RotateCw, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { usePhotosViewModel } from '../../application/view-models/usePhotosViewModel';
import type { PhotosItem } from '../../domain/types/photos.types';

type MyPhotosNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';
const LIST_PADDING = 12;
const GAP = 3;
const ITEM_SIZE = Math.floor(
  (Dimensions.get('window').width - LIST_PADDING * 2 - GAP * 2) / 3,
);

function PhotosSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 12 }).map((_, index) => (
        <View key={index} style={[styles.photo, styles.skeleton]} />
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        {error ? (
          <RotateCw size={38} color={BRAND} />
        ) : (
          <ImageIcon size={38} color={BRAND} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {error ? 'Không tải được ảnh' : 'Chưa có ảnh'}
      </Text>
      <Text style={styles.emptyText}>
        {error ?? 'Những ảnh bạn đăng sẽ xuất hiện tại đây.'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <RotateCw size={17} color="#FFFFFF" />
        <Text style={styles.retryText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

function MyPhotosScreen() {
  const navigation = useNavigation<MyPhotosNav>();
  const vm = usePhotosViewModel();

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
  );

  const renderPhoto = useCallback(
    ({ item }: ListRenderItemInfo<PhotosItem>) => (
      <TouchableOpacity activeOpacity={0.88}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      </TouchableOpacity>
    ),
    [],
  );

  const showEmpty = !vm.isLoading && vm.photos.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ảnh của tôi</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={vm.photos}
        keyExtractor={item => item.id}
        renderItem={renderPhoto}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          showEmpty && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          vm.photos.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>{vm.photos.length} ảnh</Text>
              <Text style={styles.summaryText}>
                Ảnh từ các bài đăng của bạn.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <PhotosSkeleton />
          ) : (
            <EmptyState error={vm.error} onRetry={vm.retry} />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,255,0.08)',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 4,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: LIST_PADDING,
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  photo: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#E2E8F0',
  },
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  summary: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  emptyTitle: {
    marginTop: 18,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 46,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: BRAND,
    paddingHorizontal: 22,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 16,
  },
});

export default MyPhotosScreen;
