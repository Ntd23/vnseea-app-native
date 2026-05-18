// Description: Manages form state for the Create Ad screen (UI-only phase).
import { useState } from 'react';

export type AdGender = 'all' | 'male' | 'female';

export interface CreateAdForm {
  title: string;
  description: string;
  startDate: string;
  website: string;
  page: string;
  location: string;
  ageRange: string;
  gender: AdGender;
  adPosition: string;
  budget: string;
}

const INITIAL_FORM: CreateAdForm = {
  title: '',
  description: '',
  startDate: '',
  website: '',
  page: '',
  location: '',
  ageRange: 'Rộng (18-65+)',
  gender: 'all',
  adPosition: 'Tự động (khuyến dùng)',
  budget: '100.000',
};

export function useCreateAdViewModel() {
  const [form, setForm] = useState<CreateAdForm>(INITIAL_FORM);
  const [isSubmitting] = useState(false);

  const updateField = <K extends keyof CreateAdForm>(
    field: K,
    value: CreateAdForm[K],
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // UI-only: no real submission
  };

  return { form, updateField, isSubmitting, handleSubmit };
}
