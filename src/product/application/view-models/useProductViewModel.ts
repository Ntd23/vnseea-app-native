// Product ViewModel - Handles product creation and listing
import { useState, useCallback } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { CreateProductInput, GetProductsInput, ProductItem } from '../../domain/types/product.types';

const repository = createProductRepository();

export interface ProductFormData {
  product_title: string;
  product_category: string;
  product_description: string;
  product_price: string;
  product_location: string;
  product_type: number;
  currency: string;
  lat?: string;
  lng?: string;
  units?: number;
  product_sub_category?: string;
  images: { uri: string; name: string; type: string }[];
}

export interface ProductWizardState {
  step: number;
  formData: ProductFormData;
  errors: Record<string, string>;
}

const initialFormData: ProductFormData = {
  product_title: '',
  product_category: '',
  product_description: '',
  product_price: '',
  product_location: '',
  product_type: 0,
  currency: 'VND',
  lat: '',
  lng: '',
  units: undefined,
  product_sub_category: '',
  images: [],
};

export function useProductViewModel() {
  const [state, setState] = useState<ProductWizardState>({
    step: 0,
    formData: initialFormData,
    errors: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);

  const updateFormData = useCallback((field: keyof ProductFormData, value: unknown) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
      errors: { ...prev.errors, [field]: '' },
    }));
  }, []);

  const addImage = useCallback((image: { uri: string; name: string; type: string }) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        images: [...prev.formData.images, image],
      },
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        images: prev.formData.images.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const validateStep = useCallback((step: number, formData: ProductFormData): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Tên sản phẩm
        if (!formData.product_title.trim()) {
          errors.product_title = 'Vui lòng nhập tên sản phẩm';
        }
        break;
      case 1: // Giá
        if (!formData.product_price) {
          errors.product_price = 'Vui lòng nhập giá sản phẩm';
        } else if (isNaN(Number(formData.product_price)) || Number(formData.product_price) <= 0) {
          errors.product_price = 'Giá phải lớn hơn 0';
        }
        break;
      case 3: // Danh mục
        if (!formData.product_category) {
          errors.product_category = 'Vui lòng chọn danh mục';
        }
        break;
      case 4: // Mô tả
        if (!formData.product_description.trim()) {
          errors.product_description = 'Vui lòng nhập mô tả sản phẩm';
        } else if (formData.product_description.length < 10) {
          errors.product_description = 'Mô tả phải ít nhất 10 ký tự';
        }
        break;
      case 6: // Hình ảnh
        if (formData.images.length === 0) {
          errors.images = 'Vui lòng thêm ít nhất 1 hình ảnh';
        }
        break;
    }

    setState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (validateStep(prev.step, prev.formData)) {
        return { ...prev, step: Math.min(prev.step + 1, 8) };
      }
      return prev;
    });
  }, [validateStep]);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const submitProduct = useCallback(async () => {
    if (!validateStep(state.step, state.formData)) {
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      const input: CreateProductInput = {
        product_title: state.formData.product_title,
        product_category: state.formData.product_category,
        product_description: state.formData.product_description,
        product_price: state.formData.product_price,
        product_location: state.formData.product_location,
        product_type: state.formData.product_type,
        currency: state.formData.currency,
        lat: state.formData.lat,
        lng: state.formData.lng,
        units: state.formData.units,
        product_sub_category: state.formData.product_sub_category,
        images: state.formData.images,
      };

      const result = await repository.createProduct(input);

      if (result.api_status === 200 && result.product_id) {
        setSubmitSuccess(true);
        setCreatedProductId(result.product_id);
        // Reset form
        setState({
          step: 0,
          formData: initialFormData,
          errors: {},
        });
      } else if (result.errors) {
        setSubmitError(result.errors.error_text || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo sản phẩm');
    } finally {
      setIsLoading(false);
    }
  }, [state, validateStep]);

  const resetForm = useCallback(() => {
    setState({
      step: 0,
      formData: initialFormData,
      errors: {},
    });
    setSubmitError(null);
    setSubmitSuccess(false);
    setCreatedProductId(null);
  }, []);

  return {
    // Wizard state
    step: state.step,
    formData: state.formData,
    errors: state.errors,
    totalSteps: 9,

    // Form handlers
    updateFormData,
    addImage,
    removeImage,

    // Navigation
    nextStep,
    prevStep,
    goToStep,

    // Submit
    isLoading,
    submitError,
    submitSuccess,
    createdProductId,
    submitProduct,
    resetForm,
  };
}

// Hook for fetching products
export function useProductsViewModel() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (input?: GetProductsInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await repository.getProducts(input);
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    products,
    isLoading,
    error,
    fetchProducts,
  };
}
