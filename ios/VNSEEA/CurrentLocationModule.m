// Description: Objective-C bridge to expose VnseeaCurrentLocation Swift module to React Native.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VnseeaCurrentLocation, NSObject)

RCT_EXTERN_METHOD(getCurrentLocation:(nonnull NSNumber *)timeoutMs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
