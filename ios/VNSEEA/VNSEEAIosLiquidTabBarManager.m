// Description: React Native bridge for the native iOS liquid tab bar view.
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(VNSEEAIosLiquidTabBarManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(items, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(compact, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(compactFallbackWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onTabPress, RCTBubblingEventBlock)

@end
