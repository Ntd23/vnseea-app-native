import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  FEED_REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../../../../feed/presentation/components/FeedReactionAssets';
import {
  MessageReactionBadge,
  MessageReactionPicker,
} from '../MessageReactions';
import { DoubleTapTouchable } from '../DoubleTapTouchable';

jest.mock('react-native', () => {
  const ReactModule = require('react');
  const component = (name: string) =>
    ReactModule.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      ReactModule.createElement(name, { ...props, ref }),
    );
  return {
    Image: component('Image'),
    Text: component('Text'),
    TouchableOpacity: component('TouchableOpacity'),
    View: component('View'),
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  };
});

jest.mock('react-native-css-interop/jsx-runtime', () =>
  require('react/jsx-runtime'),
);

describe('Message reaction UI', () => {
  it('separates single tap from double tap without firing both actions', async () => {
    jest.useFakeTimers();
    const onSingleTap = jest.fn();
    const onDoubleTap = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <DoubleTapTouchable
          testID="double-tap-target"
          onSingleTap={onSingleTap}
          onDoubleTap={onDoubleTap}
        />,
      );
    });
    const target = renderer.root.find(
      node =>
        String(node.type) === 'TouchableOpacity' &&
        node.props.testID === 'double-tap-target',
    );

    await act(async () => target.props.onPress());
    await act(async () => jest.advanceTimersByTime(120));
    await act(async () => target.props.onPress());
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();

    await act(async () => target.props.onPress());
    await act(async () => jest.advanceTimersByTime(320));
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders the six Feed PNGs in canonical order and toggles the selected type', async () => {
    const onSelect = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MessageReactionPicker currentReaction="love" onSelect={onSelect} />,
      );
    });

    const buttons = renderer.root.findAll(
      node =>
        String(node.type) === 'TouchableOpacity' &&
        node.props.testID?.startsWith('message-reaction-option-'),
    );
    expect(buttons.map(button => button.props.testID)).toEqual(
      FEED_REACTION_TYPES.map(type => `message-reaction-option-${type}`),
    );
    expect(
      buttons.map(button => button.findByType('Image' as never).props.source),
    ).toEqual(FEED_REACTION_TYPES.map(type => FEED_REACTION_IMAGES[type]));

    await act(async () => buttons[1].props.onPress());
    expect(onSelect).toHaveBeenCalledWith(null);
    await act(async () => buttons[2].props.onPress());
    expect(onSelect).toHaveBeenCalledWith('haha');
  });

  it('shows at most three icons and the total reaction count', async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <MessageReactionBadge
          summary={{
            total: 12,
            myReaction: 'wow',
            topReactions: ['like', 'love', 'wow', 'sad'],
            breakdown: { like: 5, love: 4, wow: 2, sad: 1 },
          }}
        />,
      );
    });

    expect(
      renderer.root.findAll(
        node =>
          String(node.type) === 'Image' &&
          node.props.testID?.startsWith('message-reaction-badge-icon-'),
      ),
    ).toHaveLength(3);
    expect(
      renderer.root.find(
        node =>
          String(node.type) === 'Text' &&
          node.props.testID === 'message-reaction-count',
      ).props.children,
    ).toBe('12');
  });
});
