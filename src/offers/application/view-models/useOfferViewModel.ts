// Description: ViewModel for offers.
import { useState, useCallback, useMemo } from 'react';
import type {
  Offer,
  OfferWithDisplay,
  DiscountType,
  CreateOfferInput,
} from '../../domain/types/offer.types';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

const MOCK_OFFERS: Offer[] = [
  {
    id: 1,
    pageId: 101,
    userId: 1,
    discountType: 'discount_percent',
    discountPercent: 50,
    discountAmount: 0,
    buy: 0,
    get: 0,
    spend: 0,
    amountOff: 0,
    description: 'Giảm giá 50% tất cả sản phẩm công nghệ. Áp dụng cho khách hàng mới và cũ.',
    discountedItems: 'Điện thoại, Laptop, Phụ kiện',
    image: 'https://picsum.photos/seed/offer1/400/200',
    currency: 'VNSEEA',
    expireDate: '2026-06-30',
    expireTime: '23:59',
    time: Math.floor(Date.now() / 1000) - 86400,
    pageName: 'TechViet Community',
    pageAvatar: 'https://i.pravatar.cc/100?img=20',
  },
  {
    id: 2,
    pageId: 101,
    userId: 1,
    discountType: 'buy_get_discount',
    discountPercent: 30,
    discountAmount: 0,
    buy: 2,
    get: 1,
    spend: 0,
    amountOff: 0,
    description: 'Mua 2 tặng 1 giảm thêm 30%. Cơ hội tốt cho tín đồ mua sắm.',
    discountedItems: 'Áo thun, Quần jean',
    image: 'https://picsum.photos/seed/offer2/400/200',
    currency: 'VND',
    expireDate: '2026-07-15',
    expireTime: '23:59',
    time: Math.floor(Date.now() / 1000) - 172800,
    pageName: 'TechViet Community',
    pageAvatar: 'https://i.pravatar.cc/100?img=20',
  },
  {
    id: 3,
    pageId: 101,
    userId: 1,
    discountType: 'free_shipping',
    discountPercent: 0,
    discountAmount: 0,
    buy: 0,
    get: 0,
    spend: 0,
    amountOff: 0,
    description: 'Miễn phí vận chuyển cho mọi đơn hàng trong tháng 6. Áp dụng toàn quốc.',
    discountedItems: 'Tất cả sản phẩm',
    image: 'https://picsum.photos/seed/offer3/400/200',
    currency: 'VND',
    expireDate: '2026-06-20',
    expireTime: '23:59',
    time: Math.floor(Date.now() / 1000) - 432000,
    pageName: 'TechViet Community',
    pageAvatar: 'https://i.pravatar.cc/100?img=20',
  },
  {
    id: 4,
    pageId: 101,
    userId: 1,
    discountType: 'spend_get_off',
    discountPercent: 0,
    discountAmount: 0,
    buy: 0,
    get: 0,
    spend: 500000,
    amountOff: 100000,
    description: 'Chi tiêu 500K giảm ngay 100K. Chương trình đặc biệt cuối tuần.',
    discountedItems: 'Tất cả sản phẩm',
    image: 'https://picsum.photos/seed/offer4/400/200',
    currency: 'VND',
    expireDate: '2026-05-30',
    expireTime: '23:59',
    time: Math.floor(Date.now() / 1000) - 864000,
    pageName: 'TechViet Community',
    pageAvatar: 'https://i.pravatar.cc/100?img=20',
  },
];

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  discount_percent: 'Giảm %',
  discount_amount: 'Giảm tiền',
  buy_get_discount: 'Mua X tặng Y',
  spend_get_off: 'Chi tiêu X giảm Y',
  free_shipping: 'Miễn phí ship',
};

const CURRENCY_OPTIONS = [
  { value: 'VNSEEA', label: 'VNSEEA' },
  { value: 'USD', label: 'USD' },
];

