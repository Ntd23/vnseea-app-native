import type { StoryOverlay } from '../../../domain/types/stories.types';
import {
  EMPTY_STORY_OVERLAY,
  STORY_OVERLAY_MAX_ITEMS,
  STORY_OVERLAY_MAX_JSON_LENGTH,
  STORY_OVERLAY_MAX_TEXT_LENGTH,
  addStoryOverlayItem,
  normalizeStoryLinkUrl,
  parseStoryOverlay,
  placeStoryOverlayItem,
  removeStoryOverlayItem,
  replaceStoryOverlayItem,
  serializeStoryOverlay,
  storyLinkLabel,
} from '../storyOverlay';

const placement = { x: 0.5, y: 0.4, scale: 1, rotation: 0 };

const overlay: StoryOverlay = {
  version: 1,
  filter: 'warm',
  items: [
    { ...placement, id: 't1', kind: 'text', text: 'Xin chào', color: '#FFD700', textStyle: 'solid' },
    { ...placement, id: 's1', kind: 'sticker', emoji: '🔥' },
    { ...placement, id: 'm1', kind: 'mention', userId: '1852', username: 'duong2004', name: 'Dương' },
    { ...placement, id: 'l1', kind: 'link', url: 'https://vnseea.vn/jobs' },
  ],
};

describe('story overlay', () => {
  it('round-trips through the story_overlay JSON', () => {
    expect(parseStoryOverlay(serializeStoryOverlay(overlay))).toEqual(overlay);
  });

  it('sends nothing for an empty overlay', () => {
    expect(serializeStoryOverlay(EMPTY_STORY_OVERLAY)).toBeUndefined();
    expect(parseStoryOverlay('')).toBeUndefined();
    expect(parseStoryOverlay('{not json')).toBeUndefined();
  });

  it('drops malformed items and clamps placement from the server', () => {
    const parsed = parseStoryOverlay(
      JSON.stringify({
        version: 1,
        filter: 'neon',
        items: [
          { id: 'a', kind: 'text', text: '  ', color: '#fff' },
          // eslint-disable-next-line no-script-url -- verifies script links are rejected
          { id: 'b', kind: 'link', url: 'javascript:alert(1)' },
          { id: 'c', kind: 'mention', userId: 'x1', name: 'Bad' },
          { id: 'd', kind: 'unknown' },
          { id: 'e', kind: 'text', text: 'ok', color: 'red', x: 3, y: -1, scale: 99 },
        ],
      }),
    );

    expect(parsed).toEqual({
      version: 1,
      filter: 'none',
      items: [
        {
          id: 'e',
          kind: 'text',
          text: 'ok',
          color: '#FFFFFF',
          textStyle: 'plain',
          x: 1,
          y: 0,
          scale: 4,
          rotation: 0,
        },
      ],
    });
  });

  it('caps text length and the number of items', () => {
    const many: StoryOverlay = {
      ...overlay,
      items: Array.from({ length: STORY_OVERLAY_MAX_ITEMS + 3 }, (_, index) => ({
        ...placement,
        id: `t${index}`,
        kind: 'text' as const,
        text: 'x'.repeat(STORY_OVERLAY_MAX_TEXT_LENGTH + 50),
        color: '#FFFFFF',
        textStyle: 'plain' as const,
      })),
    };

    const json = serializeStoryOverlay(many)!;
    const parsed = parseStoryOverlay(json)!;
    expect(json.length).toBeLessThanOrEqual(STORY_OVERLAY_MAX_JSON_LENGTH);
    expect(parsed.items).toHaveLength(STORY_OVERLAY_MAX_ITEMS);
    expect(parsed.items[0].kind === 'text' && parsed.items[0].text).toHaveLength(
      STORY_OVERLAY_MAX_TEXT_LENGTH,
    );
  });

  it('normalises only web links', () => {
    expect(normalizeStoryLinkUrl('vnseea.vn/jobs')).toBe('https://vnseea.vn/jobs');
    expect(normalizeStoryLinkUrl('http://example.com')).toBe('http://example.com');
    // eslint-disable-next-line no-script-url -- verifies script links are rejected
    expect(normalizeStoryLinkUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeStoryLinkUrl('ftp://example.com')).toBeNull();
    expect(normalizeStoryLinkUrl('không phải link')).toBeNull();
    expect(storyLinkLabel('https://www.vnseea.vn/jobs?a=1')).toBe('vnseea.vn');
  });

  it('adds, moves, edits and removes items', () => {
    let edited = addStoryOverlayItem(EMPTY_STORY_OVERLAY, overlay.items[0]);
    edited = addStoryOverlayItem(edited, overlay.items[1]);
    edited = placeStoryOverlayItem(edited, 't1', { x: 0.2, y: 0.9, scale: 10, rotation: 0.5 });
    expect(edited.items[0]).toMatchObject({ x: 0.2, y: 0.9, scale: 4, rotation: 0.5 });

    edited = replaceStoryOverlayItem(edited, { ...overlay.items[0], text: 'Đã sửa' } as never);
    expect(edited.items.map(item => item.id)).toEqual(['s1', 't1']);

    edited = removeStoryOverlayItem(edited, 's1');
    expect(edited.items.map(item => item.id)).toEqual(['t1']);
  });
});
