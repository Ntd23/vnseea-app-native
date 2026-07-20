// Description: iOS native module for one-shot current location lookup in chat sharing.
import CoreLocation
import Foundation
import React

@objc(VnseeaCurrentLocation)
class CurrentLocationModule: NSObject, CLLocationManagerDelegate {
  private var locationManager: CLLocationManager?
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var timeoutWorkItem: DispatchWorkItem?

  static func moduleName() -> String! {
    "VnseeaCurrentLocation"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc
  func getCurrentLocation(
    _ timeoutMs: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        reject("unavailable", "Current location module is unavailable.", nil)
        return
      }

      self.cleanup()
      self.pendingResolve = resolve
      self.pendingReject = reject

      guard CLLocationManager.locationServicesEnabled() else {
        self.finishReject(
          code: "provider_unavailable",
          message: "Location services are disabled on this device."
        )
        return
      }

      let manager = CLLocationManager()
      manager.delegate = self
      manager.desiredAccuracy = kCLLocationAccuracyBest
      self.locationManager = manager

      let timeout = max(3.0, min(timeoutMs.doubleValue / 1000.0, 15.0))
      let timeoutItem = DispatchWorkItem { [weak self] in
        self?.finishReject(
          code: "timeout",
          message: "Could not determine the current location in time."
        )
      }
      self.timeoutWorkItem = timeoutItem
      DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: timeoutItem)

      self.requestIfAuthorized()
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    requestIfAuthorized()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    finishResolve(location: location)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    finishReject(code: "failed", message: error.localizedDescription)
  }

  private func requestIfAuthorized() {
    guard let manager = locationManager else { return }

    let status: CLAuthorizationStatus
    if #available(iOS 14.0, *) {
      status = manager.authorizationStatus
    } else {
      status = CLLocationManager.authorizationStatus()
    }

    switch status {
    case .notDetermined:
      manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse:
      manager.requestLocation()
    case .denied, .restricted:
      finishReject(
        code: "permission_denied",
        message: "Location permission has not been granted."
      )
    @unknown default:
      finishReject(
        code: "permission_denied",
        message: "Location permission has not been granted."
      )
    }
  }

  private func finishResolve(location: CLLocation) {
    guard let resolve = pendingResolve else { return }
    cleanup()
    resolve([
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "accuracy": location.horizontalAccuracy,
      "provider": "ios",
      "timestamp": location.timestamp.timeIntervalSince1970,
    ])
  }

  private func finishReject(code: String, message: String) {
    guard let reject = pendingReject else { return }
    cleanup()
    reject(code, message, nil)
  }

  private func cleanup() {
    timeoutWorkItem?.cancel()
    timeoutWorkItem = nil
    locationManager?.stopUpdatingLocation()
    locationManager?.delegate = nil
    locationManager = nil
    pendingResolve = nil
    pendingReject = nil
  }
}
