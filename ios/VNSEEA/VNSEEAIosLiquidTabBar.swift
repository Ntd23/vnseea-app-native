import UIKit
import React

@objc(VNSEEAIosLiquidTabBar)
class VNSEEAIosLiquidTabBar: UIView, UITabBarDelegate {
  private let tabBar = UITabBar()
  private var tabBarItems: [UITabBarItem] = []
  private var compactTabBarItems: [UITabBarItem] = []
  private var tabBarItemTitles: [String?] = []
  private lazy var expandedAppearance: UITabBarAppearance =
    makeTransparentTabBarAppearance(hidesTitle: false)
  private lazy var compactAppearance: UITabBarAppearance =
    makeTransparentTabBarAppearance(hidesTitle: true)

  @objc var items: NSArray = [] {
    didSet {
      rebuildItems()
    }
  }

  @objc var selectedIndex: NSNumber = 0 {
    didSet {
      updateDisplayedItems()
    }
  }

  @objc var compact: NSNumber = 0 {
    didSet {
      updateDisplayedItems()
    }
  }

  @objc var onTabPress: RCTBubblingEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupTabBar()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupTabBar()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    tabBar.frame = bounds
    applyCompactTitleVisibility()
  }

  private func setupTabBar() {
    backgroundColor = .clear
    isOpaque = false

    tabBar.delegate = self
    tabBar.isTranslucent = true
    tabBar.backgroundColor = .clear
    tabBar.backgroundImage = UIImage()
    tabBar.shadowImage = UIImage()
    tabBar.clipsToBounds = false

    tabBar.standardAppearance = expandedAppearance
    tabBar.scrollEdgeAppearance = expandedAppearance

    addSubview(tabBar)
  }

  private func makeTransparentTabBarAppearance(hidesTitle: Bool) -> UITabBarAppearance {
    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.backgroundEffect = nil
    appearance.backgroundColor = .clear
    appearance.shadowColor = .clear

    if hidesTitle {
      configureHiddenTitleAppearance(appearance.stackedLayoutAppearance)
      configureHiddenTitleAppearance(appearance.inlineLayoutAppearance)
      configureHiddenTitleAppearance(appearance.compactInlineLayoutAppearance)
    }

    return appearance
  }

  private func configureHiddenTitleAppearance(_ itemAppearance: UITabBarItemAppearance) {
    configureHiddenTitleState(itemAppearance.normal)
    configureHiddenTitleState(itemAppearance.selected)
    configureHiddenTitleState(itemAppearance.disabled)
    configureHiddenTitleState(itemAppearance.focused)
  }

  private func configureHiddenTitleState(_ stateAppearance: UITabBarItemStateAppearance) {
    stateAppearance.titleTextAttributes = [.foregroundColor: UIColor.clear, .font: UIFont.systemFont(ofSize: 0.1)]
    stateAppearance.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 1000)
  }

  private func applyCompactTitleVisibility() {
    setTabBarLabelsHidden(compact.boolValue, in: tabBar)
  }

  private func setTabBarLabelsHidden(_ hidden: Bool, in view: UIView) {
    if let label = view as? UILabel {
      label.isHidden = hidden
      label.alpha = hidden ? 0 : 1
    }

    for subview in view.subviews {
      setTabBarLabelsHidden(hidden, in: subview)
    }
  }

  private func rebuildItems() {
    var nextTitles: [String?] = []
    var nextCompactItems: [UITabBarItem] = []
    let nextItems = items.enumerated().compactMap { index, rawItem -> UITabBarItem? in
      guard let item = rawItem as? [String: Any] else {
        return nil
      }

      let title = item["label"] as? String
      nextTitles.append(title)
      let accessibilityLabel = item["accessibilityLabel"] as? String ?? title
      let systemImageName = item["systemImage"] as? String ?? "circle.fill"
      let image = UIImage(systemName: systemImageName)
      let tabItem = UITabBarItem(title: title, image: image, selectedImage: image)
      let compactItem = UITabBarItem(title: "", image: image, selectedImage: image)
      tabItem.tag = index
      compactItem.tag = index
      tabItem.accessibilityLabel = accessibilityLabel
      compactItem.accessibilityLabel = accessibilityLabel

      if let badgeValue = item["badgeValue"] as? String, !badgeValue.isEmpty {
        tabItem.badgeValue = badgeValue
        compactItem.badgeValue = badgeValue
      } else {
        tabItem.badgeValue = nil
        compactItem.badgeValue = nil
      }

      hideCompactItemTitle(compactItem)
      nextCompactItems.append(compactItem)
      return tabItem
    }

    tabBarItems = nextItems
    compactTabBarItems = nextCompactItems
    tabBarItemTitles = nextTitles
    updateDisplayedItems()
  }

  private func restoreExpandedItemTitles() {
    for (index, item) in tabBarItems.enumerated() {
      item.title = index < tabBarItemTitles.count ? tabBarItemTitles[index] : item.title
      item.titlePositionAdjustment = .zero
      item.setTitleTextAttributes(nil, for: .normal)
      item.setTitleTextAttributes(nil, for: .selected)
    }
  }

  private func hideCompactItemTitle(_ item: UITabBarItem) {
    item.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 100)
    item.setTitleTextAttributes([.foregroundColor: UIColor.clear], for: .normal)
    item.setTitleTextAttributes([.foregroundColor: UIColor.clear], for: .selected)
  }

  private func updateDisplayedItems() {
    let index = selectedIndex.intValue
    guard index >= 0, index < tabBarItems.count, index < compactTabBarItems.count else {
      tabBar.selectedItem = nil
      return
    }

    let selectedItem = tabBarItems[index]
    let selectedCompactItem = compactTabBarItems[index]
    restoreExpandedItemTitles()
    if compact.boolValue {
      hideCompactItemTitle(selectedCompactItem)
      tabBar.standardAppearance = compactAppearance
      tabBar.scrollEdgeAppearance = compactAppearance
      selectedCompactItem.standardAppearance = compactAppearance
      selectedCompactItem.scrollEdgeAppearance = compactAppearance
      tabBar.items = [selectedCompactItem]
      tabBar.selectedItem = selectedCompactItem
    } else {
      tabBar.standardAppearance = expandedAppearance
      tabBar.scrollEdgeAppearance = expandedAppearance
      for item in compactTabBarItems {
        item.standardAppearance = nil
        item.scrollEdgeAppearance = nil
      }
      tabBar.items = tabBarItems
      tabBar.selectedItem = selectedItem
    }
    tabBar.setNeedsLayout()
    applyCompactTitleVisibility()
    DispatchQueue.main.async { [weak self] in
      self?.applyCompactTitleVisibility()
    }
    setNeedsLayout()
  }

  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    onTabPress?(["index": item.tag])
  }
}

@objc(VNSEEAIosLiquidTabBarManager)
class VNSEEAIosLiquidTabBarManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    VNSEEAIosLiquidTabBar()
  }
}
