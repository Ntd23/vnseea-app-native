import type {
  TrackReference,
  TrackReferenceOrPlaceholder,
} from '@livekit/react-native';

type MediaStreamTrack = {
  mediaStream?: {
    toURL?: () => string;
  };
};

function isPublishedTrackReference(
  trackRef: TrackReferenceOrPlaceholder,
): trackRef is TrackReference {
  return 'publication' in trackRef && Boolean(trackRef.publication);
}

function getMediaStreamUrl(
  trackRef: TrackReferenceOrPlaceholder | undefined,
): string {
  if (!trackRef || !isPublishedTrackReference(trackRef)) return '';

  const mediaStream = (
    trackRef.publication.track as MediaStreamTrack | undefined
  )?.mediaStream;
  if (!mediaStream || typeof mediaStream.toURL !== 'function') return '';

  try {
    return mediaStream.toURL() || '';
  } catch {
    return '';
  }
}

export function getRenderableGroupCameraTrack(
  trackRef: TrackReferenceOrPlaceholder | undefined,
): TrackReference | undefined {
  if (!trackRef || !isPublishedTrackReference(trackRef)) return undefined;
  if (trackRef.publication.isMuted || !trackRef.publication.track) {
    return undefined;
  }

  return getMediaStreamUrl(trackRef) ? trackRef : undefined;
}

export function getGroupCameraTrackRenderKey(
  trackRef: TrackReferenceOrPlaceholder | undefined,
): string {
  if (!trackRef) return 'camera:none';

  const participantKey =
    trackRef.participant.identity || trackRef.participant.sid || 'unknown';
  if (!isPublishedTrackReference(trackRef)) {
    return `${participantKey}:camera:placeholder`;
  }

  const trackSid = trackRef.publication.trackSid || 'pending';
  const streamUrl = getMediaStreamUrl(trackRef) || 'pending';
  const muteState = trackRef.publication.isMuted ? 'muted' : 'unmuted';

  return `${participantKey}:${trackSid}:${streamUrl}:${muteState}`;
}

export function getGroupCameraRenderStateKey(
  trackRefs: readonly TrackReferenceOrPlaceholder[],
): string {
  return trackRefs.map(getGroupCameraTrackRenderKey).join('|');
}
