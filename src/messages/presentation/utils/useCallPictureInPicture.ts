// Description: Coordinates the dedicated Android call PiP activity with active LiveKit tracks.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

const CALL_PIP_MODE_CHANGED_EVENT = 'VNSEEA_CALL_PIP_MODE_CHANGED';
const CALL_PIP_RESTORE_REQUESTED_EVENT =
  'VNSEEA_CALL_PIP_RESTORE_REQUESTED';

type CallPictureInPictureEvent = {
  active?: boolean;
};

type CallPictureInPictureNativeModule = {
  configureVideoCallPictureInPicture(
    enabled: boolean,
    localCameraEnabled: boolean,
    localMirror: boolean,
    localStreamUrl: string,
    remoteStreamUrls: string[],
    aspectWidth: number,
    aspectHeight: number,
  ): Promise<boolean>;
  enterVideoCallPictureInPicture(): Promise<boolean>;
  isInPictureInPictureMode(): Promise<boolean>;
  closeCallPictureInPictureIfActive(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

export type CallPictureInPictureOptions = {
  aspectHeight?: number;
  aspectWidth?: number;
  enabled: boolean;
  localCameraEnabled: boolean;
  localMirror: boolean;
  localStreamUrl: string;
  onEntered?: () => void;
  onRestore?: () => void;
  remoteStreamUrls: string[];
  shouldEnter: boolean;
};

const callPictureInPictureModule = NativeModules.VnseeaCallIntent as
  | CallPictureInPictureNativeModule
  | undefined;

export function useCallPictureInPicture(
  {
    aspectHeight = 2,
    aspectWidth = 3,
    enabled,
    localCameraEnabled,
    localMirror,
    localStreamUrl,
    onEntered,
    onRestore,
    remoteStreamUrls,
    shouldEnter,
  }: CallPictureInPictureOptions,
) {
  const [isInPictureInPictureMode, setPictureInPictureMode] = useState(false);
  const onEnteredRef = useRef(onEntered);
  const onRestoreRef = useRef(onRestore);
  const didRequestEntryRef = useRef(false);
  const remoteStreamUrlsKey = remoteStreamUrls.join('\u001f');
  const stableRemoteStreamUrls = useMemo(
    () => (remoteStreamUrlsKey ? remoteStreamUrlsKey.split('\u001f') : []),
    [remoteStreamUrlsKey],
  );

  onEnteredRef.current = onEntered;
  onRestoreRef.current = onRestore;

  useEffect(
    () => () => {
      if (Platform.OS !== 'android' || !callPictureInPictureModule) return;
      callPictureInPictureModule
        .configureVideoCallPictureInPicture(
          false,
          false,
          false,
          '',
          [],
          aspectWidth,
          aspectHeight,
        )
        .catch(() => undefined);
      callPictureInPictureModule
        .closeCallPictureInPictureIfActive()
        .catch(() => undefined);
    },
    [aspectHeight, aspectWidth],
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !callPictureInPictureModule) return;

    let isActive = true;
    const emitter = new NativeEventEmitter(callPictureInPictureModule);
    const subscriptions: EmitterSubscription[] = [
      emitter.addListener(
        CALL_PIP_MODE_CHANGED_EVENT,
        (event: CallPictureInPictureEvent) => {
          if (!isActive) return;
          const active = event.active === true;
          setPictureInPictureMode(active);
          if (active) onEnteredRef.current?.();
        },
      ),
      emitter.addListener(CALL_PIP_RESTORE_REQUESTED_EVENT, () => {
        if (!isActive) return;
        setPictureInPictureMode(false);
        didRequestEntryRef.current = false;
        onRestoreRef.current?.();
      }),
    ];

    callPictureInPictureModule
      .isInPictureInPictureMode()
      .then(isInMode => {
        if (isActive) setPictureInPictureMode(enabled && isInMode);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !callPictureInPictureModule) return;

    callPictureInPictureModule
      .configureVideoCallPictureInPicture(
        enabled,
        localCameraEnabled,
        localMirror,
        localStreamUrl,
        stableRemoteStreamUrls,
        aspectWidth,
        aspectHeight,
      )
      .then(didConfigure => {
        if (!enabled || !didConfigure) {
          didRequestEntryRef.current = false;
          setPictureInPictureMode(false);
        }
      })
      .catch(() => {
        if (!enabled) setPictureInPictureMode(false);
      });

    if (!enabled) {
      didRequestEntryRef.current = false;
      callPictureInPictureModule
        .closeCallPictureInPictureIfActive()
        .catch(() => undefined);
    }
  }, [
    aspectHeight,
    aspectWidth,
    enabled,
    localCameraEnabled,
    localMirror,
    localStreamUrl,
    stableRemoteStreamUrls,
  ]);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !callPictureInPictureModule ||
      !enabled ||
      !shouldEnter
    ) {
      if (!shouldEnter) didRequestEntryRef.current = false;
      return;
    }
    if (didRequestEntryRef.current) return;
    didRequestEntryRef.current = true;
    callPictureInPictureModule
      .enterVideoCallPictureInPicture()
      .then(didEnter => {
        if (!didEnter) didRequestEntryRef.current = false;
      })
      .catch(() => {
        didRequestEntryRef.current = false;
      });
  }, [enabled, shouldEnter]);

  return { isInPictureInPictureMode };
}
