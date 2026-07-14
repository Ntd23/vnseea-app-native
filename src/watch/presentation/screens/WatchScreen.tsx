// Description: Renders the API-backed watch player with navigation and an up-next playlist.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import VideoPlayer from 'react-native-video';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MessageSquare,
  Share2,
  Video as VideoIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ReelsItem } from '../../../reels/domain/types/reels.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useWatchViewModel } from '../../application/view-models/useWatchViewModel';

type WatchNavigation = NativeStackNavigationProp<RootStackParamList>;

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function WatchScreen() {
  const navigation = useNavigation<WatchNavigation>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const vm = useWatchViewModel();
  const listRef = useRef<FlatList<ReelsItem>>(null);
  const [videoError, setVideoError] = useState(false);

  const copy = useMemo(
    () => ({
      next: isVi ? 'Tiếp theo' : 'Up next',
      untitled: isVi ? 'Video không có tiêu đề' : 'Untitled video',
      views: isVi ? 'Lượt xem' : 'views',
      download: isVi ? 'Tải xuống' : 'Download',
      original: isVi ? 'Mở bản gốc' : 'Open original',
      empty: isVi ? 'Không có video để hiển thị' : 'No videos to display',
      retry: isVi ? 'Thử lại' : 'Retry',
      unavailable: isVi ? 'Không thể phát video này' : 'This video cannot be played',
      downloaded: isVi ? 'Đã tải video xuống thiết bị.' : 'Video downloaded.',
      downloadFailed: isVi ? 'Không thể tải video.' : 'Unable to download video.',
    }),
    [isVi],
  );

  const handleSelect = useCallback(
    (videoId: string) => {
      setVideoError(false);
      vm.selectVideo(videoId);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [vm.selectVideo],
  );

  const handlePrevious = useCallback(() => {
    setVideoError(false);
    vm.selectPrevious();
  }, [vm.selectPrevious]);

  const handleNext = useCallback(() => {
    setVideoError(false);
    vm.selectNext();
  }, [vm.selectNext]);

  const handleShare = useCallback(async () => {
    const video = vm.selectedVideo;
    if (!video?.videoUrl) return;
    await Share.share({
      message: [video.caption, video.videoUrl].filter(Boolean).join('\n\n'),
      url: video.videoUrl,
    });
  }, [vm.selectedVideo]);

  const handleOpenVideoUrl = useCallback(async () => {
    const url = vm.selectedVideo?.videoUrl;
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
    }
  }, [vm.selectedVideo]);

  const handleDownload = useCallback(async () => {
    const video = vm.selectedVideo;
    if (!video?.videoUrl) return;

    const fileName = `vnseea-video-${video.id}.mp4`;
    const directories = ReactNativeBlobUtil.fs.dirs;
    const path = Platform.OS === 'android'
      ? `${directories.DownloadDir}/${fileName}`
      : `${directories.DocumentDir}/${fileName}`;

    try {
      await ReactNativeBlobUtil.config({
        path,
        fileCache: false,
        addAndroidDownloads:
          Platform.OS === 'android'
            ? {
                useDownloadManager: true,
                notification: true,
                title: fileName,
                description: 'VNSEEA video',
                mime: 'video/mp4',
                path,
              }
            : undefined,
      }).fetch('GET', video.videoUrl);
      Alert.alert('VNSEEA', copy.downloaded);
    } catch {
      Alert.alert('VNSEEA', copy.downloadFailed);
    }
  }, [copy.downloadFailed, copy.downloaded, vm.selectedVideo]);

  const renderVideo = useCallback(
    ({ item }: ListRenderItemInfo<ReelsItem>) => (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.nextCard}
        onPress={() => handleSelect(item.id)}
      >
        <View style={styles.thumbnailFrame}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <VideoIcon size={32} color="#ffffff" />
            </View>
          )}
        </View>
        <Text style={styles.nextTitle} numberOfLines={2}>
          {item.caption || copy.untitled}
        </Text>
        <View style={styles.nextMeta}>
          <Text style={styles.nextMetaText}>
            {formatCount(item.viewCount)} {copy.views}
          </Text>
          <Text style={styles.nextAuthor} numberOfLines={1}>
            {item.publisher.name}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [copy.untitled, copy.views, handleSelect],
  );

  const selected = vm.selectedVideo;
  const canGoPrevious = vm.selectedIndex > 0;
  const canGoNext = vm.selectedIndex >= 0 && vm.selectedIndex < vm.videos.length - 1;

  const listHeader = selected ? (
    <>
      <View style={styles.playerStage}>
        {!videoError ? (
          <VideoPlayer
            key={selected.id}
            source={{ uri: selected.videoUrl }}
            poster={selected.thumbnailUrl}
            posterResizeMode="contain"
            style={styles.player}
            resizeMode="contain"
            controls
            paused={false}
            ignoreSilentSwitch="ignore"
            playInBackground={false}
            playWhenInactive={false}
            onError={() => setVideoError(true)}
          />
        ) : (
          <View style={styles.playerError}>
            <VideoIcon size={44} color="#94a3b8" />
            <Text style={styles.playerErrorText}>{copy.unavailable}</Text>
          </View>
        )}

        <TouchableOpacity
          disabled={!canGoPrevious}
          style={[styles.previousButton, !canGoPrevious && styles.disabledButton]}
          onPress={handlePrevious}
        >
          <ChevronLeft size={38} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!canGoNext}
          style={[styles.nextButton, !canGoNext && styles.disabledButton]}
          onPress={handleNext}
        >
          <ChevronRight size={38} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.stageActions}>
          <TouchableOpacity style={styles.stageAction} onPress={handleShare}>
            <Share2 size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stageAction}
            onPress={() => navigation.navigate(ROUTES.POST_DETAIL, { postId: selected.id })}
          >
            <MessageSquare size={20} color="#ffffff" />
            <Text style={styles.stageActionCount}>{formatCount(selected.commentCount)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.linkActions}>
        <TouchableOpacity style={styles.linkButton} onPress={handleDownload}>
          <Download size={15} color="#64748b" />
          <Text style={styles.linkText}>{copy.download}</Text>
        </TouchableOpacity>
        <View style={styles.linkDivider} />
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenVideoUrl}>
          <ExternalLink size={15} color="#64748b" />
          <Text style={styles.linkText}>{copy.original}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nextHeader}>
        <Text style={styles.nextHeaderText}>{copy.next}</Text>
      </View>
    </>
  ) : null;

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      {vm.isLoading && vm.videos.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#0000ff" />
        </View>
      ) : vm.videos.length === 0 ? (
        <View style={styles.centerState}>
          <VideoIcon size={52} color="#91aab5" />
          <Text style={styles.emptyText}>{vm.error || copy.empty}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => vm.loadFirstPage()}>
            <Text style={styles.retryText}>{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={vm.videos.filter(item => item.id !== selected?.id)}
          keyExtractor={item => item.id}
          renderItem={renderVideo}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={vm.isRefreshing}
              onRefresh={() => vm.loadFirstPage(true)}
              colors={['#0000ff']}
            />
          }
          onEndReached={() => void vm.loadMore()}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            vm.isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color="#0000ff" /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eaf0ff' },
  listContent: { paddingBottom: 32 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { marginTop: 14, color: '#64748b', fontSize: 14, textAlign: 'center' },
  retryButton: { marginTop: 18, backgroundColor: '#0000ff', borderRadius: 5, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#ffffff', fontWeight: '700' },
  playerStage: { height: 260, backgroundColor: '#000000' },
  player: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  playerError: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playerErrorText: { marginTop: 10, color: '#cbd5e1', fontWeight: '600' },
  previousButton: { position: 'absolute', left: 5, top: 98, width: 48, height: 64, alignItems: 'center', justifyContent: 'center' },
  nextButton: { position: 'absolute', right: 5, top: 98, width: 48, height: 64, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.25 },
  stageActions: { position: 'absolute', right: 10, top: 12, gap: 10 },
  stageAction: { minWidth: 38, minHeight: 38, borderRadius: 19, backgroundColor: 'rgba(30,41,59,0.76)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  stageActionCount: { marginTop: 2, color: '#ffffff', fontSize: 10, fontWeight: '700' },
  linkActions: { height: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', paddingHorizontal: 18 },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: '#94a3b8', fontSize: 13 },
  linkDivider: { width: 1, height: 16, backgroundColor: '#475569', marginHorizontal: 12 },
  nextHeader: { marginHorizontal: 12, marginTop: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#f1f1f1', paddingHorizontal: 14, paddingTop: 15, paddingBottom: 8 },
  nextHeaderText: { color: '#334155', fontSize: 20, fontWeight: '800' },
  nextCard: { marginHorizontal: 12, backgroundColor: '#f1f1f1', paddingHorizontal: 14, paddingBottom: 16 },
  thumbnailFrame: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 8, backgroundColor: '#000000' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  nextTitle: { marginTop: 10, color: '#334155', fontSize: 14, fontWeight: '700' },
  nextMeta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nextMetaText: { color: '#94a3b8', fontSize: 12 },
  nextAuthor: { flex: 1, color: '#64748b', fontSize: 12, textAlign: 'right' },
  footerLoader: { marginVertical: 18 },
});

export default WatchScreen;
