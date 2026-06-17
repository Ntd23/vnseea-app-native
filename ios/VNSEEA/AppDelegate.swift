// Description: Configures the iOS React Native application, LiveKit runtime, and native call notifications.
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import livekit_react_native
import PushKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    LivekitReactNative.setup()
    setupNativeCallNotifications()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "VnseeaRn",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  private func setupNativeCallNotifications() {
    RNCallKeep.setup([
      "appName": "VNSEEA",
      "maximumCallGroups": "1",
      "maximumCallsPerCallGroup": "8",
      "supportsVideo": true,
      "includesCallsInRecents": false,
    ])
    RNVoipPushNotificationManager.voipRegistration()
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
  ) {
    RNVoipPushNotificationManager.didUpdate(
      pushCredentials,
      forType: type.rawValue
    )
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    let data = payload.dictionaryPayload
    let uuid = nativeCallUuid(from: data)
    let callType = stringValue(data["call_type"])
    let isGroupCall = stringValue(data["event_type"]) == "livekit_group_call" || stringValue(data["call_context"]) == "group"
    let groupName = stringValue(data["group_name"])
    let directName = stringValue(data["name"])
    let callerName = isGroupCall
      ? (groupName.isEmpty ? "VNSEEA" : groupName)
      : (directName.isEmpty ? "VNSEEA" : directName)
    let groupHandle = stringValue(data["group_id"])
    let directHandle = stringValue(data["from_id"])
    let handle = isGroupCall
      ? (groupHandle.isEmpty ? "livekit-group" : groupHandle)
      : (directHandle.isEmpty ? "livekit" : directHandle)

    RNVoipPushNotificationManager.addCompletionHandler(uuid, completionHandler: completion)
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: handle,
      handleType: "generic",
      hasVideo: callType != "audio",
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: data,
      withCompletionHandler: nil
    )
  }

  private func nativeCallUuid(from payload: [AnyHashable: Any]) -> String {
    let uuid = stringValue(payload["uuid"])
    if !uuid.isEmpty {
      return uuid
    }
    return UUID().uuidString.lowercased()
  }

  private func stringValue(_ value: Any?) -> String {
    if let text = value as? String {
      return text
    }
    if let number = value as? NSNumber {
      return number.stringValue
    }
    return ""
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
