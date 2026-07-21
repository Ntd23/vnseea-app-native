const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import { sessionStorage } from '../sessionStorage';
import {
  readLastMapLocation,
  saveLastMapLocation,
} from '../mapLocationStorage';

describe('mapLocationStorage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockValues.clear();
    sessionStorage.clearSession();
    sessionStorage.setSession({ accessToken: 'token', userId: 'user-1' });
    jest.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores the latest fix for the active user', () => {
    saveLastMapLocation({ latitude: 10.77, longitude: 106.69, accuracy: 12 });

    expect(readLastMapLocation()).toEqual({
      latitude: 10.77,
      longitude: 106.69,
      accuracy: 12,
      timestamp: new Date('2026-07-21T00:00:00.000Z').getTime(),
    });
  });

  it('drops a fix older than one day', () => {
    saveLastMapLocation({ latitude: 10.77, longitude: 106.69 });
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    expect(readLastMapLocation()).toBeNull();
  });
});
