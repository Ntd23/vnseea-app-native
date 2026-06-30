// Description: Declares types for @callstack/liquid-glass to resolve TS compilation errors.
declare module '@callstack/liquid-glass' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface LiquidGlassViewProps extends ViewProps {
    [key: string]: any;
  }

  export const LiquidGlassView: React.ComponentType<LiquidGlassViewProps>;
  export function isLiquidGlassSupported(): boolean;
}
