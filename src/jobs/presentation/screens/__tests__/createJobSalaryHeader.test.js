const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Create Job salary validation and Home header', () => {
  const source = read(
    'src/jobs/presentation/screens/CreateJobScreen.tsx',
  );
  const copy = read('src/jobs/application/i18n/jobsCopy.ts');

  it('validates required positive salaries and their range', () => {
    expect(source).toContain('copy.errorSalaryMinRequired');
    expect(source).toContain('copy.errorSalaryMaxRequired');
    expect(source).toContain('copy.errorSalaryInvalid');
    expect(source).toContain('minimumValue > maximumValue');
    expect(source).toContain('setSalaryErrors(nextSalaryErrors)');
    expect(source).toContain("salaryErrors.minimum ? 'border-red-500'");
    expect(source).toContain("salaryErrors.maximum ? 'border-red-500'");
    expect(copy).toContain('Mức lương phải là số lớn hơn 0.');
  });

  it('uses the same branded status and safe-area header as Home', () => {
    expect(source).toContain('barStyle="light-content"');
    expect(source).toContain('backgroundColor={BRAND}');
    expect(source).toContain('translucent={false}');
    expect(source).toContain(
      '<SafeAreaFeedHeader safeAreaBackgroundColor={BRAND} />',
    );
  });
});
