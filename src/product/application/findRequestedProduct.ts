type ProductIdentity = {
  id: number | string;
};

export function findRequestedProduct<T extends ProductIdentity>(
  products: readonly T[] | undefined,
  requestedProductId: number | string,
): T | undefined {
  const normalizedRequestedId = String(requestedProductId);

  return products?.find(
    product => String(product.id) === normalizedRequestedId,
  );
}
