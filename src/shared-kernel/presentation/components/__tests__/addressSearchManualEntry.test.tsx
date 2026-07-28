import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockSearchAddresses = jest.fn(async (_input?: unknown) => []);
const mockGeocodeAddress = jest.fn(async (_input?: unknown) => []);
const mockResolveAddressSuggestion = jest.fn(
  async (_suggestion?: unknown, _input?: unknown) => undefined,
);
const mockKeyboardDismiss = jest.fn();

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const component = (name: string) =>
    ReactModule.forwardRef(
      (props: Record<string, unknown>, ref: React.ForwardedRef<unknown>) =>
        ReactModule.createElement(
          name,
          { ...props, ref },
          props.children as React.ReactNode,
        ),
    );

  return {
    ActivityIndicator: component('ActivityIndicator'),
    FlatList: component('FlatList'),
    Keyboard: { dismiss: () => mockKeyboardDismiss() },
    StyleSheet: {
      create: (styles: unknown) => styles,
      hairlineWidth: 1,
    },
    Text: component('Text'),
    TextInput: component('TextInput'),
    TouchableOpacity: component('TouchableOpacity'),
    View: component('View'),
  };
});

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  ChevronRight: () => null,
  MapPin: () => null,
  Search: () => null,
  X: () => null,
}));

jest.mock('../../../application/hooks/useAppLanguage', () => ({
  useAppLanguage: () => 'vi',
}));

jest.mock('../../../application/utils/asyncResourceCache', () => ({
  createAsyncResourceCache: () => ({
    getOrLoad: (_key: string, loader: () => Promise<unknown>) => loader(),
  }),
}));

jest.mock(
  '../../../infrastructure/address/ApiAddressSearchRepository',
  () => ({
    createAddressSearchRepository: () => ({
      searchAddresses: (input: unknown) => mockSearchAddresses(input),
      geocodeAddress: (input: unknown) => mockGeocodeAddress(input),
      resolveAddressSuggestion: (suggestion: unknown, input: unknown) =>
        mockResolveAddressSuggestion(suggestion, input),
    }),
    createAddressSessionToken: () => 'address-session-test',
    resolveAddressLocationBias: () => undefined,
  }),
);

import { AddressSearchContent } from '../AddressSearchContent';

describe('AddressSearchContent manual entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('accepts the trimmed typed address without resolving a Google place', async () => {
    const onUseTypedAddress = jest.fn();
    const onResolvedAddress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <AddressSearchContent
          initialQuery="  24 ngõ 3 Tân Mỹ, Mỹ Đình 1  "
          autoFocus={false}
          onQueryChange={jest.fn()}
          onResolvedAddress={onResolvedAddress}
          onUseTypedAddress={onUseTypedAddress}
        />,
      );
    });

    const button = renderer.root.find(
      node =>
        String(node.type) === 'TouchableOpacity' &&
        node.props.testID === 'use-typed-address-button',
    );

    await act(async () => button.props.onPress());

    expect(onUseTypedAddress).toHaveBeenCalledWith(
      '24 ngõ 3 Tân Mỹ, Mỹ Đình 1',
    );
    expect(mockResolveAddressSuggestion).not.toHaveBeenCalled();
    expect(onResolvedAddress).not.toHaveBeenCalled();
    expect(mockKeyboardDismiss).toHaveBeenCalledTimes(1);
  });
});
