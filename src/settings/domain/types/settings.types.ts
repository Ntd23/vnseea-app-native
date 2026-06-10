// Settings domain types

export interface WoWonderUserData {
  user_id: number;
  name: string;
  username: string;
  avatar: string;
  cover?: string;
  email?: string;
  phone_number?: string;
  gender?: string;
  birthday?: string;
  country_id?: string;
  website?: string;
  about?: string;
  first_name?: string;
  last_name?: string;
  admin: number;
  verified: number;
  active: number;
  session_hash?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
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
  subtitle?: string;
  iconKey: string;
  isDestructive?: boolean;
}
