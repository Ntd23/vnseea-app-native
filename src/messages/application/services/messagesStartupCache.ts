// Description: Keeps the first Messages conversation page warm for instant navigation.
import type { ChatItem } from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

const repository = createMessagesRepository();
const STARTUP_CACHE_TTL_MS = 60_000;
const STARTUP_CACHE_MAX_ITEMS = 80;

type MessagesStartupSnapshot = {
  ownerId: string;
  updatedAt: number;
  chats: ChatItem[];
};

let startupSnapshot: MessagesStartupSnapshot | null = null;
let pendingPreload:
  | { ownerId: string; request: Promise<ChatItem[]> }
  | null = null;

function getOwnerId() {
  return sessionStorage.getSession()?.userId?.trim() || 'guest';
}

export function getMessagesStartupSnapshot(): ChatItem[] {
  const ownerId = getOwnerId();
  if (!startupSnapshot || startupSnapshot.ownerId !== ownerId) return [];
  return startupSnapshot.chats;
}

export function setMessagesStartupSnapshot(chats: ChatItem[]) {
  startupSnapshot = {
    ownerId: getOwnerId(),
    updatedAt: Date.now(),
    chats: chats.slice(0, STARTUP_CACHE_MAX_ITEMS),
  };
}

export function preloadMessagesStartupChats(forceRefresh = false) {
  const ownerId = getOwnerId();
  const isFresh =
    startupSnapshot?.ownerId === ownerId &&
    Date.now() - startupSnapshot.updatedAt < STARTUP_CACHE_TTL_MS;

  if (!forceRefresh && isFresh) {
    return Promise.resolve(startupSnapshot?.chats ?? []);
  }

  if (pendingPreload?.ownerId === ownerId) {
    return pendingPreload.request;
  }

  const request = repository
    .getChats({ includeDiscovery: false, latestOnly: true })
    .then(chats => {
      if (getOwnerId() === ownerId) {
        setMessagesStartupSnapshot(chats);
      }
      return chats;
    })
    .finally(() => {
      if (pendingPreload?.request === request) {
        pendingPreload = null;
      }
    });

  pendingPreload = { ownerId, request };
  return request;
}
