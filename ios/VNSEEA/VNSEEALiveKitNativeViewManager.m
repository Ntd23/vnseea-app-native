// Description: React Native bridge for the native LiveKit Swift live view.
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(VNSEEALiveKitNativeViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(serverUrl, NSString)
RCT_EXPORT_VIEW_PROPERTY(token, NSString)
RCT_EXPORT_VIEW_PROPERTY(roomName, NSString)
RCT_EXPORT_VIEW_PROPERTY(streamName, NSString)
RCT_EXPORT_VIEW_PROPERTY(liveRole, NSString)
RCT_EXPORT_VIEW_PROPERTY(cameraFacing, NSString)
RCT_EXPORT_VIEW_PROPERTY(connect, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onLiveNativeEvent, RCTBubblingEventBlock)

@end
