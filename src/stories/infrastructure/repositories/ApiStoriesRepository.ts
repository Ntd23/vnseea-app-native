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
//   • Notification navigation may fetch one Story by id so targets outside
//     the first Story rail page can still open directly.

import { backendApi } from '../../../shared-kernel/infrastructure/api/backendApi';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import {
  REACTION_TO_WIRE,
  WIRE_TO_REACTION,
  type ReactionType,
} from '../../../shared-kernel/domain/reactions/reactionCatalog';
import type { StoriesRepository } from '../../domain/repositories/StoriesRepository';
import type {
  CreateStoryDraft,
  CreateStoryResult,
  CreateSharedPostStoryDraft,
  StoryItem,
  StoryMedia,
  StoryPublisher,
} from '../../domain/types/stories.types';
import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceFromWire,
  audienceToWire,
} from '../../../shared-kernel/domain/types/contentAudience';
import { filterActiveStories } from '../../domain/policies/storyExpiration';

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

function readUserOnline(raw: Record<string, unknown>): boolean {
  const onlineValue = raw.online ?? raw.is_online ?? raw.isOnline;
  if (
    onlineValue === true ||
    onlineValue === 'true' ||
    onlineValue === '1' ||
    onlineValue === 1
  ) {
    return true;
  }

  const status = readString(
    raw,
    'lastseen_status',
    'last_seen_status',
    'online_status',
  ).toLowerCase();
  if (status === 'online' || status === 'on') return true;
  if (status === 'offline' || status === 'off') return false;

  const lastseenText = readString(raw, 'lastseen').toLowerCase();
  if (lastseenText === 'online' || lastseenText === 'on') return true;
  if (lastseenText === 'offline' || lastseenText === 'off') return false;

  const lastseen = readNumber(
    raw,
    'lastseen',
    'last_seen',
    'lastseen_unix_time',
    'last_seen_unix_time',
  );
  return lastseen > 0 && lastseen > Math.floor(Date.now() / 1000) - 60;
}

type ReactStoryResponse = {
  api_status?: number | string;
  status?: number | string;
  message?: string;
  errors?: unknown;
};

function readErrorText(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const safe = errors as Record<string, unknown>;
  const errorText = safe.error_text ?? safe.message;
  return typeof errorText === 'string' ? errorText : undefined;
}

function readReactStoryStatus(response: ReactStoryResponse | string) {
  if (typeof response === 'string') return '';
  return String(response.api_status ?? response.status ?? '').trim();
}

function readReactStoryMessage(response: ReactStoryResponse | string) {
  if (typeof response === 'string') return response;
  return readErrorText(response.errors) ?? response.message ?? '';
}

function isReactStorySuccess(response: ReactStoryResponse | string) {
  const status = readReactStoryStatus(response);
  if (status === '200' || status === '220') return true;

  const message = readReactStoryMessage(response).toLowerCase();
  return (
    status.length === 0 &&
    (message.includes('story reacted') || message.includes('reaction removed'))
  );
}

