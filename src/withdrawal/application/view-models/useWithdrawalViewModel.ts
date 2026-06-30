// Description: Coordinates withdrawal overview loading, validation, and payout request submission.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWithdrawalRepository } from '../../infrastructure/repositories/ApiWithdrawalRepository';
import type {
  SepayBank,
  SepayWithdrawalDetails,
  WithdrawalHistoryItem,
  WithdrawalMethod,
  WithdrawalOverview,
} from '../../domain/types/withdrawal.types';

const repository = createWithdrawalRepository();

const DEFAULT_SEPAY_METHOD: WithdrawalMethod = { id: 'sepay', label: 'SePay' };
const EMPTY_SEPAY_DETAILS: SepayWithdrawalDetails = {
  bankCode: '',
  bankName: '',
  accountNumber: '',
  beneficiaryName: '',
};

function parseAmount(value: string) {
  return Number(value.replace(/[^\d.]/g, '')) || 0;
}

export function useWithdrawalViewModel() {
  const [overview, setOverview] = useState<WithdrawalOverview | null>(null);
  const [methods, setMethods] = useState<WithdrawalMethod[]>([
    DEFAULT_SEPAY_METHOD,
  ]);
  const [selectedMethod, setSelectedMethod] =
    useState<WithdrawalMethod>(DEFAULT_SEPAY_METHOD);
  const [amount, setAmount] = useState('0');
  const [accountValue, setAccountValue] = useState('');
  const [sepayDetails, setSepayDetails] =
    useState<SepayWithdrawalDetails>(EMPTY_SEPAY_DETAILS);
  const [sepayBanks, setSepayBanks] = useState<SepayBank[]>([]);
  const [isBanksLoading, setIsBanksLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const nextOverview = await repository.getOverview();
      setOverview(nextOverview);
      setMethods(nextOverview.methods);
      setSelectedMethod(
        nextOverview.methods.find(method => method.id === 'sepay') ||
          nextOverview.methods[0] ||
          DEFAULT_SEPAY_METHOD,
      );
      setAccountValue(nextOverview.accountValue);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải dữ liệu rút tiền.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview().catch(() => undefined);
  }, [loadOverview]);

  const loadSepayBanks = useCallback(async () => {
    setIsBanksLoading(true);
    try {
      const banks = await repository.getSepayBanks();
      setSepayBanks(banks);
      setSepayDetails(current => {
        if (current.bankCode || banks.length === 0) {
          return current;
        }
        const firstBank = banks[0];
        return {
          ...current,
          bankCode: firstBank.code,
          bankName: firstBank.shortName,
        };
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải danh sách ngân hàng SePay.',
      );
    } finally {
      setIsBanksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSepayBanks().catch(() => undefined);
  }, [loadSepayBanks]);

  const numericAmount = useMemo(() => parseAmount(amount), [amount]);
  const balance = overview?.balance ?? 0;
  const walletBalance = overview?.walletBalance ?? 0;
  const minimumAmount = overview?.minimumAmount ?? 0;
  const currency = overview?.currency ?? 'VNSEEA';
  const currencySymbol = overview?.currencySymbol ?? 'VNSEEA';
  const history: WithdrawalHistoryItem[] = overview?.history ?? [];
  const hasPendingRequest = Boolean(overview?.hasPendingRequest);

  const accountFieldLabel =
    selectedMethod.id === 'sepay'
      ? 'Tài khoản SePay'
      : selectedMethod.id === 'paypal'
      ? 'Email PayPal'
      : 'Thông tin tài khoản';

  const accountFieldPlaceholder =
    selectedMethod.id === 'sepay'
      ? 'Email, số điện thoại hoặc tài khoản nhận tiền'
      : selectedMethod.id === 'paypal'
      ? 'email@example.com'
      : 'Nhập thông tin nhận tiền';

  const accountKeyboardType =
    selectedMethod.id === 'paypal' ? 'email-address' : 'default';

  const updateSepayDetails = useCallback(
    (field: keyof SepayWithdrawalDetails, value: string) => {
      setSepayDetails(current => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const selectSepayBank = useCallback((bank: SepayBank) => {
    setSepayDetails(current => ({
      ...current,
      bankCode: bank.code,
      bankName: bank.shortName,
    }));
  }, []);

  const validate = useCallback(() => {
    if (!selectedMethod) {
      setError('Vui lòng chọn phương thức rút tiền.');
      return false;
    }

    if (!amount || numericAmount <= 0) {
      setError('Vui lòng nhập số tiền cần rút.');
      return false;
    }

    if (minimumAmount > 0 && numericAmount < minimumAmount) {
      setError(`Số tiền rút tối thiểu là ${minimumAmount}.`);
      return false;
    }

    if (numericAmount > balance) {
      setError('Số tiền rút vượt quá số dư có sẵn.');
      return false;
    }

    if (hasPendingRequest) {
      setError('Bạn đang có yêu cầu rút tiền chờ xử lý.');
      return false;
    }

    if (selectedMethod.id === 'sepay') {
      if (
        !sepayDetails.bankCode.trim() ||
        !sepayDetails.bankName.trim() ||
        !sepayDetails.accountNumber.trim() ||
        !sepayDetails.beneficiaryName.trim()
      ) {
        setError(
          'Vui lòng chọn ngân hàng, nhập số tài khoản và tên người thụ hưởng.',
        );
        return false;
      }
    } else {
      if (!accountValue.trim()) {
        setError(`Vui lòng nhập ${accountFieldLabel.toLowerCase()}.`);
        return false;
      }

      if (selectedMethod.id === 'paypal' && !accountValue.includes('@')) {
        setError('Email PayPal không hợp lệ.');
        return false;
      }
    }

    return true;
  }, [
    accountFieldLabel,
    accountValue,
    amount,
    balance,
    hasPendingRequest,
    minimumAmount,
    numericAmount,
    sepayDetails,
    selectedMethod,
  ]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      const message = await repository.requestWithdrawal({
        method: selectedMethod,
        amount: numericAmount,
        accountValue: accountValue.trim(),
        sepayDetails: {
          bankCode: sepayDetails.bankCode.trim(),
          bankName: sepayDetails.bankName.trim(),
          accountNumber: sepayDetails.accountNumber.trim(),
          beneficiaryName: sepayDetails.beneficiaryName.trim(),
        },
      });
      setSuccessMessage(message);
      setAmount('0');
      await loadOverview();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể gửi yêu cầu rút tiền.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    accountValue,
    loadOverview,
    numericAmount,
    sepayDetails,
    selectedMethod,
    validate,
  ]);

  return {
    methods,
    balance,
    walletBalance,
    minimumAmount,
    currency,
    currencySymbol,
    selectedMethod,
    setSelectedMethod,
    amount,
    setAmount,
    accountValue,
    setAccountValue,
    sepayDetails,
    updateSepayDetails,
    sepayBanks,
    selectSepayBank,
    isBanksLoading,
    accountFieldLabel,
    accountFieldPlaceholder,
    accountKeyboardType,
    history,
    hasPendingRequest,
    isLoading,
    isRefreshing,
    error,
    successMessage,
    handleSubmit,
    reload: loadOverview,
  };
}