const CREATE_OFFER_COPY: Record<AppLanguage, {
  validation: {
    descriptionMin: string;
    expiryRequired: string;
    itemsMax: string;
    percentRange: string;
    amountPositive: string;
    buyPositive: string;
    getPositive: string;
    spendPositive: string;
    submitFailed: string;
  };
}> = {
  vi: {
    validation: {
      descriptionMin: 'Mô tả phải có ít nhất 32 ký tự',
      expiryRequired: 'Vui lòng chọn ngày và giờ hết hạn',
      itemsMax: 'Sản phẩm áp dụng phải ít hơn 100 ký tự',
      percentRange: 'Phần trăm giảm phải từ 1-99',
      amountPositive: 'Số tiền giảm phải lớn hơn 0',
      buyPositive: 'Số lượng mua phải lớn hơn 0',
      getPositive: 'Số lượng tặng phải lớn hơn 0',
      spendPositive: 'Số tiền chi tiêu phải lớn hơn 0',
      submitFailed: 'Đăng ưu đãi thất bại',
    },
  },
  en: {
    validation: {
      descriptionMin: 'Description must be at least 32 characters',
      expiryRequired: 'Please choose an expiry date and time',
      itemsMax: 'Applied products must be under 100 characters',
      percentRange: 'Discount percentage must be between 1 and 99',
      amountPositive: 'Discount amount must be greater than 0',
      buyPositive: 'Buy quantity must be greater than 0',
      getPositive: 'Gift quantity must be greater than 0',
      spendPositive: 'Minimum spend must be greater than 0',
      submitFailed: 'Could not create offer',
    },
  },
};

function getDiscountText(offer: Offer): string {
  switch (offer.discountType) {
    case 'discount_percent':
      return `GIẢM ${offer.discountPercent}%`;
    case 'discount_amount':
      return `GIẢM ${offer.discountAmount.toLocaleString()} ${offer.currency}`;
    case 'buy_get_discount':
      return `MUA ${offer.buy} TẶNG ${offer.get} -${offer.discountPercent}%`;
    case 'spend_get_off':
      return `CHI ${offer.spend.toLocaleString()} GIẢM ${offer.amountOff.toLocaleString()}`;
    case 'free_shipping':
      return 'MIỄN PHÍ SHIP';
    default:
      return 'ƯU ĐÃI';
  }
}

function isOfferExpired(offer: Offer): boolean {
  const expireTimestamp = new Date(`${offer.expireDate}T${offer.expireTime}`).getTime();
  return expireTimestamp < Date.now();
}

function getDaysLeft(offer: Offer): number {
  const expireTimestamp = new Date(`${offer.expireDate}T${offer.expireTime}`).getTime();
  const diff = expireTimestamp - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function enrichOffer(offer: Offer): OfferWithDisplay {
  return {
    ...offer,
    discountText: getDiscountText(offer),
    isExpired: isOfferExpired(offer),
    daysLeft: getDaysLeft(offer),
  };
}

export function useOffersViewModel(pageId?: number) {
  const [offers] = useState<OfferWithDisplay[]>(
    MOCK_OFFERS.filter(o => !pageId || o.pageId === pageId).map(enrichOffer),
  );
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
      return b.time - a.time;
    });
  }, [offers]);

  return {
    offers: sortedOffers,
    isLoading,
    error,
    refresh: useCallback(() => {
      console.log('[Offers] refresh');
    }, []),
  };
}

