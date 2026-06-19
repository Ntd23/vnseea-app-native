import type { MutableRefObject } from 'react';
import {
  nativeTabMinimizeBehavior,
  type NativeTabMinimizeBehavior,
} from './nativeTabMinimizeBehavior';

const NATIVE_TAB_SCROLL_DOWN_THRESHOLD = 8;
const NATIVE_TAB_SCROLL_UP_THRESHOLD = 1;

export type NativeTabScrollPublisherState = {
  lastY: number;
  downwardDelta: number;
  upwardDelta: number;
  lastPublishedBehavior: NativeTabMinimizeBehavior | null;
};

type NativeTabScrollPublisherResult = {
  state: NativeTabScrollPublisherState;
  behavior?: NativeTabMinimizeBehavior;
};

export function createNativeTabScrollPublisherState(
  initialY = 0,
  lastPublishedBehavior: NativeTabMinimizeBehavior | null = null,
): NativeTabScrollPublisherState {
  return {
    lastY: Math.max(0, initialY),
    downwardDelta: 0,
    upwardDelta: 0,
    lastPublishedBehavior,
  };
}

function withPublishedBehavior(
  state: NativeTabScrollPublisherState,
  behavior: NativeTabMinimizeBehavior,
): NativeTabScrollPublisherResult {
  if (state.lastPublishedBehavior === behavior) {
    return { state };
  }

  return {
    state: {
      ...state,
      lastPublishedBehavior: behavior,
    },
    behavior,
  };
}

export function getNextNativeTabScrollPublisherState(
  state: NativeTabScrollPublisherState,
  rawY: number,
): NativeTabScrollPublisherResult {
  if (rawY < 0) {
    return withPublishedBehavior(
      {
        ...state,
        lastY: 0,
        downwardDelta: 0,
        upwardDelta: 0,
      },
      'none',
    );
  }

  const y = Math.max(0, rawY);
  const delta = y - state.lastY;

  if (delta > 0) {
    const nextState = {
      ...state,
      lastY: y,
      downwardDelta: state.downwardDelta + delta,
      upwardDelta: 0,
    };

    if (nextState.downwardDelta >= NATIVE_TAB_SCROLL_DOWN_THRESHOLD) {
      return withPublishedBehavior(
        {
          ...nextState,
          downwardDelta: 0,
        },
        'onScrollDown',
      );
    }

    return { state: nextState };
  }

  if (delta < 0) {
    const nextState = {
      ...state,
      lastY: y,
      downwardDelta: 0,
      upwardDelta: state.upwardDelta + Math.abs(delta),
    };

    if (nextState.upwardDelta >= NATIVE_TAB_SCROLL_UP_THRESHOLD) {
      return withPublishedBehavior(
        {
          ...nextState,
          upwardDelta: 0,
        },
        'none',
      );
    }

    return { state: nextState };
  }

  return {
    state: {
      ...state,
      lastY: y,
    },
  };
}

export function publishNativeTabScrollBehavior(
  behavior: NativeTabMinimizeBehavior,
) {
  if (nativeTabMinimizeBehavior.getBehavior() === behavior) {
    return false;
  }

  nativeTabMinimizeBehavior.setBehavior(behavior);
  return true;
}

export function publishNativeTabScrollIntent(
  stateRef: MutableRefObject<NativeTabScrollPublisherState>,
  rawY: number,
) {
  const result = getNextNativeTabScrollPublisherState(stateRef.current, rawY);
  stateRef.current = result.state;

  if (result.behavior) {
    publishNativeTabScrollBehavior(result.behavior);
  }

  return result.behavior;
}
