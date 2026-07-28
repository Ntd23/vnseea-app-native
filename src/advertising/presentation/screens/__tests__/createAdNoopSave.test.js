const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('CreateAdScreen unchanged edit save', () => {
  it('finishes locally before validation or the update API when nothing changed', () => {
    const source = read(
      'src/advertising/presentation/screens/CreateAdScreen.tsx',
    );
    const submitSource = source.slice(
      source.indexOf('const handleSubmit = async () => {'),
      source.indexOf('const getStepTitle = () => {'),
    );

    const unchangedCheckIndex = submitSource.indexOf(
      '!hasAdDraftChanges(initialFormDataRef.current, formData)',
    );
    const validationIndex = submitSource.indexOf(
      'const name = formData.name.trim()',
    );
    const updateIndex = submitSource.indexOf(
      'await updateAd(editingAd.id, adData)',
    );

    expect(unchangedCheckIndex).toBeGreaterThanOrEqual(0);
    expect(unchangedCheckIndex).toBeLessThan(validationIndex);
    expect(unchangedCheckIndex).toBeLessThan(updateIndex);
    expect(submitSource).toContain("showToast({ message: copy.successUpdate, type: 'success' })");
    expect(submitSource).toContain('navigation.goBack()');
  });

  it('does not raise a development LogBox for an expected update rejection', () => {
    const repositorySource = read(
      'src/advertising/infrastructure/repositories/ApiAdsRepository.ts',
    );
    const updateSource = repositorySource.slice(
      repositorySource.indexOf('async updateAd('),
      repositorySource.indexOf('async deleteAd('),
    );

    expect(updateSource).not.toContain('console.error');
    expect(updateSource).toContain('} catch {');
    expect(updateSource).toContain('return false;');
  });
});
