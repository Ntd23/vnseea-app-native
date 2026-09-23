const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('native call picture-in-picture contract', () => {
  it('keeps the PiP renderer in a global host when call routes unmount', () => {
    const app = read('App.tsx');
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const directRoom = read(
      'src/messages/presentation/screens/CallRoomScreen.tsx',
    );
    const groupRoom = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );
    const infoPlist = read('ios/VNSEEA/Info.plist');

    expect(app).toContain('<LiveKitCallPresentationHost />');
    expect(host).toContain('RTCPIPView');
    expect(host).toContain('RoomContext.Provider');
    expect(host).toContain('localStreamURL:');
    expect(host).toContain("localStreamUrl : ''");
    expect(host).toContain('startAutomatically: true');
    expect(host).toContain('active: shouldUseSystemPip');
    expect(directRoom).not.toContain('RTCPIPView');
    expect(groupRoom).not.toContain('iosPictureInPictureOptions');
    expect(infoPlist).toContain('<string>audio</string>');
  });

  it('renders direct and group system PiP with native video grids', () => {
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const androidPipActivity = read(
      'android/app/src/main/java/com/vnseea/android/call/CallPictureInPictureActivity.kt',
    );
    const packagePatch = read(
      'patches/@livekit__react-native-webrtc@144.1.1.patch',
    );

    expect(host).toContain('startIOSPIP');
    expect(host).toContain('shouldUseSystemPip');
    expect(host).toContain('onPIPRestore={onRestore}');
    expect(host).toContain('onPIPStarted');
    expect(host).toContain('onPIPStopped');
    expect(host).toContain('onPIPStartFailed');
    expect(host).not.toContain('foregroundMini');
    expect(host).not.toContain('<Animated.View');
    expect(host).toContain('direct.session?.isMinimized');
    expect(host).toContain('direct.restoreCallRoom');
    expect(host).toContain('AndroidSystemCallPictureInPicture');
    expect(host).toContain('MAX_GROUP_PIP_REMOTE_VIDEOS = 3');
    expect(host).toContain('remoteStreamURLs: stableRemoteStreamUrls');
    expect(host).toContain('GroupPipElementInfo implements ElementInfo');
    expect(host).toContain('pictureInPicture = true');
    expect(host).toContain('track.observeElementInfo(elementInfo)');
    expect(host).toContain('track.stopObservingElementInfo(elementInfo)');
    expect(androidPipActivity).toContain('LinearLayout.HORIZONTAL');
    expect(androidPipActivity).toContain('LinearLayout.VERTICAL');
    expect(androidPipActivity).toContain('.chunked(2)');
    expect(androidPipActivity).toContain('addEmptyGridCell(row)');
    expect(androidPipActivity).toContain('MAX_REMOTE_VIDEOS = 3');
    expect(androidPipActivity).toContain('WebRTCView(reactContext)');
    expect(androidPipActivity).toContain('it.setMirror(false)');
    expect(androidPipActivity).toContain('it.setMirror(current.localMirror)');
    expect(androidPipActivity).toContain('remoteStreamUrls: List<String>');
    expect(packagePatch).toContain('UIStackView');
    expect(packagePatch).toContain('UILayoutConstraintAxisHorizontal');
    expect(packagePatch).toContain('UILayoutConstraintAxisVertical');
    expect(packagePatch).toContain('UIStackViewDistributionFillEqually');
    expect(packagePatch).toContain('gridPlaceholderView');
    expect(packagePatch).toContain('remoteVideoTracks');
    expect(packagePatch).toContain('remoteStreamURLs?: string[]');
    expect(packagePatch).toContain('remoteStreamURLs.count < 3');
    expect(packagePatch).toContain('onRestoreRequested');
    expect(packagePatch).toContain('onPIPRestore');
    expect(packagePatch).toContain('onPIPStarted');
    expect(packagePatch).toContain('onPIPStopped');
    expect(packagePatch).toContain('onPIPStartFailed');
    expect(packagePatch).toContain('pictureInPicturePossible');
    expect(packagePatch).toContain('pipActiveRequested');
    expect(packagePatch).toContain('active?: boolean');
    expect(packagePatch).toContain('params.putInt("rotation", rotation)');
    expect(packagePatch).toContain(
      'public void setStreamURL(String streamURL)',
    );
    expect(packagePatch).toContain('rotation?: number');
  });

  it('uses two 3:4 video cells in a 3:2 system PiP without custom controls', () => {
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const hook = read(
      'src/messages/presentation/utils/useCallPictureInPicture.ts',
    );
    const mainActivity = read(
      'android/app/src/main/java/com/vnseea/android/MainActivity.kt',
    );
    const androidPipActivity = read(
      'android/app/src/main/java/com/vnseea/android/call/CallPictureInPictureActivity.kt',
    );

    expect(host).toContain('const CALL_PIP_ASPECT_WIDTH = 3');
    expect(host).toContain('const CALL_PIP_ASPECT_HEIGHT = 2');
    expect(host).toContain('const IOS_CALL_PIP_CONTENT_WIDTH = 1080');
    expect(host).toContain('const IOS_CALL_PIP_CONTENT_HEIGHT = 720');
    expect(host).toContain('width: IOS_CALL_PIP_CONTENT_WIDTH');
    expect(host).toContain('height: IOS_CALL_PIP_CONTENT_HEIGHT');
    expect(host).toContain('aspectWidth = CALL_PIP_ASPECT_WIDTH');
    expect(host).toContain('aspectHeight = CALL_PIP_ASPECT_HEIGHT');
    expect(hook).toContain('aspectWidth = 3');
    expect(hook).toContain('aspectHeight = 2');
    expect(mainActivity).toContain(
      'CallPictureInPictureActivity.openForCurrentCall(this)',
    );
    expect(androidPipActivity).toContain('Rational(');
    expect(androidPipActivity).toContain(
      '.setAutoEnterEnabled(current.enabled)',
    );
    expect(androidPipActivity).toContain('.setSeamlessResizeEnabled(false)');
    expect(androidPipActivity).not.toContain('.setActions(');
  });

  it('turns every call-route back action into a minimized active call', () => {
    const directRoom = read(
      'src/messages/presentation/screens/CallRoomScreen.tsx',
    );
    const groupRoom = read(
      'src/messages/presentation/screens/GroupCallRoomScreen.tsx',
    );
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const directSession = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const groupSession = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );

    expect(directRoom).toContain("navigation.addListener('beforeRemove'");
    expect(groupRoom).toContain("navigation.addListener('beforeRemove'");
    expect(directRoom).toContain('isMinimizingRef');
    expect(groupRoom).toContain('isMinimizingRef');
    expect(directRoom).toContain('ensuredRouteRef.current === route.key');
    expect(groupRoom).toContain('ensuredRouteRef.current === route.key');
    expect(host).not.toContain('completeMinimizeCall');
    expect(directSession).toContain('exitCallRoomIfFocused();');
    expect(groupSession).toContain('exitGroupCallRoomIfFocused();');
    expect(host).not.toContain('zIndex: -1');
  });

  it('keeps the iOS camera publishing while a supported video call is in PiP', () => {
    const appDelegate = read('ios/VNSEEA/AppDelegate.swift');
    const entitlements = read('ios/VNSEEA/VNSEEA.entitlements');
    const packagePatch = read(
      'patches/@livekit__react-native-webrtc@144.1.1.patch',
    );

    expect(appDelegate).toContain('import livekit_react_native_webrtc');
    expect(appDelegate).toContain('enableMultitaskingCameraAccess = true');
    expect(entitlements).toContain(
      'com.apple.developer.avfoundation.multitasking-camera-access',
    );
    expect(packagePatch).toContain('native_webrtc_multitasking_camera_access');
    expect(packagePatch).toContain('isMultitaskingCameraAccessSupported');
    expect(packagePatch).toContain('isMultitaskingCameraAccessEnabled');
    expect(packagePatch).toContain('localStreamURL');
    expect(packagePatch).toContain('localVideoTrack');
    expect(packagePatch).toContain('localSampleView');
  });

  it('uses a dedicated Android activity only for an active video call', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const mainActivity = read(
      'android/app/src/main/java/com/vnseea/android/MainActivity.kt',
    );
    const nativeModule = read(
      'android/app/src/main/java/com/vnseea/android/call/VnseeaCallIntentModule.kt',
    );
    const hook = read(
      'src/messages/presentation/utils/useCallPictureInPicture.ts',
    );
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const androidPipActivity = read(
      'android/app/src/main/java/com/vnseea/android/call/CallPictureInPictureActivity.kt',
    );

    expect(manifest).toContain(
      'android:name=".call.CallPictureInPictureActivity"',
    );
    expect(manifest).toContain('android:supportsPictureInPicture="true"');
    expect(manifest).toContain('android:resizeableActivity="true"');
    expect(mainActivity).toContain('override fun onUserLeaveHint()');
    expect(mainActivity).not.toContain('enterPictureInPictureMode');
    expect(mainActivity).not.toContain(
      'override fun onPictureInPictureModeChanged',
    );
    expect(androidPipActivity).toContain('enterPictureInPictureMode');
    expect(androidPipActivity).toContain(
      'override fun onPictureInPictureModeChanged',
    );
    expect(nativeModule).toContain('fun setVideoCallPictureInPictureEnabled');
    expect(nativeModule).toContain('fun configureVideoCallPictureInPicture');
    expect(nativeModule).toContain('fun enterVideoCallPictureInPicture');
    expect(nativeModule).toContain('fun isInPictureInPictureMode');
    expect(nativeModule).toContain('fun closeCallPictureInPictureIfActive');
    expect(mainActivity).toContain('fun closeCallPictureInPictureIfActive');
    expect(hook).toContain('configureVideoCallPictureInPicture');
    expect(hook).toContain('enterVideoCallPictureInPicture');
    expect(hook).toContain('closeCallPictureInPictureIfActive');
    expect(hook).toContain('VNSEEA_CALL_PIP_MODE_CHANGED');
    expect(hook).toContain('VNSEEA_CALL_PIP_RESTORE_REQUESTED');
    expect(host).toContain('useCallPictureInPicture');
    expect(host).toContain("session?.callType === 'video'");
  });

  it('keeps established calls represented by native system call UI', () => {
    const nativeService = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const foregroundService = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallForegroundService.kt',
    );
    const appDelegate = read('ios/VNSEEA/AppDelegate.swift');

    expect(appDelegate).toContain('RNCallKeep.setup');
    expect(nativeService).toContain('reportConnectedOutgoingCallWithUUID');
    expect(nativeService).toContain('startCallForegroundService');
    expect(foregroundService).toContain(
      '.setCategory(NotificationCompat.CATEGORY_CALL)',
    );
    expect(foregroundService).toContain('.setUsesChronometer(true)');
    expect(foregroundService).toContain('.setOngoing(true)');
  });

  it('ends native call UI when the remote party closes a background call', () => {
    const nativeService = read(
      'src/messages/infrastructure/calls/nativeCallService.ts',
    );
    const appDelegate = read('ios/VNSEEA/AppDelegate.swift');
    const androidPushExtension = read(
      'android/app/src/main/java/com/vnseea/android/call/LiveKitCallNotificationServiceExtension.kt',
    );

    expect(appDelegate).toContain(
      'RNCallKeep.endCall(withUUID: uuid, reason: 2)',
    );
    expect(nativeService).toContain('closeCallPictureInPictureIfActive');
    expect(androidPushExtension).toContain(
      'closeActiveCallPresentation(context)',
    );
    expect(androidPushExtension).toContain(
      'CallPictureInPictureActivity.closeIfActive()',
    );
  });

  it('reconciles terminal direct and group calls immediately on foreground', () => {
    const directSession = read(
      'src/messages/application/view-models/useLiveKitCallSession.tsx',
    );
    const groupSession = read(
      'src/messages/application/view-models/useGroupLiveKitCallSession.tsx',
    );
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );

    expect(directSession).toContain(
      'const syncResult = await syncCallStatus()',
    );
    expect(directSession).toContain("if (syncResult !== 'active') return;");
    expect(
      directSession.indexOf('const syncResult = await syncCallStatus()'),
    ).toBeLessThan(
      directSession.indexOf(
        'ensureIosCallKitAudioSessionStarted({',
        directSession.indexOf('const syncResult = await syncCallStatus()'),
      ),
    );
    expect(groupSession).toContain(
      'const syncResult = await syncGroupCallStatus()',
    );
    expect(host).toContain('dismissInactiveCallRoute');
    expect(host).toContain('stopIOSPIP');
  });

  it('never leaves an active minimized video call invisible when system PiP fails', () => {
    const host = read(
      'src/messages/presentation/components/LiveKitCallPresentationHost.tsx',
    );
    const miniBar = read(
      'src/messages/presentation/components/LiveKitMiniCallBar.tsx',
    );

    expect(host).toContain('onSystemPipStartFailed');
    expect(host).toContain("isCallMinimized && appState === 'active'");
    expect(host).toContain('direct.restoreCallRoom');
    expect(host).toContain('group.restoreCallRoom');
    expect(miniBar).not.toContain(
      "if (callType === 'video' && phase === 'connected') return null;",
    );
  });
});
