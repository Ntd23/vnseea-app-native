// Description: Manages product creation, editing, and product list state.
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
  currency: 'VNSEEA',
  lat: '',
  lng: '',
  units: undefined,
  product_sub_category: '',
  images: [],
};

function buildInitialFormData(product?: ProductItem): ProductFormData {
  if (!product) {
    return initialFormData;
  }

  return {
    product_title: product.name ?? '',
    product_category: product.category ? String(product.category) : '',
    product_description: product.description ?? '',
    product_price: product.price ? String(product.price) : '',
    product_location: product.location ?? '',
    product_type: Number(product.type ?? 0),
    currency: product.currency || product.currency_code || 'VNSEEA',
    lat: product.lat ?? '',
    lng: product.lng ?? '',
    units: product.units,
    product_sub_category: product.product_sub_category || (product.sub_category ? String(product.sub_category) : ''),
    images: [],
  };
}

export function useProductViewModel(initialProduct?: ProductItem) {
  const isEditing = Boolean(initialProduct?.id);
  const hasExistingImages = Boolean(initialProduct?.images?.length);
  const [state, setState] = useState<ProductWizardState>({
    step: 0,
    formData: buildInitialFormData(initialProduct),
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

  const validateAll = useCallback((formData: ProductFormData): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.product_title.trim()) {
      errors.product_title = 'Vui lòng nhập tên sản phẩm';
    }

    if (!formData.product_price) {
      errors.product_price = 'Vui lòng nhập giá sản phẩm';
    } else if (isNaN(Number(formData.product_price)) || Number(formData.product_price) <= 0) {
      errors.product_price = 'Giá phải lớn hơn 0';
    }

    if (!formData.product_category) {
      errors.product_category = 'Vui lòng chọn danh mục';
    }

    if (!formData.product_description.trim()) {
      errors.product_description = 'Vui lòng nhập mô tả sản phẩm';
    } else if (formData.product_description.length < 10) {
      errors.product_description = 'Mô tả phải ít nhất 10 ký tự';
    }

    if (formData.images.length === 0 && !hasExistingImages) {
      errors.images = 'Vui lòng thêm ít nhất 1 hình ảnh';
    }

    setState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [hasExistingImages]);

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
      case 6: // Images
        if (formData.images.length === 0 && !hasExistingImages) {
          errors.images = 'Vui l\u00f2ng th\u00eam \u00edt nh\u1ea5t 1 h\u00ecnh \u1ea3nh';
        }
        break;
    }

    setState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [hasExistingImages]);

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
    if (!validateAll(state.formData)) {
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      const input: CreateProductInput = {
        product_id: initialProduct?.id,
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

      const result = isEditing
        ? await repository.updateProduct(input)
        : await repository.createProduct(input);

      if (String(result.api_status) === '200' && (isEditing || result.product_id)) {
        setSubmitSuccess(true);
        setCreatedProductId(result.product_id ?? initialProduct?.id ?? null);
        // Reset form
        setState({
          step: 0,
          formData: isEditing ? buildInitialFormData(initialProduct) : initialFormData,
          errors: {},
        });
      } else if (result.errors) {
        setSubmitError(result.errors.error_text || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isEditing
            ? 'C\u00f3 l\u1ed7i x\u1ea3y ra khi c\u1eadp nh\u1eadt s\u1ea3n ph\u1ea9m'
            : 'C\u00f3 l\u1ed7i x\u1ea3y ra khi t\u1ea1o s\u1ea3n ph\u1ea9m',
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialProduct, isEditing, state, validateAll]);

  const resetForm = useCallback(() => {
    setState({
      step: 0,
      formData: isEditing ? buildInitialFormData(initialProduct) : initialFormData,
      errors: {},
    });
    setSubmitError(null);
    setSubmitSuccess(false);
    setCreatedProductId(null);
  }, [initialProduct, isEditing]);

  return {
    // Wizard state
    step: state.step,
    formData: state.formData,
    errors: state.errors,
    totalSteps: 9,
    isEditing,
    existingImages: initialProduct?.images ?? [],

    // Form handlers
    updateFormData,
    addImage,
    removeImage,
    validateForm: validateAll,

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
