// Description: Remembers whether the first-launch notification prompt has been attempted.
import { createMMKV } from 'react-native-mmkv';

const PROMPTED_KEY = 'notification.permission.prompted';
const storage = createMMKV({ id: 'vnseea-push-permission' });

export const pushPermissionPromptStorage = {
  wasRequested() {
    return storage.getBoolean(PROMPTED_KEY) === true;
  },

  markRequested() {
    storage.set(PROMPTED_KEY, true);
  },
};
