import {
  createNativeTabScrollPublisherState,
  getNextNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../nativeTabScrollPublisher';
import {
  nativeTabBarPresentation,
  nativeTabMinimizeBehavior,
} from '../nativeTabMinimizeBehavior';

describe('native tab scroll publisher', () => {
  beforeEach(() => {
    nativeTabMinimizeBehavior.reset();
    nativeTabBarPresentation.reset();
  });

  it('publishes onScrollDown after enough downward scroll', () => {
    const result = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      12,
    );

    expect(result.behavior).toBe('onScrollDown');
    expect(result.state.downwardDelta).toBe(0);
  });

  it('publishes none after enough upward scroll', () => {
    const result = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(120, 'onScrollDown'),
      118,
    );

    expect(result.behavior).toBe('none');
    expect(result.state.upwardDelta).toBe(0);
  });

  it('does not publish for small jitter deltas', () => {
    const result = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      3,
    );

    expect(result.behavior).toBeUndefined();
    expect(result.state.downwardDelta).toBe(3);
  });

  it('publishes none during top bounce', () => {
    const result = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(20, 'onScrollDown'),
      -1,
    );

    expect(result.behavior).toBe('none');
    expect(result.state.lastY).toBe(0);
  });

  it('dedupes duplicate behavior updates', () => {
    const first = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      12,
    );
    const second = getNextNativeTabScrollPublisherState(first.state, 24);

    expect(first.behavior).toBe('onScrollDown');
    expect(second.behavior).toBeUndefined();
    expect(second.state.lastPublishedBehavior).toBe('onScrollDown');
  });

  it('dedupes writes to the global native tab behavior store', () => {
    const received: string[] = [];
    const unsubscribe = nativeTabMinimizeBehavior.subscribe(behavior => {
      received.push(behavior);
    });

    expect(publishNativeTabScrollBehavior('onScrollDown')).toBe(false);
    expect(publishNativeTabScrollBehavior('none')).toBe(true);
    expect(publishNativeTabScrollBehavior('none')).toBe(false);

    unsubscribe();
    expect(received).toEqual(['none']);
  });

  it('drives custom iOS tab chrome compact state from actual scroll intent', () => {
    const stateRef = {
      current: createNativeTabScrollPublisherState(),
    };

    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');

    publishNativeTabScrollIntent(stateRef, 12);
    expect(nativeTabBarPresentation.getPresentation()).toBe('minimized');

    publishNativeTabScrollIntent(stateRef, 10);
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
  });

  it('does not compact the custom tab chrome when only restoring native behavior mode', () => {
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');

    publishNativeTabScrollBehavior('onScrollDown');

    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
  });
});
