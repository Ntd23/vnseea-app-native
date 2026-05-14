// Withdrawal ViewModel — mock UI state, no real API calls yet

import { useState, useCallback, useEffect } from 'react';
import type {
  WithdrawalMethod,
} from '../../domain/types/withdrawal.types';

const METHODS: WithdrawalMethod[] = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'bank_transfer', label: 'Chuyển khoản ngân hàng' },
  { id: 'momo', label: 'Ví MoMo' },
];

const MOCK_BALANCE = '$1,250.00';
const MIN_AMOUNT = 50;

export function useWithdrawalViewModel() {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>(
    METHODS[0],
  );
  const [amount, setAmount] = useState('');
  const [accountValue, setAccountValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset account field when method changes
  useEffect(() => {
    setAccountValue('');
    setError(null);
  }, [selectedMethod]);

  const accountFieldLabel =
    selectedMethod.id === 'paypal'
      ? 'Email PayPal'
      : selectedMethod.id === 'bank_transfer'
      ? 'Số tài khoản ngân hàng'
      : 'Số điện thoại MoMo';

  const accountFieldPlaceholder =
    selectedMethod.id === 'paypal'
      ? 'email@example.com'
      : selectedMethod.id === 'bank_transfer'
      ? '0123456789'
      : '0901234567';

  const accountKeyboardType =
    selectedMethod.id === 'paypal' ? 'email-address' : 'phone-pad';

  const validate = useCallback((): boolean => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt < MIN_AMOUNT) {
      setError(`Số tiền tối thiểu là $${MIN_AMOUNT}.00`);
      return false;
    }
    if (!accountValue.trim()) {
      setError(`Vui lòng nhập ${accountFieldLabel.toLowerCase()}.`);
      return false;
    }
    if (selectedMethod.id === 'paypal' && !accountValue.includes('@')) {
      setError('Email PayPal không hợp lệ.');
      return false;
    }
    return true;
  }, [amount, accountValue, accountFieldLabel, selectedMethod]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    if (!validate()) return;

    setIsLoading(true);
    // Mock async delay
    await new Promise<void>(resolve => setTimeout(resolve, 1400));
    setIsLoading(false);
    setSuccessMessage('Yêu cầu rút tiền đã được gửi thành công!');
  }, [validate]);

  return {
    // Data
    methods: METHODS,
    balance: MOCK_BALANCE,
    // Form state
    selectedMethod,
    setSelectedMethod,
    amount,
    setAmount,
    accountValue,
    setAccountValue,
    // Account field meta
    accountFieldLabel,
    accountFieldPlaceholder,
    accountKeyboardType,
    // Async state
    isLoading,
    error,
    successMessage,
    handleSubmit,
  };
}
