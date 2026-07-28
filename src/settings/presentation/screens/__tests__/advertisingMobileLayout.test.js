const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('AdvertisingScreen mobile layout', () => {
  it('uses the Home header chrome and a phone-friendly campaign card list', () => {
    const source = read(
      'src/settings/presentation/screens/AdvertisingScreen.tsx',
    );

    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={APP_BRAND_COLOR} />',
    );
    expect(source).toContain('barStyle="light-content"');
    expect(source).toContain('function AdCampaignCard');
    expect(source).toContain('ads.map(ad => (');
    expect(source).not.toContain('function CampaignTableRow');
    expect(source).not.toContain('<ScrollView horizontal');
    expect(source).not.toContain('w-[748px]');
  });

  it('keeps the primary campaign actions large enough for touch use', () => {
    const source = read(
      'src/settings/presentation/screens/AdvertisingScreen.tsx',
    );

    expect(source).toContain('min-h-[46px] flex-1');
    expect(source).toContain('h-[46px] w-[46px]');
    expect(source).toContain('onPress={() => onViewDetails(ad)}');
    expect(source).toContain('onPress={() => onEdit(ad)}');
    expect(source).toContain('onPress={() => onDelete(ad)}');
  });

  it('uses an accessible custom deletion modal instead of the native alert', () => {
    const source = read(
      'src/settings/presentation/screens/AdvertisingScreen.tsx',
    );

    expect(source).toContain('<Modal');
    expect(source).toContain('visible={Boolean(pendingDeleteAd)}');
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('onPress={confirmDelete}');
    expect(source).toContain('disabled={isDeleting}');
    expect(source).not.toContain('Alert.alert(');
  });

  it('synchronizes campaign metrics while the focused app is active', () => {
    const screenSource = read(
      'src/settings/presentation/screens/AdvertisingScreen.tsx',
    );
    const viewModelSource = read(
      'src/settings/application/view-models/useAdvertisingViewModel.ts',
    );

    expect(screenSource).toContain('AD_LIST_REFRESH_INTERVAL_MS = 5_000');
    expect(screenSource).toContain('AppState.addEventListener(');
    expect(screenSource).toContain('syncAds().catch(() => undefined)');
    expect(screenSource).toContain('clearInterval(refreshTimer)');
    expect(screenSource).toContain('{copy.liveMetrics}');
    expect(viewModelSource).toContain('const syncAds = useCallback(() => {');
    expect(viewModelSource).toContain('syncRequestRef.current');
    expect(viewModelSource).toContain('const data = await repository.getMyAds()');
  });
});
