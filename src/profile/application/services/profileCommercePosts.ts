// Description: Loads and maps commerce content that belongs on a personal profile.
import type {
  FeedJobPost,
  FeedPost,
  FeedProductPost,
} from '../../../feed/domain/types/feed.types';
import { createJobsRepository } from '../../../jobs/infrastructure/repositories/ApiJobsRepository';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import { createPagesRepository } from '../../../pages/infrastructure/repositories/ApiPagesRepository';
import { createProductRepository } from '../../../product/infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../../product/domain/types/product.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const PROFILE_PRODUCTS_LIMIT = 60;
const PROFILE_OWNED_PAGES_LIMIT = 100;
const PROFILE_JOBS_PER_PAGE_LIMIT = 20;

const productRepository = createProductRepository();
const jobsRepository = createJobsRepository();
const pagesRepository = createPagesRepository();

export type ProfileCommercePost = FeedProductPost | FeedJobPost;

type LoadProfileCommercePostsInput = {
  userId: string | number;
  includeOwnedPageJobs: boolean;
  sellerFallback: string;
  employerFallback: string;
};

function positiveId(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized && Number(normalized) > 0 ? normalized : null;
}

function timestampSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed > 1_000_000_000_000 ? Math.floor(parsed / 1000) : parsed;
}

export function profileProductBelongsToUser(
  product: ProductItem,
  userId: string | number,
) {
  const targetId = String(userId);
  return (
    String(product.user_id ?? '') === targetId ||
    String(product.seller?.user_id ?? '') === targetId
  );
}

export function profileJobBelongsToUser(
  job: JobsItem,
  userId: string | number,
) {
  const targetId = String(userId);
  return (
    String(job.user_id ?? '') === targetId ||
    String(job.page?.user_id ?? '') === targetId
  );
}

function mergeItemsByKey<T>(items: T[], getKey: (item: T) => string) {
  const merged = new Map<string, T>();
  items.forEach(item => merged.set(getKey(item), item));
  return Array.from(merged.values());
}

export function mapProfileProductPost(
  product: ProductItem,
  sellerFallback: string,
): FeedProductPost {
  const postId = positiveId(product.post_id);
  const sellerId = product.seller?.user_id || product.user_id;

  return {
    kind: 'product',
    id: postId ?? `product-${product.id}`,
    product,
    postedAt: timestampSeconds(product.time),
    publisher: {
      id: String(sellerId || ''),
      name: product.seller?.name || sellerFallback,
      username: product.seller?.username || '',
      avatarUrl: product.seller?.avatar || undefined,
    },
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    permissions: {
      canDelete: Boolean(postId && product.is_owner),
      canShare: Boolean(postId),
    },
  };
}

export function mapProfileJobPost(
  job: JobsItem,
  employerFallback: string,
): FeedJobPost {
  const postId = positiveId(job.post_id);
  const pageName = job.page?.page_title || employerFallback;

  return {
    kind: 'job',
    id: postId ?? `job-${job.id}`,
    job,
    postedAt: timestampSeconds(job.time),
    publisher: {
      id: String(job.page?.user_id || job.user_id || ''),
      name: pageName,
      username: job.page?.page_name || '',
      avatarUrl: job.page?.avatar || job.image || undefined,
    },
    permissions: {
      canDelete: Boolean(postId && job.page?.is_page_onwer),
      canShare: Boolean(postId),
    },
  };
}

function mergeCommercePostWithExisting(
  commercePost: ProfileCommercePost,
  existingPost: FeedPost | undefined,
): ProfileCommercePost {
  if (!existingPost) return commercePost;

  const permissions = existingPost.permissions ?? commercePost.permissions;
  if (commercePost.kind === 'job') {
    return { ...commercePost, permissions };
  }

  if (!('likeCount' in existingPost)) {
    return { ...commercePost, permissions };
  }

  return {
    ...commercePost,
    permissions,
    likeCount: existingPost.likeCount,
    commentCount: existingPost.commentCount,
    myReaction: existingPost.myReaction,
    topReactions: existingPost.topReactions,
    isLiked: existingPost.myReaction !== null,
  };
}

