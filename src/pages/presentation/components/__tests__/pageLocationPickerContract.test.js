const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('page location picker contract', () => {
  it('uses a Google map with a fixed center pin and reverse-geocodes after map movement', () => {
    const source = read('PageLocationPickerModal.tsx');

    expect(source).toContain('provider={PROVIDER_GOOGLE}');
    expect(source).toContain('onRegionChangeComplete={handleRegionChangeComplete}');
    expect(source).toContain("type: 'reverse_geocode'");
    expect(source).toContain('REVERSE_GEOCODE_DEBOUNCE_MS');
    expect(source).toContain('handleUseCurrentLocation');
  });

  it('wires the picker into Create Page and keeps address search in address mode', () => {
    const screen = fs.readFileSync(
      path.resolve(__dirname, '../../screens/CreatePageScreen.tsx'),
      'utf8',
    );

    expect(screen).toContain('preferAddressSearch');
    expect(screen).toContain('PageLocationPickerModal');
    expect(screen).toContain('Chọn vị trí chính xác trên bản đồ');
    expect(screen).toContain('onConfirm={handleLocationConfirm}');
  });
});
