import {
  CREATE_POST_KEYBOARD_ACTION_KEYS,
  CREATE_POST_MORE_EXCLUDED_ACTION_KEYS,
  CREATE_POST_TRAY_ACTION_KEYS,
} from '../createPostActionConfig';

describe('Create Post action configuration', () => {
  it('shows only the approved actions in the full composer tray', () => {
    expect(CREATE_POST_TRAY_ACTION_KEYS).toEqual([
      'photo',
      'video',
      'product',
      'job',
      'live',
      'poll',
      'ad',
    ]);
  });

  it('keeps the keyboard tray compact and exposes the remaining actions via More', () => {
    expect(CREATE_POST_KEYBOARD_ACTION_KEYS).toEqual([
      'photo',
      'video',
      'product',
      'job',
    ]);
  });

  it('hides unsupported creation flows from the More sheet', () => {
    expect(CREATE_POST_MORE_EXCLUDED_ACTION_KEYS).toEqual([
      'album',
      'event',
      'page',
      'group',
      'reel',
      'blog',
    ]);
  });
});
