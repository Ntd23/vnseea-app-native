# Description: Backend recommendation feed logic for Vnseea home feed ranking.

# Recommended Feed Logic

## Goal

Create a backend-first recommendation feed so the app does not need to merge many noisy streams on the client. The server should return one ranked, deduped list of posts for the Home feed.

This keeps scrolling smoother because React Native only renders a ready-to-display list instead of fetching and merging posts, videos, jobs, products, lives, groups, and discovery authors at the same time.

## Endpoint Contract

Add a new mobile-only endpoint on the server:

```txt
POST /api/recommended-feed
```

Request:

```json
{
  "limit": 15,
  "after_post_id": "3920",
  "source": "all"
}
```

Response:

```json
{
  "api_status": 200,
  "data": [],
  "next_cursor": "3888",
  "reached_end": false
}
```

Rules:

- Keep `/api/posts` unchanged.
- `after_post_id` stays compatible with the current app cursor style.
- `data` should use the same raw post shape as `/api/posts`, so existing app mappers can be reused.
- This endpoint should be mobile-only. Do not change web feed behavior.

## Tracking Events

Recommendation quality depends on user behavior. Add a lightweight event endpoint:

```txt
POST /api/recommendation-events
```

Payload examples:

```json
{ "event": "impression", "post_id": "3920" }
{ "event": "click", "post_id": "3920" }
{ "event": "reaction", "post_id": "3920", "value": "love" }
{ "event": "comment", "post_id": "3920" }
{ "event": "share", "post_id": "3920" }
{ "event": "video_watch", "post_id": "3920", "duration_ms": 8400 }
{ "event": "hide", "post_id": "3920" }
```

Recommended table:

```sql
CREATE TABLE IF NOT EXISTS wo_recommendation_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  post_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  value VARCHAR(64) DEFAULT NULL,
  weight FLOAT NOT NULL DEFAULT 1,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY user_time (user_id, created_at),
  KEY user_post (user_id, post_id),
  KEY post_type (post_id, event_type)
);
```

Optional cache table:

```sql
CREATE TABLE IF NOT EXISTS wo_recommendation_seen (
  user_id BIGINT UNSIGNED NOT NULL,
  post_id BIGINT UNSIGNED NOT NULL,
  last_seen_at INT UNSIGNED NOT NULL,
  seen_count INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, post_id),
  KEY user_seen_time (user_id, last_seen_at)
);
```

## Candidate Generation

Do not rank every post in the database on every request. Build a candidate pool first:

1. Recent public posts from the last 7-14 days.
2. Posts from friends/following.
3. Posts from pages/groups the user follows or joins.
4. Posts matching hashtags/categories the user recently engaged with.
5. Popular posts from outside the user's graph for exploration.
6. Active live posts.
7. Jobs/products/events/funding when those modules have recent content.

Recommended candidate window:

```txt
candidate_limit = limit * 20
minimum 200
maximum 500
```

For a request with `limit=15`, rank roughly 300 candidates and return the best 15.

## Score Formula

Use a simple hybrid ranker first:

```txt
score =
  recency_score
  + engagement_score
  + relationship_score
  + interest_score
  + media_score
  + live_score
  + exploration_score
  - seen_penalty
  - negative_feedback_penalty
  - author_repetition_penalty
```

Suggested weights:

| Feature | Weight |
| --- | ---: |
| Recency | 0-35 |
| Engagement | 0-25 |
| Relationship | 0-28 |
| Interest match | 0-22 |
| Media/content type preference | 0-10 |
| Live boost | 0-20 |
| Exploration randomness | 0-6 |
| Seen penalty | -40 |
| Hide/report penalty | -100 |
| Same-author repetition penalty | -10 per extra post |

## Feature Details

### Recency

Use time decay instead of hard sorting by post id:

```txt
age_hours = (now - post.time) / 3600
recency_score = 35 * exp(-age_hours / 72)
```

This keeps fresh posts high but still allows older high-quality posts to appear.

### Engagement

Use logarithms so viral posts do not dominate forever:

```txt
raw_engagement =
  likes * 2
  + comments * 4
  + shares * 5
  + views * 0.3

engagement_score = min(25, log(1 + raw_engagement) * 5)
```

### Relationship

```txt
friend:       +28
following:    +20
same group:   +12
same page:     +8
own post:      -8 unless recently created
unknown user:  +0
```

Own posts should not dominate the Home feed. They can still appear, but the score should be lower than friends/following unless the account has no other content.

### Interest

Build a user interest profile from the last 30 days:

- hashtags reacted/commented/viewed
- post types watched/read
- pages/groups/jobs/products clicked
- authors frequently watched

Example:

```txt
hashtag match:        +4 per tag, max +12
preferred post type:  +4 to +8
preferred category:   +3 to +8
frequent author:      +4 to +10
```

### Seen Penalty

If the user already saw a post recently:

```txt
seen once:     -25
seen multiple: -40
clicked:       no penalty for 24h if it has new comments
hidden:       -100
reported:     -100
```

### Diversity

After sorting by score, apply a diversity pass:

- Max 2 posts from the same author per page.
- Max 2 heavy video posts per 10 feed items.
- Insert live cards early if live exists.
- Insert group/page/product/job modules between posts only after enough post content exists.

