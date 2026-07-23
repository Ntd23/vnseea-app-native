import UIKit
import React

@objc(VNSEEAIosLiquidTabBar)
class VNSEEAIosLiquidTabBar: UIView, UITabBarDelegate {
  private let tabBar = UITabBar()
  private let compactFallbackBackgroundView = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterial))
  private let compactFallbackDefaultWidth: CGFloat = 88
  private let compactFallbackHeight: CGFloat = 54
  private let compactFallbackCornerRadius: CGFloat = 27
  private let compactFallbackDefaultIconCenterY: CGFloat = 25
  private var tabBarItems: [UITabBarItem] = []
  private var compactTabBarItems: [UITabBarItem] = []
  private var tabBarItemTitles: [String?] = []
  private var lastAppliedExpandedLayoutWidth: CGFloat = 0
  private lazy var expandedAppearance: UITabBarAppearance =
    makePlatformTabBarAppearance(hidesTitle: false, usesCompactFallbackBackground: false)
  private lazy var compactAppearance: UITabBarAppearance =
    makePlatformTabBarAppearance(hidesTitle: true, usesCompactFallbackBackground: true)

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

  @objc var compactFallbackWidth: NSNumber = 88 {
    didSet {
      layoutCompactFallbackBackground()
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
    refreshExpandedLayoutForCurrentWidthIfNeeded()
    layoutCompactFallbackBackground()
    applyCompactTitleVisibility()
  }

  private func setupTabBar() {
    backgroundColor = .clear
    isOpaque = false

    tabBar.delegate = self
    tabBar.isTranslucent = true
    tabBar.tintColor = VNSEEAColor.brandPrimary
    configurePlatformTabBarBackground()
    tabBar.clipsToBounds = false
    tabBar.itemPositioning = .fill
    tabBar.itemWidth = 0
    tabBar.itemSpacing = 0

    compactFallbackBackgroundView.isHidden = true
    compactFallbackBackgroundView.isUserInteractionEnabled = false
    compactFallbackBackgroundView.backgroundColor = .clear
    compactFallbackBackgroundView.layer.cornerRadius = compactFallbackCornerRadius
    compactFallbackBackgroundView.clipsToBounds = true

    tabBar.standardAppearance = expandedAppearance
    tabBar.scrollEdgeAppearance = expandedAppearance

    addSubview(compactFallbackBackgroundView)
    addSubview(tabBar)
  }

  private func configurePlatformTabBarBackground() {
    if #available(iOS 26.0, *) {
      tabBar.backgroundColor = .clear
      tabBar.backgroundImage = UIImage()
      tabBar.shadowImage = UIImage()
    } else if compact.boolValue {
      tabBar.backgroundColor = .clear
      tabBar.backgroundImage = UIImage()
      tabBar.shadowImage = UIImage()
    } else {
      tabBar.backgroundColor = nil
      tabBar.backgroundImage = nil
      tabBar.shadowImage = nil
    }
  }

  private func makePlatformTabBarAppearance(
    hidesTitle: Bool,
    usesCompactFallbackBackground: Bool
  ) -> UITabBarAppearance {
    let appearance = UITabBarAppearance()
    configurePlatformAppearanceBackground(appearance, usesCompactFallbackBackground: usesCompactFallbackBackground)

    if hidesTitle {
      configureHiddenTitleAppearance(appearance.stackedLayoutAppearance)
      configureHiddenTitleAppearance(appearance.inlineLayoutAppearance)
      configureHiddenTitleAppearance(appearance.compactInlineLayoutAppearance)
    }

    return appearance
  }

  private func configurePlatformAppearanceBackground(
    _ appearance: UITabBarAppearance,
    usesCompactFallbackBackground: Bool
  ) {
    if #available(iOS 26.0, *) {
      appearance.configureWithTransparentBackground()
      appearance.backgroundEffect = nil
      appearance.backgroundColor = .clear
      appearance.shadowColor = .clear
    } else if usesCompactFallbackBackground {
      appearance.configureWithTransparentBackground()
      appearance.backgroundEffect = nil
      appearance.backgroundColor = .clear
      appearance.shadowColor = .clear
    } else {
      appearance.configureWithDefaultBackground()
    }
  }

  private func refreshExpandedLayoutForCurrentWidthIfNeeded() {
    guard !compact.boolValue, bounds.width > 0 else {
      return
    }

    guard abs(bounds.width - lastAppliedExpandedLayoutWidth) > 0.5 else {
      return
    }

    applyExpandedItemsForCurrentLayout(forceLayout: true)
  }

  private func applyExpandedItemsForCurrentLayout(forceLayout: Bool) {
    guard bounds.width > 0 else {
      return
    }

    let index = selectedIndex.intValue
    guard index >= 0, index < tabBarItems.count else {
      tabBar.selectedItem = nil
      return
    }

    restoreExpandedItemTitles()
    tabBar.standardAppearance = expandedAppearance
    tabBar.scrollEdgeAppearance = expandedAppearance
    for item in compactTabBarItems {
      item.standardAppearance = nil
      item.scrollEdgeAppearance = nil
    }
    tabBar.items = tabBarItems
    tabBar.selectedItem = tabBarItems[index]
    lastAppliedExpandedLayoutWidth = bounds.width

    if forceLayout {
      tabBar.setNeedsLayout()
      tabBar.layoutIfNeeded()
    }

    setTabBarLabelsHidden(false, in: tabBar)
  }

  private func layoutCompactFallbackBackground() {
    tabBar.layoutIfNeeded()
    let iconCenter = compactFallbackIconCenter()
    let fallbackWidth = compactFallbackResolvedWidth()
    let originX = iconCenter.x - fallbackWidth / 2
    let originY = iconCenter.y - compactFallbackHeight / 2
    compactFallbackBackgroundView.frame = CGRect(
      x: originX,
      y: originY,
      width: compactFallbackResolvedWidth(),
      height: compactFallbackHeight
    )
  }

  private func compactFallbackResolvedWidth() -> CGFloat {
    max(compactFallbackDefaultWidth, CGFloat(truncating: compactFallbackWidth))
  }

  private func compactFallbackIconCenter() -> CGPoint {
    let imageViews = visibleTabBarImageViews(in: tabBar).filter { imageView in
      let size = imageView.bounds.size
      return size.width >= 12 && size.height >= 12 && size.width <= 48 && size.height <= 48
    }
    let targetCenterX = tabBar.bounds.midX
    let selectedIconView = imageViews.min { lhs, rhs in
      let lhsCenter = lhs.convert(CGPoint(x: lhs.bounds.midX, y: lhs.bounds.midY), to: tabBar)
      let rhsCenter = rhs.convert(CGPoint(x: rhs.bounds.midX, y: rhs.bounds.midY), to: tabBar)
      return abs(lhsCenter.x - targetCenterX) < abs(rhsCenter.x - targetCenterX)
    }

    guard let imageView = selectedIconView else {
      return CGPoint(x: bounds.midX, y: compactFallbackDefaultIconCenterY)
    }

    return imageView.convert(CGPoint(x: imageView.bounds.midX, y: imageView.bounds.midY), to: self)
  }

  private func visibleTabBarImageViews(in view: UIView) -> [UIImageView] {
    var imageViews: [UIImageView] = []
    if let imageView = view as? UIImageView,
       imageView.image != nil,
       !imageView.isHidden,
       imageView.alpha > 0.01,
       imageView.bounds.width > 0,
       imageView.bounds.height > 0 {
      imageViews.append(imageView)
    }

    for subview in view.subviews {
      imageViews.append(contentsOf: visibleTabBarImageViews(in: subview))
    }

    return imageViews
  }

  private func updateCompactFallbackBackgroundVisibility() {
    compactFallbackBackgroundView.isHidden = !shouldShowCompactFallbackBackground()
  }

  private func shouldShowCompactFallbackBackground() -> Bool {
    if #available(iOS 26.0, *) {
      return false
    }

    return compact.boolValue
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
    lastAppliedExpandedLayoutWidth = 0
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

    let selectedCompactItem = compactTabBarItems[index]
    restoreExpandedItemTitles()
    configurePlatformTabBarBackground()
    if !compact.boolValue && bounds.width <= 0 {
      tabBar.standardAppearance = expandedAppearance
      tabBar.scrollEdgeAppearance = expandedAppearance
      for item in compactTabBarItems {
        item.standardAppearance = nil
        item.scrollEdgeAppearance = nil
      }
      updateCompactFallbackBackgroundVisibility()
      applyCompactTitleVisibility()
      setNeedsLayout()
      return
    }

    if compact.boolValue {
      lastAppliedExpandedLayoutWidth = 0
      hideCompactItemTitle(selectedCompactItem)
      tabBar.standardAppearance = compactAppearance
      tabBar.scrollEdgeAppearance = compactAppearance
      selectedCompactItem.standardAppearance = compactAppearance
      selectedCompactItem.scrollEdgeAppearance = compactAppearance
      tabBar.items = [selectedCompactItem]
      tabBar.selectedItem = selectedCompactItem
    } else {
      applyExpandedItemsForCurrentLayout(forceLayout: true)
    }
    tabBar.setNeedsLayout()
    layoutCompactFallbackBackground()
    updateCompactFallbackBackgroundVisibility()
    applyCompactTitleVisibility()
    DispatchQueue.main.async { [weak self] in
      self?.layoutCompactFallbackBackground()
      self?.updateCompactFallbackBackgroundVisibility()
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
