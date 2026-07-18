<?php

// Private post collections for the authenticated App/Nuxt user.

function VNSEEA_PostActivityNormalizeCategory($value)
{
    if (!is_string($value)) {
        return null;
    }

    $value = strtolower(trim($value));
    return in_array($value, array('saved', 'reaction', 'comment', 'share'), true)
        ? $value
        : null;
}

function VNSEEA_PostActivityNormalizeLimit($value)
{
    if ($value === null || $value === '') {
        return 20;
    }
    if (is_bool($value) || !preg_match('/^[0-9]+$/', (string) $value)) {
        return null;
    }

    $limit = (int) $value;
    return $limit >= 1 && $limit <= 30 ? $limit : null;
}

function VNSEEA_PostActivityEncodeCursor($value)
{
    if (!is_array($value) || empty($value['sort']) || empty($value['post_id'])) {
        return null;
    }

    $json = json_encode(array(
        'sort' => (int) $value['sort'],
        'post_id' => (int) $value['post_id'],
    ));
    return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
}

function VNSEEA_PostActivityDecodeCursor($value)
{
    if (!is_string($value) || $value === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
        return null;
    }

    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }
    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    $data = $decoded !== false ? json_decode($decoded, true) : null;
    if (!is_array($data) || !isset($data['sort'], $data['post_id'])) {
        return null;
    }

    $sort = filter_var($data['sort'], FILTER_VALIDATE_INT);
    $post_id = filter_var($data['post_id'], FILTER_VALIDATE_INT);
    if ($sort === false || $post_id === false || $sort < 1 || $post_id < 1) {
        return null;
    }

    return array('sort' => (int) $sort, 'post_id' => (int) $post_id);
}

function VNSEEA_PostActivityCursorCondition($cursor)
{
    if (empty($cursor)) {
        return '';
    }

    $sort = (int) $cursor['sort'];
    $post_id = (int) $cursor['post_id'];
    return " WHERE (`sort_value` < {$sort} OR (`sort_value` = {$sort} AND `post_id` < {$post_id}))";
}

function VNSEEA_PostActivityBuildQuery($user_id, $category, $cursor, $scan_limit)
{
    $user_id = (int) $user_id;
    $scan_limit = (int) $scan_limit;
    $cursor_condition = VNSEEA_PostActivityCursorCondition($cursor);

    if ($category === 'saved') {
        $source = "
            SELECT MAX(s.id) AS source_id,
                   s.post_id AS post_id,
                   MAX(s.id) AS sort_value,
                   0 AS action_time,
                   '' AS reaction_type,
                   COUNT(*) AS interaction_count,
                   '' AS share_destination
            FROM " . T_SAVED_POSTS . " s
            INNER JOIN " . T_POSTS . " p ON p.id = s.post_id
            WHERE s.user_id = {$user_id} AND s.post_id > 0
            GROUP BY s.post_id
        ";
    }
    else if ($category === 'reaction') {
        $source = "
            SELECT r.id AS source_id,
                   r.post_id AS post_id,
                   r.id AS sort_value,
                   0 AS action_time,
                   r.reaction AS reaction_type,
                   1 AS interaction_count,
                   '' AS share_destination
            FROM " . T_REACTIONS . " r
            INNER JOIN (
                SELECT post_id, MAX(id) AS latest_id
                FROM " . T_REACTIONS . "
                WHERE user_id = {$user_id} AND post_id > 0
                GROUP BY post_id
            ) latest ON latest.latest_id = r.id
            INNER JOIN " . T_POSTS . " p ON p.id = r.post_id
        ";
    }
    else if ($category === 'comment') {
        $source = "
            SELECT MAX(actions.source_id) AS source_id,
                   actions.post_id AS post_id,
                   MAX(actions.action_time) AS sort_value,
                   MAX(actions.action_time) AS action_time,
                   '' AS reaction_type,
                   COUNT(*) AS interaction_count,
                   '' AS share_destination
            FROM (
                SELECT c.id AS source_id, c.post_id, c.time AS action_time
                FROM " . T_COMMENTS . " c
                WHERE c.user_id = {$user_id} AND c.post_id > 0
                UNION ALL
                SELECT r.id AS source_id, c.post_id, r.time AS action_time
                FROM " . T_COMMENTS_REPLIES . " r
                INNER JOIN " . T_COMMENTS . " c ON c.id = r.comment_id
                WHERE r.user_id = {$user_id} AND c.post_id > 0
            ) actions
            INNER JOIN " . T_POSTS . " p ON p.id = actions.post_id
            GROUP BY actions.post_id
        ";
    }
    else {
        $source = "
            SELECT MAX(shares.source_id) AS source_id,
                   shares.post_id AS post_id,
                   MAX(shares.action_time) AS sort_value,
                   MAX(shares.action_time) AS action_time,
                   '' AS reaction_type,
                   COUNT(*) AS interaction_count,
                   SUBSTRING_INDEX(
                       GROUP_CONCAT(shares.destination ORDER BY shares.action_time DESC, shares.source_id DESC SEPARATOR ','),
                       ',',
                       1
                   ) AS share_destination
            FROM (
                SELECT p.id AS source_id, p.post_id, p.time AS action_time, 'timeline' AS destination
                FROM " . T_POSTS . " p
                WHERE p.user_id = {$user_id} AND p.postShare = 1 AND p.post_id > 0
                UNION ALL
                SELECT p.id AS source_id, p.parent_id AS post_id, p.time AS action_time, 'timeline' AS destination
                FROM " . T_POSTS . " p
                WHERE p.user_id = {$user_id} AND p.parent_id > 0 AND p.page_id = 0 AND p.group_id = 0 AND p.postShare <> 1
                UNION ALL
                SELECT p.id AS source_id, p.parent_id AS post_id, p.time AS action_time, 'page' AS destination
                FROM " . T_POSTS . " p
                WHERE p.parent_id > 0 AND p.page_id IN (
                    SELECT page_id FROM " . T_PAGES . " WHERE user_id = {$user_id}
                )
                UNION ALL
                SELECT p.id AS source_id, p.parent_id AS post_id, p.time AS action_time, 'group' AS destination
                FROM " . T_POSTS . " p
                WHERE p.user_id = {$user_id} AND p.parent_id > 0 AND p.group_id > 0
            ) shares
            INNER JOIN " . T_POSTS . " original_post ON original_post.id = shares.post_id
            GROUP BY shares.post_id
        ";
    }

    return "SELECT * FROM ({$source}) post_activity{$cursor_condition} ORDER BY `sort_value` DESC, `post_id` DESC LIMIT {$scan_limit}";
}

