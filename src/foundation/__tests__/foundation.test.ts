// Description: Verifies shared foundation normalizers, pagination helpers, and summary mappers.
import {
  asBoolean,
  asEntityId,
  asNumber,
  asRecord,
  asString,
  firstBoolean,
  firstEntityId,
  firstString,
} from '../application/normalizers/resolveValue';
import { normalizeRawUrl } from '../application/normalizers/url';
import {
  createPaginatedResult,
  toPaginationPayload,
} from '../application/pagination/pagination';
import { mapGroupSummary } from '../application/mappers/groupSummaryMapper';
import { mapMediaAsset } from '../application/mappers/mediaAssetMapper';
import { mapPageSummary } from '../application/mappers/pageSummaryMapper';
import { mapPostSummary } from '../application/mappers/postSummaryMapper';
import { mapUserSummary } from '../application/mappers/userSummaryMapper';

const WEB_BASE_URL = 'https://v2.vnseea.vn';

describe('foundation value resolvers', () => {
  it('normalizes primitive values from raw API payloads', () => {
    expect(asString('  admin  ')).toBe('admin');
    expect(asString('   ')).toBeUndefined();
    expect(asString(123)).toBe('123');
    expect(asEntityId(123)).toBe('123');
    expect(asNumber('42')).toBe(42);
    expect(asNumber('nope')).toBeUndefined();
    expect(asBoolean('1')).toBe(true);
    expect(asBoolean('0')).toBe(false);
    expect(asBoolean('yes')).toBe(true);
    expect(asBoolean('off')).toBe(false);
    expect(asRecord({ id: 1 })).toEqual({ id: 1 });
    expect(asRecord([])).toBeUndefined();
  });

  it('returns the first present field by preferred key order', () => {
    const record = {
      id: null,
      user_id: 9,
      username: '',
      name: 'Admin',
      verified: '1',
    };

    expect(firstEntityId(record, ['id', 'user_id'])).toBe('9');
    expect(firstString(record, ['username', 'name'])).toBe('Admin');
    expect(firstString(record, ['name', 'username'])).toBe('Admin');
    expect(firstBoolean(record, ['verified'])).toBe(true);
  });
});

describe('foundation URL resolver', () => {
  it('keeps absolute URLs and resolves relative media paths', () => {
    expect(normalizeRawUrl('https://cdn.vnseea.vn/a.jpg', WEB_BASE_URL)).toBe(
      'https://cdn.vnseea.vn/a.jpg',
    );
    expect(normalizeRawUrl('/upload/photos/a.jpg', WEB_BASE_URL)).toBe(
      'https://v2.vnseea.vn/upload/photos/a.jpg',
    );
    expect(
      normalizeRawUrl(
        '/upload/photos/a.jpg',
        WEB_BASE_URL,
        'https://media.vnseea.vn',
      ),
    ).toBe('https://media.vnseea.vn/upload/photos/a.jpg');
    expect(
      normalizeRawUrl(
        '/themes/wondertag/logo.png',
        WEB_BASE_URL,
        'https://media.vnseea.vn',
      ),
    ).toBe('https://v2.vnseea.vn/themes/wondertag/logo.png');
    expect(normalizeRawUrl(undefined, WEB_BASE_URL)).toBeUndefined();
  });
});

describe('foundation pagination helpers', () => {
  it('maps pagination input into API payload fields', () => {
    expect(
      toPaginationPayload({
        limit: 20,
        offset: 40,
        afterPostId: '99',
      }),
    ).toEqual({
      limit: 20,
      offset: 40,
      after_post_id: '99',
    });
  });

  it('derives next offset and hasMore metadata from returned item count', () => {
    expect(createPaginatedResult([1, 2], { limit: 2, offset: 4 })).toEqual({
      items: [1, 2],
      nextOffset: 6,
      afterPostId: undefined,
      hasMore: true,
    });

    expect(createPaginatedResult([1], { limit: 2, offset: 4 }).hasMore).toBe(
      false,
    );
  });
});

describe('foundation summary mappers', () => {
  it('maps user summaries without hardcoded display fallback', () => {
    expect(
      mapUserSummary(
        {
          user_id: 7,
          username: 'admin',
          name: 'Admin User',
          avatar: '/upload/avatar.jpg',
          verified: '1',
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: '7',
      username: 'admin',
      name: 'Admin User',
      avatarUrl: 'https://v2.vnseea.vn/upload/avatar.jpg',
      verified: true,
    });
  });

  it('maps page and group summaries from WoWonder-shaped records', () => {
    expect(
      mapPageSummary(
        {
          page_id: '12',
          page_title: 'VNSEEA',
          page_name: 'vnseea',
          page_avatar: '/upload/page.jpg',
          page_cover: '/upload/cover.jpg',
          is_liked: '1',
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: '12',
      name: 'VNSEEA',
      username: 'vnseea',
      avatarUrl: 'https://v2.vnseea.vn/upload/page.jpg',
      coverUrl: 'https://v2.vnseea.vn/upload/cover.jpg',
      liked: true,
    });

    expect(
      mapGroupSummary(
        {
          group_id: '33',
          group_title: 'Developers',
          group_name: 'devs',
          group_avatar: '/upload/group.jpg',
          joined: 0,
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: '33',
      name: 'Developers',
      username: 'devs',
      avatarUrl: 'https://v2.vnseea.vn/upload/group.jpg',
      coverUrl: undefined,
      joined: false,
    });
  });

  it('maps media assets and infers media kind', () => {
    expect(
      mapMediaAsset(
        {
          file: '/upload/video.mp4',
          thumbnail: '/upload/thumb.jpg',
          mime_type: 'video/mp4',
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      url: 'https://v2.vnseea.vn/upload/video.mp4',
      kind: 'video',
      thumbnailUrl: 'https://v2.vnseea.vn/upload/thumb.jpg',
      mimeType: 'video/mp4',
    });

    expect(
      mapMediaAsset(
        {
          image: '/upload/photo.webp?cache=1',
        },
        WEB_BASE_URL,
      )?.kind,
    ).toBe('image');
  });

  it('maps post summaries with author and media', () => {
    expect(
      mapPostSummary(
        {
          post_id: 88,
          postText: 'Hello',
          postPhoto: '/upload/post.jpg',
          time_text: '1 minute ago',
          publisher: {
            user_id: 7,
            username: 'admin',
            avatar: '/upload/avatar.jpg',
          },
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: '88',
      author: {
        id: '7',
        username: 'admin',
        name: undefined,
        avatarUrl: 'https://v2.vnseea.vn/upload/avatar.jpg',
        verified: undefined,
      },
      text: 'Hello',
      media: [
        {
          url: 'https://v2.vnseea.vn/upload/post.jpg',
          kind: 'image',
          thumbnailUrl: undefined,
          mimeType: undefined,
        },
      ],
      createdAt: '1 minute ago',
    });
  });
});
