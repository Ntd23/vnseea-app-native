import {
  nativeTabBarPresentation,
  nativeTabMinimizeBehavior,
  useNativeTabBarPresentation,
  useNativeTabMinimizeBehavior,
  type NativeTabBarPresentation,
  type NativeTabMinimizeBehavior,
} from '../nativeTabMinimizeBehavior';

describe('native tab minimize behavior store', () => {
  beforeEach(() => {
    nativeTabMinimizeBehavior.reset();
    nativeTabBarPresentation.reset();
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

  it('keeps custom iOS tab chrome expanded until scroll explicitly minimizes it', () => {
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
    expect(typeof useNativeTabBarPresentation).toBe('function');
  });

  it('notifies custom iOS tab chrome presentation changes and ignores duplicates', () => {
    const received: NativeTabBarPresentation[] = [];
    const unsubscribe = nativeTabBarPresentation.subscribe(presentation => {
      received.push(presentation);
    });

    nativeTabBarPresentation.setPresentation('minimized');
    nativeTabBarPresentation.setPresentation('minimized');
    nativeTabBarPresentation.setPresentation('expanded');

    unsubscribe();
    nativeTabBarPresentation.setPresentation('minimized');

    expect(received).toEqual(['minimized', 'expanded']);
    expect(nativeTabBarPresentation.getPresentation()).toBe('minimized');
  });
});
