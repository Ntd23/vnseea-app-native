import type { JobsItem } from '../../../../jobs/domain/types/jobs.types';
import type { ProductItem } from '../../../../product/domain/types/product.types';

const mockGetProducts = jest.fn();
const mockGetPageJobs = jest.fn();
const mockGetMetadata = jest.fn();
const mockGetMyPages = jest.fn();
const mockGetCachedProducts = jest.fn();
const mockGetCachedJobs = jest.fn();

jest.mock(
  '../../../../product/infrastructure/repositories/ApiProductRepository',
  () => ({
    createProductRepository: () => ({ getProducts: mockGetProducts }),
  }),
);

jest.mock(
  '../../../../jobs/infrastructure/repositories/ApiJobsRepository',
  () => ({
    createJobsRepository: () => ({
      getPageJobs: mockGetPageJobs,
      getMetadata: mockGetMetadata,
    }),
  }),
);

jest.mock(
  '../../../../pages/infrastructure/repositories/ApiPagesRepository',
  () => ({
    createPagesRepository: () => ({ getMyPages: mockGetMyPages }),
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/feedCacheStorage',
  () => ({
    feedCacheStorage: {
      getCachedProducts: mockGetCachedProducts,
      getCachedJobs: mockGetCachedJobs,
    },
  }),
);

const {
  loadProfileCommercePosts,
  profileProductBelongsToUser,
} = require('../profileCommercePosts') as typeof import('../profileCommercePosts');

function product(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 7,
    user_id: 42,
    name: 'Product',
    category: 1,
    category_name: 'Category',
    description: 'Description',
    price: '10',
    currency: 'USD',
    currency_code: 'USD',
    currency_symbol: '$',
    location: 'Location',
    type: 0,
    active: 1,
    post_id: 70,
    time: '1000',
    images: [],
    seller: {
      user_id: 42,
      username: 'seller',
      name: 'Seller',
      avatar: '',
    },
    is_owner: true,
    can_contact_seller: true,
    can_add_to_cart: true,
    ...overrides,
  };
}

function job(overrides: Partial<JobsItem> = {}): JobsItem {
  return {
    id: '8',
    title: 'Job',
    description: 'Description',
    location: 'Location',
    job_type: 'full_time',
    category: '1',
    image: '',
    page_id: '17',
    user_id: '42',
    time: 1000,
    post_id: '80',
    page: {
      page_id: '17',
      page_title: 'Page',
      page_name: 'page',
      page_description: '',
      avatar: '',
      cover: '',
      user_id: '42',
      is_page_onwer: true,
    },
    ...overrides,
  };
}

describe('profileCommercePosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedProducts.mockReturnValue([]);
    mockGetCachedJobs.mockReturnValue([]);
    mockGetProducts.mockResolvedValue({ products: [] });
    mockGetMyPages.mockResolvedValue({ items: [] });
    mockGetMetadata.mockResolvedValue({ ownedPages: [] });
    mockGetPageJobs.mockResolvedValue([]);
  });

  it('keeps the Home Feed product cache when the product request fails', async () => {
    mockGetCachedProducts.mockReturnValue([product()]);
    mockGetProducts.mockRejectedValue(new Error('offline'));

    const posts = await loadProfileCommercePosts({
      userId: 42,
      includeOwnedPageJobs: false,
      sellerFallback: 'Seller',
      employerFallback: 'Employer',
    });

    expect(posts).toEqual([
      expect.objectContaining({ kind: 'product', id: '70' }),
    ]);
  });

  it('uses jobs metadata when the pages endpoint is unavailable', async () => {
    mockGetMyPages.mockRejectedValue(new Error('unsupported'));
    mockGetMetadata.mockResolvedValue({
      ownedPages: [{ page_id: '17' }],
    });
    mockGetPageJobs.mockResolvedValue([job()]);

    const posts = await loadProfileCommercePosts({
      userId: 42,
      includeOwnedPageJobs: true,
      sellerFallback: 'Seller',
      employerFallback: 'Employer',
    });

    expect(mockGetPageJobs).toHaveBeenCalledWith('17', 20, 0);
    expect(posts).toEqual([expect.objectContaining({ kind: 'job', id: '80' })]);
  });

  it('does not treat is_owner alone as ownership on another profile', () => {
    expect(
      profileProductBelongsToUser(
        product({
          user_id: 42,
          seller: {
            user_id: 42,
            username: 'seller',
            name: 'Seller',
            avatar: '',
          },
          is_owner: true,
        }),
        99,
      ),
    ).toBe(false);
  });
});
