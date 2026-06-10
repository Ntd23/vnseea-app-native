// Description: Provides settings screen data with real user profile from WoWonder API.
import { useCallback, useMemo, useState } from 'react';
import type {
  FeatureGridItem,
  SettingsMenuItem,
} from '../../domain/types/settings.types';
import { useUserProfileViewModel } from './useUserProfileViewModel';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';

const BRAND = '#0000FF';

const MOCK_FEATURES: FeatureGridItem[] = [
  {
    id: 'messages',
    label: 'Tin nhắn',
    iconKey: 'MessageCircle',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'following',
    label: 'Theo dõi',
    iconKey: 'UserPlus',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'poke',
    label: 'Chọc',
    iconKey: 'Pointer',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'albums',
    label: 'Album',
    iconKey: 'Images',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'photos',
    label: 'Ảnh',
    iconKey: 'Image',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'videos',
    label: 'Video của tôi',
    iconKey: 'Video',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'saved',
    label: 'Đã lưu',
    iconKey: 'Bookmark',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'groups',
    label: 'Nhóm',
    iconKey: 'Users',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'pages',
    label: 'Trang',
    iconKey: 'Flag',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'blogs',
    label: 'Bài viết',
    iconKey: 'FileText',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'market',
    label: 'Cửa hàng',
    iconKey: 'Store',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'boosted',
    label: 'Boosted',
    iconKey: 'Rocket',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'popular',
    label: 'Xu hướng',
    iconKey: 'Flame',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'events',
    label: 'Sự kiện',
    iconKey: 'Calendar',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'find-friends',
    label: 'Tìm bạn',
    iconKey: 'UserSearch',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'nearby',
    label: 'Gần đây',
    iconKey: 'MapPinned',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'offers',
    label: 'Ưu đãi',
    iconKey: 'Tag',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'movies',
    label: 'Phim',
    iconKey: 'Film',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'jobs',
    label: 'Việc làm',
    iconKey: 'Briefcase',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'common',
    label: 'Chung',
    iconKey: 'LayoutGrid',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'memories',
    label: 'Kỷ niệm',
    iconKey: 'Clock',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'funding',
    label: 'Gây quỹ',
    iconKey: 'HeartHandshake',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'games',
    label: 'Trò chơi',
    iconKey: 'Gamepad2',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'live',
    label: 'Trực tiếp',
    iconKey: 'Radio',
    bgColor: '',
    iconColor: BRAND,
  },
  {
    id: 'ads',
    label: 'Quảng cáo',
    iconKey: 'Megaphone',
    bgColor: '',
    iconColor: BRAND,
  },
];

const MOCK_SETTINGS: SettingsMenuItem[] = [
  { id: 'general', label: 'Cài đặt chung', iconKey: 'Globe2' },
  { id: 'privacy', label: 'Quyền riêng tư', iconKey: 'Lock' },
  { id: 'notifications', label: 'Thông báo', iconKey: 'Bell' },
  { id: 'invite', label: 'Link mời', iconKey: 'Link' },
  { id: 'my-info', label: 'Thông tin của tôi', iconKey: 'Info' },
  { id: 'address', label: 'Địa chỉ', iconKey: 'MapPin' },
  { id: 'earnings', label: 'Thu nhập', iconKey: 'Wallet' },
  { id: 'help', label: 'Hỗ trợ & Trợ giúp', iconKey: 'HelpCircle' },
  { id: 'logout', label: 'Đăng xuất', iconKey: 'LogOut', isDestructive: true },
];

