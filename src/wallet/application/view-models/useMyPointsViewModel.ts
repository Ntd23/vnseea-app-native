// Description: Coordinates member points loading, exchange validation, and history refresh.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createMyPointsRepository } from '../../infrastructure/repositories/ApiMyPointsRepository';
import type { UserPoints } from '../../domain/types/wallet.types';

const repository = createMyPointsRepository();

function toNumber(value: string) {
  const number = Number(String(value).replace(/[^\d]/g, ''));
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

export function useMyPointsViewModel() {
  const [data, setData] = useState<UserPoints | null>(null);
  const [exchangePoints, setExchangePoints] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await repository.getOverview();
      setData(overview);
      setExchangePoints(String(overview.exchangeStepPoints));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải dữ liệu điểm thành viên.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const numericExchangePoints = useMemo(
    () => toNumber(exchangePoints),
    [exchangePoints],
  );

  const canExchange = useMemo(() => {
    if (!data) return false;
    if (data.maxExchangePoints < data.exchangeStepPoints) return false;
    if (numericExchangePoints < data.exchangeStepPoints) return false;
    if (numericExchangePoints > data.maxExchangePoints) return false;
    return numericExchangePoints % data.exchangeStepPoints === 0;
  }, [data, numericExchangePoints]);

  const submitExchange = useCallback(async () => {
    if (!data) return false;
    setExchangeError(null);
    setSuccessMessage(null);

    if (!canExchange) {
      setExchangeError(
        `Số điểm phải là bội số của ${data.exchangeStepPoints.toLocaleString(
          'vi-VN',
        )}.`,
      );
      return false;
    }

    setIsSubmitting(true);
    try {
      const result = await repository.exchangePoints(numericExchangePoints);
      setSuccessMessage(result.message);
      await load();
      return true;
    } catch (submitError) {
      setExchangeError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể đổi điểm.',
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [canExchange, data, load, numericExchangePoints]);

  return {
    data,
    exchangePoints,
    setExchangePoints,
    numericExchangePoints,
    canExchange,
    isLoading,
    isSubmitting,
    error,
    exchangeError,
    successMessage,
    reload: load,
    submitExchange,
  };
}
