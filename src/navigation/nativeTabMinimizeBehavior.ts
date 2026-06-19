import { useEffect, useState } from 'react';

export type NativeTabMinimizeBehavior = 'onScrollDown' | 'none';

type NativeTabMinimizeBehaviorListener = (
  behavior: NativeTabMinimizeBehavior,
) => void;

const DEFAULT_NATIVE_TAB_MINIMIZE_BEHAVIOR: NativeTabMinimizeBehavior =
  'onScrollDown';

const listeners = new Set<NativeTabMinimizeBehaviorListener>();
let currentBehavior: NativeTabMinimizeBehavior =
  DEFAULT_NATIVE_TAB_MINIMIZE_BEHAVIOR;

export const nativeTabMinimizeBehavior = {
  getBehavior() {
    return currentBehavior;
  },
  setBehavior(nextBehavior: NativeTabMinimizeBehavior) {
    if (currentBehavior === nextBehavior) return;

    currentBehavior = nextBehavior;
    listeners.forEach(listener => listener(currentBehavior));
  },
  subscribe(listener: NativeTabMinimizeBehaviorListener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
  reset() {
    currentBehavior = DEFAULT_NATIVE_TAB_MINIMIZE_BEHAVIOR;
    listeners.clear();
  },
};

export function useNativeTabMinimizeBehavior() {
  const [behavior, setBehavior] = useState<NativeTabMinimizeBehavior>(
    nativeTabMinimizeBehavior.getBehavior(),
  );

  useEffect(() => nativeTabMinimizeBehavior.subscribe(setBehavior), []);

  return behavior;
}
