<?php
// English description: Returns a mobile-only ranked feed without changing the existing posts endpoint.

$response_data = array(
    'api_status' => 400
);

function WoApiRecommended_ReadInt($key, $default, $min, $max) {
    if (!isset($_POST[$key]) || !is_numeric($_POST[$key])) {
        return $default;
    }
    $value = (int) $_POST[$key];
    if ($value < $min) {
        return $min;
    }
    if ($value > $max) {
        return $max;
    }
    return $value;
}

function WoApiRecommended_ReadString($key, $default = '') {
    if (!isset($_POST[$key])) {
        return $default;
    }
    return trim((string) $_POST[$key]);
}

function WoApiRecommended_Lower($value) {
    $value = (string) $value;
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($value, 'UTF-8');
    }
    return strtolower($value);
}

function WoApiRecommended_RowValue($row, $key, $default = null) {
    if (is_array($row) && array_key_exists($key, $row)) {
        return $row[$key];
    }
    if (is_object($row) && isset($row->{$key})) {
        return $row->{$key};
    }
    return $default;
}

function WoApiRecommended_TableExists($table) {
    global $db;
    $safe_table = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
    if ($safe_table === '') {
        return false;
    }
    try {
        $rows = $db->rawQuery("SHOW TABLES LIKE '{$safe_table}'");
        return !empty($rows);
    } catch (Exception $e) {
        return false;
    }
}

function WoApiRecommended_CollectIds($rows, $field) {
    $ids = array();
    if (empty($rows)) {
        return $ids;
    }
    foreach ($rows as $row) {
        $value = WoApiRecommended_RowValue($row, $field, 0);
        if (is_numeric($value) && (int) $value > 0) {
            $ids[(string) (int) $value] = true;
        }
    }
    return $ids;
}

function WoApiRecommended_NormalizePost($post) {
    global $non_allowed;

    if (empty($post) || !is_array($post)) {
        return null;
    }

    $post['shared_info'] = null;

    if (!empty($post['postFile'])) {
        $post['postFile'] = Wo_GetMedia($post['postFile']);
    }
    if (!empty($post['postFileThumb'])) {
        $post['postFileThumb'] = Wo_GetMedia($post['postFileThumb']);
    }
    if (!empty($post['postPlaytube'])) {
        $post['postText'] = strip_tags($post['postText']);
    }

    if (!empty($post['publisher']) && is_array($post['publisher'])) {
        foreach ($non_allowed as $blocked_key) {
            unset($post['publisher'][$blocked_key]);
        }
    } else {
        $post['publisher'] = null;
    }

    if (!empty($post['user_data']) && is_array($post['user_data'])) {
        foreach ($non_allowed as $blocked_key) {
            unset($post['user_data'][$blocked_key]);
        }
    } else {
        $post['user_data'] = null;
    }

    if (!empty($post['parent_id'])) {
        $shared_info = Wo_PostData($post['parent_id']);
        if (!empty($shared_info) && is_array($shared_info)) {
            if (!empty($shared_info['publisher']) && is_array($shared_info['publisher'])) {
                foreach ($non_allowed as $blocked_key) {
                    unset($shared_info['publisher'][$blocked_key]);
                }
            } else {
                $shared_info['publisher'] = null;
            }

            if (!empty($shared_info['user_data']) && is_array($shared_info['user_data'])) {
                foreach ($non_allowed as $blocked_key) {
                    unset($shared_info['user_data'][$blocked_key]);
                }
            } else {
                $shared_info['user_data'] = null;
            }

            if (!empty($shared_info['get_post_comments']) && is_array($shared_info['get_post_comments'])) {
                foreach ($shared_info['get_post_comments'] as $comment_key => $comment) {
                    if (!empty($shared_info['get_post_comments'][$comment_key]['publisher'])) {
                        foreach ($non_allowed as $blocked_key) {
                            unset($shared_info['get_post_comments'][$comment_key]['publisher'][$blocked_key]);
                        }
                    }
                }
            }
        }
        $post['shared_info'] = $shared_info;
    }

    if (!empty($post['get_post_comments']) && is_array($post['get_post_comments'])) {
        foreach ($post['get_post_comments'] as $comment_key => $comment) {
            if (!empty($post['get_post_comments'][$comment_key]['publisher'])) {
                foreach ($non_allowed as $blocked_key) {
                    unset($post['get_post_comments'][$comment_key]['publisher'][$blocked_key]);
                }
            }
        }
    }

    return $post;
}

function WoApiRecommended_PostId($post) {
    if (!empty($post['id']) && is_numeric($post['id'])) {
        return (int) $post['id'];
    }
    if (!empty($post['post_id']) && is_numeric($post['post_id'])) {
        return (int) $post['post_id'];
    }
    return 0;
}

