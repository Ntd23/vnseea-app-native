import { RoomEvent, Track } from 'livekit-client';
import { createRemoteTrackSubscriptionCoordinator } from '../remoteTrackSubscriptionCoordinator';

type Listener = (...args: never[]) => void;

class FakeRoom {
  remoteParticipants = new Map<string, FakeParticipant>();
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners
      .get(event)
      ?.forEach(listener => listener(...(args as never[])));
  }
}

class FakeParticipant {
  trackPublications = new Map<string, FakePublication>();

  constructor(
    readonly identity: string,
    readonly sid: string,
  ) {}
}

class FakePublication {
  isSubscribed = false;
  track: unknown;
  readonly setSubscribed = jest.fn((subscribed: boolean) => {
    if (!subscribed) {
      this.isSubscribed = false;
      this.track = undefined;
    }
  });

  constructor(
    readonly trackSid: string,
    readonly source: Track.Source,
  ) {}
}

describe('createRemoteTrackSubscriptionCoordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes existing microphone and camera publications once', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const camera = new FakePublication('cam-2', Track.Source.Camera);
    participant.trackPublications.set(microphone.trackSid, microphone);
    participant.trackPublications.set(camera.trackSid, camera);
    room.remoteParticipants.set(participant.identity, participant);

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: false,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 2_000,
    });

    coordinator.start();
    room.emit(RoomEvent.Connected);

    expect(microphone.setSubscribed).toHaveBeenCalledTimes(1);
    expect(microphone.setSubscribed).toHaveBeenLastCalledWith(true);
    expect(camera.setSubscribed).toHaveBeenCalledTimes(1);
    expect(camera.setSubscribed).toHaveBeenLastCalledWith(true);

    coordinator.dispose();
  });

  it('retries once then reports a terminal failure', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: false,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 2_000,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, microphone, participant);
    jest.advanceTimersByTime(2_000);

    expect(microphone.setSubscribed.mock.calls).toEqual([
      [true],
      [false],
      [true],
    ]);
    expect(onTerminalFailure).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2_000);
    expect(onTerminalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        publication: microphone,
        participant,
        retryAttempt: 1,
      }),
    );

    coordinator.dispose();
  });

  it('clears retry state when the track subscribes', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const onSubscribed = jest.fn();
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: false,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 2_000,
      onSubscribed,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, microphone, participant);
    microphone.isSubscribed = true;
    microphone.track = { kind: Track.Kind.Audio };
    room.emit(
      RoomEvent.TrackSubscribed,
      microphone.track,
      microphone,
      participant,
    );
    jest.advanceTimersByTime(4_000);

    expect(onSubscribed).toHaveBeenCalledWith(
      expect.objectContaining({ publication: microphone, participant }),
    );
    expect(onTerminalFailure).not.toHaveBeenCalled();

    coordinator.dispose();
  });

  it('deduplicates repeated participant and publication events by track SID', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const camera = new FakePublication('cam-2', Track.Source.Camera);
    participant.trackPublications.set(camera.trackSid, camera);

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: false,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 2_000,
    });

    coordinator.start();
    room.emit(RoomEvent.ParticipantConnected, participant);
    room.emit(RoomEvent.TrackPublished, camera, participant);
    room.emit(RoomEvent.TrackPublished, camera, participant);

    expect(camera.setSubscribed).toHaveBeenCalledTimes(1);
    expect(camera.setSubscribed).toHaveBeenCalledWith(true);

    coordinator.dispose();
  });

  it('accepts a late subscription after the terminal timeout', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const onSubscribed = jest.fn();
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: false,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 2_000,
      onSubscribed,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, microphone, participant);
    jest.advanceTimersByTime(4_000);
    expect(onTerminalFailure).toHaveBeenCalledTimes(1);

    microphone.isSubscribed = true;
    microphone.track = { kind: Track.Kind.Audio };
    room.emit(
      RoomEvent.TrackSubscribed,
      microphone.track,
      microphone,
      participant,
    );

    expect(onSubscribed).toHaveBeenCalledWith(
      expect.objectContaining({ publication: microphone, participant }),
    );

    coordinator.dispose();
  });

  it('waits for SDK auto-subscription without sending a primary request', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const camera = new FakePublication('cam-2', Track.Source.Camera);
    const log = jest.fn();
    const onSubscribed = jest.fn();
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: true,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 3_000,
      log,
      onSubscribed,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, camera, participant);

    expect(camera.setSubscribed).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'group_track_auto_subscribe_waiting',
      expect.objectContaining({ publication: camera, participant }),
    );

    camera.isSubscribed = true;
    camera.track = { kind: Track.Kind.Video };
    room.emit(RoomEvent.TrackSubscribed, camera.track, camera, participant);
    jest.advanceTimersByTime(6_000);

    expect(camera.setSubscribed).not.toHaveBeenCalled();
    expect(onSubscribed).toHaveBeenCalledTimes(1);
    expect(onTerminalFailure).not.toHaveBeenCalled();

    coordinator.dispose();
  });

  it('recovers auto-subscription once without toggling it off', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const log = jest.fn();
    const onRetry = jest.fn();
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: true,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 3_000,
      log,
      onRetry,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, microphone, participant);
    jest.advanceTimersByTime(3_000);

    expect(microphone.setSubscribed.mock.calls).toEqual([[true]]);
    expect(microphone.setSubscribed).not.toHaveBeenCalledWith(false);
    expect(log).toHaveBeenCalledWith(
      'group_track_subscription_recovery_requested',
      expect.objectContaining({ retryAttempt: 1 }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onTerminalFailure).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3_000);
    expect(microphone.setSubscribed).toHaveBeenCalledTimes(1);
    expect(onTerminalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        publication: microphone,
        participant,
        retryAttempt: 1,
      }),
    );

    coordinator.dispose();
  });

  it('clears auto-subscription recovery when a late track subscribes', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const microphone = new FakePublication('mic-2', Track.Source.Microphone);
    const onSubscribed = jest.fn();
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: true,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 3_000,
      onSubscribed,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, microphone, participant);
    jest.advanceTimersByTime(3_000);
    expect(microphone.setSubscribed.mock.calls).toEqual([[true]]);

    microphone.isSubscribed = true;
    microphone.track = { kind: Track.Kind.Audio };
    room.emit(
      RoomEvent.TrackSubscribed,
      microphone.track,
      microphone,
      participant,
    );
    jest.advanceTimersByTime(3_000);

    expect(onSubscribed).toHaveBeenCalledTimes(1);
    expect(onTerminalFailure).not.toHaveBeenCalled();

    coordinator.dispose();
  });

  it.each([
    ['track unpublish', RoomEvent.TrackUnpublished],
    ['participant disconnect', RoomEvent.ParticipantDisconnected],
  ])('clears pending auto-subscription on %s', (_name, event) => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const camera = new FakePublication('cam-2', Track.Source.Camera);
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: true,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 3_000,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, camera, participant);
    if (event === RoomEvent.TrackUnpublished) {
      room.emit(event, camera, participant);
    } else {
      room.emit(event, participant);
    }
    jest.advanceTimersByTime(6_000);

    expect(camera.setSubscribed).not.toHaveBeenCalled();
    expect(onTerminalFailure).not.toHaveBeenCalled();

    coordinator.dispose();
  });

  it('clears pending auto-subscription when disposed', () => {
    const room = new FakeRoom();
    const participant = new FakeParticipant('user-2', 'participant-2');
    const camera = new FakePublication('cam-2', Track.Source.Camera);
    const onTerminalFailure = jest.fn();

    const coordinator = createRemoteTrackSubscriptionCoordinator({
      room: room as never,
      autoSubscribe: true,
      sources: [Track.Source.Microphone, Track.Source.Camera],
      timeoutMs: 3_000,
      onTerminalFailure,
    });

    coordinator.start();
    room.emit(RoomEvent.TrackPublished, camera, participant);
    coordinator.dispose();
    jest.advanceTimersByTime(6_000);

    expect(camera.setSubscribed).not.toHaveBeenCalled();
    expect(onTerminalFailure).not.toHaveBeenCalled();
  });
});
