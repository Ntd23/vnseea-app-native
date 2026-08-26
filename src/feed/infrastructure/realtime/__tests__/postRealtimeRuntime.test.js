const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../postRealtimeRuntime.ts'),
  'utf8',
);

describe('post realtime runtime', () => {
  it('authenticates through the Nuxt token endpoint with the app bearer token', () => {
    expect(source).toContain("Authorization: `Bearer ${token}`");
    expect(source).toContain("nuxtApiUrl('realtime/token')");
  });

  it('uses adaptive timeout polling while retrying realtime connection', () => {
    expect(source).toMatch(
      /setTimeout\([\s\S]*coordinator\.refreshWatchedPosts\(\)[\s\S]*pollAttempt \+= 1[\s\S]*ensureConnected\(\)/,
    );
    expect(source).toContain('POLL_BASE_INTERVAL_MS = 30_000');
    expect(source).toContain('POLL_MAX_INTERVAL_MS = 120_000');
    expect(source).toContain('POLL_JITTER_RATIO = 0.15');
    expect(source).not.toContain('setInterval(');
  });

  it('resets fallback backoff when connectivity or watched posts change', () => {
    expect(source).toContain('stopPolling(true)');
    expect(source).toContain('updatePolling({ resetBackoff: true })');
  });

  it('discards stale socket auth after a reconnect error', () => {
    expect(source).toMatch(
      /nextSocket\.on\('connect_error',[\s\S]*nextSocket\.disconnect\(\)[\s\S]*socket = null[\s\S]*accessToken = ''/,
    );
  });

  it('accepts edited invalidations emitted by the canonical relay', () => {
    expect(source).toContain("'reaction', 'comment', 'share', 'edited', 'deleted'");
  });

  it('cancels pending token requests and disconnects when realtime has no demand', () => {
    expect(source).toContain('signal: AbortSignal');
    expect(source).toContain('signal,');
    expect(source).toContain('activeTokenRequest?.controller.abort();');
    expect(source).toContain('function releaseRealtimeResourcesIfIdle()');
    expect(source).toContain('IDLE_RELEASE_GRACE_MS = 250');
    expect(source).toMatch(
      /release\(\);[\s\S]*scheduleRealtimeResourceReleaseIfIdle\(\)/,
    );
  });

  it('rechecks active demand after token acquisition before creating a socket', () => {
    expect(source).toContain('function hasRealtimeDemand()');
    expect(source).toMatch(
      /await requestToken\(token, request\.controller\.signal\);[\s\S]*!hasRealtimeDemand\(\)/,
    );
    expect(source).toMatch(
      /if \(nextState !== 'active'\) \{[\s\S]*releaseRealtimeResourcesIfIdle\(\)/,
    );
  });
});
