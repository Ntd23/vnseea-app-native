// English description: Defines advertising campaign data and backend option types.

export type AdBiddingType = 'clicks' | 'views';
export type AdAppearsType =
  | 'entire'
  | 'post'
  | 'sidebar'
  | 'jobs'
  | 'forum'
  | 'movies'
  | 'offer'
  | 'funding'
  | 'story'
  | 'video'
  | 'timeline'
  | 'groups'
  | 'pages'
  | 'messages';
export type AdGender = 'male' | 'female' | 'all';

export interface AdFormData {
  name: string; // Company name (3-100 chars)
  website: string; // URL (required)
  headline: string; // Ad title (5-200 chars)
  description: string; // Ad description
  audienceList: string; // WoWonder country IDs: "233" or "233,1"
  gender: AdGender;
  bidding: AdBiddingType;
  media?: string; // Local file URI for upload
  mediaName?: string;
  mediaType?: string;
  appears: AdAppearsType;
  location?: string;
  pageId?: string; // Optional page ID
  pageName?: string; // Optional page slug expected by the backend
  startDate?: string; // Format: YYYY-MM-DD
  endDate?: string; // Format: YYYY-MM-DD
  budget?: number;
}

export interface AdOption {
  value: string;
  label: string;
}

export interface AdPageOption {
  id: string;
  name: string;
  title: string;
  avatar?: string;
}

export interface AdsOptions {
  audience: AdOption[];
  genders: AdOption[];
  pages: AdPageOption[];
  placements: AdOption[];
  clickPrice: number;
  viewPrice: number;
  currency: string;
  currencySymbol: string;
  walletBalance: number;
}

export interface AdItem {
  id: number;
  name: string;
  url: string;
  headline: string;
  description: string;
  location: string;
  audience: string;
  gender: string;
  bidding: string;
  ad_media: string;
  appears: string;
  page_id: number;
  user_id: number;
  budget: string;
  spent: string;
  views: string;
  clicks: number;
  posted: number;
  start: string;
  end: string;
  status: string;
  user_data?: {
    user_id: string;
    username: string;
    avatar: string;
    name: string;
  };
}

export interface CreateAdResult {
  adId: number;
  ad: AdItem;
}

export interface AdDailyStats {
  date: string; // Format: YYYY-MM-DD
  views: number;
  clicks: number;
  spent: number;
}

export interface AdStatsSnapshot {
  ad: AdItem;
  dailyStats: AdDailyStats[];
  fetchedAt: number;
}
