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
import { tabBarVisibility } from '../tabBarVisibility';

describe('native tab scroll publisher', () => {
  beforeEach(() => {
    nativeTabMinimizeBehavior.reset();
    nativeTabBarPresentation.reset();
    tabBarVisibility.setVisible(true);
  });

  it('seeds the first scroll sample without publishing hidden tab state', () => {
    const result = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      12,
    );

    expect(result.behavior).toBeUndefined();
    expect(result.state.lastY).toBe(12);
    expect(result.state.downwardDelta).toBe(0);
  });

  it('publishes onScrollDown after enough real downward scroll', () => {
    const seeded = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      12,
    );
    const result = getNextNativeTabScrollPublisherState(seeded.state, 24);

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
    const seeded = getNextNativeTabScrollPublisherState(
      createNativeTabScrollPublisherState(),
      3,
    );
    const result = getNextNativeTabScrollPublisherState(seeded.state, 5);

    expect(result.behavior).toBeUndefined();
    expect(result.state.downwardDelta).toBe(2);
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
    const third = getNextNativeTabScrollPublisherState(second.state, 36);

    expect(first.behavior).toBeUndefined();
    expect(second.behavior).toBe('onScrollDown');
    expect(third.behavior).toBeUndefined();
    expect(third.state.lastPublishedBehavior).toBe('onScrollDown');
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

  it('drives custom iOS tab chrome visibility from actual scroll intent', () => {
    const stateRef = {
      current: createNativeTabScrollPublisherState(),
    };

    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
    expect(tabBarVisibility.getVisible()).toBe(true);

    publishNativeTabScrollIntent(stateRef, 12);
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
    expect(tabBarVisibility.getVisible()).toBe(true);

    publishNativeTabScrollIntent(stateRef, 24);
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
    expect(tabBarVisibility.getVisible()).toBe(false);

    publishNativeTabScrollIntent(stateRef, 10);
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
    expect(tabBarVisibility.getVisible()).toBe(true);
  });

  it('does not compact the custom tab chrome when only restoring native behavior mode', () => {
    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');

    publishNativeTabScrollBehavior('onScrollDown');

    expect(nativeTabBarPresentation.getPresentation()).toBe('expanded');
  });
});
