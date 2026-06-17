// Description: Coordinates marketplace checkout state, wallet checks, quantity changes, and payment.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createCheckoutRepository } from '../../infrastructure/repositories/ApiCheckoutRepository';
import type {
  CheckoutSummary,
  DeliveryAddress,
  DeliveryAddressInput,
  WalletCheckoutBalance,
} from '../../domain/types/checkout.types';

const repository = createCheckoutRepository();

export type CheckoutStep = 'cart' | 'confirm' | 'payment';

const EMPTY_ADDRESS_FORM: DeliveryAddressInput = {
  name: '',
  phone: '',
  country: '',
  city: '',
  zip: '',
  address: '',
};

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useCheckoutViewModel() {
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [walletBalance, setWalletBalance] =
    useState<WalletCheckoutBalance | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] =
    useState<DeliveryAddressInput>(EMPTY_ADDRESS_FORM);
  const [step, setStep] = useState<CheckoutStep>('confirm');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
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

  const canPay = Boolean(
    summary && walletBalance && walletBalance.wallet >= summary.total,
  );

  const itemCount = summary?.items.reduce(
    (count, item) => count + item.quantity,
    0,
  ) ?? 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPaymentError(null);

    try {
      const [nextSummary, nextAddresses, nextWalletBalance] =
        await Promise.all([
          repository.getSummary(),
          repository.getAddresses(),
          repository.getWalletBalance(),
        ]);
      setSummary(nextSummary);
      setAddresses(nextAddresses);
      setWalletBalance(nextWalletBalance);

      const nextSelectedAddress = nextAddresses[0];
      if (nextSelectedAddress) {
        setSelectedAddressId(nextSelectedAddress.id);
        setAddressForm(nextSelectedAddress);
        setStep('payment');
      } else {
        setSelectedAddressId('');
        setAddressForm(EMPTY_ADDRESS_FORM);
        setStep('confirm');
      }
    } catch (caughtError) {
      setError(messageFromError(caughtError, 'Không tải được thông tin thanh toán.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const refreshWallet = useCallback(async () => {
    setWalletBalance(await repository.getWalletBalance());
  }, []);

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

  const saveAddress = useCallback(async () => {
    const requiredFields: Array<keyof DeliveryAddressInput> = [
      'name',
      'phone',
      'country',
      'city',
      'zip',
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
      const nextAddresses = await repository.saveAddress(addressForm);
      setAddresses(nextAddresses);
      const savedAddress = nextAddresses[0];
      if (savedAddress) {
        setSelectedAddressId(savedAddress.id);
        setAddressForm(savedAddress);
      }
      await refreshWallet();
      setStep('payment');
      return true;
    } catch (caughtError) {
      setAddressError(messageFromError(caughtError, 'Không thể lưu địa chỉ.'));
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  }, [addressForm, refreshWallet]);

  const changeQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (quantity < 0 || isUpdatingQuantity) return;
      setIsUpdatingQuantity(true);
      setPaymentError(null);

      try {
        setSummary(await repository.changeQuantity(productId, quantity));
        await refreshWallet();
      } catch (caughtError) {
        setPaymentError(
          messageFromError(caughtError, 'Không thể cập nhật số lượng.'),
        );
      } finally {
        setIsUpdatingQuantity(false);
      }
    },
    [isUpdatingQuantity, refreshWallet],
  );

  const openConfirm = useCallback(() => {
    const addressId = selectedAddressId || selectedAddress?.id;
    if (!addressId) {
      setPaymentError('Bạn cần lưu địa chỉ giao hàng trước khi thanh toán.');
      setStep('confirm');
      return;
    }
    if (!canPay) {
      setPaymentError('Số dư ví không đủ để thanh toán đơn hàng này.');
      return;
    }
    setConfirmVisible(true);
  }, [canPay, selectedAddress, selectedAddressId]);

  const pay = useCallback(async () => {
    const addressId = selectedAddressId || selectedAddress?.id;
    if (!addressId) {
      setPaymentError('Bạn cần lưu địa chỉ giao hàng trước khi thanh toán.');
      setStep('confirm');
      return false;
    }

    setIsPaying(true);
    setPaymentError(null);
    setSuccessMessage(null);

    try {
      const result = await repository.buy(addressId);
      setConfirmVisible(false);
      if (result.success) {
        setSuccessMessage(result.message);
        setSuccessVisible(true);
      } else {
        setPaymentError(result.message);
      }
      await load();
      setStep('payment');
      return result.success;
    } catch (caughtError) {
      setPaymentError(
        messageFromError(
          caughtError,
          'Không thể thanh toán. Vui lòng kiểm tra số dư ví hoặc thử lại.',
        ),
      );
      setConfirmVisible(false);
      setStep('payment');
      return false;
    } finally {
      setIsPaying(false);
    }
  }, [load, selectedAddress, selectedAddressId]);

  return {
    addressError,
    addressForm,
    addresses,
    canPay,
    confirmVisible,
    error,
    isLoading,
    isPaying,
    isSavingAddress,
    isUpdatingQuantity,
    itemCount,
    paymentError,
    selectedAddress,
    selectedAddressId,
    step,
    successMessage,
    successVisible,
    summary,
    walletBalance,
    changeQuantity,
    closeConfirm: () => setConfirmVisible(false),
    closeSuccess: () => setSuccessVisible(false),
    load,
    openConfirm,
    pay,
    saveAddress,
    setStep,
    updateAddressField,
  };
}
