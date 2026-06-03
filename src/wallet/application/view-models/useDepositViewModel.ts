// Description: Coordinates wallet top-up methods and SePay payment verification.
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Linking} from 'react-native';
import {apiConfig} from '../../../shared-kernel/infrastructure/config/env';
import type {TopupMethod} from '../../domain/types/wallet.types';
import type {SepayQRResponse} from '../../domain/repositories/WalletRepository';
import {createWalletRepository} from '../../infrastructure/repositories/ApiWalletRepository';

const repository = createWalletRepository();
const MINIMUM_TOPUP_AMOUNT = 10000;
const SEPAY_POLL_INTERVAL_MS = 5000;

type SepayOrder = NonNullable<SepayQRResponse['data']>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useDepositViewModel() {
  const [balance, setBalance] = useState(0);
  const [topupMethods, setTopupMethods] = useState<TopupMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sepayOrder, setSepayOrder] = useState<SepayOrder | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCheckError, setPaymentCheckError] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const numericAmount = useMemo(() => parseInt(amount, 10) || 0, [amount]);
  const isValidAmount = numericAmount >= MINIMUM_TOPUP_AMOUNT;
  const canSubmit = Boolean(isValidAmount && selectedMethod && !isProcessing);

  const loadWallet = useCallback(async () => {
    setIsLoadingMethods(true);

    try {
      const overview = await repository.getWalletOverview();
      const methods = overview.topupMethods || [];

      setBalance(overview.balance);
      setTopupMethods(methods);
      setSelectedMethod(currentMethod => {
        if (currentMethod && methods.some(method => method.value === currentMethod)) {
          return currentMethod;
        }

        return methods[0]?.value ?? null;
      });
    } finally {
      setIsLoadingMethods(false);
    }
  }, []);

  useEffect(() => {
    loadWallet().catch(error => {
      console.error('[Deposit] Load wallet error:', error);
    });
  }, [loadWallet]);

  const selectPreset = useCallback((value: number) => {
    setSelectedPreset(value);
    setAmount(String(value));
  }, []);

  const updateAmount = useCallback((text: string) => {
    setAmount(text.replace(/[^0-9]/g, ''));
    setSelectedPreset(null);
  }, []);

  const closeSepayOrder = useCallback(() => {
    setSepayOrder(null);
    setPaymentCheckError(null);
    setPaymentCompleted(false);
  }, []);

  const startDeposit = useCallback(async () => {
    if (!canSubmit || !selectedMethod) {
      return;
    }

    setIsProcessing(true);
    setPaymentCheckError(null);

    try {
      if (selectedMethod === 'sepay') {
        const result = await repository.createSepayQR(numericAmount);

        if (!result.data?.qr_url || !result.data.order_code) {
          throw new Error(result.errors?.error_text || 'Không tạo được mã QR SePay.');
        }

        setSepayOrder({...result.data, status: result.data.status || 'pending'});
        return;
      }

      const walletUrl = `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/wallet`;
      const canOpenWallet = await Linking.canOpenURL(walletUrl);

      if (!canOpenWallet) {
        throw new Error('Không mở được trang thanh toán.');
      }

      await Linking.openURL(walletUrl);
    } finally {
      setIsProcessing(false);
    }
  }, [canSubmit, numericAmount, selectedMethod]);

  const checkSepayPayment = useCallback(async () => {
    if (!sepayOrder?.order_code || isCheckingPayment || paymentCompleted) {
      return false;
    }

    setIsCheckingPayment(true);
    setPaymentCheckError(null);

    try {
      const result = await repository.checkSepayOrder(sepayOrder.order_code);
      const nextOrder = {...sepayOrder, ...result.data};
      const isPaid = Boolean(result.data?.paid || result.data?.status === 'paid');

      setSepayOrder(nextOrder);

      if (isPaid) {
        setPaymentCompleted(true);
        await loadWallet();
      }

      return isPaid;
    } catch (error) {
      setPaymentCheckError(getErrorMessage(error, 'Chưa kiểm tra được giao dịch.'));
      return false;
    } finally {
      setIsCheckingPayment(false);
    }
  }, [isCheckingPayment, loadWallet, paymentCompleted, sepayOrder]);

  useEffect(() => {
    if (!sepayOrder?.order_code || paymentCompleted) {
      return;
    }

    const intervalId = setInterval(() => {
      checkSepayPayment();
    }, SEPAY_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [checkSepayPayment, paymentCompleted, sepayOrder?.order_code]);

  return {
    amount,
    balance,
    canSubmit,
    closeSepayOrder,
    isCheckingPayment,
    isLoadingMethods,
    isProcessing,
    numericAmount,
    paymentCheckError,
    paymentCompleted,
    selectedMethod,
    selectedPreset,
    sepayOrder,
    setSelectedMethod,
    checkSepayPayment,
    selectPreset,
    startDeposit,
    topupMethods,
    updateAmount,
  };
}
