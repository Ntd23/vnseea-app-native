const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Create Poll localization and iOS input alignment', () => {
  const screenSource = read(
    'src/poll/presentation/screens/CreatePollScreen.tsx',
  );
  const viewModelSource = read(
    'src/poll/application/view-models/usePollViewModel.ts',
  );

  it('uses the app language copy for visible and accessibility text', () => {
    expect(screenSource).toContain('useAppLanguage');
    expect(screenSource).toContain('POLL_COPY');
    expect(screenSource).toContain('const copy = POLL_COPY[language]');
    expect(screenSource).toContain('{copy.headerTitle}');
    expect(screenSource).toContain('placeholder={copy.questionPlaceholder}');
    expect(screenSource).toContain(
      'placeholder={copy.optionPlaceholder(index + 1)}',
    );
    expect(screenSource).toContain('accessibilityLabel={copy.backA11yLabel}');
    expect(screenSource).toContain('accessibilityLabel={copy.publishA11yLabel}');
    expect(screenSource).not.toContain('placeholder="Bạn muốn hỏi gì?"');
    expect(screenSource).not.toContain('Tạo cuộc thăm dò để thu thập');
  });

  it('passes localized fallback errors to the poll view model', () => {
    expect(screenSource).toContain('createErrorFallback: copy.createErrorFallback');
    expect(screenSource).toContain('voteErrorFallback: copy.voteErrorFallback');
    expect(viewModelSource).toContain('export interface UsePollViewModelOptions');
    expect(viewModelSource).toContain('options.createErrorFallback');
    expect(viewModelSource).toContain('options.voteErrorFallback');
  });

  it('lets the native single-line iOS input center its own text baseline', () => {
    expect(screenSource).toContain(
      "style={Platform.OS === 'ios' ? styles.questionInputIos : undefined}",
    );
    expect(screenSource).toContain(
      "style={Platform.OS === 'ios' ? styles.optionInputIos : undefined}",
    );
    expect(screenSource).toMatch(
      /questionInputIos:\s*\{[\s\S]*?lineHeight:\s*24,[\s\S]*?paddingTop:\s*0,[\s\S]*?paddingBottom:\s*0,/,
    );
    expect(screenSource).toMatch(
      /Platform\.OS === 'ios'\s*\? 'flex-1'\s*:\s*'flex-1 text-body-primary'/,
    );
    const optionStyle = screenSource.match(
      /optionInputIos:\s*\{([\s\S]*?)\n\s*\},/,
    )?.[1];

    expect(optionStyle).toContain('height: 32');
    expect(optionStyle).toContain('fontSize: 14');
    expect(optionStyle).toContain('paddingTop: 0');
    expect(optionStyle).toContain('paddingBottom: 0');
    expect(optionStyle).not.toContain('lineHeight');
  });
});
