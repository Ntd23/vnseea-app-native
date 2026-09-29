// Description: Validates, serialises and edits the sticker/text/mention/link overlay placed on a story.
import type {
  StoryFilterId,
  StoryOverlay,
  StoryOverlayItem,
  StoryTextStyle,
} from '../../domain/types/stories.types';

export const STORY_OVERLAY_MAX_ITEMS = 12;
export const STORY_OVERLAY_MAX_TEXT_LENGTH = 200;
export const STORY_OVERLAY_MAX_URL_LENGTH = 300;
/** Must match the `story_overlay` length check in create-story.php. */
export const STORY_OVERLAY_MAX_JSON_LENGTH = 6000;
export const STORY_OVERLAY_MIN_SCALE = 0.4;
export const STORY_OVERLAY_MAX_SCALE = 4;

export const STORY_FILTER_IDS: readonly StoryFilterId[] = [
  'none',
  'warm',
  'cool',
  'rose',
  'vintage',
  'dusk',
];
const STORY_TEXT_STYLES: readonly StoryTextStyle[] = ['plain', 'solid', 'soft'];
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const EMPTY_STORY_OVERLAY: StoryOverlay = {
  version: 1,
  filter: 'none',
  items: [],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function readText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readNumber(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/** Adds https:// when the scheme is missing; returns null for anything that is not a web link. */
export function normalizeStoryLinkUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > STORY_OVERLAY_MAX_URL_LENGTH) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const match = /^https?:\/\/([^/?#\s]+)(?:[/?#][^\s]*)?$/i.exec(withScheme);
  if (!match || !match[1].includes('.')) return null;
  return withScheme;
}

/** The host a link sticker shows, e.g. "vnseea.vn" for https://www.vnseea.vn/abc. */
export function storyLinkLabel(url: string) {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return (match?.[1] ?? url).replace(/^www\./i, '');
}

function sanitizeItem(raw: unknown): StoryOverlayItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = readText(record.id, 40);
  if (!id) return null;

  const placement = {
    id,
    x: clamp(readNumber(record.x, 0.5), 0, 1),
    y: clamp(readNumber(record.y, 0.5), 0, 1),
    scale: clamp(
      readNumber(record.scale, 1),
      STORY_OVERLAY_MIN_SCALE,
      STORY_OVERLAY_MAX_SCALE,
    ),
    rotation: readNumber(record.rotation, 0) % (2 * Math.PI),
  };

  switch (record.kind) {
    case 'text': {
      const text = readText(record.text, STORY_OVERLAY_MAX_TEXT_LENGTH);
      if (!text) return null;
      const color = readText(record.color, 9);
      const textStyle = STORY_TEXT_STYLES.includes(
        record.textStyle as StoryTextStyle,
      )
        ? (record.textStyle as StoryTextStyle)
        : 'plain';
      return {
        ...placement,
        kind: 'text',
        text,
        color: HEX_COLOR_PATTERN.test(color) ? color : '#FFFFFF',
        textStyle,
      };
    }
    case 'sticker': {
      const emoji = readText(record.emoji, 16);
      return emoji ? { ...placement, kind: 'sticker', emoji } : null;
    }
    case 'mention': {
      const userId = readText(record.userId, 20);
      const username = readText(record.username, 64);
      const name = readText(record.name, 80);
      if (!/^\d+$/.test(userId) || !(username || name)) return null;
      return { ...placement, kind: 'mention', userId, username, name };
    }
    case 'link': {
      const url = normalizeStoryLinkUrl(readText(record.url, 400));
      return url ? { ...placement, kind: 'link', url } : null;
    }
    default:
      return null;
  }
}

/**
 * Reads `overlay_data` from the API. Anything malformed is dropped so a bad
 * row can never break the viewer; returns undefined when there is nothing to draw.
 */
export function parseStoryOverlay(raw: unknown): StoryOverlay | undefined {
  let value = raw;
  if (typeof value === 'string') {
    if (!value.trim()) return undefined;
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;

  const filter = STORY_FILTER_IDS.includes(record.filter as StoryFilterId)
    ? (record.filter as StoryFilterId)
    : 'none';
  const items = (Array.isArray(record.items) ? record.items : [])
    .map(sanitizeItem)
    .filter((item): item is StoryOverlayItem => Boolean(item))
    .slice(0, STORY_OVERLAY_MAX_ITEMS);

  if (filter === 'none' && items.length === 0) return undefined;
  return { version: 1, filter, items };
}

/** JSON for the `story_overlay` field, or undefined when the story has no overlay. */
export function serializeStoryOverlay(overlay?: StoryOverlay) {
  const clean = parseStoryOverlay(overlay);
  if (!clean) return undefined;

  const items = clean.items.map(item => ({
    ...item,
    x: round(item.x),
    y: round(item.y),
    scale: round(item.scale),
    rotation: round(item.rotation),
  }));
  let json = JSON.stringify({ ...clean, items });
  // The editor caps items and text well below the limit; drop the newest
  // items rather than letting the backend reject the whole story.
  while (json.length > STORY_OVERLAY_MAX_JSON_LENGTH && items.length > 0) {
    items.pop();
    json = JSON.stringify({ ...clean, items });
  }
  return json;
}

let overlayItemSequence = 0;

export function createStoryOverlayItemId() {
  overlayItemSequence += 1;
  return `o${Date.now().toString(36)}${overlayItemSequence.toString(36)}`;
}

/**
 * Where a new item appears: just above the centre, nudged down for each item
 * already on the story so new items do not land exactly on top of each other.
 */
export function nextStoryOverlayPlacement(overlay: StoryOverlay) {
  const offset = (overlay.items.length % 5) * 0.06;
  return { x: 0.5, y: 0.4 + offset, scale: 1, rotation: 0 };
}

export function canAddStoryOverlayItem(overlay: StoryOverlay) {
  return overlay.items.length < STORY_OVERLAY_MAX_ITEMS;
}

export function addStoryOverlayItem(
  overlay: StoryOverlay,
  item: StoryOverlayItem,
): StoryOverlay {
  if (!canAddStoryOverlayItem(overlay)) return overlay;
  return { ...overlay, items: [...overlay.items, item] };
}

/** Replaces an item's content (for example edited text) and brings it to the front. */
export function replaceStoryOverlayItem(
  overlay: StoryOverlay,
  item: StoryOverlayItem,
): StoryOverlay {
  return {
    ...overlay,
    items: [...overlay.items.filter(current => current.id !== item.id), item],
  };
}

export function placeStoryOverlayItem(
  overlay: StoryOverlay,
  id: string,
  placement: { x: number; y: number; scale: number; rotation: number },
): StoryOverlay {
  return {
    ...overlay,
    items: overlay.items.map(item =>
      item.id === id
        ? {
            ...item,
            x: clamp(placement.x, 0, 1),
            y: clamp(placement.y, 0, 1),
            scale: clamp(
              placement.scale,
              STORY_OVERLAY_MIN_SCALE,
              STORY_OVERLAY_MAX_SCALE,
            ),
            rotation: placement.rotation,
          }
        : item,
    ),
  };
}

export function removeStoryOverlayItem(
  overlay: StoryOverlay,
  id: string,
): StoryOverlay {
  return { ...overlay, items: overlay.items.filter(item => item.id !== id) };
}

export function setStoryOverlayFilter(
  overlay: StoryOverlay,
  filter: StoryFilterId,
): StoryOverlay {
  return { ...overlay, filter };
}