function WoApiRecommended_PostAuthorId($post) {
    if (!empty($post['user_id']) && is_numeric($post['user_id'])) {
        return (string) (int) $post['user_id'];
    }
    if (!empty($post['publisher']['user_id']) && is_numeric($post['publisher']['user_id'])) {
        return (string) (int) $post['publisher']['user_id'];
    }
    return '';
}

function WoApiRecommended_PostType($post) {
    $type = '';
    if (!empty($post['postType'])) {
        $type = strtolower((string) $post['postType']);
    }
    $file = strtolower((string) ($post['postFile'] ?? ''));
    if ($type === '' && preg_match('/\.(mp4|mov|webm|m3u8)(\?|$)/', $file)) {
        $type = 'video';
    }
    if ($type === '') {
        $type = 'text';
    }
    return $type;
}

function WoApiRecommended_ExtractHashtags($post) {
    $text = '';
    if (!empty($post['postText'])) {
        $text .= ' ' . strip_tags((string) $post['postText']);
    }
    if (!empty($post['Orginaltext'])) {
        $text .= ' ' . strip_tags((string) $post['Orginaltext']);
    }

    $tags = array();
    if (preg_match_all('/#([\p{L}\p{N}_-]+)/u', $text, $matches)) {
        foreach ($matches[1] as $tag) {
            $normalized = WoApiRecommended_Lower($tag);
            if ($normalized !== '') {
                $tags[$normalized] = true;
            }
        }
    }
    return array_keys($tags);
}

function WoApiRecommended_BuildContext($viewer_id) {
    global $db;

    $context = array(
        'viewer_id' => (string) $viewer_id,
        'following_ids' => array(),
        'friend_ids' => array(),
        'same_group_author_ids' => array(),
        'seen_post_ids' => array(),
        'hidden_post_ids' => array(),
        'hashtag_weights' => array(),
        'type_weights' => array(),
    );

    try {
        $following_rows = $db->rawQuery("SELECT following_id FROM " . T_FOLLOWERS . " WHERE follower_id = {$viewer_id} AND active = '1' LIMIT 1000");
        $context['following_ids'] = WoApiRecommended_CollectIds($following_rows, 'following_id');

        $follower_rows = $db->rawQuery("SELECT follower_id FROM " . T_FOLLOWERS . " WHERE following_id = {$viewer_id} AND active = '1' LIMIT 1000");
        $followers = WoApiRecommended_CollectIds($follower_rows, 'follower_id');
        foreach ($context['following_ids'] as $id => $value) {
            if (isset($followers[$id])) {
                $context['friend_ids'][$id] = true;
            }
        }
    } catch (Exception $e) {
    }

    if (defined('T_GROUP_MEMBERS')) {
        try {
            $group_rows = $db->rawQuery("SELECT DISTINCT M2.user_id FROM " . T_GROUP_MEMBERS . " M1 INNER JOIN " . T_GROUP_MEMBERS . " M2 ON M1.group_id = M2.group_id WHERE M1.user_id = {$viewer_id} AND M1.active = '1' AND M2.active = '1' AND M2.user_id <> {$viewer_id} LIMIT 1000");
            $context['same_group_author_ids'] = WoApiRecommended_CollectIds($group_rows, 'user_id');
        } catch (Exception $e) {
        }
    }

    if (WoApiRecommended_TableExists('wo_recommendation_events')) {
        try {
            $since = time() - (30 * 24 * 60 * 60);
            $event_rows = $db->rawQuery("SELECT post_id,event_type,value,duration_ms,created_at FROM wo_recommendation_events WHERE user_id = {$viewer_id} AND created_at >= {$since} ORDER BY id DESC LIMIT 1000");
            foreach ($event_rows as $event_row) {
                $post_id = (string) (int) WoApiRecommended_RowValue($event_row, 'post_id', 0);
                $event_type = (string) WoApiRecommended_RowValue($event_row, 'event_type', '');
                $value = (string) WoApiRecommended_RowValue($event_row, 'value', '');

                if ($post_id !== '0' && ($event_type === 'impression' || $event_type === 'click' || $event_type === 'video_watch')) {
                    $context['seen_post_ids'][$post_id] = true;
                }
                if ($post_id !== '0' && ($event_type === 'hide' || $event_type === 'report')) {
                    $context['hidden_post_ids'][$post_id] = true;
                }
                if ($event_type === 'hashtag' && $value !== '') {
                    $tag = WoApiRecommended_Lower($value);
                    $context['hashtag_weights'][$tag] = ($context['hashtag_weights'][$tag] ?? 0) + 3;
                }
                if (($event_type === 'video_watch' || $event_type === 'click') && $value !== '') {
                    $context['type_weights'][$value] = ($context['type_weights'][$value] ?? 0) + 2;
                }
            }
        } catch (Exception $e) {
        }
    }

    return $context;
}

