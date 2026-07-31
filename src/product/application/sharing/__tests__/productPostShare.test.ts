import type { ProductItem } from '../../../domain/types/product.types';
import {
  buildProductSharePost,
  getProductSharePostId,
} from '../productPostShare';

function product(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 7,
    user_id: 2,
    name: 'May anh',
    category: 1,
    category_name: 'Dien tu',
    description: 'Mo ta',
    price: '2000000',
    currency: 'VND',
    currency_code: 'VND',
    currency_symbol: '',
    location: 'Ha Noi',
    type: 0,
    active: 1,
    post_id: 70,
    time: '1700000000',
    images: [],
    seller: {
      user_id: 2,
      username: 'seller',
      name: 'Nguoi ban',
      avatar: 'https://cdn.vnseea.vn/seller.jpg',
    },
    is_owner: false,
    can_contact_seller: true,
    can_add_to_cart: true,
    ...overrides,
  };
}

describe('product post sharing', () => {
  it('uses the associated post id instead of the marketplace product id', () => {
    const value = product();
    const post = buildProductSharePost(value);

    expect(getProductSharePostId(value)).toBe('70');
    expect(post.id).toBe('70');
    expect(post.product.id).toBe(7);
    expect(post.permissions?.canShare).toBe(true);
  });

  it('keeps products without a real post id non-shareable', () => {
    const post = buildProductSharePost(product({ post_id: 0 }));

    expect(post.id).toBe('product-7');
    expect(post.permissions?.canShare).toBe(false);
  });
});
