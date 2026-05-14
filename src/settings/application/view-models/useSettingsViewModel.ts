// Settings - useSettingsViewModel
// UI-only phase: returns static mock data

import {useState} from 'react';
import type {
  FeatureGridItem,
  SettingsMenuItem,
  UserProfile,
} from '../../domain/types/settings.types';

const MOCK_PROFILE: UserProfile = {
  id: '1',
  name: 'Nguyễn Dũng',
  avatarUrl: null,
  isOnline: true,
};

const MOCK_FEATURES: FeatureGridItem[] = [
  {id: 'messages', label: 'Tin nhắn', iconKey: 'MessageCircle', bgColor: 'bg-blue-50', iconColor: '#2563eb'},
  {id: 'following', label: 'Theo dõi', iconKey: 'UserPlus', bgColor: 'bg-purple-50', iconColor: '#9333ea'},
  {id: 'poke', label: 'Chọc', iconKey: 'Pointer', bgColor: 'bg-pink-50', iconColor: '#db2777'},
  {id: 'albums', label: 'Album', iconKey: 'Images', bgColor: 'bg-amber-50', iconColor: '#d97706'},
  {id: 'photos', label: 'Ảnh', iconKey: 'Image', bgColor: 'bg-red-50', iconColor: '#dc2626'},
  {id: 'videos', label: 'Video của tôi', iconKey: 'Video', bgColor: 'bg-indigo-50', iconColor: '#4f46e5'},
  {id: 'saved', label: 'Đã lưu', iconKey: 'Bookmark', bgColor: 'bg-cyan-50', iconColor: '#0891b2'},
  {id: 'groups', label: 'Nhóm', iconKey: 'Users', bgColor: 'bg-violet-50', iconColor: '#7c3aed'},
  {id: 'pages', label: 'Trang', iconKey: 'Flag', bgColor: 'bg-emerald-50', iconColor: '#059669'},
  {id: 'blogs', label: 'Bài viết', iconKey: 'FileText', bgColor: 'bg-orange-50', iconColor: '#ea580c'},
  {id: 'market', label: 'Cửa hàng', iconKey: 'Store', bgColor: 'bg-sky-50', iconColor: '#0284c7'},
  {id: 'boosted', label: 'Boosted', iconKey: 'Rocket', bgColor: 'bg-rose-50', iconColor: '#e11d48'},
  {id: 'popular', label: 'Xu hướng', iconKey: 'Flame', bgColor: 'bg-fuchsia-50', iconColor: '#c026d3'},
  {id: 'events', label: 'Sự kiện', iconKey: 'Calendar', bgColor: 'bg-teal-50', iconColor: '#0d9488'},
  {id: 'find-friends', label: 'Tìm bạn', iconKey: 'UserSearch', bgColor: 'bg-blue-50', iconColor: '#2563eb'},
  {id: 'offers', label: 'Ưu đãi', iconKey: 'Tag', bgColor: 'bg-lime-50', iconColor: '#65a30d'},
  {id: 'movies', label: 'Phim', iconKey: 'Film', bgColor: 'bg-yellow-50', iconColor: '#ca8a04'},
  {id: 'jobs', label: 'Việc làm', iconKey: 'Briefcase', bgColor: 'bg-green-50', iconColor: '#16a34a'},
  {id: 'common', label: 'Chung', iconKey: 'LayoutGrid', bgColor: 'bg-slate-100', iconColor: '#475569'},
  {id: 'memories', label: 'Kỷ niệm', iconKey: 'Clock', bgColor: 'bg-orange-50', iconColor: '#f97316'},
  {id: 'funding', label: 'Gây quỹ', iconKey: 'HeartHandshake', bgColor: 'bg-cyan-50', iconColor: '#06b6d4'},
  {id: 'games', label: 'Trò chơi', iconKey: 'Gamepad2', bgColor: 'bg-violet-50', iconColor: '#8b5cf6'},
  {id: 'live', label: 'Trực tiếp', iconKey: 'Radio', bgColor: 'bg-red-50', iconColor: '#ef4444'},
  {id: 'ads', label: 'Quảng cáo', iconKey: 'Megaphone', bgColor: 'bg-blue-50', iconColor: '#3b82f6'},
];

const MOCK_SETTINGS: SettingsMenuItem[] = [
  {id: 'general', label: 'Cài đặt chung', iconKey: 'User'},
  {id: 'privacy', label: 'Quyền riêng tư', iconKey: 'Lock'},
  {id: 'notifications', label: 'Thông báo', iconKey: 'Bell'},
  {id: 'invite', label: 'Link mời', iconKey: 'Link'},
  {id: 'my-info', label: 'Thông tin của tôi', iconKey: 'Info'},
  {id: 'address', label: 'Địa chỉ', iconKey: 'MapPin'},
  {id: 'earnings', label: 'Thu nhập', iconKey: 'Wallet'},
  {id: 'help', label: 'Hỗ trợ & Trợ giúp', iconKey: 'HelpCircle'},
  {id: 'logout', label: 'Đăng xuất', iconKey: 'LogOut', isDestructive: true},
];

export function useSettingsViewModel() {
  const [profile] = useState<UserProfile>(MOCK_PROFILE);
  const [features] = useState<FeatureGridItem[]>(MOCK_FEATURES);
  const [settingsMenu] = useState<SettingsMenuItem[]>(MOCK_SETTINGS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    profile,
    features,
    settingsMenu,
    isLoading,
    error,
  };
}
