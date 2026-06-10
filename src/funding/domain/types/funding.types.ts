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

export interface FundingListResponse {
  api_status: number;
  can_create: boolean;
  currency: string;
  currency_symbol: string;
  data: FundingItem[];
}

export interface FundingDetailResponse {
  api_status: number;
  currency: string;
  currency_symbol: string;
  data: FundingItem;
}

export interface FundingDonationsResponse {
  api_status: number;
  data: FundingDonation[];
}

export interface FundingMutationResponse {
  api_status: number | string;
  message?: string;
  data?: FundingItem;
  errors?: {
    error_id?: number | string;
    error_text?: string;
  };
}

export interface CreateFundingInput {
  title: string;
  description: string;
  amount: number;
  image: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface EditFundingInput {
  id: number;
  title: string;
  description: string;
  amount: number;
}
