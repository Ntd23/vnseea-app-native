import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

import { ReelCaption } from '../ReelCaption';

const longCaption =
  'D\u00f2ng n\u1ed9i dung d\u00e0i c\u1ea7n \u0111\u01b0\u1ee3c hi\u1ec3n th\u1ecb \u0111\u1ea7y \u0111\u1ee7 sau khi ng\u01b0\u1eddi d\u00f9ng b\u1ea5m xem th\u00eam.';

function textContent(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap(node => node.children)
    .join(' ');
}

describe('ReelCaption', () => {
  it('expands and collapses a caption without hiding its content', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ReelCaption
          reelId="reel-1"
          text={longCaption}
          showMoreLabel={'Xem th\u00eam'}
          showLessLabel={'\u1ea8n b\u1edbt'}
        />,
      );
    });

    const visibleCaption = renderer.root.findByProps({
      testID: 'reel-caption-text',
    });
    expect(visibleCaption.props.numberOfLines).toBe(3);

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-measure' })
        .props.onTextLayout({
          nativeEvent: {
            lines: [{}, {}, {}, {}],
          },
        });
    });

    expect(textContent(renderer)).toContain('Xem th\u00eam');

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-toggle' })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'reel-caption-text' }).props
        .numberOfLines,
    ).toBeUndefined();
    expect(textContent(renderer)).toContain(longCaption);
    expect(textContent(renderer)).toContain('\u1ea8n b\u1edbt');

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-toggle' })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'reel-caption-text' }).props
        .numberOfLines,
    ).toBe(3);
    expect(textContent(renderer)).toContain(longCaption);
    expect(textContent(renderer)).toContain('Xem th\u00eam');
  });

  it('does not show the toggle for a caption within three lines', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ReelCaption
          reelId="reel-1"
          text="N\u1ed9i dung ng\u1eafn"
          showMoreLabel={'Xem th\u00eam'}
          showLessLabel={'\u1ea8n b\u1edbt'}
        />,
      );
    });

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-measure' })
        .props.onTextLayout({
          nativeEvent: {
            lines: [{}, {}],
          },
        });
    });

    expect(
      renderer.root.findAllByProps({ testID: 'reel-caption-toggle' }),
    ).toHaveLength(0);
  });

  it('resets expansion when a recycled cell receives another reel', () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ReelCaption
          reelId="reel-1"
          text={longCaption}
          showMoreLabel={'Xem th\u00eam'}
          showLessLabel={'\u1ea8n b\u1edbt'}
        />,
      );
    });

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-measure' })
        .props.onTextLayout({ nativeEvent: { lines: [{}, {}, {}, {}] } });
    });

    act(() => {
      renderer.root
        .findByProps({ testID: 'reel-caption-toggle' })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ testID: 'reel-caption-text' }).props
        .numberOfLines,
    ).toBeUndefined();

    act(() => {
      renderer.update(
        <ReelCaption
          reelId="reel-2"
          text="Caption kh\u00e1c"
          showMoreLabel={'Xem th\u00eam'}
          showLessLabel={'\u1ea8n b\u1edbt'}
        />,
      );
    });

    expect(
      renderer.root.findByProps({ testID: 'reel-caption-text' }).props
        .numberOfLines,
    ).toBe(3);
    expect(
      renderer.root.findAllByProps({ testID: 'reel-caption-toggle' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'reel-caption-measure' }),
    ).toHaveLength(1);
  });
});
