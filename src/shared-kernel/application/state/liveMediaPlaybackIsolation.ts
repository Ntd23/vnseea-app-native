import { useEffect, useState } from 'react';

type LiveMediaActiveListener = (active: boolean) => void;

const LIVE_DEBUG_PREFIX = '[VNSEEA_CALL_DEBUG]';
const listeners = new Set<LiveMediaActiveListener>();
let liveMediaActive = false;

function logLiveMediaIsolationDebug(
  event: string,
  data: Record<string, unknown> = {},
) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...data,
  };

  try {
    console.log(LIVE_DEBUG_PREFIX, JSON.stringify(payload));
  } catch {
    console.log(LIVE_DEBUG_PREFIX, event, data);
  }
}

export function getLiveMediaActive() {
  return liveMediaActive;
}

export function publishLiveMediaActive(active: boolean) {
  const nextActive = Boolean(active);
  if (liveMediaActive === nextActive) return;

  liveMediaActive = nextActive;
  logLiveMediaIsolationDebug('live_video_audio_session_isolation_changed', {
    active: liveMediaActive,
  });
  listeners.forEach(listener => listener(liveMediaActive));
}

export function subscribeLiveMediaActive(listener: LiveMediaActiveListener) {
  listeners.add(listener);
  listener(liveMediaActive);

  return () => {
    listeners.delete(listener);
  };
}

export function useLiveMediaActive() {
  const [active, setActive] = useState(liveMediaActive);

  useEffect(() => subscribeLiveMediaActive(setActive), []);

  return active;
}
