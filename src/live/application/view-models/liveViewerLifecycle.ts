export type LiveViewerLifecycleState =
  | 'watching'
  | 'reconnecting'
  | 'ended';

export type LiveViewerLifecycleEvent =
  | 'media_connected'
  | 'media_disconnected'
  | 'media_error'
  | 'backend_live'
  | 'backend_offline'
  | 'room_changed';

export function reduceLiveViewerLifecycle(
  state: LiveViewerLifecycleState,
  event: LiveViewerLifecycleEvent,
): LiveViewerLifecycleState {
  if (event === 'room_changed') return 'watching';
  if (state === 'ended') return state;
  if (event === 'backend_offline') return 'ended';
  if (event === 'media_disconnected' || event === 'media_error') {
    return 'reconnecting';
  }
  if (event === 'media_connected') return 'watching';
  return state;
}
