// Advertising domain types
// Based on WoWonder ads.php API

export type AdBiddingType = 'clicks' | 'views';
export type AdAppearsType = 'post' | 'sidebar' | 'video';
export type AdGender = 'male' | 'female' | 'all';

export interface AdFormData {
  name: string;           // Company name (3-100 chars)
  website: string;       // URL (required)
  headline: string;      // Ad title (5-200 chars)
  description: string;    // Ad description
  audienceList: string;   // WoWonder country IDs: "233" or "233,1"
  gender: AdGender;
  bidding: AdBiddingType;
  media?: string;         // Local file URI for upload
  mediaName?: string;
  mediaType?: string;
  appears: AdAppearsType;
  location?: string;
  pageId?: string;        // Optional page ID
  startDate?: string;     // Format: YYYY-MM-DD
  endDate?: string;      // Format: YYYY-MM-DD
  budget?: number;
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
