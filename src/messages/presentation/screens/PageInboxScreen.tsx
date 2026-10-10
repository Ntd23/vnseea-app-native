// Description: Page Inbox — lets the Page owner and admins with the Messages permission see customer conversations and answer as the Page.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { ArrowLeft, Inbox, RotateCw, Search, X } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { createPageInboxChat } from '../../application/page-conversations/pageConversationChat';
import { usePageInboxViewModel } from '../../application/view-models/usePageInboxViewModel';
import type { PageInboxConversation } from '../../domain/types/messages.types';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.PAGE_INBOX>;

const LIST_REFRESH_INTERVAL_MS = 20_000;

const COPY = {
  vi: {
    back: 'Quay lại',
    title: 'Hộp thư trang',
    searchPlaceholder: 'Tìm theo tên người nhắn',
    clearSearch: 'Xóa tìm kiếm',
    you: 'Bạn',
    page: 'Trang',
    noPagesTitle: 'Chưa có hộp thư nào',
    noPagesSubtitle:
      'Bạn cần là chủ trang hoặc quản trị viên có quyền Tin nhắn để xem hộp thư trang.',
    emptyTitle: 'Chưa có tin nhắn',
    emptySubtitle: 'Khi có người nhắn tin cho trang, cuộc trò chuyện sẽ hiện ở đây.',
    noSearchResult: 'Không tìm thấy cuộc trò chuyện phù hợp.',
    retry: 'Thử lại',
  },
  en: {
    back: 'Back',
    title: 'Page inbox',
    searchPlaceholder: 'Search by sender name',
    clearSearch: 'Clear search',
    you: 'You',
    page: 'Page',
    noPagesTitle: 'No inbox yet',
    noPagesSubtitle:
      'You need to own the Page or be an admin with the Messages permission to see its inbox.',
    emptyTitle: 'No messages yet',
    emptySubtitle: 'When people message the Page, their conversations appear here.',
    noSearchResult: 'No matching conversations were found.',
    retry: 'Try again',
  },
} as const;

type InboxCopy = (typeof COPY)[keyof typeof COPY];

function formatInboxTime(seconds: number) {
  if (!seconds) return '';
  const time = dayjs.unix(seconds);
  return time.isSame(dayjs(), 'day') ? time.format('HH:mm') : time.format('DD/MM');
}

function previewPrefix(item: PageInboxConversation, copy: InboxCopy, pageTitle: string) {
  if (!item.lastMessageIsPageSide) return '';
  const sender = item.lastMessageSentBy;
  if (sender && sender.id === (sessionStorage.getSession()?.userId ?? '')) {
    return `${copy.you}: `;
  }
  return `${sender?.name || pageTitle || copy.page}: `;
}

function Avatar({ uri, name }: { uri: string; name: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>
        {(name.trim()[0] || '?').toUpperCase()}
      </Text>
    </View>
  );
}