function WoApiRecommended_ScorePost($post, $context) {
    $now = time();
    $posted_at = !empty($post['time']) && is_numeric($post['time']) ? (int) $post['time'] : $now;
    $age_hours = max(0, ($now - $posted_at) / 3600);
    $recency = 35 * exp(-$age_hours / 72);

    $likes = 0;
    if (isset($post['postLikes']) && is_numeric($post['postLikes'])) {
        $likes = (int) $post['postLikes'];
    } elseif (isset($post['reaction']['count']) && is_numeric($post['reaction']['count'])) {
        $likes = (int) $post['reaction']['count'];
    }
    $comments = !empty($post['post_comments']) && is_numeric($post['post_comments']) ? (int) $post['post_comments'] : 0;
    $shares = !empty($post['post_shares']) && is_numeric($post['post_shares']) ? (int) $post['post_shares'] : 0;
    $views = !empty($post['views']) && is_numeric($post['views']) ? (int) $post['views'] : 0;
    $engagement = min(25, log(1 + ($likes * 2 + $comments * 4 + $shares * 5 + $views * 0.3)) * 5);

    $author_id = WoApiRecommended_PostAuthorId($post);
    $relationship = 0;
    if ($author_id !== '' && isset($context['friend_ids'][$author_id])) {
        $relationship = 28;
    } elseif ($author_id !== '' && isset($context['following_ids'][$author_id])) {
        $relationship = 20;
    } elseif ($author_id !== '' && isset($context['same_group_author_ids'][$author_id])) {
        $relationship = 12;
    }
    if ($author_id !== '' && $author_id === (string) $context['viewer_id']) {
        $relationship -= 8;
    }

    $interest = 0;
    foreach (WoApiRecommended_ExtractHashtags($post) as $tag) {
        if (isset($context['hashtag_weights'][$tag])) {
            $interest += min(4, $context['hashtag_weights'][$tag]);
        }
    }
    $interest = min(22, $interest);

    $type = WoApiRecommended_PostType($post);
    $media = min(10, (float) ($context['type_weights'][$type] ?? 0));

    $live = (!empty($post['live_time']) || $type === 'live') ? 20 : 0;

    $post_id = (string) WoApiRecommended_PostId($post);
    $seen_penalty = isset($context['seen_post_ids'][$post_id]) ? 35 : 0;
    $negative_penalty = isset($context['hidden_post_ids'][$post_id]) ? 100 : 0;
    $exploration = mt_rand(0, 600) / 100;

    return $recency + $engagement + $relationship + $interest + $media + $live + $exploration - $seen_penalty - $negative_penalty;
}

function WoApiRecommended_DiversePick($ranked_posts, $limit) {
    $picked = array();
    $picked_ids = array();
    $author_count = array();
    $video_count = 0;
    $max_videos = max(1, (int) floor($limit / 5));

    foreach ($ranked_posts as $item) {
        if (count($picked) >= $limit) {
            break;
        }

        $post = $item['post'];
        $post_id = (string) WoApiRecommended_PostId($post);
        $author_id = WoApiRecommended_PostAuthorId($post);
        $type = WoApiRecommended_PostType($post);

        if ($post_id === '' || isset($picked_ids[$post_id])) {
            continue;
        }
        if ($author_id !== '' && ($author_count[$author_id] ?? 0) >= 2) {
            continue;
        }
        if ($type === 'video' && $video_count >= $max_videos) {
            continue;
        }

        $picked[] = $post;
        $picked_ids[$post_id] = true;
        if ($author_id !== '') {
            $author_count[$author_id] = ($author_count[$author_id] ?? 0) + 1;
        }
        if ($type === 'video') {
            $video_count++;
        }
    }

    if (count($picked) < $limit) {
        foreach ($ranked_posts as $item) {
            if (count($picked) >= $limit) {
                break;
            }
            $post = $item['post'];
            $post_id = (string) WoApiRecommended_PostId($post);
            if ($post_id !== '' && !isset($picked_ids[$post_id])) {
                $picked[] = $post;
                $picked_ids[$post_id] = true;
            }
        }
    }

    return $picked;
}

