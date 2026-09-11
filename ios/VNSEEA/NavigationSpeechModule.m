// Description: Objective-C bridge to expose VnseeaNavigationSpeech Swift module to React Native.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VnseeaNavigationSpeech, NSObject)

RCT_EXTERN_METHOD(speak:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop)

@end

@interface RCT_EXTERN_MODULE(VnseeaCallProgressTone, NSObject)

RCT_EXTERN_METHOD(start:(NSString *)mode
                  callId:(NSString *)callId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(NSString *)callId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
