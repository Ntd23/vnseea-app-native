// Description: Declares types for react-native-camera-kit to resolve TS compilation errors.
declare module 'react-native-camera-kit' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export enum CameraType {
    Back = 'back',
    Front = 'front',
  }

  export interface CameraProps extends ViewProps {
    cameraType?: CameraType | 'back' | 'front';
    flashMode?: 'on' | 'off' | 'auto';
    focusMode?: 'on' | 'off';
    zoomMode?: 'on' | 'off';
    scanBarcode?: boolean;
    showFrame?: boolean;
    laserColor?: string;
    frameColor?: string;
    surfaceColor?: string;
    onReadCode?: (event: { nativeEvent: { codeStringValue: string } }) => void;
    ref?: React.Ref<any>;
  }

  export class Camera extends React.Component<CameraProps> {
    static requestDeviceCameraAuthorization(): Promise<boolean>;
    static checkDeviceCameraAuthorizationStatus(): Promise<boolean>;
  }

  export interface CameraScreenProps extends CameraProps {
    actions?: {
      rightButtonSource?: any;
      leftButtonSource?: any;
    };
    onBottomButtonPressed?: (event: any) => void;
    flashImages?: {
      on?: any;
      off?: any;
      auto?: any;
    };
    cameraFlipImage?: any;
    captureButtonImage?: any;
  }

  export class CameraScreen extends React.Component<CameraScreenProps> {}
}
