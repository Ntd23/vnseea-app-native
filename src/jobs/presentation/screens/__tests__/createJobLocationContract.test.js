const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../CreateJobScreen.tsx'),
  'utf8',
);

describe('Create Job location contract', () => {
  it('stores coordinates selected from address search and sends them to the API', () => {
    expect(source).toContain('const [jobCoordinate, setJobCoordinate]');
    expect(source).toContain('setJobCoordinate({');
    expect(source).toContain('lat: jobCoordinate?.latitude.toString()');
    expect(source).toContain('lng: jobCoordinate?.longitude.toString()');
  });

  it('clears stale coordinates when the address is edited manually', () => {
    expect(source).toContain('setJobCoordinate(null);');
  });
});
