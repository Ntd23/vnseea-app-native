// Description: Shows the platform's own action sheet (iOS) or list dialog (Android) and resolves the chosen option.
import { ActionSheetIOS, NativeModules, Platform } from 'react-native';

export type SystemActionSheetOption = {
  label: string;
  destructive?: boolean;
};

export type SystemActionSheetRequest = {
  title?: string;
  message?: string;
  options: SystemActionSheetOption[];
  cancelLabel: string;
};

type AndroidSystemActionSheetModule = {
  show: (
    title: string,
    labels: string[],
    destructiveIndexes: number[],
    cancelLabel: string,
  ) => Promise<number>;
};

/** Resolves the index of the chosen option, or null when the sheet is cancelled. */
export function showSystemActionSheet({
  title,
  message,
  options,
  cancelLabel,
}: SystemActionSheetRequest): Promise<number | null> {
  const labels = options.map(option => option.label);
  const destructiveIndexes = options
    .map((option, index) => (option.destructive ? index : -1))
    .filter(index => index >= 0);

  if (Platform.OS === 'ios') {
    return new Promise(resolve => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [...labels, cancelLabel],
          cancelButtonIndex: labels.length,
          destructiveButtonIndex: destructiveIndexes,
        },
        buttonIndex => {
          resolve(
            buttonIndex >= 0 && buttonIndex < labels.length ? buttonIndex : null,
          );
        },
      );
    });
  }

  const nativeModule = NativeModules.VnseeaSystemActionSheet as
    | AndroidSystemActionSheetModule
    | undefined;
  if (!nativeModule?.show) {
    console.warn('[SystemActionSheet] Native Android module is unavailable');
    return Promise.resolve(null);
  }

  return nativeModule
    .show(title ?? '', labels, destructiveIndexes, cancelLabel)
    .then(index => (index >= 0 && index < labels.length ? index : null));
}
