// Objective-C bridge for the ImageIO-based upload image processor.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VnseeaUploadImageProcessor, NSObject)

RCT_EXTERN_METHOD(prepare:(NSString *)uri
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