export default function PageInboxScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;
  const vm = usePageInboxViewModel(route.params?.pageId);
  const [searchText, setSearchText] = useState('');
  const { setSearchQuery, refreshSilently } = vm;
  const hasFocusedOnceRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchText);
    }, searchText.trim() ? 320 : 0);
    return () => clearTimeout(timeout);
  }, [searchText, setSearchQuery]);

  // Coming back from a thread, or sitting on the list, picks up new messages.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnceRef.current) refreshSilently();
      hasFocusedOnceRef.current = true;
      const interval = setInterval(refreshSilently, LIST_REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [refreshSilently]),
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.MESSAGES);
  }, [navigation]);

  const selectedPage = vm.selectedPage;
  const pageTitle = selectedPage?.pageTitle || '';

  const openConversation = useCallback(
    (item: PageInboxConversation) => {
      if (!selectedPage) return;
      navigation.navigate(ROUTES.CHAT, {
        chat: createPageInboxChat({
          pageId: selectedPage.pageId,
          pageTitle: selectedPage.pageTitle,
          pageAvatar: selectedPage.avatar,
          customer: item.customer,
          unreadCount: item.unreadCount,
        }),
      });
    },
    [navigation, selectedPage],
  );

  const renderConversation = useCallback(
    ({ item }: ListRenderItemInfo<PageInboxConversation>) => {
      const isUnread = item.unreadCount > 0;
      return (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={() => openConversation(item)}
          style={styles.row}
        >
          <Avatar uri={item.customer.avatar} name={item.customer.name} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text
                numberOfLines={1}
                style={[styles.rowName, isUnread && styles.rowNameUnread]}
              >
                {item.customer.name || item.customer.username}
              </Text>
              <Text style={styles.rowTime}>
                {formatInboxTime(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.rowBottom}>
              <Text
                numberOfLines={1}
                style={[styles.rowPreview, isUnread && styles.rowPreviewUnread]}
              >
                {previewPrefix(item, copy, pageTitle)}
                {item.lastMessagePreview}
              </Text>
              {isUnread ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [copy, openConversation, pageTitle],
  );

  const hasNoPages = !vm.isLoadingPages && vm.pages.length === 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={APP_BRAND_COLOR}
        translucent={false}
      />

      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={copy.back}
          accessibilityRole="button"
          activeOpacity={0.82}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {copy.title}
          </Text>
          {pageTitle ? (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {pageTitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {vm.pages.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pageChips}
          style={styles.pageChipsBar}
        >
          {vm.pages.map(page => {
            const isActive = page.pageId === vm.selectedPageId;
            return (
              <TouchableOpacity
                key={page.pageId}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                activeOpacity={0.82}
                onPress={() => vm.selectPage(page.pageId)}
                style={[styles.pageChip, isActive && styles.pageChipActive]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.pageChipText, isActive && styles.pageChipTextActive]}
                >
                  {page.pageTitle}
                </Text>
                {page.unreadCount > 0 ? (
                  <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>
                      {page.unreadCount > 99 ? '99+' : page.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {!hasNoPages ? (
        <View style={styles.searchSection}>
          <View style={styles.searchInputShell}>
            <Search size={19} color="#64748B" />
            <TextInput
              accessibilityLabel={copy.searchPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              style={styles.searchInput}
              value={searchText}
            />
            {searchText ? (
              <TouchableOpacity
                accessibilityLabel={copy.clearSearch}
                accessibilityRole="button"
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setSearchText('')}
                style={styles.clearSearchButton}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <FlatList
        data={vm.conversations}
        keyExtractor={item => item.customer.id}
        renderItem={renderConversation}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={APP_BRAND_COLOR}
            colors={[APP_BRAND_COLOR]}
          />
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              {vm.error ? (
                <RotateCw size={34} color={APP_BRAND_COLOR} />
              ) : (
                <Inbox size={34} color={APP_BRAND_COLOR} />
              )}
              <Text style={styles.emptyTitle}>
                {vm.error || (hasNoPages ? copy.noPagesTitle : copy.emptyTitle)}
              </Text>
              <Text style={styles.emptySubtitle}>
                {hasNoPages
                  ? copy.noPagesSubtitle
                  : vm.searchQuery
                  ? copy.noSearchResult
                  : copy.emptySubtitle}
              </Text>
              {vm.error ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={vm.refresh}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>{copy.retry}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator color={APP_BRAND_COLOR} />
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
    backgroundColor: '#F6F8FC',
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_BRAND_COLOR,
    paddingHorizontal: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.borderOnPrimary,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: APP_COLORS.brand.onPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    color: APP_COLORS.brand.onPrimaryMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  pageChipsBar: {
    flexGrow: 0,
    backgroundColor: '#F6F8FC',
  },
  pageChips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pageChip: {
    maxWidth: 220,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  pageChipActive: {
    borderColor: APP_BRAND_COLOR,
    backgroundColor: APP_BRAND_COLOR,
  },
  pageChipText: {
    flexShrink: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  pageChipTextActive: {
    color: '#FFFFFF',
  },
  chipBadge: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: APP_BRAND_COLOR,
  },
  chipBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  chipBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  chipBadgeTextActive: {
    color: APP_BRAND_COLOR,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#F6F8FC',
  },
  searchInputShell: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    marginLeft: 10,
    paddingVertical: 0,
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
  },
  clearSearchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F4',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '800',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowName: {
    flex: 1,
    minWidth: 0,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  rowNameUnread: {
    fontWeight: '900',
  },
  rowTime: {
    marginLeft: 8,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rowPreview: {
    flex: 1,
    minWidth: 0,
    color: '#64748B',
    fontSize: 13,
  },
  rowPreviewUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: APP_BRAND_COLOR,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F4',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    marginTop: 14,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: APP_BRAND_COLOR,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  loaderFooter: {
    alignItems: 'center',
    paddingVertical: 18,
  },
});
