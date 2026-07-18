const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('logout flow cleanup and navigation', () => {
  it('cleans local auth state even when backend logout fails', () => {
    const source = read(
      'src/auth/infrastructure/repositories/ApiAuthRepository.ts',
    );
    const logoutIndex = source.indexOf('async logout()');
    const logoutBlock = source.slice(
      logoutIndex,
      source.indexOf('    async getCurrentUser()', logoutIndex),
    );

    expect(source).toContain(
      "const AUTH_DEBUG_PREFIX = '[VNSEEA_AUTH_DEBUG]';",
    );
    expect(source).toContain('function logAuthDebug');
    expect(logoutBlock).toContain("logAuthDebug('auth_logout_start'");
    expect(logoutBlock).toContain("logAuthDebug('auth_logout_backend_success'");
    expect(logoutBlock).toContain("logAuthDebug('auth_logout_backend_error'");
    expect(logoutBlock).toContain(
      "logAuthDebug('auth_logout_local_cleanup_done'",
    );
    expect(logoutBlock).toContain('catch (error)');
    expect(logoutBlock).toContain('disconnectLiveKitCallRealtime();');
    expect(logoutBlock).toContain('logoutPushUser();');
    expect(logoutBlock).toContain('sessionStorage.clearSession();');
    expect(logoutBlock).not.toContain('throw error');
  });

  it('resets root navigation to login from the auth view model after logout', () => {
    const source = read('src/auth/application/view-models/useAuthViewModel.ts');
    const logoutIndex = source.indexOf('const logout = useCallback');
    const logoutBlock = source.slice(
      logoutIndex,
      source.indexOf('  return {', logoutIndex),
    );

    expect(source).toContain(
      "const AUTH_DEBUG_PREFIX = '[VNSEEA_AUTH_DEBUG]';",
    );
    expect(source).toContain(
      "import { navigationRef } from '../../../navigation/navigationRef';",
    );
    expect(source).toContain(
      "import { ROUTES } from '../../../navigation/constants/routes';",
    );
    expect(source).toContain('function resetNavigationToLogin');
    expect(logoutBlock).toContain(
      'await runAuthAction(() => repository.logout())',
    );
    expect(logoutBlock).toContain('resetNavigationToLogin();');
    expect(source).toContain('navigationRef.isReady()');
    expect(source).toContain('navigationRef.reset({');
    expect(source).toContain('routes: [{ name: ROUTES.LOGIN }]');
    expect(source).toContain("logAuthDebug('auth_logout_navigation_reset'");
    expect(source).toContain(
      "logAuthDebug('auth_logout_navigation_reset_skipped'",
    );
  });

  it('keeps logout entrypoints on the centralized auth reset flow', () => {
    const drawerSource = read(
      'src/feed/presentation/components/HeaderProfileDrawer.tsx',
    );
    const settingsSource = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );
    const drawerLogoutIndex = drawerSource.indexOf(
      'const handleLogout = useCallback',
    );
    const drawerLogoutBlock = drawerSource.slice(
      drawerLogoutIndex,
      drawerSource.indexOf('  // Inline language toggle', drawerLogoutIndex),
    );
    const settingsLogoutIndex = settingsSource.indexOf("if (id === 'logout')");
    const settingsLogoutBlock = settingsSource.slice(
      settingsLogoutIndex,
      settingsSource.indexOf('  const handleFeaturePress', settingsLogoutIndex),
    );

    expect(drawerLogoutBlock).toContain('await logout();');
    expect(drawerLogoutBlock).not.toContain('navigation.reset');
    expect(settingsLogoutBlock).toContain('await logout();');
    expect(settingsLogoutBlock).not.toContain('navigation.reset');
  });

  it('opts out on logout and only opts in an identified user after permission exists', () => {
    const source = read(
      'src/shared-kernel/infrastructure/push/oneSignalPush.ts',
    );
    const identifyIndex = source.indexOf('export function identifyPushUser');
    const identifyBlock = source.slice(
      identifyIndex,
      source.indexOf('export function logoutPushUser', identifyIndex),
    );
    const logoutIndex = source.indexOf('export function logoutPushUser');
    const logoutBlock = source.slice(logoutIndex);

    expect(identifyBlock).toContain("optInPushIfAlreadyAuthorized('identify')");
    expect(source).toContain('async function optInPushIfAlreadyAuthorized');
    expect(source).toContain('OneSignal.User.pushSubscription.optIn();');
    expect(logoutBlock).toContain('OneSignal.logout();');
    expect(logoutBlock).toContain('OneSignal.User.pushSubscription.optOut();');
    expect(logoutBlock).toContain("logPushDebug('push_opt_out_complete'");
  });

  it('logs backend logout token/device cleanup without exposing raw access tokens', () => {
    const source = read('phtml/api/v2/endpoints/delete-access-token.php');

    expect(source).toContain('function Wo_VnseeaLogoutDebugLog');
    expect(source).toContain('[vnseea_logout_debug]');
    expect(source).toContain('vnseea_logout_debug.log');
    expect(source).toContain('FILE_APPEND | LOCK_EX');
    expect(source).toContain("Wo_VnseeaLogoutDebugLog('logout_request'");
    expect(source).toContain(
      "Wo_VnseeaLogoutDebugLog('logout_device_ids_cleared'",
    );
    expect(source).toContain('Wo_VnseeaLogoutMaskValue($access_token)');
    expect(source).toContain("`android_m_device_id` = ''");
    expect(source).toContain("`ios_m_device_id` = ''");
    expect(source).toContain("`android_n_device_id` = ''");
    expect(source).toContain("`ios_n_device_id` = ''");
    expect(source).not.toContain("'access_token' => $access_token");
  });
});