This avoids the current issue where the feed shows too many posts from the logged-in user.

## PHP-Style Ranking Pseudocode

```php
function score_recommended_post(array $post, array $ctx): float {
    $now = time();
    $ageHours = max(0, ($now - intval($post['time'] ?? $now)) / 3600);
    $recency = 35 * exp(-$ageHours / 72);

    $likes = intval($post['postLikes'] ?? $post['likes'] ?? 0);
    $comments = intval($post['post_comments'] ?? 0);
    $shares = intval($post['shares'] ?? 0);
    $views = intval($post['views'] ?? 0);
    $engagement = min(25, log(1 + ($likes * 2 + $comments * 4 + $shares * 5 + $views * 0.3)) * 5);

    $publisherId = strval($post['user_id'] ?? $post['publisher']['user_id'] ?? '');
    $relationship = 0;
    if (isset($ctx['friend_ids'][$publisherId])) {
        $relationship = 28;
    } elseif (isset($ctx['following_ids'][$publisherId])) {
        $relationship = 20;
    } elseif (isset($ctx['same_group_author_ids'][$publisherId])) {
        $relationship = 12;
    }

    if ($publisherId !== '' && $publisherId === strval($ctx['viewer_id'])) {
        $relationship -= 8;
    }

    $interest = 0;
    foreach (($post['hashtags'] ?? []) as $tag) {
        if (isset($ctx['hashtag_weights'][$tag])) {
            $interest += min(4, $ctx['hashtag_weights'][$tag]);
        }
    }
    $interest = min(22, $interest);

    $type = strval($post['postType'] ?? 'text');
    $media = floatval($ctx['type_weights'][$type] ?? 0);
    $media = min(10, $media);

    $live = !empty($post['live_time']) || $type === 'live' ? 20 : 0;

    $postId = strval($post['id'] ?? $post['post_id'] ?? '');
    $seenPenalty = isset($ctx['seen_post_ids'][$postId]) ? 35 : 0;
    $negativePenalty = isset($ctx['hidden_post_ids'][$postId]) ? 100 : 0;
    $exploration = mt_rand(0, 600) / 100;

    return $recency
        + $engagement
        + $relationship
        + $interest
        + $media
        + $live
        + $exploration
        - $seenPenalty
        - $negativePenalty;
}
```

## Diversity Pass

```php
function pick_diverse_posts(array $rankedPosts, int $limit): array {
    $picked = [];
    $authorCount = [];
    $videoCount = 0;

    foreach ($rankedPosts as $item) {
        if (count($picked) >= $limit) {
            break;
        }

        $authorId = strval($item['user_id'] ?? $item['publisher']['user_id'] ?? '');
        $type = strval($item['postType'] ?? 'text');

        if ($authorId !== '' && ($authorCount[$authorId] ?? 0) >= 2) {
            continue;
        }

        if ($type === 'video' && $videoCount >= max(1, floor($limit / 5))) {
            continue;
        }

        $picked[] = $item;
        if ($authorId !== '') {
            $authorCount[$authorId] = ($authorCount[$authorId] ?? 0) + 1;
        }
        if ($type === 'video') {
            $videoCount++;
        }
    }

    if (count($picked) < $limit) {
        foreach ($rankedPosts as $item) {
            if (count($picked) >= $limit) {
                break;
            }
            $id = strval($item['id'] ?? $item['post_id'] ?? '');
            $exists = false;
            foreach ($picked as $pickedItem) {
                if (strval($pickedItem['id'] ?? $pickedItem['post_id'] ?? '') === $id) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $picked[] = $item;
            }
        }
    }

    return $picked;
}
```

## Cursor Strategy

Keep the current app cursor for the first version:

```txt
next_cursor = lowest post id in returned page
```

The SQL candidate query can use:

```sql
WHERE posts.id < :after_post_id
ORDER BY posts.id DESC
LIMIT :candidate_limit
```

Later, if the ranker becomes more advanced, switch to a composite cursor:

```txt
cursor = base64(score + ":" + post_id)
```

## App Integration Plan

1. Add route:

```ts
feed: {
  recommended: 'recommended-feed'
}
```

2. Add repository method:

```ts
getRecommendedPosts(limit?: number, afterPostId?: string): Promise<FeedPostsPage>
```

3. Home uses this endpoint first.
4. Existing `/api/posts` remains fallback.
5. App sends impression/watch/reaction events in the background.

## First Rollout

Phase 1:

- Backend returns recommended posts with hybrid score.
- App still renders with existing mapper.
- Log recommendation debug server-side only.

Phase 2:

- Add tracking events from app.
- Add seen penalty.
- Add author diversity.

Phase 3:

- Add collaborative filtering:
  - users who reacted to similar posts
  - hashtag/category clusters
  - same group/page behavior

## Why This Fixes Current Feed Problems

- Fewer duplicate posts because server dedupes before returning data.
- Fewer own-account posts because own posts get a small penalty and author diversity is enforced.
- More content because candidate generation pulls beyond the follow graph.
- Smoother scrolling because app receives one prepared stream and does less merging/filtering during scroll.
- Better personalization because the feed learns from impressions, watch time, reactions, comments, and hides.
