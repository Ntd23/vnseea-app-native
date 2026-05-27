// Stories API Repository (Infrastructure)
//
// Wire-format mapper for WoWonder's stories endpoints. See
// phtml/api/phone/{create,get,delete}_story.php and
// phtml/api/v2/endpoints/react_story.php for the PHP source of truth.
//
// Key wire-format notes (these bit me during reels — collected here so
// future-me doesn't repeat the lookup):
//
//   • `Wo_GetMedia()` is already applied to media filenames before they
//     reach the JSON, so `images[i].filename` and `videos[i].filename`
//     are FULL URLs. Photo album items in posts are different — don't
//     copy that normalisation here.
//
//   • Reactions live in T_REACTIONS under `story_id` (instead of
//     `post_id`). The response shape is identical to posts though, so
//     we can reuse the same `WIRE_TO_REACTION` table.
//
//   • There is NO endpoint to fetch a SINGLE story by id. The viewer
//     must take the StoryItem it already has from `getStories()`.

import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { StoriesRepository } from '../../domain/repositories/StoriesRepository';
import type {
  CreateStoryDraft,
  CreateStoryResult,
  StoryItem,
  StoryMedia,
  StoryPublisher,
} from '../../domain/types/stories.types';

// ── Generic readers (mirror the reels repository) ─────────────────────────
//
// Duplicated rather than imported because cross-module imports between
// repositories of different bounded contexts are a code smell. The shape
// is tiny so the cost is negligible.

function readString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function readBool(raw: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
  }
  return false;
}

// ── Reaction wire format ──────────────────────────────────────────────────
//
// Stories use the same `T_REACTIONS.reaction` column as posts — numeric
// strings '1'..'6'. The `react_story.php` endpoint at line 3 validates
// against `array_keys($wo['reactions_types'])` which on this install is
// 'like'..'angry' (lowercase names), so we pass the human name on the
// wire instead of the numeric id. The response in `reaction.type` may
// still come back as numeric, so the reverse table accepts both.

const WIRE_TO_REACTION: Record<string, ReactionType> = {
  '1': 'like',
  '2': 'love',
  '3': 'haha',
  '4': 'wow',
  '5': 'sad',
  '6': 'angry',
  like: 'like',
  love: 'love',
  haha: 'haha',
  wow: 'wow',
  sad: 'sad',
  angry: 'angry',
};

// ── Publisher mapping ─────────────────────────────────────────────────────

function mapPublisher(
  raw: Record<string, unknown> | undefined | null,
): StoryPublisher {
  const safe = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const userId = readString(safe, 'user_id', 'id');
  const username = readString(safe, 'username', 'user_name');
  const firstName = readString(safe, 'first_name');
  const lastName = readString(safe, 'last_name');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(safe, 'name', 'full_name') ||
    username ||
    'Người dùng';

  return {
    userId,
    username,
    name,
    avatarUrl: readString(safe, 'avatar', 'profile_picture') || undefined,
    isVerified: readBool(safe, 'verified'),
  };
}

// ── Media segment mapping ─────────────────────────────────────────────────
//
// `images` and `videos` are returned as separate arrays of raw rows from
// T_USER_STORY_MEDIA. Each row has `id`, `filename` (already a full URL),
// and `type` ('image' or 'video'). We normalise both into a single
// StoryMedia[] list with an inferred type discriminator.

function mapMediaItem(
  raw: Record<string, unknown>,
  fallbackType: 'image' | 'video',
  storyId?: string,
): StoryMedia | null {
  const url = readString(raw, 'filename', 'url');
  if (!url) return null;
  const rawType = readString(raw, 'type').toLowerCase();
  const type: 'image' | 'video' =
    rawType === 'video' || rawType === 'image' ? rawType : fallbackType;
  return {
    id: readString(raw, 'id') || `${type}-${url}`,
    type,
    url,
    storyId,
  };
}

