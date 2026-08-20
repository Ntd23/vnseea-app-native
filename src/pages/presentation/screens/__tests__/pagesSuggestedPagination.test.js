const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Pages suggested pagination', () => {
  it('keeps the main suggested tab at 20 items and opens the full list', () => {
    const source = read('src/pages/presentation/screens/PagesScreen.tsx');

    expect(source).toContain("activeFilter === 'suggested' ? undefined : loadMore");
    expect(source).toContain('navigation.navigate(ROUTES.SUGGESTED_PAGES)');
    expect(source).toContain('{copy.viewAllSuggested}');
  });

  it('loads subsequent suggested pages only in the dedicated screen', () => {
    const source = read(
      'src/pages/presentation/screens/SuggestedPagesScreen.tsx',
    );

    expect(source).toContain("useMyPagesViewModel('suggested')");
    expect(source).toContain('onEndReached={loadMore}');
    expect(source).toContain('onEndReachedThreshold={0.45}');
    expect(source).toContain("navigation.navigate(ROUTES.PAGE_DETAIL, { page })");
    expect(source).toContain('placeholder={copy.searchPlaceholder}');
    expect(source).toContain('setSearchQuery(searchText)');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('searches Pages through the existing paginated API instead of filtering loaded cards', () => {
    const repository = read(
      'src/pages/infrastructure/repositories/ApiPagesRepository.ts',
    );
    const viewModel = read(
      'src/pages/application/view-models/useMyPagesViewModel.ts',
    );

    expect(repository).toContain('async searchPages(query, options = {})');
    expect(repository).toContain('apiRoutes.search.all');
    expect(repository).toContain('page_offset: Number.isFinite(offset) ? offset : 0');
    expect(viewModel).toContain('repository.searchPages(searchQuery');
    expect(viewModel).toContain('requestGenerationRef.current');
  });

  it('forwards the page cursor through the repository and mirror endpoint', () => {
    const repository = read(
      'src/pages/infrastructure/repositories/ApiPagesRepository.ts',
    );
    const endpoint = read('phtml/api/v2/endpoints/fetch-recommended.php');
    const helper = read('phtml/assets/includes/functions_two.php');

    expect(repository).toContain('...(offset ? { offset } : {})');
    expect(repository).toContain('return toListPage(response, limit);');
    expect(endpoint).toContain("Wo_PageSug($limit, $offset, 'latest')");
    expect(helper).toContain('if ($type == "latest")');
    expect(helper).toContain('ORDER BY `page_id` DESC');
  });

  it('keeps the cover edit control above the full-cover touch target', () => {
    const source = read(
      'src/pages/presentation/screens/PageDetailScreen.tsx',
    );

    expect(source).toContain('style={{ zIndex: 0 }}');
    expect(source).toContain('style={{ zIndex: 30, elevation: 8 }}');
    expect(source).toContain('onPress={onChangeCover}');
  });
});
