import type {
  FeedEventPost,
  FeedJobPost,
  FeedPost,
  FeedProductPost,
} from '../../domain/types/feed.types';

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function interleaveSupplementalPosts(
  basePosts: readonly FeedPost[],
  productPosts: readonly FeedProductPost[],
  eventPosts: readonly FeedEventPost[],
  jobPosts: readonly FeedJobPost[],
): FeedPost[] {
  const products = uniqueById(productPosts);
  const events = uniqueById(eventPosts);
  const jobs = uniqueById(jobPosts);
  const productByPostId = new Map(products.map(post => [post.id, post]));
  const basePostIds = new Set(basePosts.map(post => post.id));
  const intervalProducts = products.filter(post => !basePostIds.has(post.id));
  const intervalJobs = jobs.filter(post => !basePostIds.has(post.id));
  const result: FeedPost[] = [];
  const seenIds = new Set<string>();
  let productIndex = 0;
  let eventIndex = 0;
  let jobIndex = 0;

  const pushUnique = (post: FeedPost | undefined) => {
    if (!post?.id || seenIds.has(post.id)) return;
    seenIds.add(post.id);
    result.push(post);
  };

  basePosts.forEach((basePost, index) => {
    pushUnique(productByPostId.get(basePost.id) ?? basePost);

    const slot = index + 1;
    if (slot % 7 === 0) {
      pushUnique(intervalProducts[productIndex]);
      productIndex += 1;
    }
    if (slot % 11 === 0) {
      pushUnique(events[eventIndex]);
      eventIndex += 1;
    }
    if (slot % 13 === 0) {
      pushUnique(intervalJobs[jobIndex]);
      jobIndex += 1;
    }
  });

  return result;
}
