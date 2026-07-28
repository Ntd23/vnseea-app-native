export const CREATE_POST_TRAY_ACTION_KEYS = [
  'photo',
  'video',
  'product',
  'job',
  'live',
  'poll',
  'ad',
] as const;

export const CREATE_POST_KEYBOARD_ACTION_KEYS = [
  'photo',
  'video',
  'product',
  'job',
] as const;

export const CREATE_POST_MORE_EXCLUDED_ACTION_KEYS = [
  'album',
  'event',
  'page',
  'group',
  'reel',
  'blog',
] as const;

export type CreatePostTrayActionKey =
  (typeof CREATE_POST_TRAY_ACTION_KEYS)[number];
