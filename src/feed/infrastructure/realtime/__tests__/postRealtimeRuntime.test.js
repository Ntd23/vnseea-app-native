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

  it('retries realtime connection while disconnected fallback polling is active', () => {
    expect(source).toMatch(
      /setInterval\([\s\S]*coordinator\.refreshWatchedPosts\(\)[\s\S]*ensureConnected\(\)[\s\S]*POLL_INTERVAL_MS/,
    );
  });

  it('discards stale socket auth after a reconnect error', () => {
    expect(source).toMatch(
      /nextSocket\.on\('connect_error',[\s\S]*nextSocket\.disconnect\(\)[\s\S]*socket = null[\s\S]*accessToken = ''/,
    );
  });
});
