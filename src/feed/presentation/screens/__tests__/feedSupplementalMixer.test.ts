import type {
  FeedEventPost,
  FeedJobPost,
  FeedPost,
  FeedProductPost,
} from '../../../domain/types/feed.types';
import { interleaveSupplementalPosts } from '../feedSupplementalMixer';

function textPost(id: string): FeedPost {
  return { id, kind: 'text', postedAt: 100 } as FeedPost;
}

function productPost(id: string): FeedProductPost {
  return { id, kind: 'product', postedAt: 90, product: {} } as FeedProductPost;
}

function eventPost(id: string): FeedEventPost {
  return { id, kind: 'event', postedAt: 80, event: {} } as FeedEventPost;
}

function jobPost(id: string): FeedJobPost {
  return { id, kind: 'job', postedAt: 70, job: {} } as FeedJobPost;
}

describe('interleaveSupplementalPosts', () => {
  it('lets the richer product row replace a base text row with the same post id', () => {
    const replacement = productPost('42');
    const result = interleaveSupplementalPosts(
      [textPost('41'), textPost('42'), textPost('43')],
      [replacement],
      [],
      [],
    );

    expect(result.filter(post => post.id === '42')).toEqual([replacement]);
    expect(new Set(result.map(post => post.id)).size).toBe(result.length);
  });

  it('never repeats supplied supplemental rows across a long feed', () => {
    const base = Array.from({ length: 100 }, (_, index) =>
      textPost(`post-${index + 1}`),
    );
    const products = [productPost('product-1'), productPost('product-2')];
    const events = [eventPost('event-1')];
    const jobs = [jobPost('job-1'), jobPost('job-2')];

    const result = interleaveSupplementalPosts(base, products, events, jobs);
    const ids = result.map(post => post.id);

    expect(ids.filter(id => id === 'product-1')).toHaveLength(1);
    expect(ids.filter(id => id === 'product-2')).toHaveLength(1);
    expect(ids.filter(id => id === 'event-1')).toHaveLength(1);
    expect(ids.filter(id => id === 'job-1')).toHaveLength(1);
    expect(ids.filter(id => id === 'job-2')).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