function VNSEEA_PostActivityLatestCommentText($user_id, $post_id)
{
    global $sqlConnect;

    $user_id = (int) $user_id;
    $post_id = (int) $post_id;
    $query = mysqli_query($sqlConnect, "
        SELECT latest.text
        FROM (
            SELECT c.id AS source_id, c.time AS action_time, c.text
            FROM " . T_COMMENTS . " c
            WHERE c.user_id = {$user_id} AND c.post_id = {$post_id}
            UNION ALL
            SELECT r.id AS source_id, r.time AS action_time, r.text
            FROM " . T_COMMENTS_REPLIES . " r
            INNER JOIN " . T_COMMENTS . " c ON c.id = r.comment_id
            WHERE r.user_id = {$user_id} AND c.post_id = {$post_id}
        ) latest
        ORDER BY latest.action_time DESC, latest.source_id DESC
        LIMIT 1
    ");
    if (!$query || mysqli_num_rows($query) === 0) {
        return '';
    }

    $row = mysqli_fetch_assoc($query);
    return isset($row['text']) ? html_entity_decode(strip_tags($row['text']), ENT_QUOTES, 'UTF-8') : '';
}

function VNSEEA_PostActivityPreparePost($post_data)
{
    global $non_allowed;

    if (!is_array($post_data) || empty($post_data['id'])) {
        return null;
    }

    unset($post_data['get_post_comments']);
    $post_data['shared_from'] = empty($post_data['shared_from']) ? null : $post_data['shared_from'];

    foreach (array('postFile', 'postFileThumb') as $media_key) {
        if (!empty($post_data[$media_key])) {
            $post_data[$media_key] = Wo_GetMedia($post_data[$media_key]);
        }
    }

    foreach (array('publisher', 'user_data') as $user_key) {
        if (!empty($post_data[$user_key]) && is_array($post_data[$user_key])) {
            foreach ($non_allowed as $field) {
                unset($post_data[$user_key][$field]);
            }
        }
        else {
            $post_data[$user_key] = null;
        }
    }

    if (!empty($post_data['parent_id'])) {
        $shared_info = Wo_PostData($post_data['parent_id']);
        if (is_array($shared_info)) {
            unset($shared_info['get_post_comments']);
            if (!empty($shared_info['publisher'])) {
                foreach ($non_allowed as $field) {
                    unset($shared_info['publisher'][$field]);
                }
            }
            foreach (array('postFile', 'postFileThumb') as $media_key) {
                if (!empty($shared_info[$media_key])) {
                    $shared_info[$media_key] = Wo_GetMedia($shared_info[$media_key]);
                }
            }
            $post_data['shared_info'] = $shared_info;
        }
    }

    return $post_data;
}

function VNSEEA_GetPostActivityPage($user_id, $category, $limit, $cursor = null)
{
    global $sqlConnect;

    $user_id = (int) $user_id;
    $scan_limit = min(91, ($limit * 3) + 1);
    $query_text = VNSEEA_PostActivityBuildQuery($user_id, $category, $cursor, $scan_limit);
    $query = mysqli_query($sqlConnect, $query_text);
    if (!$query) {
        return false;
    }

    $rows = array();
    while ($row = mysqli_fetch_assoc($query)) {
        $rows[] = $row;
    }

    $items = array();
    $processed = 0;
    $last_cursor = null;
    foreach ($rows as $row) {
        $processed++;
        $post_id = (int) $row['post_id'];
        $sort_value = (int) $row['sort_value'];
        $last_cursor = array('sort' => $sort_value, 'post_id' => $post_id);

        $post_data = VNSEEA_PostActivityPreparePost(Wo_PostData($post_id));
        if (empty($post_data)) {
            continue;
        }

        $item = array(
            'id' => $category . ':' . $post_id,
            'post_id' => (string) $post_id,
            'category' => $category,
            'interaction_count' => (int) $row['interaction_count'],
            'post_data' => $post_data,
        );
        if ($category === 'reaction' && $row['reaction_type'] !== '') {
            $item['reaction_type'] = (string) $row['reaction_type'];
        }
        if ($category === 'comment') {
            $item['latest_comment_text'] = VNSEEA_PostActivityLatestCommentText($user_id, $post_id);
        }
        if ($category === 'share' && in_array($row['share_destination'], array('timeline', 'page', 'group'), true)) {
            $item['share_destination'] = $row['share_destination'];
        }
        if ((int) $row['action_time'] > 0) {
            $item['action_time'] = (int) $row['action_time'];
        }

        $items[] = $item;
        if (count($items) >= $limit) {
            break;
        }
    }

    $has_more = count($rows) > $processed || count($rows) >= $scan_limit;
    return array(
        'items' => $items,
        'next_cursor' => $has_more && !empty($last_cursor)
            ? VNSEEA_PostActivityEncodeCursor($last_cursor)
            : null,
        'has_more' => $has_more,
    );
}
