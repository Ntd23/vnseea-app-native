const makeElement = require('react')['create' + 'Element'];
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;

jest.setMock('react-native', {
  Image: 'Image',
  View: 'View',
});

jest.setMock('react-native-css-interop', {
  createElement: makeElement,
  createInteropElement: makeElement,
});
jest.setMock('react-native-css-interop/jsx-runtime', {
  ...require('react/jsx-runtime'),
  createElement: makeElement,
  createInteropElement: makeElement,
});

const { Image } = require('react-native');
const { StaggeredFeedMediaImage } = require('../StaggeredFeedMediaImage');

describe('StaggeredFeedMediaImage mount scheduling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function mountedImages(renderer: any) {
    return renderer.root.findAllByType(Image);
  }

  it('mounts immediately when no delay is requested', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        makeElement(StaggeredFeedMediaImage, {
          uri: 'https://cdn.vnseea.vn/immediate.jpg',
          mountOrder: 0,
          staggerEnabled: true,
        }),
      );
    });

    expect(mountedImages(renderer)).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('keeps a cold image as a placeholder until its delay expires', () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        makeElement(StaggeredFeedMediaImage, {
          uri: 'https://cdn.vnseea.vn/delayed.jpg',
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });

    expect(mountedImages(renderer)).toHaveLength(0);
    act(() => jest.advanceTimersByTime(47));
    expect(mountedImages(renderer)).toHaveLength(0);
    act(() => jest.advanceTimersByTime(1));
    expect(mountedImages(renderer)).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('cancels a delayed cold mount after the image leaves the viewport', () => {
    const uri = 'https://cdn.vnseea.vn/cancelled.jpg';
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        makeElement(StaggeredFeedMediaImage, {
          uri,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });

    act(() => {
      renderer.update(
        makeElement(StaggeredFeedMediaImage, {
          uri,
          enabled: false,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
      jest.advanceTimersByTime(96);
    });

    expect(mountedImages(renderer)).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('keeps a loaded image mounted after it leaves the viewport', () => {
    const uri = 'https://cdn.vnseea.vn/retained.jpg';
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        makeElement(StaggeredFeedMediaImage, {
          uri,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });
    act(() => jest.advanceTimersByTime(48));

    act(() => {
      mountedImages(renderer)[0].props.onLoad();
      renderer.update(
        makeElement(StaggeredFeedMediaImage, {
          uri,
          enabled: false,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });

    expect(mountedImages(renderer)).toHaveLength(1);
    act(() => renderer.unmount());
  });

  it('does not retain a loaded native image after its holder changes URI', () => {
    const originalUri = 'https://cdn.vnseea.vn/original.jpg';
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        makeElement(StaggeredFeedMediaImage, {
          uri: originalUri,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });
    act(() => jest.advanceTimersByTime(48));
    act(() => mountedImages(renderer)[0].props.onLoad());

    act(() => {
      renderer.update(
        makeElement(StaggeredFeedMediaImage, {
          uri: 'https://cdn.vnseea.vn/recycled.jpg',
          enabled: false,
          mountOrder: 1,
          staggerEnabled: true,
        }),
      );
    });

    expect(mountedImages(renderer)).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
