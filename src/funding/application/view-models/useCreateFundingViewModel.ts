// Create Funding ViewModel
// Manages form state and submission for the Create Funding screen.

import { useCallback, useState } from 'react';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';
import type { FundingItem } from '../../domain/types/funding.types';

export interface CreateFundingFormState {
  title: string;
  description: string;
  amount: string;
  image: {
    uri: string;
    name: string;
    type: string;
  } | null;
}

export interface CreateFundingErrors {
  title?: string;
  description?: string;
  amount?: string;
  image?: string;
}

const INITIAL_FORM: CreateFundingFormState = {
  title: '',
  description: '',
  amount: '',
  image: null,
};

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;

export function useCreateFundingViewModel(initialCampaign?: FundingItem) {
  const [form, setForm] = useState<CreateFundingFormState>(() => {
    if (initialCampaign) {
      return {
        title: initialCampaign.title || '',
        description: initialCampaign.description || '',
        amount: String(initialCampaign.amount || ''),
        image: initialCampaign.image ? { uri: initialCampaign.image, name: 'image.jpg', type: 'image/jpeg' } : null,
      };
    }
    return INITIAL_FORM;
  });
  const [errors, setErrors] = useState<CreateFundingErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const updateField = useCallback(
    <K extends keyof CreateFundingFormState>(
      field: K,
      value: CreateFundingFormState[K],
    ) => {
      setForm(prev => ({ ...prev, [field]: value }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm(initialCampaign ? {
      title: initialCampaign.title || '',
      description: initialCampaign.description || '',
      amount: String(initialCampaign.amount || ''),
      image: initialCampaign.image ? { uri: initialCampaign.image, name: 'image.jpg', type: 'image/jpeg' } : null,
    } : INITIAL_FORM);
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [initialCampaign]);

  const validate = useCallback((): boolean => {
    const nextErrors: CreateFundingErrors = {};

    const title = form.title.trim();
    if (!title) {
      nextErrors.title = 'Vui lòng nhập tiêu đề chiến dịch';
    } else if (title.length > TITLE_MAX) {
      nextErrors.title = `Tiêu đề tối đa ${TITLE_MAX} ký tự`;
    }

    const description = form.description.trim();
    if (!description) {
      nextErrors.description = 'Vui lòng nhập mô tả chiến dịch';
    } else if (description.length > DESCRIPTION_MAX) {
      nextErrors.description = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự`;
    }

    const amountNumber = Number(form.amount);
    if (!form.amount || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      nextErrors.amount = 'Số tiền mục tiêu phải lớn hơn 0';
    }

    if (!initialCampaign && !form.image) {
      nextErrors.image = 'Vui lòng chọn ảnh đại diện cho chiến dịch';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form, initialCampaign]);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    if (!initialCampaign && !form.image) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    const repository = createFundingRepository();

    try {
      let response;
      if (initialCampaign) {
        const hasNewImage = form.image && !form.image.uri.startsWith('http');
        response = await repository.editFunding({
          id: initialCampaign.id,
          title: form.title.trim(),
          description: form.description.trim(),
          amount: Number(form.amount),
          image: hasNewImage ? form.image! : undefined,
        });
      } else {
        response = await repository.createFunding({
          title: form.title.trim(),
          description: form.description.trim(),
          amount: Number(form.amount),
          image: form.image!,
        });
      }

      if (response?.api_status === 200 || Number(response?.api_status) === 200) {
        setSubmitSuccess(true);
        return true;
      }

      const errorMessage =
        response?.errors?.error_text ??
        response?.message ??
        (initialCampaign ? 'Chỉnh sửa chiến dịch thất bại, vui lòng thử lại' : 'Tạo chiến dịch thất bại, vui lòng thử lại');
      setSubmitError(errorMessage);
      return false;
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : (initialCampaign ? 'Chỉnh sửa chiến dịch thất bại, vui lòng thử lại' : 'Tạo chiến dịch thất bại, vui lòng thử lại'),
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validate, initialCampaign]);

  return {
    form,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    updateField,
    resetForm,
    handleSubmit,
  };
}
