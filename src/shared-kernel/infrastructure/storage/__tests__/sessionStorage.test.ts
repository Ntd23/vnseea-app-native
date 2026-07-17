const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { sessionStorage } from '../sessionStorage';

describe('sessionStorage current-user profile subscriptions', () => {
  beforeEach(() => {
    sessionStorage.clearSession();
    mockValues.clear();
  });

  it('notifies active subscribers when the cached avatar changes', () => {
    const listener = jest.fn();
    const unsubscribe = sessionStorage.subscribeToUserProfile(listener);

    sessionStorage.setUserProfile({
      name: 'Giang',
      username: 'giang',
      avatarUrl: 'https://example.com/avatar-new.jpg',
    });

    expect(listener).toHaveBeenCalledWith({
      name: 'Giang',
      username: 'giang',
      avatarUrl: 'https://example.com/avatar-new.jpg',
    });

    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = sessionStorage.subscribeToUserProfile(listener);
    unsubscribe();

    sessionStorage.setUserProfile({ avatarUrl: 'https://example.com/avatar.jpg' });

    expect(listener).not.toHaveBeenCalled();
  });
});
