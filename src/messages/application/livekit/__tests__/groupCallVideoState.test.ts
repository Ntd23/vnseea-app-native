import {
  getGroupCameraRenderStateKey,
  getGroupCameraTrackRenderKey,
  getRenderableGroupCameraTrack,
} from '../groupCallVideoState';

function createTrackReference(options?: {
  muted?: boolean;
  streamUrl?: string;
  withTrack?: boolean;
}) {
  const {
    muted = false,
    streamUrl = 'stream://camera-1',
    withTrack = true,
  } = options ?? {};

  return {
    participant: {
      identity: 'groupcall_user_1',
      sid: 'PA_1',
      isLocal: true,
    },
    source: 'camera',
    publication: {
      trackSid: 'TR_CAMERA_1',
      source: 'camera',
      isMuted: muted,
      track: withTrack
        ? {
            mediaStream: streamUrl
              ? {
                  toURL: () => streamUrl,
                }
              : undefined,
          }
        : undefined,
    },
  } as never;
}

describe('group call video render state', () => {
  it('does not render a publication before its track exists', () => {
    expect(
      getRenderableGroupCameraTrack(
        createTrackReference({ withTrack: false }),
      ),
    ).toBeUndefined();
  });

  it('does not render a track before its media stream exists', () => {
    expect(
      getRenderableGroupCameraTrack(createTrackReference({ streamUrl: '' })),
    ).toBeUndefined();
  });

  it('returns a ready and unmuted camera track', () => {
    const trackRef = createTrackReference();

    expect(getRenderableGroupCameraTrack(trackRef)).toBe(trackRef);
  });

  it('does not render a muted camera publication', () => {
    expect(
      getRenderableGroupCameraTrack(createTrackReference({ muted: true })),
    ).toBeUndefined();
  });

  it('changes the render key when the media stream restarts', () => {
    const firstTrackRef = createTrackReference({
      streamUrl: 'stream://camera-before-restart',
    });
    const restartedTrackRef = createTrackReference({
      streamUrl: 'stream://camera-after-restart',
    });

    expect(getGroupCameraTrackRenderKey(firstTrackRef)).not.toBe(
      getGroupCameraTrackRenderKey(restartedTrackRef),
    );
    expect(getGroupCameraRenderStateKey([firstTrackRef])).not.toBe(
      getGroupCameraRenderStateKey([restartedTrackRef]),
    );
  });
});
