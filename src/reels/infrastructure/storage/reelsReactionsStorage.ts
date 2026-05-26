// Description: Client-side cache of the viewer's reaction on each reel.
//
// Why this exists
// ───────────────
// WoWonder's `posts` endpoint only embeds the viewer's reaction state
// (`reaction.is_reacted`, `reaction.type`) when the admin has set the
// site config `second_post_button = 'reaction'`. On installs that use
// 'like' / 'dislike' / 'wonder' as the second button (e.g. demo.vnseea.vn),
// the reaction is correctly written to the DB by `post-actions.php` but
// is NEVER returned by `Wo_GetPosts`. That means on every reload the UI
// would show an outline heart even though the server has saved a love.
//
// Since we can't touch PHP, we keep our own per-user cache here and merge
// it into items returned by the API. The contract:
//
//   • Source of truth for `myReaction` = backend if it sends one, else cache.
//   • `setReaction` writes through to the cache on success so the next
//     reload sees the same state.
//   • The cache is per-user (keyed by userId) — switching accounts on the
//     same device should NEVER see another user's reactions.
//
// Storage is MMKV — synchronous, persistent, fast (~1ms read).

import { createMMKV } from 'react-native-mmkv';
import type { ReactionType } from '../../domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../domain/types/reels.types';

const storage = createMMKV({ id: 'vnseea-reels-reactions' });

// Two namespaces in the same MMKV bucket so logout-clear wipes both:
//   r:<userId>:<postId>      → post reactions
//   rc:<userId>:<commentId>  → comment reactions
function postKey(userId: string, postId: string) {
  return `r:${userId}:${postId}`;
}
function commentKey(userId: string, commentId: string) {
  return `rc:${userId}:${commentId}`;
}

function isReaction(value: string): value is ReactionType {
  return (ALL_REACTION_TYPES as readonly string[]).includes(value);
}

function readReaction(key: string): ReactionType | null {
  const value = storage.getString(key);
  if (!value) return null;
  return isReaction(value) ? value : null;
}

function writeReaction(key: string, reaction: ReactionType | null) {
  if (reaction === null) {
    storage.remove(key);
  } else {
    storage.set(key, reaction);
  }
}

export const reelsReactionsStorage = {
  /** Returns the cached reaction for a (user, post) pair, or null. */
  get(userId: string | undefined, postId: string): ReactionType | null {
    if (!userId || !postId) return null;
    return readReaction(postKey(userId, postId));
  },

  /**
   * Persists (or clears) the viewer's reaction for a post.
   *
   *   reaction = ReactionType  → save it
   *   reaction = null          → clear any previous reaction
   *
   * No-ops when userId is missing — the user is logged out, so there's no
   * stable identity to key the cache against.
   */
  set(
    userId: string | undefined,
    postId: string,
    reaction: ReactionType | null,
  ): void {
    if (!userId || !postId) return;
    writeReaction(postKey(userId, postId), reaction);
  },

  /** Same as `get`, but for a comment. */
  getComment(
    userId: string | undefined,
    commentId: string,
  ): ReactionType | null {
    if (!userId || !commentId) return null;
    return readReaction(commentKey(userId, commentId));
  },

  /** Same as `set`, but for a comment. */
  setComment(
    userId: string | undefined,
    commentId: string,
    reaction: ReactionType | null,
  ): void {
    if (!userId || !commentId) return;
    writeReaction(commentKey(userId, commentId), reaction);
  },

  /** Drops every cached reaction. Call on logout. */
  clear(): void {
    storage.clearAll();
  },
};
