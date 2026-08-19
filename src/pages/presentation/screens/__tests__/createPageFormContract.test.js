const fs = require('fs');
const path = require('path');

const screen = fs.readFileSync(
  path.resolve(__dirname, '../CreatePageScreen.tsx'),
  'utf8',
);
const repository = fs.readFileSync(
  path.resolve(__dirname, '../../../infrastructure/repositories/ApiPagesRepository.ts'),
  'utf8',
);
const backend = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../../../phtml/api/v2/endpoints/get-site-settings.php',
  ),
  'utf8',
);

describe('Create and Edit Page form contract', () => {
  it('loads every Page category from site settings with a local fallback', () => {
    expect(screen).toContain('normalizePageCategories');
    expect(screen).toContain('apiRoutes.auth.siteSettings');
    expect(screen).toContain('response.page_categories');
    expect(screen).toContain('pageCategories.map');
    expect(screen).toContain('maxHeight: 280');
    expect(backend).toContain("'page_categories' => $wo['page_categories']");
  });

  it('keeps the Edit general form aligned with the Create form', () => {
    expect(screen).toContain('<EditFieldLabel>Tên trang</EditFieldLabel>');
    expect(screen).toContain('<EditFieldLabel>Trang URL</EditFieldLabel>');
    expect(screen).toContain('<EditFieldLabel>Danh mục trang</EditFieldLabel>');
    expect(screen).toContain('<EditFieldLabel>Mô tả trang</EditFieldLabel>');
    expect(screen).toContain("activeEditTab === 'general'");
    expect(screen).toContain("? 'core'");
    expect(repository).toContain('mapPageCoreUpdatePayload');
    expect(repository).toContain('...mapPageGeneralUpdatePayload');
    expect(repository).toContain('...mapPageProfileUpdatePayload');
  });

  it('refreshes canonical map-pin state without overwriting user edits', () => {
    expect(screen).toContain('.getPageDetail(pageId)');
    expect(screen).toContain('editDraftDirtyRef.current');
    expect(screen).toContain('setDraft(mapPageToDraft(latestPage))');
    expect(screen).toContain('copy.step3PinStatusApproved');
    expect(repository).toContain("'map_pin_approved', 'mapPinApproved', 'pinned'");
    expect(repository).toContain("'map_pin_requested'");
    expect(repository).not.toContain(
      'map_pin_requested: draft.mapPinRequested ? 1 : 0',
    );
  });
});
