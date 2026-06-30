import type { ProductItem } from '../../domain/types/product.types';

export type ProductCategoryOption = {
  id: number;
  label: string;
};

function readCategoryLabel(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const label = readCategoryLabel(entry);
      if (label) return label;
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const directKeys = [
      'lang',
      'lang_key',
      'name',
      'label',
      'title',
      'category_name',
    ];

    for (const key of directKeys) {
      const label = readCategoryLabel(record[key]);
      if (label) return label;
    }
  }

  return undefined;
}

export function normalizeProductCategoriesMap(
  raw: unknown,
): Record<string, string> {
  const categoriesById: Record<string, string> = {};

  if (Array.isArray(raw)) {
    raw.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const record = entry as Record<string, unknown>;
      const id = record.id ?? record.category_id ?? record.cat_id;
      const label = readCategoryLabel(record);
      if (id !== undefined && id !== null && label) {
        categoriesById[String(id)] = label;
      }
    });
    return categoriesById;
  }

  if (!raw || typeof raw !== 'object') return {};

  Object.entries(raw as Record<string, unknown>).forEach(([id, value]) => {
    const label = readCategoryLabel(value);
    if (label) {
      categoriesById[id] = label;
    }
  });

  return categoriesById;
}

export function buildProductCategoryOptions(
  products: ProductItem[],
  categoriesById: Record<string, string>,
): ProductCategoryOption[] {
  const categories = new Map<number, string>();

  products.forEach(product => {
    if (!product.category) return;

    const fromProduct = product.category_name?.trim();
    const fromCatalog = categoriesById[String(product.category)]?.trim();
    const label =
      fromProduct && fromProduct.length > 0
        ? fromProduct
        : fromCatalog && fromCatalog.length > 0
          ? fromCatalog
          : `Th\u1ec3 lo\u1ea1i ${product.category}`;

    categories.set(product.category, label);
  });

  return Array.from(categories.entries()).map(([id, label]) => ({
    id,
    label,
  }));
}

export function mergeProductCategoryOptions(
  currentCategories: ProductCategoryOption[],
  products: ProductItem[],
  categoriesById: Record<string, string>,
): ProductCategoryOption[] {
  const categories = new Map<number, string>();

  currentCategories.forEach(category => {
    categories.set(category.id, category.label);
  });

  buildProductCategoryOptions(products, categoriesById).forEach(category => {
    categories.set(category.id, category.label);
  });

  return Array.from(categories.entries()).map(([id, label]) => ({
    id,
    label,
  }));
}
