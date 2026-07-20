// Description: Objective-C bridge for the native iOS message label color picker.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VnseeaColorPicker, NSObject)

RCT_EXTERN_METHOD(pickColor:(NSString *)initialHex
                  title:(NSString *)title
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
