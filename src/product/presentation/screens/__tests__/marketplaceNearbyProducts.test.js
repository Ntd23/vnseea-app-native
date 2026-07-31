const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Marketplace nearby products', () => {
  const marketplace = read(
    'src/product/presentation/screens/MarketplaceScreen.tsx',
  );
  const card = read('src/product/presentation/components/ProductPostCard.tsx');
  const viewModel = read(
    'src/product/application/view-models/useMarketplaceViewModel.ts',
  );
  const repository = read(
    'src/product/infrastructure/repositories/ApiProductRepository.ts',
  );
  const endpoint = read('phtml/api/v2/endpoints/get-products.php');

  it('loads nearby products in the Marketplace list instead of leaving for the map', () => {
    expect(marketplace).toContain('handleNearbyStoresToggle');
    expect(marketplace).toContain('setMarketplaceDistance(15)');
    expect(marketplace).toContain('onPress={handleNearbyStoresToggle}');
    expect(marketplace).toContain('distanceLimitKm=');
    expect(marketplace).toContain('Xem sản phẩm');
  });

  it('uses the current device location for marketplace distance filtering', () => {
    expect(viewModel).toContain('getCurrentDeviceLocation');
    expect(viewModel).toContain('saveLastMapLocation');
    expect(viewModel).toContain('lat: currentDistanceOrigin?.latitude');
    expect(viewModel).toContain('lng: currentDistanceOrigin?.longitude');
    expect(repository).toContain('lat: input?.lat');
    expect(repository).toContain('lng: input?.lng');
    expect(endpoint).toContain('$has_request_origin');
    expect(endpoint).toContain("$wo['user']['lat'] = $filter_lat");
    expect(endpoint).toContain(
      "'distance_origin_source' => $has_request_origin ? 'device' : 'profile'",
    );
  });

  it('normalizes, computes, sorts, and renders product distance from the active origin', () => {
    expect(repository).toContain('normalizeProductDistance');
    expect(repository).toContain('record.distance_meters');
    expect(viewModel).toContain('enrichProductDistances');
    expect(viewModel).toContain('sortProductsByDistance');
    expect(viewModel).toContain('filterProductsByDistance');
    expect(viewModel).toContain('DISTANCE_FALLBACK_PAGE_SIZE');
    expect(viewModel).toContain('isResolvingDistanceOrigin');
    expect(card).toContain('Cách bạn');
    expect(card).toContain('Trong phạm vi');
  });

  it('keeps distance-slider movement on the UI thread and applies once', () => {
    expect(marketplace).toContain('Gesture.Pan()');
    expect(marketplace).toContain('GestureHandlerRootView');
    expect(marketplace).toContain(
      '<GestureHandlerRootView style={DISTANCE_MODAL_GESTURE_ROOT_STYLE}>',
    );
    expect(marketplace).toContain('useSharedValue(');
    expect(marketplace).toContain('const [draftValue, setDraftValue]');
    expect(marketplace).toContain('onApply(draftValue)');
    expect(marketplace).toContain('onApply={vm.setDistance}');
    expect(marketplace).not.toContain('PanResponder.create');
    expect(marketplace).not.toContain('onChange={vm.setDistance}');
  });
});
