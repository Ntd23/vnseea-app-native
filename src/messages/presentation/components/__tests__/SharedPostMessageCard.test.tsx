import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import type { SharedPostPreviewModel } from '../../../application/shared-posts/sharedPostMessage';

jest.mock('react-native-css-interop/jsx-runtime', () =>
  jest.requireActual('react/jsx-runtime'),
);

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Image: 'Image',
  StyleSheet: {
    absoluteFill: {},
    create: (styles: unknown) => styles,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('lucide-react-native', () => ({
  Building2: () => null,
  BriefcaseBusiness: () => null,
  ChevronRight: () => null,
  CircleDollarSign: () => null,
  Eye: () => null,
  FileText: () => null,
  MapPin: () => null,
  Play: () => null,
  Radio: () => null,
  ShoppingBag: () => null,
}));

jest.mock(
  '../../../../live/infrastructure/storage/endedLivePostsStorage',
  () => ({
    LOCAL_LIVE_ENDED_EVENT: 'localLiveEnded',
    endedLivePostsStorage: {
      hasEnded: jest.fn(() => false),
      markEnded: jest.fn(),
    },
  }),
);

jest.mock(
  '../../../../shared-kernel/infrastructure/storage/sessionStorage',
  () => ({ sessionStorage: { getSession: () => ({ userId: 'user-1' }) } }),
);

jest.mock(
  '../../../../shared-kernel/application/hooks/useAppLanguage',
  () => ({ useAppLanguage: () => 'vi' }),
);

jest.mock(
  '../../../../shared-kernel/application/hooks/useAppTheme',
  () => ({ useAppTheme: () => ({ isDark: false }) }),
);

jest.mock('../../../../feed/infrastructure/repositories/ApiFeedRepository', () => ({
  createFeedRepository: () => ({ getPostById: jest.fn() }),
}));

import { SharedPostMessageCard } from '../SharedPostMessageCard';
import { Alert } from 'react-native';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function textContent(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap(node => node.children)
    .join(' ');
}

const reference = {
  postId: '42',
  url: 'https://demo.vnseea.vn/post/42',
  note: 'Bạn xem bài này nhé',
};

describe('SharedPostMessageCard', () => {
  beforeEach(() => {
    (Alert.alert as jest.Mock).mockClear();
  });

  it('shows the note and replaces loading with the fetched preview', async () => {
    const request = deferred<SharedPostPreviewModel>();
    const loadPreview = jest.fn(() => request.promise);
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={jest.fn()}
          loadPreview={loadPreview}
        />,
      );
    });

    expect(loadPreview).toHaveBeenCalledWith('42');
    expect(textContent(renderer)).toContain('Bạn xem bài này nhé');
    expect(renderer.root.findAllByType('ActivityIndicator' as never)).toHaveLength(1);

    await act(async () => {
      request.resolve({
        postId: '42',
        kind: 'video',
        publisherName: 'Nguyễn An',
        publisherAvatar: 'https://cdn.vnseea.vn/avatar.jpg',
        title: 'Video chuyến đi',
        description: 'Một ngày đáng nhớ',
        imageUrl: 'https://cdn.vnseea.vn/thumb.jpg',
        isVideo: true,
      });
      await request.promise;
    });

    const content = textContent(renderer);
    expect(content).toContain('Nguyễn An');
    expect(content).toContain('Video chuyến đi');
    expect(content).not.toContain(reference.url);
  });

  it('keeps an error preview tappable and opens the exact post id', async () => {
    const onOpenPost = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={onOpenPost}
          loadPreview={() => Promise.reject(new Error('network'))}
        />,
      );
      await Promise.resolve();
    });

    expect(textContent(renderer)).toContain('Không thể tải xem trước bài viết');
    const button = renderer.root
      .findAllByProps({ accessibilityLabel: 'Mở bài viết' })
      .find(node => typeof node.props.onSingleTap === 'function');
    button?.props.onSingleTap();
    expect(onOpenPost).toHaveBeenCalledWith({ postId: '42' });
  });

  it('renders a product share with commerce details and seller footer', async () => {
    const onOpenPost = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={onOpenPost}
          loadPreview={() =>
            Promise.resolve({
              postId: '42',
              kind: 'product',
              productId: 17,
              publisherName: 'Anh Ba',
              publisherAvatar: 'https://cdn.vnseea.vn/avatar.jpg',
              eyebrow: 'PRODUCT',
              title: 'Banh my chuyen ngu',
              description: 'Ho tro nguoi dung da ngon ngu',
              imageUrl: 'https://cdn.vnseea.vn/product.jpg',
              price: '500.000.000 VND',
              points: '10 VNSEEA',
              location: 'Ha Noi',
              isVideo: false,
            })
          }
        />,
      );
      await Promise.resolve();
    });

    const content = textContent(renderer);
    expect(content).toContain('PRODUCT');
    expect(content).toContain('Banh my chuyen ngu');
    expect(content).toContain('500.000.000 VND');
    expect(content).toContain('10 VNSEEA');
    expect(content).toContain('Anh Ba');

    const button = renderer.root
      .findAllByProps({ accessibilityLabel: 'Mở bài viết' })
      .find(node => typeof node.props.onSingleTap === 'function');
    button?.props.onSingleTap();
    expect(onOpenPost).toHaveBeenCalledWith({
      postId: '42',
      kind: 'product',
      productId: 17,
    });
  });

  it('renders a polished job card and opens the exact job detail target', async () => {
    const onOpenPost = jest.fn();
    const job = {
      id: '31',
      title: 'Frontend Developer',
      description: 'Xây dựng ứng dụng di động cho VNSEEA',
      location: 'Hà Nội',
      minimum: 20000000,
      maximum: 30000000,
      salary_date: 'per_month',
      salary_date_label: 'Theo tháng',
      job_type: 'full_time',
      job_type_label: 'Toàn thời gian',
      category: '6',
      category_label: 'Công nghệ thông tin',
      currency: 'VND',
      currency_symbol: '₫',
      image: '',
      page_id: '9',
      user_id: '8',
      time: 1,
      post_id: '42',
      page: {
        page_id: '9',
        page_title: 'VNSEEA Careers',
        page_name: 'vnseea-careers',
        page_description: '',
        avatar: 'https://cdn.vnseea.vn/company.jpg',
        cover: '',
        user_id: '8',
      },
    };
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={reference}
          onOpenPost={onOpenPost}
          loadPreview={() =>
            Promise.resolve({
              postId: '42',
              kind: 'job',
              jobId: '31',
              job,
              publisherName: 'VNSEEA Careers',
              companyName: 'VNSEEA Careers',
              companyAvatar: 'https://cdn.vnseea.vn/company.jpg',
              eyebrow: 'TUYỂN DỤNG',
              title: 'Frontend Developer',
              description: 'Xây dựng ứng dụng di động cho VNSEEA',
              price: '₫20.000.000 - ₫30.000.000 / Theo tháng',
              points: 'Toàn thời gian',
              category: 'Công nghệ thông tin',
              location: 'Hà Nội',
              isVideo: false,
            })
          }
        />,
      );
      await Promise.resolve();
    });

    const content = textContent(renderer);
    expect(content).toContain('Frontend Developer');
    expect(content).toContain('VNSEEA Careers');
    expect(content).toContain('Mức lương');
    expect(content).toContain('Toàn thời gian');
    expect(content).toContain('Công nghệ thông tin');
    expect(content).toContain('Xem chi tiết công việc');

    const button = renderer.root
      .findAllByProps({ accessibilityLabel: 'Mở bài viết' })
      .find(node => typeof node.props.onSingleTap === 'function');
    button?.props.onSingleTap();
    expect(onOpenPost).toHaveBeenCalledWith({
      postId: '42',
      kind: 'job',
      jobId: '31',
      job,
    });
  });

  it('shows an ended live card and blocks opening the room', async () => {
    const onOpenPost = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <SharedPostMessageCard
          reference={{ ...reference, isLive: true }}
          onOpenPost={onOpenPost}
          loadPreview={() =>
            Promise.resolve({
              postId: '42',
              kind: 'text',
              publisherName: 'Nguyễn An',
              title: 'Cùng trò chuyện tối nay',
              imageUrl: 'https://cdn.vnseea.vn/live.jpg',
              isVideo: true,
              live: {
                state: 'offline',
                streamName: 'live-42',
                viewerCount: 0,
              },
            })
          }
        />,
      );
      await Promise.resolve();
    });

    expect(textContent(renderer)).toContain('Phiên live đã kết thúc');
    const button = renderer.root
      .findAll(node => typeof node.props.onSingleTap === 'function')
      .at(0);
    button?.props.onSingleTap();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Phiên live đã kết thúc',
      'Bạn không thể tham gia phiên live này nữa.',
    );
    expect(onOpenPost).not.toHaveBeenCalled();
  });
});
