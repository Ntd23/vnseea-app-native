// Description: Shows a native update prompt when the backend release differs from this app build.
import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import {
  APP_RELEASE_VERSION,
  getMobilePlatform,
  shouldPromptForUpdate,
} from '../../application/app-update/appRelease';
import { useAppLanguage } from '../../application/hooks/useAppLanguage';
import { fetchMobileReleaseSettings } from '../../infrastructure/app-update/appUpdateService';

const INITIAL_CHECK_DELAY_MS = 1_500;
const promptedReleases = new Set<string>();

const COPY = {
  vi: {
    title: 'Có bản cập nhật mới',
    message: (version: string) =>
      `Phiên bản ${version} của VNSEEA đã sẵn sàng. Hãy cập nhật để sử dụng các cải tiến mới nhất.`,
    update: 'Cập nhật',
    openFailedTitle: 'Không thể mở cửa hàng',
    openFailedMessage:
      'Vui lòng mở App Store hoặc Google Play và tìm VNSEEA để cập nhật.',
  },
  en: {
    title: 'Update available',
    message: (version: string) =>
      `VNSEEA ${version} is available. Update now to use the latest improvements.`,
    update: 'Update',
    openFailedTitle: 'Cannot open the store',
    openFailedMessage:
      'Please open the App Store or Google Play and search for VNSEEA.',
  },
} as const;

export function AppUpdatePrompt() {
  const language = useAppLanguage();
  const checkingRef = useRef(false);
  const copy = COPY[language] ?? COPY.vi;

  const checkForUpdate = useCallback(async () => {
    const platform = getMobilePlatform();
    if (!platform || checkingRef.current) return;

    checkingRef.current = true;
    try {
      const settings = await fetchMobileReleaseSettings();
      const release = settings[platform];
      const currentVersion = APP_RELEASE_VERSION[platform];
      const promptKey = `${platform}:${release.version}`;

      if (
        !shouldPromptForUpdate(currentVersion, release.version) ||
        promptedReleases.has(promptKey)
      ) {
        return;
      }

      promptedReleases.add(promptKey);
      Alert.alert(
        copy.title,
        copy.message(release.version),
        [
          {
            text: copy.update,
            onPress: () => {
              Linking.openURL(release.storeUrl).catch(() => {
                Alert.alert(copy.openFailedTitle, copy.openFailedMessage);
              });
            },
          },
        ],
        {
          cancelable: false,
        },
      );
    } catch (error) {
      console.warn('[AppUpdate] Could not check release settings', error);
    } finally {
      checkingRef.current = false;
    }
  }, [copy]);

  useEffect(() => {
    const timer = setTimeout(checkForUpdate, INITIAL_CHECK_DELAY_MS);
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkForUpdate();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [checkForUpdate]);

  return null;
}