export function mergeProfileCommercePosts(
  basePosts: FeedPost[],
  commercePosts: ProfileCommercePost[],
): FeedPost[] {
  const merged = new Map(basePosts.map(post => [String(post.id), post]));

  for (const commercePost of commercePosts) {
    const key = String(commercePost.id);
    merged.set(
      key,
      mergeCommercePostWithExisting(commercePost, merged.get(key)),
    );
  }

  return Array.from(merged.values()).sort(
    (left, right) => (right.postedAt ?? 0) - (left.postedAt ?? 0),
  );
}

async function loadUserProducts(
  userId: string | number,
  sellerFallback: string,
) {
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) return [];

  const cachedProducts = feedCacheStorage
    .getCachedProducts()
    .filter(product => profileProductBelongsToUser(product, userId));
  let remoteProducts: ProductItem[] = [];

  try {
    const response = await productRepository.getProducts({
      limit: PROFILE_PRODUCTS_LIMIT,
      user_id: numericUserId,
    });
    remoteProducts = response.products.filter(product =>
      profileProductBelongsToUser(product, userId),
    );
  } catch {
    // Home Feed keeps a small product cache. Preserve those cards on Profile
    // while the marketplace endpoint is temporarily unavailable.
  }

  return mergeItemsByKey(
    [...cachedProducts, ...remoteProducts],
    product => String(product.id),
  )
    .map(product => mapProfileProductPost(product, sellerFallback));
}

async function loadOwnedPageIds() {
  const [pagesResult, metadataResult] = await Promise.allSettled([
    pagesRepository.getMyPages({ limit: PROFILE_OWNED_PAGES_LIMIT }),
    jobsRepository.getMetadata(),
  ]);
  const pageIds = new Set<string>();

  if (pagesResult.status === 'fulfilled') {
    pagesResult.value.items.forEach(page => {
      if (page.pageId) pageIds.add(String(page.pageId));
    });
  }
  if (metadataResult.status === 'fulfilled') {
    metadataResult.value.ownedPages.forEach(page => {
      if (page.page_id) pageIds.add(String(page.page_id));
    });
  }

  return Array.from(pageIds);
}

async function loadOwnedPageJobs(
  userId: string | number,
  employerFallback: string,
) {
  const cachedJobs = feedCacheStorage
    .getCachedJobs()
    .filter(job => profileJobBelongsToUser(job, userId));
  const pageIds = new Set(await loadOwnedPageIds());
  cachedJobs.forEach(job => {
    if (job.page_id) pageIds.add(String(job.page_id));
    if (job.page?.page_id) pageIds.add(String(job.page.page_id));
  });

  if (pageIds.size === 0) {
    return cachedJobs.map(job => mapProfileJobPost(job, employerFallback));
  }

  const pageJobResults = await Promise.allSettled(
    Array.from(pageIds).map(pageId =>
      jobsRepository.getPageJobs(pageId, PROFILE_JOBS_PER_PAGE_LIMIT, 0),
    ),
  );
  const jobsById = new Map<string, JobsItem>();

  cachedJobs.forEach(job => {
    const key = positiveId(job.post_id) ?? `job-${job.id}`;
    jobsById.set(key, job);
  });

  for (const result of pageJobResults) {
    if (result.status !== 'fulfilled') continue;
    for (const job of result.value) {
      const key = positiveId(job.post_id) ?? `job-${job.id}`;
      jobsById.set(key, job);
    }
  }

  return Array.from(jobsById.values()).map(job =>
    mapProfileJobPost(job, employerFallback),
  );
}

export async function loadProfileCommercePosts({
  userId,
  includeOwnedPageJobs,
  sellerFallback,
  employerFallback,
}: LoadProfileCommercePostsInput): Promise<ProfileCommercePost[]> {
  const [productsResult, jobsResult] = await Promise.allSettled([
    loadUserProducts(userId, sellerFallback),
    includeOwnedPageJobs
      ? loadOwnedPageJobs(userId, employerFallback)
      : Promise.resolve([] as FeedJobPost[]),
  ]);

  const products =
    productsResult.status === 'fulfilled' ? productsResult.value : [];
  const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : [];

  return [...products, ...jobs];
}
