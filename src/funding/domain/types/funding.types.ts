// Funding domain types
// Port từ: client/src/funding/domain/types/

export interface FundingUser {
  user_id: string | number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  cover: string;
}

export interface FundingDonation {
  id: number;
  amount: string;
  time: number;
  user_data: FundingUser;
}

export interface FundingItem {
  id: number;
  hashed_id: string;
  user_id: number;
  title: string;
  description: string;
  amount: string;
  raised: string;
  image: string;
  time: number;
  user_data: FundingUser | null;
  recent_donations?: FundingDonation[];
  percentage?: number;
}

export interface FundingResponse {
  api_status: number;
  can_create: boolean;
  currency: string;
  currency_symbol: string;
  data: FundingItem[];
}
