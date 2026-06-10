// Description: Provides settings screen data with real user profile from WoWonder API.
import { useState } from 'react';
import type {
  FeatureGridItem,
  SettingsMenuItem,
} from '../../domain/types/settings.types';
import { useUserProfileViewModel } from './useUserProfileViewModel';

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
  { id: 'general', label: 'Cài đặt chung', iconKey: 'User' },
  { id: 'privacy', label: 'Quyền riêng tư', iconKey: 'Lock' },
  { id: 'notifications', label: 'Thông báo', iconKey: 'Bell' },
  { id: 'invite', label: 'Link mời', iconKey: 'Link' },
  { id: 'address', label: 'Địa chỉ', iconKey: 'MapPin' },
  { id: 'earnings', label: 'Thu nhập', iconKey: 'Wallet' },
  { id: 'help', label: 'Hỗ trợ & Trợ giúp', iconKey: 'HelpCircle' },
  { id: 'logout', label: 'Đăng xuất', iconKey: 'LogOut', isDestructive: true },
];

export function useSettingsViewModel() {
  const userProfileVm = useUserProfileViewModel();

  const [features] = useState<FeatureGridItem[]>(MOCK_FEATURES);
  const [settingsMenu] = useState<SettingsMenuItem[]>(MOCK_SETTINGS);

  return {
    profile: userProfileVm.profile,
    features,
    settingsMenu,
    isLoading: userProfileVm.isLoading,
    error: userProfileVm.error,
  };
}
