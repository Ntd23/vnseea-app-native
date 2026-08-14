import { createFeedLoadMoreDemandController } from '../feedLoadMoreDemandController';

describe('feed load-more demand controller', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps rejected demand behind one retry until the request is accepted', () => {
    const controller = createFeedLoadMoreDemandController();
    let canAccept = false;
    let attempts = 0;

    const attempt = () => {
      attempts += 1;
      if (canAccept) {
        const requestToken = controller.beginRequest();
        expect(requestToken).not.toBeNull();
        controller.completeRequest(requestToken!);
        return;
      }
      controller.scheduleRetry(240, attempt);
    };

    controller.latch(false);
    expect(controller.clearIfTerminal(false)).toBe(false);
    expect(controller.isPending()).toBe(true);
    attempt();

    expect(controller.isPending()).toBe(true);
    expect(controller.hasScheduledRetry()).toBe(true);
    expect(controller.scheduleRetry(240, attempt)).toBe(false);
    expect(attempts).toBe(1);

    canAccept = true;
    jest.advanceTimersByTime(240);

    expect(attempts).toBe(2);
    expect(controller.isPending()).toBe(false);
    expect(controller.isConsumed()).toBe(true);
    expect(controller.hasScheduledRetry()).toBe(false);
  });

  it('reopens accepted demand only after the next drag gesture begins', () => {
    const controller = createFeedLoadMoreDemandController();

    controller.latch(false);
    const requestToken = controller.beginRequest();
    expect(requestToken).not.toBeNull();
    controller.completeRequest(requestToken!);
    controller.latch(false);

    expect(controller.isPending()).toBe(false);
    expect(controller.isConsumed()).toBe(true);

    controller.resetGesture();
    controller.latch(false);

    expect(controller.isPending()).toBe(true);
    expect(controller.isConsumed()).toBe(false);
  });

  it('keeps no-progress completion pending so the same tail demand can retry', () => {
    const controller = createFeedLoadMoreDemandController();

    controller.latch(false);
    const firstToken = controller.beginRequest();

    expect(firstToken).not.toBeNull();
    expect(controller.isRequestInFlight()).toBe(true);
    expect(controller.retryRequest(firstToken!)).toBe(true);
    expect(controller.isPending()).toBe(true);
    expect(controller.isConsumed()).toBe(false);
    expect(controller.isRequestInFlight()).toBe(false);

    const secondToken = controller.beginRequest();
    expect(secondToken).not.toBeNull();
    expect(secondToken).not.toBe(firstToken);
    expect(controller.completeRequest(secondToken!)).toBe(true);
    expect(controller.isPending()).toBe(false);
    expect(controller.isConsumed()).toBe(true);
  });

  it('backs off automatic no-progress retries at a capped delay', () => {
    const controller = createFeedLoadMoreDemandController();

    controller.latch(false);
    const expectedDelays = [240, 480, 960, 1920, 1920];

    expectedDelays.forEach(expectedDelay => {
      const requestToken = controller.beginRequest();
      expect(requestToken).not.toBeNull();
      expect(controller.retryRequest(requestToken!)).toBe(true);
      expect(controller.getRetryDelay(240, 1920)).toBe(expectedDelay);
    });

    controller.resetGesture();
    const nextGestureToken = controller.beginRequest();
    expect(nextGestureToken).not.toBeNull();
    expect(controller.retryRequest(nextGestureToken!)).toBe(true);
    expect(controller.getRetryDelay(240, 1920)).toBe(240);
  });

  it('cancels a queued retry after leaving the tail without losing an active request', () => {
    const controller = createFeedLoadMoreDemandController();
    const retry = jest.fn();

    controller.latch(false);
    controller.scheduleRetry(240, retry);
    expect(controller.leaveTail()).toBe(true);

    expect(controller.isPending()).toBe(false);
    expect(controller.hasScheduledRetry()).toBe(false);
    jest.advanceTimersByTime(240);
    expect(retry).not.toHaveBeenCalled();

    controller.latch(false);
    const requestToken = controller.beginRequest();
    expect(requestToken).not.toBeNull();
    expect(controller.leaveTail()).toBe(false);

    expect(controller.isRequestInFlight()).toBe(true);
    expect(controller.isPending()).toBe(true);
    expect(controller.discardRequest(requestToken!)).toBe(true);
    expect(controller.isRequestInFlight()).toBe(false);

    controller.latch(false);
    expect(controller.beginRequest()).not.toBeNull();
  });

  it('drops pending and consumed state when a new feed generation starts', () => {
    const controller = createFeedLoadMoreDemandController();
    const retry = jest.fn();

    controller.latch(false);
    controller.scheduleRetry(240, retry);
    controller.resetGeneration();

    expect(controller.isPending()).toBe(false);
    expect(controller.isConsumed()).toBe(false);
    expect(controller.hasScheduledRetry()).toBe(false);

    jest.advanceTimersByTime(240);
    expect(retry).not.toHaveBeenCalled();

    controller.latch(false);
    const requestToken = controller.beginRequest();
    expect(requestToken).not.toBeNull();
    controller.completeRequest(requestToken!);
    expect(controller.isConsumed()).toBe(true);

    controller.resetGeneration();
    controller.latch(false);

    expect(controller.isPending()).toBe(true);
    expect(controller.isConsumed()).toBe(false);
    expect(controller.hasScheduledRetry()).toBe(false);
  });

  it('ignores an old request outcome after a new generation owns demand', () => {
    const controller = createFeedLoadMoreDemandController();

    controller.latch(false);
    const oldToken = controller.beginRequest();
    expect(oldToken).not.toBeNull();

    controller.resetGeneration();
    controller.latch(false);
    const newToken = controller.beginRequest();
    expect(newToken).not.toBeNull();

    expect(controller.completeRequest(oldToken!)).toBe(false);
    expect(controller.isRequestInFlight()).toBe(true);
    expect(controller.isPending()).toBe(true);

    expect(controller.completeRequest(newToken!)).toBe(true);
    expect(controller.isRequestInFlight()).toBe(false);
    expect(controller.isPending()).toBe(false);
    expect(controller.isConsumed()).toBe(true);
  });

  it('clears demand and cancels its retry after the feed reaches the end', () => {
    const controller = createFeedLoadMoreDemandController();
    const retry = jest.fn();

    controller.latch(false);
    controller.scheduleRetry(240, retry);

    expect(controller.clearIfTerminal(true)).toBe(true);
    expect(controller.isPending()).toBe(false);
    expect(controller.hasScheduledRetry()).toBe(false);

    jest.advanceTimersByTime(240);
    expect(retry).not.toHaveBeenCalled();
  });

  it('preserves pending demand while a hidden feed suspends its retry', () => {
    const controller = createFeedLoadMoreDemandController();
    const retry = jest.fn();

    controller.latch(false);
    controller.scheduleRetry(240, retry);
    controller.suspend();

    expect(controller.isPending()).toBe(true);
    expect(controller.isConsumed()).toBe(false);
    expect(controller.hasScheduledRetry()).toBe(false);

    jest.advanceTimersByTime(240);
    expect(retry).not.toHaveBeenCalled();
  });
});
