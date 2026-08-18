const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Home, Notifications, and Messages transitions', () => {
  it('switches retained Android tabs without cross-fading two heavy surfaces', () => {
    const transitionSource = read('src/navigation/mainSurfaceTransition.ts');
    const tabsSource = read('src/navigation/MainTabNavigator.tsx');
    const stackSource = read('src/navigation/AppNavigator.tsx');

    expect(transitionSource).toContain(
      'export const MAIN_SURFACE_TRANSITION_DURATION_MS = 150',
    );
    expect(transitionSource).toContain(
      "MAIN_SURFACE_TAB_TRANSITION_OPTIONS: BottomTabNavigationOptions = {\n  animation: 'none',\n};",
    );
    expect(transitionSource).toContain(
      "MAIN_SURFACE_STACK_TRANSITION_OPTIONS: NativeStackNavigationOptions",
    );
    expect(transitionSource).toContain("animation: 'fade'");
    expect(tabsSource).toContain('MAIN_SURFACE_TAB_TRANSITION_OPTIONS');
    expect(stackSource).toContain('options={NOTIFICATIONS_OPTIONS}');
    expect(stackSource).toContain('options={MESSAGES_OPTIONS}');
    expect(stackSource).toContain('MAIN_SURFACE_STACK_TRANSITION_OPTIONS');
  });

  it('does not stack staggered card entrances on top of the screen fade', () => {
    const cardSource = read(
      'src/notifications/presentation/components/NotificationCard.tsx',
    );

    expect(cardSource).not.toContain('FadeInDown');
    expect(cardSource).not.toContain('entering={');
    expect(cardSource).toContain('SlideOutRight.duration(220)');
  });
});
