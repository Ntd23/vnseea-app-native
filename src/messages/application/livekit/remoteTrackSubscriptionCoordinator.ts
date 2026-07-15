// Description: Coordinates selective LiveKit subscriptions with bounded retry and deterministic cleanup.
import {
  RoomEvent,
  Track,
  TrackPublication,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
} from 'livekit-client';

export type RemoteTrackSubscriptionContext = {
  publication: RemoteTrackPublication;
  participant: RemoteParticipant;
  retryAttempt: number;
};

type SubscriptionLog = (
  event: string,
  context: RemoteTrackSubscriptionContext,
) => void;
type SubscriptionCallback = (context: RemoteTrackSubscriptionContext) => void;

export type RemoteTrackSubscriptionCoordinatorOptions = {
  room: Room;
  sources: readonly Track.Source[];
  timeoutMs?: number;
  log?: SubscriptionLog;
  onRequested?: SubscriptionCallback;
  onRetry?: SubscriptionCallback;
  onSubscribed?: SubscriptionCallback;
  onTerminalFailure?: SubscriptionCallback;
};

type PendingSubscription = RemoteTrackSubscriptionContext & {
  timeoutId: ReturnType<typeof setTimeout>;
};

const DEFAULT_SUBSCRIPTION_TIMEOUT_MS = 2_000;

export function createRemoteTrackSubscriptionCoordinator(
  options: RemoteTrackSubscriptionCoordinatorOptions,
) {
  const {
    room,
    sources,
    timeoutMs = DEFAULT_SUBSCRIPTION_TIMEOUT_MS,
    log,
    onRequested,
    onRetry,
    onSubscribed,
    onTerminalFailure,
  } = options;
  const allowedSources = new Set(sources);
  const pending = new Map<string, PendingSubscription>();
  let started = false;

  const clearPending = (trackSid?: string) => {
    if (!trackSid) return;
    const current = pending.get(trackSid);
    if (current) clearTimeout(current.timeoutId);
    pending.delete(trackSid);
  };

  const isReady = (publication: RemoteTrackPublication) =>
    publication.isSubscribed && Boolean(publication.track);

  const scheduleTimeout = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
    retryAttempt: number,
  ) => {
    const trackSid = publication.trackSid;
    if (!trackSid) return;
    clearPending(trackSid);
    const context = { publication, participant, retryAttempt };
    const timeoutId = setTimeout(() => {
      const current = pending.get(trackSid);
      if (!current || isReady(publication)) {
        clearPending(trackSid);
        return;
      }

      if (retryAttempt === 0) {
        try {
          publication.setSubscribed(false);
          publication.setSubscribed(true);
          const retryContext = {
            ...context,
            retryAttempt: 1,
          };
          log?.('group_track_subscription_retry', retryContext);
          onRetry?.(retryContext);
          scheduleTimeout(publication, participant, 1);
        } catch {
          clearPending(trackSid);
          const failureContext = { ...context, retryAttempt: 1 };
          log?.('group_track_subscription_terminal_failure', failureContext);
          onTerminalFailure?.(failureContext);
        }
        return;
      }

      clearPending(trackSid);
      log?.('group_track_subscription_terminal_failure', context);
      onTerminalFailure?.(context);
    }, timeoutMs);

    pending.set(trackSid, { ...context, timeoutId });
  };

  const request = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    const trackSid = publication.trackSid;
    if (
      !trackSid ||
      !allowedSources.has(publication.source) ||
      isReady(publication) ||
      pending.has(trackSid)
    ) {
      return;
    }

    const context = { publication, participant, retryAttempt: 0 };
    try {
      publication.setSubscribed(true);
      log?.('group_track_subscription_requested', context);
      onRequested?.(context);
      scheduleTimeout(publication, participant, 0);
    } catch {
      log?.('group_track_subscription_terminal_failure', context);
      onTerminalFailure?.(context);
    }
  };

  const requestParticipant = (participant: RemoteParticipant) => {
    participant.trackPublications.forEach(publication => {
      request(publication, participant);
    });
  };

  const requestExisting = () => {
    room.remoteParticipants.forEach(requestParticipant);
  };

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    requestParticipant(participant);
  };
  const handleTrackPublished = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    request(publication, participant);
  };
  const handleTrackSubscribed = (
    _track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    clearPending(publication.trackSid);
    const context = {
      publication,
      participant,
      retryAttempt: 0,
    };
    log?.('group_track_subscription_subscribed', context);
    onSubscribed?.(context);
  };
  const handleTrackUnsubscribed = (
    _track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    request(publication, participant);
  };
  const handleSubscriptionFailed = (
    trackSid: string,
    participant: RemoteParticipant,
  ) => {
    const current = pending.get(trackSid);
    if (!current) return;
    clearPending(trackSid);
    const context = {
      publication: current.publication,
      participant,
      retryAttempt: current.retryAttempt,
    };
    log?.('group_track_subscription_terminal_failure', context);
    onTerminalFailure?.(context);
  };
  const handleSubscriptionStatusChanged = (
    publication: RemoteTrackPublication,
    _status: unknown,
    participant: RemoteParticipant,
  ) => {
    if (isReady(publication)) {
      handleTrackSubscribed(
        publication.track as RemoteTrack,
        publication,
        participant,
      );
    }
  };
  const handleSubscriptionPermissionChanged = (
    publication: RemoteTrackPublication,
    permissionStatus: TrackPublication.PermissionStatus,
    participant: RemoteParticipant,
  ) => {
    if (permissionStatus === TrackPublication.PermissionStatus.NotAllowed) {
      const current = pending.get(publication.trackSid);
      clearPending(publication.trackSid);
      const context = {
        publication,
        participant,
        retryAttempt: current?.retryAttempt ?? 0,
      };
      log?.('group_track_subscription_terminal_failure', context);
      onTerminalFailure?.(context);
    }
  };

  const start = () => {
    if (started) return;
    started = true;
    room
      .on(RoomEvent.Connected, requestExisting)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.TrackPublished, handleTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.TrackSubscriptionFailed, handleSubscriptionFailed)
      .on(
        RoomEvent.TrackSubscriptionStatusChanged,
        handleSubscriptionStatusChanged,
      )
      .on(
        RoomEvent.TrackSubscriptionPermissionChanged,
        handleSubscriptionPermissionChanged,
      );
  };

  const dispose = () => {
    if (started) {
      room
        .off(RoomEvent.Connected, requestExisting)
        .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .off(RoomEvent.TrackPublished, handleTrackPublished)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .off(RoomEvent.TrackSubscriptionFailed, handleSubscriptionFailed)
        .off(
          RoomEvent.TrackSubscriptionStatusChanged,
          handleSubscriptionStatusChanged,
        )
        .off(
          RoomEvent.TrackSubscriptionPermissionChanged,
          handleSubscriptionPermissionChanged,
        );
    }
    started = false;
    pending.forEach(item => clearTimeout(item.timeoutId));
    pending.clear();
  };

  return {
    start,
    requestExisting,
    requestParticipant,
    dispose,
  };
}
