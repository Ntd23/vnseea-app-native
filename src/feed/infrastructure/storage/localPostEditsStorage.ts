import { createMMKV } from 'react-native-mmkv';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

export type LocalPostCaptionEdit = {
  postId: string;
  text: string;
  updatedAt: number;
};

const storage = createMMKV({ id: 'vnseea-local-post-edits' });
const STORAGE_KEY_PREFIX = 'caption-edits.v1';
const MAX_LOCAL_EDITS = 200;

function getOwnerKey(userId?: string) {
  return userId?.trim() || sessionStorage.getSession()?.userId?.trim() || 'guest';
}

function getStorageKey(userId?: string) {
  return `${STORAGE_KEY_PREFIX}:${getOwnerKey(userId)}`;
}

function readEdits(userId?: string): Record<string, LocalPostCaptionEdit> {
  try {
    const json = storage.getString(getStorageKey(userId));
    if (!json) return {};
    const parsed = JSON.parse(json) as Record<string, LocalPostCaptionEdit>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (caught) {
    console.warn('[localPostEditsStorage] Failed to read local edits', caught);
    return {};
  }
}

function writeEdits(
  edits: Record<string, LocalPostCaptionEdit>,
  userId?: string,
) {
  const entries = Object.entries(edits)
    .filter(([, edit]) => Boolean(edit?.postId && typeof edit.text === 'string'))
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_LOCAL_EDITS);

  if (entries.length === 0) {
    storage.remove(getStorageKey(userId));
    return;
  }

  storage.set(getStorageKey(userId), JSON.stringify(Object.fromEntries(entries)));
}

export const localPostEditsStorage = {
  getCaptionEdit(postId: string, userId?: string): LocalPostCaptionEdit | null {
    const normalizedPostId = String(postId ?? '').trim();
    if (!normalizedPostId) return null;
    return readEdits(userId)[normalizedPostId] ?? null;
  },

  saveCaptionEdit(postId: string, text: string, userId?: string) {
    const normalizedPostId = String(postId ?? '').trim();
    if (!normalizedPostId) return;
    const edits = readEdits(userId);
    edits[normalizedPostId] = {
      postId: normalizedPostId,
      text,
      updatedAt: Date.now(),
    };
    writeEdits(edits, userId);
  },

  removeCaptionEdit(postId: string, userId?: string) {
    const normalizedPostId = String(postId ?? '').trim();
    if (!normalizedPostId) return;
    const edits = readEdits(userId);
    if (!edits[normalizedPostId]) return;
    delete edits[normalizedPostId];
    writeEdits(edits, userId);
  },
};
