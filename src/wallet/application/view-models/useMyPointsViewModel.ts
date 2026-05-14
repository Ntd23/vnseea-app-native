// MyPoints ViewModel — UI-only phase, mock data

import {useState} from 'react';
import type {UserPoints} from '../../domain/types/wallet.types';

const MOCK_USER_POINTS: UserPoints = {
  total: 2450,
  goal: 5000,
  level: 'Cấp độ Vàng',
  initials: 'ND',
  activities: [
    {
      id: 'comment',
      label: 'Bình luận bất kỳ bài viết nào',
      iconKey: 'MessageSquare',
      percentage: 10,
      color: '#3b82f6',
      chipBg: 'rgba(59,130,246,0.10)',
    },
    {
      id: 'post',
      label: 'Tạo bài viết mới',
      iconKey: 'PenLine',
      percentage: 15,
      color: '#f59e0b',
      chipBg: 'rgba(245,158,11,0.10)',
    },
    {
      id: 'react',
      label: 'Tương tác bất kỳ bài viết nào',
      iconKey: 'ThumbsUp',
      percentage: 5,
      color: '#0ea5e9',
      chipBg: 'rgba(14,165,233,0.10)',
    },
    {
      id: 'blog',
      label: 'Tạo blog mới',
      iconKey: 'FileText',
      percentage: 15,
      color: '#0000ff',
      chipBg: 'rgba(0,0,255,0.08)',
    },
  ],
};

export function useMyPointsViewModel() {
  const [data] = useState<UserPoints>(MOCK_USER_POINTS);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const progressPercent = Math.min(
    Math.round((data.total / data.goal) * 100),
    100,
  );

  return {data, progressPercent, isLoading, error};
}
