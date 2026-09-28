const fs = require('fs');
const path = require('path');
const { ActionSheetIOS, NativeModules, Platform } = require('react-native');
const { showSystemActionSheet } = require('../systemActionSheet');

const root = path.resolve(__dirname, '../../../../..');

const request = {
  title: 'Dũng',
  options: [{ label: 'Gọi video' }, { label: 'Chặn', destructive: true }],
  cancelLabel: 'Hủy',
};

function setPlatform(os) {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

describe('showSystemActionSheet', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    setPlatform(originalPlatform);
    jest.restoreAllMocks();
    delete NativeModules.VnseeaSystemActionSheet;
  });

  it('opens the iOS action sheet with cancel last and destructive rows marked', async () => {
    setPlatform('ios');
    const showSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(1));

    await expect(showSystemActionSheet(request)).resolves.toBe(1);
    expect(showSheet.mock.calls[0][0]).toMatchObject({
      title: 'Dũng',
      options: ['Gọi video', 'Chặn', 'Hủy'],
      cancelButtonIndex: 2,
      destructiveButtonIndex: [1],
    });
  });

  it('resolves null when the iOS cancel button is chosen', async () => {
    setPlatform('ios');
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(2));

    await expect(showSystemActionSheet(request)).resolves.toBeNull();
  });

  it('opens the native Android list dialog', async () => {
    setPlatform('android');
    const show = jest.fn().mockResolvedValue(0);
    NativeModules.VnseeaSystemActionSheet = { show };

    await expect(showSystemActionSheet(request)).resolves.toBe(0);
    expect(show).toHaveBeenCalledWith('Dũng', ['Gọi video', 'Chặn'], [1], 'Hủy');
  });

  it('resolves null when the Android dialog is cancelled', async () => {
    setPlatform('android');
    NativeModules.VnseeaSystemActionSheet = {
      show: jest.fn().mockResolvedValue(-1),
    };

    await expect(showSystemActionSheet(request)).resolves.toBeNull();
  });

  it('matches the registered Android native module name', () => {
    const nativeModule = fs.readFileSync(
      path.join(
        root,
        'android/app/src/main/java/com/vnseea/android/ui/SystemActionSheetModule.kt',
      ),
      'utf8',
    );
    const application = fs.readFileSync(
      path.join(root, 'android/app/src/main/java/com/vnseea/android/MainApplication.kt'),
      'utf8',
    );

    expect(nativeModule).toContain('override fun getName() = "VnseeaSystemActionSheet"');
    expect(application).toContain('add(SystemActionSheetPackage())');
  });
});
