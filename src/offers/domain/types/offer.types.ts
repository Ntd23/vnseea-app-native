// Description: Offer domain types for VnseeaRn app.
export type DiscountType =
  | 'discount_percent'
  | 'discount_amount'
  | 'buy_get_discount'
  | 'spend_get_off'
  | 'free_shipping';

export interface Offer {
  id: number;
  productId?: number;
  postId?: number;
  url?: string;
  pageId: number;
  userId: number;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  buy: number;
  get: number;
  spend: number;
  amountOff: number;
  description: string;
  discountedItems: string;
  image: string;
  currency: string;
  expireDate: string;
  expireTime: string;
  time: number;
  pageName?: string;
  pageAvatar?: string;
}

export interface OfferWithDisplay extends Offer {
  discountText: string;
  isExpired: boolean;
  daysLeft: number;
}

export interface CreateOfferInput {
  pageId: number;
  discountType: DiscountType;
  discountPercent?: number;
  discountAmount?: number;
  buy?: number;
  get?: number;
  spend?: number;
  amountOff?: number;
  description: string;
  discountedItems?: string;
  expireDate: string;
  expireTime: string;
  currency: string;
  thumbnailBase64?: string;
}
