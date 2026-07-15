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
  autoSubscribe: boolean;
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

const DEFAULT_SUBSCRIPTION_TIMEOUT_MS = 3_000;

export function createRemoteTrackSubscriptionCoordinator(
  options: RemoteTrackSubscriptionCoordinatorOptions,
) {
  const {
    room,
    autoSubscribe,
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
  const subscribedTrackSids = new Set<string>();
  let started = false;

  const clearPending = (trackSid?: string) => {
    if (!trackSid) return;
    const current = pending.get(trackSid);
    if (current) clearTimeout(current.timeoutId);
    pending.delete(trackSid);
  };

  const isReady = (publication: RemoteTrackPublication) =>
    publication.isSubscribed && Boolean(publication.track);

  const markSubscribed = (
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    const trackSid = publication.trackSid;
    clearPending(trackSid);
    if (!trackSid || subscribedTrackSids.has(trackSid)) return;
    subscribedTrackSids.add(trackSid);
    const context = {
      publication,
      participant,
      retryAttempt: 0,
    };
    log?.('group_track_subscription_subscribed', context);
    onSubscribed?.(context);
  };

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
          const retryContext = {
            ...context,
            retryAttempt: 1,
          };
          if (autoSubscribe) {
            publication.setSubscribed(true);
            log?.(
              'group_track_subscription_recovery_requested',
              retryContext,
            );
          } else {
            publication.setSubscribed(false);
            publication.setSubscribed(true);
            log?.('group_track_subscription_retry', retryContext);
          }
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
    if (!trackSid || !allowedSources.has(publication.source)) {
      return;
    }

    if (isReady(publication)) {
      markSubscribed(publication, participant);
      return;
    }

    if (pending.has(trackSid)) return;

    const context = { publication, participant, retryAttempt: 0 };
    if (autoSubscribe) {
      log?.('group_track_auto_subscribe_waiting', context);
      scheduleTimeout(publication, participant, 0);
      return;
    }

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
    markSubscribed(publication, participant);
  };
  const handleTrackUnsubscribed = (
    _track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    subscribedTrackSids.delete(publication.trackSid);
    request(publication, participant);
  };
  const handleTrackUnpublished = (
    publication: RemoteTrackPublication,
    _participant: RemoteParticipant,
  ) => {
    clearPending(publication.trackSid);
    subscribedTrackSids.delete(publication.trackSid);
  };
  const handleParticipantDisconnected = (participant: RemoteParticipant) => {
    Array.from(pending.entries()).forEach(([trackSid, current]) => {
      if (current.participant.sid === participant.sid) clearPending(trackSid);
    });
    participant.trackPublications.forEach(publication => {
      subscribedTrackSids.delete(publication.trackSid);
    });
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
      .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      .on(RoomEvent.TrackPublished, handleTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.TrackUnpublished, handleTrackUnpublished)
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
        .off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .off(RoomEvent.TrackPublished, handleTrackPublished)
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .off(RoomEvent.TrackUnpublished, handleTrackUnpublished)
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
    subscribedTrackSids.clear();
  };

  return {
    start,
    requestExisting,
    requestParticipant,
    dispose,
  };
}
