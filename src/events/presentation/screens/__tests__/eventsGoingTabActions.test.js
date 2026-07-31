const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Events going-tab actions', () => {
  const screen = read('src/events/presentation/screens/EventsScreen.tsx');
  const detailScreen = read(
    'src/events/presentation/screens/EventDetailScreen.tsx',
  );
  const createScreen = read(
    'src/events/presentation/screens/CreateEventScreen.tsx',
  );
  const repository = read(
    'src/events/infrastructure/repositories/ApiEventsRepository.ts',
  );

  it('does not render a going toggle inside the going tab', () => {
    expect(screen).toContain('hideGoingAction?: boolean');
    expect(screen).toContain('{!hideGoingAction ? (');
    expect(screen).toContain("hideGoingAction={activeTab === 'going'}");
    expect(screen).toContain("activeTab === 'going'");
  });

  it('treats every event returned by the going endpoint as joined', () => {
    expect(repository).toContain(
      "extractEventsList(response, 'going').map(event => ({",
    );
    expect(repository).toContain('is_going: true');
  });

  it('matches the Home status-bar and safe-area colors on Android', () => {
    [screen, detailScreen].forEach(source => {
      expect(source).toContain(
        "barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}",
      );
      expect(source).toContain(
        "Platform.OS === 'android' ? BRAND : '#FFFFFF'",
      );
      expect(source).toContain('translucent={false}');
    });

    expect(createScreen).toContain(
      "Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'",
    );
    expect(createScreen).toContain('translucent={false}');
  });
});
