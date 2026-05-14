// Settings domain types

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export interface FeatureGridItem {
  id: string;
  label: string;
  iconKey: string;
  bgColor: string;
  iconColor: string;
}

export interface SettingsMenuItem {
  id: string;
  label: string;
  iconKey: string;
  isDestructive?: boolean;
}
