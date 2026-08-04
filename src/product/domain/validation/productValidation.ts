// Description: Defines product form validation shared by UI and repository boundaries.
export const PRODUCT_UNITS_ERROR =
  'Số lượng sản phẩm phải là số nguyên lớn hơn 0';

export function parsePositiveProductUnits(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const normalized = typeof value === 'string' ? value.trim() : value;

  if (normalized === '') return null;

  const units =
    typeof normalized === 'number' ? normalized : Number(normalized);

  return Number.isInteger(units) && units > 0 ? units : null;
}

export function assertPositiveProductUnits(value: unknown): number {
  const units = parsePositiveProductUnits(value);
  if (units === null) {
    throw new Error(PRODUCT_UNITS_ERROR);
  }
  return units;
}