function isReactionPayloadError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('reaction') || normalized.includes('id , reaction');
}

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
    avatarUrl:
      normalizeConfiguredUrl(
        readString(safe, 'avatar', 'profile_picture'),
      ) || undefined,
    isVerified: readBool(safe, 'verified'),
    isOnline: readUserOnline(safe),
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
  const url = normalizeConfiguredUrl(readString(raw, 'filename', 'url'));
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
  const storyType = readString(raw, 'story_type') || 'media';
  if (storyType === 'shared_post') {
    const sourcePostId = readString(raw, 'source_post_id');
    if (!/^[1-9][0-9]*$/.test(sourcePostId)) return [];
    return [
      {
        id: `shared-post-${storyId}`,
        type: 'shared_post',
        url: '',
        storyId,
        sourcePostId,
        title: readString(raw, 'title') || undefined,
        description: readString(raw, 'description') || undefined,
      },
    ];
  }

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
    const thumbnail = normalizeConfiguredUrl(
      readString(raw, 'thumbnail', 'cover_image'),
    );
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
  let thumbnailUrl =
    normalizeConfiguredUrl(readString(raw, 'thumbnail')) || undefined;
  if (!thumbnailUrl) {
    const thumb = raw.thumb as Record<string, unknown> | undefined;
    if (thumb && typeof thumb === 'object') {
      thumbnailUrl =
        normalizeConfiguredUrl(readString(thumb, 'filename')) || undefined;
    }
  }

  const postedAt = readNumber(raw, 'posted', 'time');
  const expiresAt = readNumber(raw, 'expire');

  const title = readString(raw, 'title') || undefined;
  const description = readString(raw, 'description') || undefined;
  const media = extractMedia(raw, id).map(segment => ({
    ...segment,
    title: segment.title ?? title,
    description: segment.description ?? description,
  }));

  return {
    id,
    publisher,
    title,
    description,
    postedAt,
    expiresAt,
    thumbnailUrl,
    media,
    isOwner: readBool(raw, 'is_owner'),
    isViewed: readBool(raw, 'is_viewed'),
    hasUnseen: readBool(raw, 'have_not_seen'),
    myReaction: extractMyReaction(raw),
    reactionCount: extractReactionCount(raw),
    audience: audienceFromWire(raw.postPrivacy ?? raw.privacy, {
      contract:
        readString(raw, 'privacy_contract') === CONTENT_AUDIENCE_CONTRACT
          ? CONTENT_AUDIENCE_CONTRACT
          : 'legacy_feed',
      fallback: 'followers',
    }).audience,
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

      return filterActiveStories(Array.from(grouped.values()));
    },

    async getUserStories() {
      const response = await backendApi.post<{
        api_status: number | string;
        stories?: Array<Record<string, unknown>>;
      }>(apiRoutes.stories.getUserStories, {});

      const users = response.stories ?? [];

      // Group multi-segment stories by publisher + storyId
      // CRITICAL: Each user's stories are already grouped by PHP on server side
      // But we still need to dedupe media segments within each story
      const grouped = new Map<string, StoryItem>();

      for (const user of users) {
        const storiesList = Array.isArray(user.stories) ? user.stories : [];

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

      return filterActiveStories(Array.from(grouped.values()));
    },

    async getStoryById(storyId: string) {
      const response = await backendApi.post<{
        api_status: number | string;
        story?: Record<string, unknown>;
      }>(apiRoutes.stories.getById, { id: storyId });

      if (String(response.api_status) !== '200' || !response.story) {
        return null;
      }
      const mapped = mapStory(response.story);
      if (!mapped || mapped.media.length === 0) return null;
      return filterActiveStories([mapped])[0] ?? null;
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
      const storyPrivacy = audienceToWire(draft.audience ?? 'followers');
      const payload: Record<string, unknown> = {
        // WoWonder API v2 endpoints typically require a `type` field in the body
        type: 'create_story',
        file_type: draft.media.fileType,
        postPrivacy: storyPrivacy,
        privacy: storyPrivacy,
        privacy_contract: CONTENT_AUDIENCE_CONTRACT,
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

    async createSharedPostStory(
      draft: CreateSharedPostStoryDraft,
    ): Promise<CreateStoryResult> {
      const storyPrivacy = audienceToWire(draft.audience ?? 'followers');
      const response = await backendApi.post<{
        api_status: number | string;
        message?: string;
        story_id?: string | number;
        errors?: unknown;
        status?: number | string;
        error?: string;
      }>(apiRoutes.stories.create, {
        type: 'create_story',
        story_type: 'shared_post',
        source_post_id: draft.sourcePostId,
        postPrivacy: storyPrivacy,
        privacy: storyPrivacy,
        privacy_contract: CONTENT_AUDIENCE_CONTRACT,
        ...(draft.note ? { story_description: draft.note } : {}),
      });

      const status = String(response.api_status ?? response.status ?? '');
      if (status !== '200' && status !== '220') {
        const errorMessage =
          (Array.isArray(response.errors) && response.errors[0]) ||
          response.message ||
          response.error ||
          `Status: ${status}`;
        throw new Error(String(errorMessage));
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
      const wireReaction = REACTION_TO_WIRE[reaction];
      const payloads = Array.from(new Set([wireReaction, reaction]));
      let lastError: Error | null = null;

      for (let index = 0; index < payloads.length; index += 1) {
        const payloadReaction = payloads[index];

        try {
          const response = await backendApi.post<ReactStoryResponse | string>(
            apiRoutes.stories.react,
            {
              id: storyId,
              reaction: payloadReaction,
            },
          );

          if (isReactStorySuccess(response)) {
            const message = readReactStoryMessage(response);
            const added = !/removed/i.test(message);
            return { added };
          }

          lastError = new Error(
            readReactStoryMessage(response) ||
              'Khong tha duoc cam xuc.',
          );
        } catch (err) {
          lastError =
            err instanceof Error
              ? err
              : new Error('Khong tha duoc cam xuc.');
        }

        const canRetryWithName =
          index === 0 &&
          payloads.length > 1 &&
          lastError !== null &&
          isReactionPayloadError(lastError.message);

        if (!canRetryWithName) {
          break;
        }
      }

      throw lastError ?? new Error('Khong tha duoc cam xuc.');
    },
  };
}