function extractMedia(raw: Record<string, unknown>, storyId: string): StoryMedia[] {
  const out: StoryMedia[] = [];

  // The first (cover) image is shipped under `thumb` in `get_stories.php`
  // when present, with the rest in `images`. We include the thumb first
  // so the viewer opens on the same image the bubble previewed.
  const thumb = raw.thumb as Record<string, unknown> | undefined;
  if (thumb && typeof thumb === 'object') {
    const mapped = mapMediaItem(thumb, 'image', storyId);
    if (mapped) out.push(mapped);
  }

  const images = Array.isArray(raw.images) ? raw.images : [];
  for (const item of images) {
    if (item && typeof item === 'object') {
      const mapped = mapMediaItem(item as Record<string, unknown>, 'image', storyId);
      // Dedupe by URL so the thumb doesn't appear twice if it's also in
      // the images list.
      if (mapped && !out.some(m => m.url === mapped.url)) out.push(mapped);
    }
  }

  const videos = Array.isArray(raw.videos) ? raw.videos : [];
  for (const item of videos) {
    if (item && typeof item === 'object') {
      const mapped = mapMediaItem(item as Record<string, unknown>, 'video', storyId);
      if (mapped) out.push(mapped);
    }
  }

  // FALLBACK: If no media segments were found but a thumbnail/cover is present,
  // treat the thumbnail URL as the main image segment.
  if (out.length === 0) {
    const thumbnail = readString(raw, 'thumbnail', 'cover_image');
    if (thumbnail && thumbnail.length > 0) {
      const isVideo = /\.(mp4|mov|3gp|webm|avi|mkv)$/i.test(thumbnail);
      out.push({
        id: `thumb-fallback-${storyId}`,
        type: isVideo ? 'video' : 'image',
        url: thumbnail,
        storyId,
      });
    }
  }

  return out;
}

// ── Reaction extraction ───────────────────────────────────────────────────
//
// Same JSON shape as posts/comments — `raw.reaction` is an object with:
//   { is_reacted: bool, type: '<numeric_or_name>', count: number,
//     like?: 1, love?: 1, … }
// We only need the viewer's own reaction and the total here.

function extractMyReaction(
  raw: Record<string, unknown>,
): ReactionType | null {
  const reaction = raw.reaction;
  if (!reaction || typeof reaction !== 'object') return null;
  const r = reaction as Record<string, unknown>;
  const reacted =
    r.is_reacted === true ||
    r.is_reacted === 'true' ||
    r.is_reacted === 1 ||
    r.is_reacted === '1';
  if (!reacted) return null;
  const rawType = String(r.type ?? '').trim();
  return (
    WIRE_TO_REACTION[rawType] ??
    WIRE_TO_REACTION[rawType.toLowerCase()] ??
    null
  );
}

function extractReactionCount(raw: Record<string, unknown>): number {
  const reaction = raw.reaction;
  if (!reaction || typeof reaction !== 'object') return 0;
  return readNumber(reaction as Record<string, unknown>, 'count');
}

// ── Story mapping ─────────────────────────────────────────────────────────

function mapStory(raw: Record<string, unknown>): StoryItem | null {
  const id = readString(raw, 'id', 'story_id');
  if (!id) return null;

  // `user_data` is the canonical publisher object inside the get_stories
  // response. Falls back to a flatter shape some older WoWonder builds
  // return, just in case.
  const publisherRaw =
    (raw.user_data as Record<string, unknown> | undefined) ??
    (raw.publisher as Record<string, unknown> | undefined) ??
    undefined;
  const publisher = mapPublisher(publisherRaw);

  // Thumbnail: get_stories.php attaches either the resized story thumb
  // OR the publisher's avatar as `thumbnail` (line 99-104 in the PHP).
  // We also probe the `thumb.filename` shape returned by `Wo_GetStroies`.
  let thumbnailUrl = readString(raw, 'thumbnail') || undefined;
  if (!thumbnailUrl) {
    const thumb = raw.thumb as Record<string, unknown> | undefined;
    if (thumb && typeof thumb === 'object') {
      thumbnailUrl = readString(thumb, 'filename') || undefined;
    }
  }

  // DEBUG: Log raw timestamps for debugging new uploads
  const postedAt = readNumber(raw, 'posted', 'time');
  const expiresAt = readNumber(raw, 'expire');
  console.log(
    '[ApiStoriesRepository] mapStory - ID:',
    id,
    'posted:',
    postedAt,
    'expire:',
    expiresAt,
    'current time:',
    Math.floor(Date.now() / 1000)
  );

  return {
    id,
    publisher,
    title: readString(raw, 'title') || undefined,
    description: readString(raw, 'description') || undefined,
    postedAt,
    expiresAt,
    thumbnailUrl,
    media: extractMedia(raw, id),
    isOwner: readBool(raw, 'is_owner'),
    isViewed: readBool(raw, 'is_viewed'),
    hasUnseen: readBool(raw, 'have_not_seen'),
    myReaction: extractMyReaction(raw),
    reactionCount: extractReactionCount(raw),
  };
}

