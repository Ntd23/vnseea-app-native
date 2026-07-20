const fs = require('fs');
const path = require('path');

describe('iOS current location native module', () => {
  const swiftSource = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../../../ios/VNSEEA/CurrentLocationModule.swift',
    ),
    'utf8',
  );

  it('calls RCTPromiseRejectBlock with code, message, and error', () => {
    expect(swiftSource).toContain(
      'reject("unavailable", "Current location module is unavailable.", nil)',
    );
  });

  it('uses the Objective-C extern bridge instead of unavailable Swift protocol conformance', () => {
    const bridgeSource = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../ios/VNSEEA/CurrentLocationModule.m',
      ),
      'utf8',
    );

    expect(swiftSource).not.toContain('NSObject, RCTBridgeModule');
    expect(bridgeSource).toContain(
      'RCT_EXTERN_MODULE(VnseeaCurrentLocation, NSObject)',
    );
  });

  it('uses a fast chat-appropriate accuracy and normalizes timestamps to milliseconds', () => {
    expect(swiftSource).toContain(
      'manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters',
    );
    expect(swiftSource).not.toContain(
      'manager.desiredAccuracy = kCLLocationAccuracyBest',
    );
    expect(swiftSource).toContain('isFreshEnough(cachedLocation)');
    expect(swiftSource).toContain(
      'location.timestamp.timeIntervalSince1970 * 1000',
    );
  });
});