const FEATURE_LABELS: Record<AppLanguage, Record<string, string>> = {
  vi: {
    messages: 'Tin nhắn',
    following: 'Theo dõi',
    poke: 'Chọc',
    albums: 'Album',
    photos: 'Ảnh',
    videos: 'Video của tôi',
    saved: 'Đã lưu',
    groups: 'Nhóm',
    pages: 'Trang',
    blogs: 'Bài viết',
    market: 'Cửa hàng',
    boosted: 'Boosted',
    popular: 'Xu hướng',
    events: 'Sự kiện',
    'find-friends': 'Tìm bạn',
    nearby: 'Gần đây',
    offers: 'Ưu đãi',
    movies: 'Phim',
    jobs: 'Việc làm',
    common: 'Chung',
    memories: 'Kỷ niệm',
    funding: 'Gây quỹ',
    games: 'Trò chơi',
    live: 'Trực tiếp',
    ads: 'Quảng cáo',
  },
  en: {
    messages: 'Messages',
    following: 'Following',
    poke: 'Poke',
    albums: 'Albums',
    photos: 'Photos',
    videos: 'My videos',
    saved: 'Saved',
    groups: 'Groups',
    pages: 'Pages',
    blogs: 'Articles',
    market: 'Marketplace',
    boosted: 'Boosted',
    popular: 'Trending',
    events: 'Events',
    'find-friends': 'Find friends',
    nearby: 'Nearby',
    offers: 'Offers',
    movies: 'Movies',
    jobs: 'Jobs',
    common: 'General',
    memories: 'Memories',
    funding: 'Funding',
    games: 'Games',
    live: 'Live',
    ads: 'Ads',
  },
};

const SETTINGS_LABELS: Record<AppLanguage, Record<string, string>> = {
  vi: {
    general: 'Cài đặt chung',
    privacy: 'Quyền riêng tư',
    notifications: 'Thông báo',
    invite: 'Link mời',
    'my-info': 'Thông tin của tôi',
    address: 'Địa chỉ',
    earnings: 'Thu nhập',
    help: 'Hỗ trợ & Trợ giúp',
    logout: 'Đăng xuất',
  },
  en: {
    general: 'General settings',
    privacy: 'Privacy',
    notifications: 'Notifications',
    invite: 'Invite link',
    'my-info': 'My information',
    address: 'Address',
    earnings: 'Earnings',
    help: 'Help & Support',
    logout: 'Log out',
  },
};

const COPY: Record<AppLanguage, {
  otherSettings: string;
  languageSubtitle: string;
  viewProfile: string;
  proTitle: string;
  proSubtitle: string;
  languageTitle: string;
  languageDescription: string;
  selected: string;
  close: string;
}> = {
  vi: {
    otherSettings: 'CÀI ĐẶT KHÁC',
    languageSubtitle: 'Ngôn ngữ: Tiếng Việt',
    viewProfile: 'Xem hồ sơ',
    proTitle: 'Tài khoản Pro',
    proSubtitle: 'Mở khóa tất cả tính năng cao cấp',
    languageTitle: 'Ngôn ngữ',
    languageDescription: 'Chọn ngôn ngữ hiển thị cho phần cài đặt.',
    selected: 'Đang dùng',
    close: 'Đóng',
  },
  en: {
    otherSettings: 'OTHER SETTINGS',
    languageSubtitle: 'Language: English',
    viewProfile: 'View profile',
    proTitle: 'Pro Account',
    proSubtitle: 'Unlock all premium features',
    languageTitle: 'Language',
    languageDescription: 'Choose the display language for settings.',
    selected: 'Selected',
    close: 'Close',
  },
};

export const LANGUAGE_OPTIONS: Array<{
  code: AppLanguage;
  label: string;
  nativeLabel: string;
}> = [
  { code: 'vi', label: 'Tiếng Việt', nativeLabel: 'Vietnamese' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

export function useSettingsViewModel() {
  const userProfileVm = useUserProfileViewModel();
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    languageStorage.setLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const features = useMemo<FeatureGridItem[]>(
    () =>
      MOCK_FEATURES.map(item => ({
        ...item,
        label: FEATURE_LABELS[language][item.id] ?? item.label,
      })),
    [language],
  );

  const settingsMenu = useMemo<SettingsMenuItem[]>(
    () =>
      MOCK_SETTINGS.map(item => ({
        ...item,
        label: SETTINGS_LABELS[language][item.id] ?? item.label,
        subtitle:
          item.id === 'general' ? COPY[language].languageSubtitle : undefined,
      })),
    [language],
  );

  return {
    profile: userProfileVm.profile,
    features,
    settingsMenu,
    language,
    setLanguage,
    languageOptions: LANGUAGE_OPTIONS,
    copy: COPY[language],
    isLoading: userProfileVm.isLoading,
    error: userProfileVm.error,
  };
}