// ── Repository factory ────────────────────────────────────────────────────

export function createStoriesRepository(): StoriesRepository {
  return {
    async getStories() {
      const response = await backendApi.post<{
        api_status: number | string;
        stories?: Array<Record<string, unknown>>;
      }>(apiRoutes.stories.get, {});

      const rows = response.stories ?? [];

      // DEBUG: Log raw response for debugging
      console.log('[StoriesRepo] getStories - received', rows.length, 'rows');

      const validRows = rows;

      // WoWonder's get_stories returns EACH STORY SEGMENT AS A SEPARATE ROW.
      // We need to group by (publisher.userId + storyId) so multi-segment stories render
      // correctly with swipe left/right.
      const grouped = new Map<string, StoryItem>();

      for (const row of validRows) {
        const mapped = mapStory(row);
        if (!mapped || mapped.media.length === 0) continue;

        // Group key = userId + storyId (same story from same user)
        const key = `${mapped.publisher.userId}-${mapped.id}`;

        if (grouped.has(key)) {
          // Merge only NEW media segments (dedupe by URL to avoid duplication)
          const existing = grouped.get(key)!;
          for (const newMedia of mapped.media) {
            if (!existing.media.some(m => m.url === newMedia.url)) {
              existing.media.push(newMedia);
            }
          }
          // Preserve highest-fidelity thumbnail
          if (!existing.thumbnailUrl && mapped.thumbnailUrl) {
            existing.thumbnailUrl = mapped.thumbnailUrl;
          }
        } else {
          grouped.set(key, mapped);
        }
      }

      console.log(
        '[StoriesRepo] getStories - final grouped count:',
        grouped.size,
        'stories'
      );

      return Array.from(grouped.values());
    },

    async getUserStories() {
      const response = await backendApi.post<{
        api_status: number | string;
        stories?: Array<Record<string, unknown>>;
      }>(apiRoutes.stories.getUserStories, {});

      const users = response.stories ?? [];

      // DEBUG: Log raw response for debugging
      console.log(
        '[StoriesRepo] getUserStories - received',
        users.length,
        'users'
      );

      // Group multi-segment stories by publisher + storyId
      // CRITICAL: Each user's stories are already grouped by PHP on server side
      // But we still need to dedupe media segments within each story
      const grouped = new Map<string, StoryItem>();

      for (const user of users) {
        const storiesList = Array.isArray(user.stories) ? user.stories : [];
        console.log(
          `[StoriesRepo] getUserStories - user ${user.user_id || user.id} has ${storiesList.length} story rows`
        );

        for (const storyRaw of storiesList) {
          const raw = storyRaw as Record<string, unknown>;

          const mapped = mapStory(raw);
          if (!mapped || mapped.media.length === 0) continue;

          const key = `${mapped.publisher.userId}-${mapped.id}`;

          if (grouped.has(key)) {
            // Merge only NEW media segments (dedupe by URL)
            const existing = grouped.get(key)!;
            for (const newMedia of mapped.media) {
              if (!existing.media.some(m => m.url === newMedia.url)) {
                existing.media.push(newMedia);
              }
            }
            // Preserve highest-fidelity thumbnail
            if (!existing.thumbnailUrl && mapped.thumbnailUrl) {
              existing.thumbnailUrl = mapped.thumbnailUrl;
            }
          } else {
            grouped.set(key, mapped);
          }
        }
      }

      console.log(
        '[StoriesRepo] getUserStories - final grouped count:',
        grouped.size,
        'stories'
      );

      return Array.from(grouped.values());
    },

    async createStory(draft: CreateStoryDraft): Promise<CreateStoryResult> {
      // ── Field name caveat ─────────────────────────────────────────────
      //
      // The route `/api/create-story` (with HYPHEN) resolves to the v2
      // endpoint `phtml/api/v2/endpoints/create-story.php`, NOT the
      // legacy `phtml/api/phone/create_story.php` (UNDERSCORE).
      //
      // The two endpoints use DIFFERENT field names — easy to miss:
      //
      //   v2 (what we hit):   file        story_title   story_description
      //   phone (legacy):     image       title         description
      //
      // Sending the phone-style names against the v2 endpoint produces
      // a `file (STREAM FILE) is missing` error because the upload lands
      // in `$_FILES['image']` while line 15 of v2 checks `$_FILES['file']`.
      // The title/description fields silently get dropped.
      const payload: Record<string, unknown> = {
        // WoWonder API v2 endpoints typically require a `type` field in the body
        type: 'create_story',
        file_type: draft.media.fileType,
        // ⚠ MUST be 'file' to satisfy v2 endpoint's $_FILES['file'] check.
        file: {
          uri: draft.media.uri,
          name: draft.media.name,
          type: draft.media.type,
        },
      };

      // Title / description are optional. PHP enforces length limits
      // (title ≤ 100, description ≤ 300) so we let it validate rather
      // than duplicating the check here.
      if (draft.title) payload.story_title = draft.title;
      if (draft.description) payload.story_description = draft.description;

      const response = await backendApi.multipart<{
        api_status: number | string;
        message?: string;
        story_id?: string | number;
        errors?: unknown;
        status?: number | string;
        error?: string;
      }>(apiRoutes.stories.create, payload, {
        timeout: 5 * 60 * 1000,
      });

      const status = String(response.api_status ?? response.status ?? '');
      const ok = status === '200' || status === '220';

      if (!ok) {
        const errMsg =
          (response.errors &&
            Array.isArray(response.errors) &&
            response.errors[0]) ||
          response.message ||
          response.error ||
          `Status: ${status}`;
        throw new Error(String(errMsg));
      }

      return {
        storyId:
          response.story_id !== undefined
            ? String(response.story_id)
            : undefined,
        message: response.message ?? 'Đã đăng tin.',
      };
    },

    async deleteStory(storyId: string) {
      const response = await backendApi.post<{
        api_status: number | string;
        message?: string;
        errors?: { error_text?: string };
      }>(apiRoutes.stories.delete, {
        story_id: storyId,
      });

      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error(
          response.errors?.error_text ??
            response.message ??
            'Không xoá được tin.',
        );
      }
    },

    async reactStory(storyId: string, reaction: ReactionType) {
      // react_story.php expects `id` (story id) + `reaction` (name, NOT
      // numeric id — it validates against `array_keys($wo['reactions_types'])`
      // which holds the names).
      const response = await backendApi.post<{
        api_status: number | string;
        message?: string;
      }>(apiRoutes.stories.react, {
        id: storyId,
        reaction,
      });

      const ok = String(response.api_status) === '200';
      if (!ok) {
        throw new Error(response.message ?? 'Không thả được cảm xúc.');
      }

      // Endpoint reports outcome via `message` text — 'story reacted' for
      // an add, 'reaction removed' for the toggle-off. We surface a tidy
      // boolean to the caller so the view-model can sync optimistic state.
      const added = !/removed/i.test(response.message ?? '');
      return { added };
    },
  };
}