export function useCreateOfferViewModel(pageId: number, language: AppLanguage = 'vi') {
  const copy = CREATE_OFFER_COPY[language] ?? CREATE_OFFER_COPY.vi;
  const [discountType, setDiscountType] = useState<DiscountType>('discount_percent');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [discountAmount, setDiscountAmount] = useState('');
  const [buy, setBuy] = useState('');
  const [get, setGet] = useState('');
  const [spend, setSpend] = useState('');
  const [amountOff, setAmountOff] = useState('');
  const [description, setDescription] = useState('');
  const [discountedItems, setDiscountedItems] = useState('');
  const [expireDate, setExpireDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [expireTime, setExpireTime] = useState('23:59');
  const [currency, setCurrency] = useState('VNSEEA');
  const [thumbnailBase64, setThumbnailBase64] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountTypeOptions = Object.entries(DISCOUNT_LABELS).map(([value, label]) => ({
    value: value as DiscountType,
    label,
  }));

  const reset = useCallback(() => {
    setDiscountType('discount_percent');
    setDiscountPercent('10');
    setDiscountAmount('');
    setBuy('');
    setGet('');
    setSpend('');
    setAmountOff('');
    setDescription('');
    setDiscountedItems('');
    setThumbnailBase64(undefined);
    setIsLoading(false);
    setError(null);
  }, []);

  const validate = useCallback((): string | null => {
    if (description.trim().length < 32) {
      return copy.validation.descriptionMin;
    }
    if (!expireDate || !expireTime) {
      return copy.validation.expiryRequired;
    }
    if (discountedItems && discountedItems.length > 100) {
      return copy.validation.itemsMax;
    }
    switch (discountType) {
      case 'discount_percent': {
        const pct = Number(discountPercent);
        if (!pct || pct < 1 || pct > 99) return copy.validation.percentRange;
        break;
      }
      case 'discount_amount': {
        const amt = Number(discountAmount);
        if (!amt || amt < 1) return copy.validation.amountPositive;
        break;
      }
      case 'buy_get_discount': {
        const pct = Number(discountPercent);
        const b = Number(buy);
        const g = Number(get);
        if (!b || b < 1) return copy.validation.buyPositive;
        if (!g || g < 1) return copy.validation.getPositive;
        if (!pct || pct < 1 || pct > 99) return copy.validation.percentRange;
        break;
      }
      case 'spend_get_off': {
        const s = Number(spend);
        const a = Number(amountOff);
        if (!s || s < 1) return copy.validation.spendPositive;
        if (!a || a < 1) return copy.validation.amountPositive;
        break;
      }
      default:
        break;
    }
    return null;
  }, [
    description,
    expireDate,
    expireTime,
    discountedItems,
    discountType,
    discountPercent,
    discountAmount,
    buy,
    get,
    spend,
    amountOff,
    copy,
  ]);

  const submit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const input: CreateOfferInput = {
        pageId,
        discountType,
        description: description.trim(),
        discountedItems: discountedItems.trim(),
        expireDate,
        expireTime,
        currency,
        thumbnailBase64,
        ...(discountType === 'discount_percent' && { discountPercent: Number(discountPercent) }),
        ...(discountType === 'discount_amount' && { discountAmount: Number(discountAmount) }),
        ...(discountType === 'buy_get_discount' && {
          discountPercent: Number(discountPercent),
          buy: Number(buy),
          get: Number(get),
        }),
        ...(discountType === 'spend_get_off' && {
          spend: Number(spend),
          amountOff: Number(amountOff),
        }),
      };
      console.log('[Offers] submit:', input);
      // TODO: call repository.createOffer(input)
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.validation.submitFailed);
      setIsLoading(false);
      return false;
    }
  }, [
    validate,
    pageId,
    discountType,
    description,
    discountedItems,
    expireDate,
    expireTime,
    currency,
    thumbnailBase64,
    discountPercent,
    discountAmount,
    buy,
    get,
    spend,
    amountOff,
    copy,
  ]);

  return {
    discountType,
    discountPercent,
    discountAmount,
    buy,
    get,
    spend,
    amountOff,
    description,
    discountedItems,
    expireDate,
    expireTime,
    currency,
    thumbnailBase64,
    isLoading,
    error,
    discountTypeOptions,
    currencyOptions: CURRENCY_OPTIONS,
    setDiscountType,
    setDiscountPercent,
    setDiscountAmount,
    setBuy,
    setGet,
    setSpend,
    setAmountOff,
    setDescription,
    setDiscountedItems,
    setExpireDate,
    setExpireTime,
    setCurrency,
    setThumbnailBase64,
    setError,
    submit,
    reset,
  };
}
