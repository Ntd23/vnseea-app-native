import {
  DISCOVERY_PERSISTED_MAX_AGE_MS,
  DISCOVERY_RELOAD_MIN_INTERVAL_MS,
  isPersistedDiscoveryLocationFresh,
  shouldReloadNearbyPages,
} from '../mapDiscoveryLocation';

const hanoi = { latitude: 21.0285, longitude: 105.8542 };

describe('map discovery location stability', () => {
  it('uses only recent and reasonably accurate persisted fixes', () => {
    const now = 1_000_000;

    expect(
      isPersistedDiscoveryLocationFresh(
        { ...hanoi, accuracy: 25, timestamp: now - 30_000 },
        now,
      ),
    ).toBe(true);
    expect(
      isPersistedDiscoveryLocationFresh(
        {
          ...hanoi,
          accuracy: 25,
          timestamp: now - DISCOVERY_PERSISTED_MAX_AGE_MS - 1,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPersistedDiscoveryLocationFresh(
        { ...hanoi, accuracy: 500, timestamp: now - 30_000 },
        now,
      ),
    ).toBe(false);
  });

  it('replaces a persisted Page dataset with the first accurate GPS fix', () => {
    expect(
      shouldReloadNearbyPages({
        currentOrigin: hanoi,
        currentSource: 'persisted',
        nextOrigin: { latitude: 21.029, longitude: 105.855 },
        nextSource: 'gps',
        nextAccuracy: 20,
        lastLoadedAt: 99_900,
        now: 100_000,
      }),
    ).toBe(true);
  });

  it('ignores GPS jitter and rate-limits a real relocation', () => {
    expect(
      shouldReloadNearbyPages({
        currentOrigin: hanoi,
        currentSource: 'gps',
        nextOrigin: { latitude: 21.0288, longitude: 105.8545 },
        nextSource: 'gps',
        nextAccuracy: 15,
        lastLoadedAt: 90_000,
        now: 100_000,
      }),
    ).toBe(false);

    const relocated = { latitude: 21.045, longitude: 105.87 };
    expect(
      shouldReloadNearbyPages({
        currentOrigin: hanoi,
        currentSource: 'gps',
        nextOrigin: relocated,
        nextSource: 'gps',
        nextAccuracy: 15,
        lastLoadedAt: 100_000 - DISCOVERY_RELOAD_MIN_INTERVAL_MS + 1,
        now: 100_000,
      }),
    ).toBe(false);
    expect(
      shouldReloadNearbyPages({
        currentOrigin: hanoi,
        currentSource: 'gps',
        nextOrigin: relocated,
        nextSource: 'gps',
        nextAccuracy: 15,
        lastLoadedAt: 100_000 - DISCOVERY_RELOAD_MIN_INTERVAL_MS,
        now: 100_000,
      }),
    ).toBe(true);
  });

  it('rejects a low-quality GPS fix before it can replace Page markers', () => {
    expect(
      shouldReloadNearbyPages({
        currentOrigin: hanoi,
        currentSource: 'persisted',
        nextOrigin: { latitude: 21.05, longitude: 105.88 },
        nextSource: 'gps',
        nextAccuracy: 900,
        lastLoadedAt: 0,
        now: 100_000,
      }),
    ).toBe(false);
  });
});
