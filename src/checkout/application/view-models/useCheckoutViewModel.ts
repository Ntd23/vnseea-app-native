// Description: Coordinates marketplace checkout state, wallet checks, quantity changes, and payment.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createCheckoutRepository } from '../../infrastructure/repositories/ApiCheckoutRepository';
import { createUserRepository } from '../../../user/infrastructure/repositories/ApiUserRepository';
import type { UserProfile } from '../../../user/domain/types/user.types';
import type {
  CheckoutSummary,
  DeliveryAddress,
  DeliveryAddressInput,
} from '../../domain/types/checkout.types';
import { createCheckoutSummary } from '../../domain/checkoutMoney';
import { setSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

const repository = createCheckoutRepository();
const userRepository = createUserRepository();

export type CheckoutStep = 'cart' | 'confirm' | 'payment';

export type CheckoutViewModelOptions = {
  selectedProductIds?: number[];
  selectedAddressId?: string;
  initialStep?: CheckoutStep;
};

const EMPTY_ADDRESS_FORM: DeliveryAddressInput = {
  name: '',
  phone: '',
  country: '',
  city: '',
  zip: '10000',
  address: '',
};

function createEmptyAddressForm(
  profile: UserProfile | null,
): DeliveryAddressInput {
  const userFullName = profile
    ? [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || profile.name
    : '';
  return {
    ...EMPTY_ADDRESS_FORM,
    name: userFullName || '',
    phone: profile?.phoneNumber || '',
  };
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function countSummaryItems(summary: CheckoutSummary | null) {
  return (
    summary?.items.reduce((count, item) => count + Math.max(0, item.quantity), 0) ??
    0
  );
}

export function useCheckoutViewModel(options: CheckoutViewModelOptions = {}) {
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] =
    useState<DeliveryAddressInput>(EMPTY_ADDRESS_FORM);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [step, setStep] = useState<CheckoutStep>('confirm');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddressId, setIsDeletingAddressId] = useState<
    string | null
  >(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const selectedAddress = useMemo(
    () => addresses.find(address => address.id === selectedAddressId),
    [addresses, selectedAddressId],
  );

  const selectedSummary = useMemo(() => {
    if (!summary) return null;
    const selectedIds = new Set(
      (options.selectedProductIds ?? [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0),
    );
    if (!selectedIds.size) return summary;

    const items = summary.items.filter(item => selectedIds.has(item.productId));
    return createCheckoutSummary(items, summary.shipping);
  }, [options.selectedProductIds, summary]);

  const canPay = Boolean(selectedSummary);

  const itemCount = selectedSummary?.items.reduce(
    (count, item) => count + item.quantity,
    0,
  ) ?? 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPaymentError(null);

    try {
      const [nextSummary, nextAddresses, nextUserProfile] =
        await Promise.all([
          repository.getSummary(),
          repository.getAddresses(),
          userRepository.getCurrentUser().catch(() => null),
      ]);
      setSummary(nextSummary);
      setSyncedCartCount(countSummaryItems(nextSummary));
      setAddresses(nextAddresses);
      setCurrentUserProfile(nextUserProfile);

      const nextSelectedAddress =
        nextAddresses.find(address => address.id === options.selectedAddressId) ??
        nextAddresses[0];
      if (nextSelectedAddress) {
        setSelectedAddressId(nextSelectedAddress.id);
        setAddressForm(nextSelectedAddress);
        setStep(options.initialStep ?? 'payment');
      } else {
        setSelectedAddressId('');
        setAddressForm(createEmptyAddressForm(nextUserProfile));
        setStep(options.initialStep ?? 'confirm');
      }
    } catch (caughtError) {
      setError(messageFromError(caughtError, 'Không tải được thông tin thanh toán.'));
    } finally {
      setIsLoading(false);
    }
  }, [options.initialStep, options.selectedAddressId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const updateAddressField = useCallback(
    (field: keyof DeliveryAddressInput, value: string) => {
      setAddressForm(current => ({
        ...current,
        [field]: value,
      }));
      setAddressError(null);
    },
    [],
  );

  const selectAddress = useCallback((address: DeliveryAddress) => {
    setSelectedAddressId(address.id);
    setAddressForm(address);
    setAddressError(null);
    setStep('payment');
  }, []);

  const createNewAddress = useCallback(() => {
    setSelectedAddressId('');
    setAddressForm(createEmptyAddressForm(currentUserProfile));
    setAddressError(null);
    setStep('confirm');
  }, [currentUserProfile]);

  const editAddress = useCallback((address: DeliveryAddress) => {
    setAddressForm(address);
    setAddressError(null);
    setStep('confirm');
  }, []);

  const deleteAddress = useCallback(
    async (addressId: string) => {
      if (!addressId || isDeletingAddressId) return false;

      setIsDeletingAddressId(addressId);
      setAddressError(null);
      try {
        const nextAddresses = await repository.deleteAddress(addressId);
        setAddresses(nextAddresses);

        const deletedSelectedAddress = selectedAddressId === addressId;
        const deletedEditedAddress = addressForm.id === addressId;
        if (nextAddresses.length === 0) {
          setSelectedAddressId('');
          setAddressForm(createEmptyAddressForm(currentUserProfile));
          setStep('confirm');
        } else if (deletedSelectedAddress) {
          const fallbackAddress = nextAddresses[0];
          setSelectedAddressId(fallbackAddress.id);
          setAddressForm(fallbackAddress);
          setStep('payment');
        } else if (deletedEditedAddress) {
          const currentSelection =
            nextAddresses.find(
              address => address.id === selectedAddressId,
            ) ?? nextAddresses[0];
          setAddressForm(currentSelection);
          setStep('payment');
        }
        return true;
      } catch (caughtError) {
        setAddressError(
          messageFromError(caughtError, 'Không thể xóa địa chỉ.'),
        );
        return false;
      } finally {
        setIsDeletingAddressId(null);
      }
    },
    [
      addressForm.id,
      currentUserProfile,
      isDeletingAddressId,
      selectedAddressId,
    ],
  );

  const saveAddress = useCallback(async () => {
    const requiredFields: Array<keyof DeliveryAddressInput> = [
      'name',
      'phone',
      'country',
      'city',
      'address',
    ];
    const missingField = requiredFields.find(
      field => !String(addressForm[field] ?? '').trim(),
    );

    if (missingField) {
      setAddressError('Vui lòng nhập đầy đủ thông tin giao hàng.');
      return false;
    }

    setIsSavingAddress(true);
    setAddressError(null);

    try {
      const nextAddresses = await repository.saveAddress({
        ...addressForm,
        zip: String(addressForm.zip || '').trim() || '10000',
      });
      setAddresses(nextAddresses);
      const savedAddress = addressForm.id
        ? nextAddresses.find(a => a.id === addressForm.id)
        : nextAddresses[0];
      if (savedAddress) {
        setSelectedAddressId(savedAddress.id);
        setAddressForm(savedAddress);
      }
      setStep('payment');
      return true;
    } catch (caughtError) {
      setAddressError(messageFromError(caughtError, 'Không thể lưu địa chỉ.'));
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  }, [addressForm]);

  const changeQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (quantity < 0 || isUpdatingQuantity) return;
      setIsUpdatingQuantity(true);
      setPaymentError(null);

      try {
        const nextSummary = await repository.changeQuantity(productId, quantity);
        setSummary(nextSummary);
        setSyncedCartCount(countSummaryItems(nextSummary));
      } catch (caughtError) {
        setPaymentError(
          messageFromError(caughtError, 'Không thể cập nhật số lượng.'),
        );
      } finally {
        setIsUpdatingQuantity(false);
      }
    },
    [isUpdatingQuantity],
  );

  const openConfirm = useCallback(() => {
    const addressId = selectedAddressId || selectedAddress?.id;
    if (!addressId) {
      setPaymentError('Bạn cần lưu địa chỉ giao hàng trước khi gửi yêu cầu mua.');
      setStep('confirm');
      return;
    }
    setConfirmVisible(true);
  }, [selectedAddress, selectedAddressId]);

  const pay = useCallback(async () => {
    const addressId = selectedAddressId || selectedAddress?.id;
    if (!addressId) {
      setPaymentError('Bạn cần lưu địa chỉ giao hàng trước khi gửi yêu cầu mua.');
      setStep('confirm');
      return false;
    }
    if (!selectedSummary || selectedSummary.items.length === 0) {
      setPaymentError('Giỏ hàng trống.');
      return false;
    }

    setIsPaying(true);
    setPaymentError(null);
    setSuccessMessage(null);

    try {
      const result = await repository.requestOrder(
        addressId,
        selectedSummary.items.map(item => item.productId),
      );
      if (!result.success) {
        throw new Error(result.message);
      }

      setConfirmVisible(false);
      setSuccessMessage(result.message);
      setSuccessVisible(true);
      setSyncedCartCount(result.cartCount, -itemCount);

      await load();
      setStep('payment');
      return true;
    } catch (caughtError) {
      setPaymentError(
        messageFromError(
          caughtError,
          'Không thể đặt hàng. Vui lòng kiểm tra lại kết nối.',
        ),
      );
      setConfirmVisible(false);
      setStep('payment');
      return false;
    } finally {
      setIsPaying(false);
    }
  }, [itemCount, load, selectedAddress, selectedAddressId, selectedSummary]);

  return {
    addressError,
    addressForm,
    addresses,
    canPay,
    confirmVisible,
    error,
    isLoading,
    isDeletingAddressId,
    isPaying,
    isSavingAddress,
    isUpdatingQuantity,
    itemCount,
    paymentError,
    selectedAddress,
    selectedAddressId,
    selectedSummary,
    step,
    successMessage,
    successVisible,
    summary,
    changeQuantity,
    closeConfirm: () => setConfirmVisible(false),
    closeSuccess: () => setSuccessVisible(false),
    createNewAddress,
    deleteAddress,
    editAddress,
    load,
    openConfirm,
    pay,
    saveAddress,
    selectAddress,
    setStep,
    updateAddressField,
  };
}
