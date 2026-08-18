import { createFeedVisibleMediaStore } from '../feedVisibleMediaStore';

describe('feed visible media store', () => {
  it('notifies only post ids whose visibility changed', () => {
    const store = createFeedVisibleMediaStore();
    const postA = jest.fn();
    const postB = jest.fn();
    const postC = jest.fn();

    store.subscribe('a', postA);
    store.subscribe('b', postB);
    store.subscribe('c', postC);

    store.publish(['a', 'b']);

    expect(postA).toHaveBeenCalledWith(true);
    expect(postB).toHaveBeenCalledWith(true);
    expect(postC).not.toHaveBeenCalled();

    postA.mockClear();
    postB.mockClear();
    postC.mockClear();

    store.publish(['b', 'c']);

    expect(postA).toHaveBeenCalledWith(false);
    expect(postB).not.toHaveBeenCalled();
    expect(postC).toHaveBeenCalledWith(true);

    postA.mockClear();
    postC.mockClear();
    store.publish(['b', 'c']);

    expect(postA).not.toHaveBeenCalled();
    expect(postB).not.toHaveBeenCalled();
    expect(postC).not.toHaveBeenCalled();
  });

  it('stops notifying a post after unsubscribe', () => {
    const store = createFeedVisibleMediaStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe('post-1', listener);

    unsubscribe();
    store.publish(['post-1']);

    expect(listener).not.toHaveBeenCalled();
    expect(store.isVisible('post-1')).toBe(true);
  });
});
