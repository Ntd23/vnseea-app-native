// Description: Connects a LiveKit room and retries after short pauses when the server cannot be reached, so a brief network or server blip does not drop an answered call.
import {
  ConnectionError,
  ConnectionErrorReason,
  type Room,
  type RoomConnectOptions,
} from 'livekit-client';

/** Pauses before the second and the third attempt. */
export const ROOM_CONNECT_RETRY_DELAYS_MS = [1000, 2000];

/** The signal socket was refused or dropped before the server answered. */
export function isLiveKitServerUnreachable(error: unknown): boolean {
  if (error instanceof ConnectionError) {
    return error.reason === ConnectionErrorReason.ServerUnreachable;
  }
  const candidate = error as { name?: unknown; reason?: unknown } | null;
  return (
    candidate?.name === 'ConnectionError' &&
    candidate.reason === ConnectionErrorReason.ServerUnreachable
  );
}

export interface RoomConnectRetryHooks {
  /** False once the call ended or another room replaced this one. */
  shouldContinue(): boolean;
  onRetry?(attempt: number, error: unknown): void;
  /** Overridable for tests. */
  wait?(milliseconds: number): Promise<void>;
}

/**
 * The LiveKit SDK retries an unreachable server at once, which cannot ride
 * out a proxy restart or a network switch. Wait a little between attempts;
 * every other error (rejected token, timeout, room gone) fails right away.
 */
export async function connectRoomWithRetry(
  room: Pick<Room, 'connect'>,
  url: string,
  token: string,
  options: RoomConnectOptions,
  hooks: RoomConnectRetryHooks,
): Promise<void> {
  const wait =
    hooks.wait ??
    ((milliseconds: number) =>
      new Promise<void>(resolve => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      await room.connect(url, token, options);
      return;
    } catch (error) {
      const delay = ROOM_CONNECT_RETRY_DELAYS_MS[attempt];
      if (
        delay === undefined ||
        !isLiveKitServerUnreachable(error) ||
        !hooks.shouldContinue()
      ) {
        throw error;
      }
      hooks.onRetry?.(attempt + 1, error);
      await wait(delay);
      if (!hooks.shouldContinue()) throw error;
    }
  }
}