$limit = WoApiRecommended_ReadInt('limit', 15, 1, 50);
$after_post_id = WoApiRecommended_ReadInt('after_post_id', 0, 0, 2147483647);
$source = WoApiRecommended_ReadString('source', 'all');
$strict_pagination = WoApiRecommended_ReadInt('strict_pagination', 0, 0, 1) === 1;
$candidate_default = $strict_pagination ? $limit : max(200, $limit * 20);
$candidate_min = $strict_pagination ? $limit : 50;
$candidate_limit = WoApiRecommended_ReadInt('candidate_limit', $candidate_default, $candidate_min, 500);
$candidate_limit = max($limit, $candidate_limit);
$debug = WoApiRecommended_ReadInt('debug', 0, 0, 1) === 1;
$viewer_id = (int) $wo['user']['user_id'];
$context = WoApiRecommended_BuildContext($viewer_id);
$cursor_sql = $after_post_id > 0 ? " AND P.id < {$after_post_id}" : "";

$candidate_ids = array();

try {
    $news_posts = Wo_GetPosts(array(
        'limit' => min($candidate_limit, 100),
        'publisher_id' => 0,
        'after_post_id' => $after_post_id,
        'placement' => 'multi_image_post',
        'anonymous' => true
    ));
    if (!empty($news_posts)) {
        foreach ($news_posts as $news_post) {
            $id = WoApiRecommended_PostId($news_post);
            if ($id > 0) {
                $candidate_ids[$id] = true;
            }
        }
    }
} catch (Exception $e) {
}

try {
    $public_rows = $db->rawQuery("SELECT P.id FROM " . T_POSTS . " P WHERE P.postPrivacy = '0' {$cursor_sql} GROUP BY P.id ORDER BY P.id DESC LIMIT {$candidate_limit}");
    if (!empty($public_rows)) {
        foreach ($public_rows as $row) {
            $id = (int) WoApiRecommended_RowValue($row, 'id', 0);
            if ($id > 0) {
                $candidate_ids[$id] = true;
            }
        }
    }
} catch (Exception $e) {
}

if ($source === 'following') {
    if (empty($context['following_ids'])) {
        $candidate_ids = array();
    } else {
        $allowed = $context['following_ids'];
        $candidate_ids = array_filter($candidate_ids, function ($unused, $id) use ($allowed) {
            $post = Wo_PostData((int) $id);
            $author_id = WoApiRecommended_PostAuthorId($post);
            return $author_id !== '' && isset($allowed[$author_id]);
        }, ARRAY_FILTER_USE_BOTH);
    }
}

if ($strict_pagination && count($candidate_ids) > $candidate_limit) {
    $candidate_keys = array_map('intval', array_keys($candidate_ids));
    rsort($candidate_keys, SORT_NUMERIC);
    $candidate_keys = array_slice($candidate_keys, 0, $candidate_limit);
    $candidate_ids = array_fill_keys($candidate_keys, true);
}

$ranked_posts = array();
$seen_ids = array();

foreach (array_keys($candidate_ids) as $candidate_id) {
    $post = Wo_PostData((int) $candidate_id);
    $post = WoApiRecommended_NormalizePost($post);
    if (empty($post)) {
        continue;
    }

    $post_id = WoApiRecommended_PostId($post);
    if ($post_id <= 0 || isset($seen_ids[$post_id])) {
        continue;
    }
    $seen_ids[$post_id] = true;

    $score = WoApiRecommended_ScorePost($post, $context);
    if ($debug) {
        $post['_recommendation'] = array(
            'score' => round($score, 4),
            'type' => WoApiRecommended_PostType($post),
            'author_id' => WoApiRecommended_PostAuthorId($post)
        );
    }
    $ranked_posts[] = array(
        'score' => $score,
        'post' => $post
    );
}

usort($ranked_posts, function ($a, $b) {
    if ($a['score'] == $b['score']) {
        return WoApiRecommended_PostId($b['post']) - WoApiRecommended_PostId($a['post']);
    }
    return ($a['score'] < $b['score']) ? 1 : -1;
});

$posts = WoApiRecommended_DiversePick($ranked_posts, $limit);
$next_cursor = 0;
$cursor_source = $strict_pagination ? array_map(function ($item) {
    return $item['post'];
}, $ranked_posts) : $posts;
foreach ($cursor_source as $post) {
    $post_id = WoApiRecommended_PostId($post);
    if ($post_id > 0 && ($next_cursor === 0 || $post_id < $next_cursor)) {
        $next_cursor = $post_id;
    }
}

$response_data = array(
    'api_status' => 200,
    'data' => $posts,
    'next_cursor' => $next_cursor > 0 ? (string) $next_cursor : null,
    'reached_end' => count($ranked_posts) < $limit || count($candidate_ids) < $candidate_limit
);

if ($debug) {
    $response_data['debug'] = array(
        'candidate_count' => count($candidate_ids),
        'ranked_count' => count($ranked_posts),
        'returned_count' => count($posts),
        'candidate_limit' => $candidate_limit,
        'after_post_id' => $after_post_id,
        'source' => $source,
        'strict_pagination' => $strict_pagination
    );
}
?>
