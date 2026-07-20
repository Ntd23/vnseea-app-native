// Description: Presents the native iOS color picker for message labels.
import Foundation
import React
import UIKit

@objc(VnseeaColorPicker)
class VnseeaColorPicker: NSObject, UIColorPickerViewControllerDelegate,
  UIAdaptivePresentationControllerDelegate {
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var initialHex = "#3B82F6"
  private var selectedHex = "#3B82F6"

  static func moduleName() -> String! {
    "VnseeaColorPicker"
  }

  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc
  func pickColor(
    _ initialHex: String,
    title: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else {
        reject("E_COLOR_PICKER_UNAVAILABLE", "The color picker is unavailable.", nil)
        return
      }

      guard self.pendingResolve == nil else {
        reject("E_COLOR_PICKER_BUSY", "A color picker is already open.", nil)
        return
      }

      guard let presenter = self.activeViewController() else {
        reject("E_COLOR_PICKER_UNAVAILABLE", "No active view controller can present the color picker.", nil)
        return
      }

      let normalizedInitialHex = self.normalizedHex(initialHex) ?? "#3B82F6"
      let picker = UIColorPickerViewController()
      picker.delegate = self
      picker.selectedColor = self.color(from: normalizedInitialHex)
      picker.supportsAlpha = false
      picker.title = title.isEmpty ? nil : title
      picker.modalPresentationStyle = .pageSheet
      picker.presentationController?.delegate = self

      self.initialHex = normalizedInitialHex
      self.selectedHex = normalizedInitialHex
      self.pendingResolve = resolve
      self.pendingReject = reject

      presenter.present(picker, animated: true) {
        picker.presentationController?.delegate = self
      }
    }
  }

  func colorPickerViewController(
    _ viewController: UIColorPickerViewController,
    didSelect color: UIColor,
    continuously: Bool
  ) {
    selectedHex = hexString(from: color, fallback: selectedHex)
  }

  func colorPickerViewControllerDidFinish(_ viewController: UIColorPickerViewController) {
    selectedHex = hexString(from: viewController.selectedColor, fallback: selectedHex)
    finishResolve()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    finishResolve()
  }

  private func finishResolve() {
    guard let resolve = pendingResolve else { return }
    let result = normalizedHex(selectedHex) ?? initialHex
    cleanup()
    resolve(result)
  }

  private func cleanup() {
    pendingResolve = nil
    pendingReject = nil
  }

  private func activeViewController() -> UIViewController? {
    if let reactPresenter = RCTPresentedViewController() {
      return reactPresenter
    }

    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.activationState == .foregroundActive }

    let windows = scenes.flatMap { $0.windows }
    let window = windows.first(where: { $0.isKeyWindow }) ?? windows.first

    return topViewController(from: window?.rootViewController)
  }

  private func topViewController(from base: UIViewController?) -> UIViewController? {
    if let presented = base?.presentedViewController {
      return topViewController(from: presented)
    }
    if let navigationController = base as? UINavigationController {
      return topViewController(from: navigationController.visibleViewController)
    }
    if let tabBarController = base as? UITabBarController {
      return topViewController(from: tabBarController.selectedViewController)
    }
    return base
  }

  private func normalizedHex(_ value: String) -> String? {
    let raw = value
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: "#", with: "")
      .uppercased()
    guard raw.count == 6, UInt64(raw, radix: 16) != nil else { return nil }
    return "#\(raw)"
  }

  private func color(from hex: String) -> UIColor {
    let raw = hex.replacingOccurrences(of: "#", with: "")
    let value = UInt64(raw, radix: 16) ?? 0x3B82F6
    return UIColor(
      red: CGFloat((value >> 16) & 0xFF) / 255,
      green: CGFloat((value >> 8) & 0xFF) / 255,
      blue: CGFloat(value & 0xFF) / 255,
      alpha: 1
    )
  }

  private func hexString(from color: UIColor, fallback: String) -> String {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    guard color.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else {
      return fallback
    }

    let redByte = Int((max(0, min(1, red)) * 255).rounded())
    let greenByte = Int((max(0, min(1, green)) * 255).rounded())
    let blueByte = Int((max(0, min(1, blue)) * 255).rounded())
    return String(format: "#%02X%02X%02X", redByte, greenByte, blueByte)
  }
}
