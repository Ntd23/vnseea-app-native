// Description: Thin JS bridge for Android device-heading updates on the map screen.
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

type NavigationHeadingNativeModule = {
  start(): void;
  stop(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

type HeadingEvent = {
  heading?: number;
};

const EVENT_NAME = 'vnseeaNavigationHeading';

function getNavigationHeadingModule() {
  if (Platform.OS !== 'android') return undefined;
  return NativeModules.VnseeaNavigationHeading as
    | NavigationHeadingNativeModule
    | undefined;
}

export function subscribeNavigationHeading(
  onHeading: (heading: number) => void,
) {
  const headingModule = getNavigationHeadingModule();
  if (!headingModule) {
    console.warn('[NavigationHeading] native module missing. Rebuild Android app.');
    return () => undefined;
  }

  const emitter = new NativeEventEmitter(headingModule);
  let subscription: EmitterSubscription | undefined;

  subscription = emitter.addListener(EVENT_NAME, (event: HeadingEvent) => {
    const heading = Number(event.heading);
    if (Number.isFinite(heading)) {
      onHeading(((heading % 360) + 360) % 360);
    }
  });
  headingModule.start();

  return () => {
    subscription?.remove();
    headingModule.stop();
  };
}
