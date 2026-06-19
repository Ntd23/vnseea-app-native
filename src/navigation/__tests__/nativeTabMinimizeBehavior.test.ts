import {
  nativeTabMinimizeBehavior,
  useNativeTabMinimizeBehavior,
  type NativeTabMinimizeBehavior,
} from '../nativeTabMinimizeBehavior';

describe('native tab minimize behavior store', () => {
  beforeEach(() => {
    nativeTabMinimizeBehavior.reset();
  });

  it('defaults to native on-scroll-down minimize behavior', () => {
    expect(nativeTabMinimizeBehavior.getBehavior()).toBe('onScrollDown');
    expect(typeof useNativeTabMinimizeBehavior).toBe('function');
  });

  it('notifies subscribers when behavior changes and ignores duplicate values', () => {
    const received: NativeTabMinimizeBehavior[] = [];
    const unsubscribe = nativeTabMinimizeBehavior.subscribe(behavior => {
      received.push(behavior);
    });

    nativeTabMinimizeBehavior.setBehavior('none');
    nativeTabMinimizeBehavior.setBehavior('none');
    nativeTabMinimizeBehavior.setBehavior('onScrollDown');

    unsubscribe();
    nativeTabMinimizeBehavior.setBehavior('none');

    expect(received).toEqual(['none', 'onScrollDown']);
    expect(nativeTabMinimizeBehavior.getBehavior()).toBe('none');
  });
});
