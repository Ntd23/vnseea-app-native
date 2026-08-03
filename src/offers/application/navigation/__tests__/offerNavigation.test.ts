import { resolveOfferNavigationDestination } from '../offerNavigation';

describe('offer navigation destination', () => {
  it('opens an explicitly linked product before any fallback', () => {
    expect(
      resolveOfferNavigationDestination({
        productId: 42,
        postId: 91,
        url: 'https://vnseea.vn/post/91',
      }),
    ).toEqual({ kind: 'product', productId: 42 });
  });

  it('extracts a product id from a product URL', () => {
    expect(
      resolveOfferNavigationDestination({
        url: 'https://vnseea.vn/products/73?ref=offer',
      }),
    ).toEqual({ kind: 'product', productId: 73 });
  });

  it('opens the backend offer post when no product id exists', () => {
    expect(
      resolveOfferNavigationDestination({
        postId: 108,
        url: 'https://vnseea.vn/index.php?link1=post&id=108',
      }),
    ).toEqual({ kind: 'post', postId: '108' });
  });

  it('falls back to Marketplace when the offer has no usable link', () => {
    expect(resolveOfferNavigationDestination({})).toEqual({
      kind: 'marketplace',
    });
  });
});
