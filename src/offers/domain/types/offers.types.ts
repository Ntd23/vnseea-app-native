// Description: Offer/Offer domain types
// Port từ: client/src/offers/domain/types/

export type DiscountType =
  | 'discount_percent'
  | 'discount_amount'
  | 'buy_get_discount'
  | 'spend_get_off'
  | 'free_shipping';

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  discount_percent: 'Giảm %',
  discount_amount: 'Giảm tiền',
  buy_get_discount: 'Mua X tặng Y',
  spend_get_off: 'Chi tiêu được giảm',
  free_shipping: 'Miễn phí ship',
};

export interface OfferItem {
  id: number;
  productId?: number;
  postId?: number;
  url?: string;
  page_id: number;
  user_id: number;
  discount_type: DiscountType;
  discount_percent: number;
  discount_amount: number;
  buy: number;
  get_price: number;
  spend: number;
  amount_off: number;
  description: string;
  discounted_items: string;
  expire_date: string;
  expire_time: string;
  image: string;
  time: number;
  page?: {
    page_id: number;
    page_title: string;
    page_name: string;
    avatar: string;
    cover: string;
  };
}

export interface OffersResponse {
  api_status: number;
  data: OfferItem[];
}

export interface CreateOfferPayload {
  discountType: DiscountType;
  description: string;
  pageId: string | number;
  discountPercent?: number;
  discountAmount?: number;
  buy?: number;
  get?: number;
  spend?: number;
  amountOff?: number;
  expireDate: string;
  expireTime: string;
  discountedItems?: string;
  thumbnail?: {
    uri: string;
    name: string;
    type: string;
  };
}
