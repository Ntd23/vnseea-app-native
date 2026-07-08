import { useEffect, useState } from 'react';

export type NativeTabMinimizeBehavior = 'onScrollDown' | 'none';
export type NativeTabBarPresentation = 'expanded' | 'minimized';

type NativeTabMinimizeBehaviorListener = (
  behavior: NativeTabMinimizeBehavior,
) => void;
type NativeTabBarPresentationListener = (
  presentation: NativeTabBarPresentation,
) => void;

const DEFAULT_NATIVE_TAB_MINIMIZE_BEHAVIOR: NativeTabMinimizeBehavior =
  'onScrollDown';

const listeners = new Set<NativeTabMinimizeBehaviorListener>();
const presentationListeners = new Set<NativeTabBarPresentationListener>();
let currentBehavior: NativeTabMinimizeBehavior =
  DEFAULT_NATIVE_TAB_MINIMIZE_BEHAVIOR;
let currentPresentation: NativeTabBarPresentation = 'expanded';

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

export const nativeTabBarPresentation = {
  getPresentation() {
    return currentPresentation;
  },
  setPresentation(nextPresentation: NativeTabBarPresentation) {
    if (currentPresentation === nextPresentation) return;

    currentPresentation = nextPresentation;
    presentationListeners.forEach(listener => listener(currentPresentation));
  },
  subscribe(listener: NativeTabBarPresentationListener) {
    presentationListeners.add(listener);

    return () => {
      presentationListeners.delete(listener);
    };
  },
  reset() {
    currentPresentation = 'expanded';
    presentationListeners.clear();
  },
};

export function useNativeTabMinimizeBehavior() {
  const [behavior, setBehavior] = useState<NativeTabMinimizeBehavior>(
    nativeTabMinimizeBehavior.getBehavior(),
  );

  useEffect(() => nativeTabMinimizeBehavior.subscribe(setBehavior), []);

  return behavior;
}

export function useNativeTabBarPresentation() {
  const [presentation, setPresentation] = useState<NativeTabBarPresentation>(
    nativeTabBarPresentation.getPresentation(),
  );

  useEffect(() => nativeTabBarPresentation.subscribe(setPresentation), []);

  return presentation;
}
