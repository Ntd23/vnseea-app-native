<?php
// English description: Returns reaction counts and users for one post as JSON for feed reaction modals.

if (!empty($_GET['post_id']) && is_numeric($_GET['post_id']) && $_GET['post_id'] > 0) {
    $post_id = (int) $_GET['post_id'];
    $limit = (!empty($_GET['limit']) && is_numeric($_GET['limit']) && $_GET['limit'] > 0) ? min(100, (int) $_GET['limit']) : 50;
    $offset = (!empty($_GET['offset']) && is_numeric($_GET['offset']) && $_GET['offset'] > 0) ? (int) $_GET['offset'] : 0;
    $reaction_types = array_map('strval', array_keys($wo['reactions_types']));
    $reaction_aliases = array(
        'like' => '1',
        'love' => '2',
        'haha' => '3',
        'wow' => '4',
        'sad' => '5',
        'angry' => '6'
    );
    $raw_reaction_filter = !empty($_GET['reaction']) ? strtolower(trim((string) $_GET['reaction'])) : '';
    $reaction_filter = isset($reaction_aliases[$raw_reaction_filter])
        ? $reaction_aliases[$raw_reaction_filter]
        : $raw_reaction_filter;
    if (!empty($reaction_filter) && !in_array($reaction_filter, $reaction_types, true)) {
        $reaction_filter = '__invalid__';
    }
    $reaction_types_sql = implode(',', array_map(function ($reaction_type) {
        return "'" . Wo_Secure($reaction_type) . "'";
    }, $reaction_types));

    $reaction_users = array();
    $reaction_counts = array();
    $filtered_total = 0;

    // One aggregate query replaces one COUNT query per reaction type.
    $counts_query = mysqli_query(
        $sqlConnect,
        "SELECT r.`reaction`, COUNT(*) AS `count` FROM " . T_REACTIONS . " r INNER JOIN " . T_USERS . " u ON u.`user_id` = r.`user_id` WHERE r.`post_id` = {$post_id} GROUP BY r.`reaction` ORDER BY r.`reaction` ASC"
    );
    if ($counts_query && mysqli_num_rows($counts_query)) {
        while ($count_row = mysqli_fetch_assoc($counts_query)) {
            $reaction_type = (string) $count_row['reaction'];
            $count = (int) $count_row['count'];
            if ($count < 1 || !in_array($reaction_type, $reaction_types, true)) {
                continue;
            }

            $reaction_counts[] = array(
                'reaction' => $reaction_type,
                'count' => $count
            );
            if (empty($reaction_filter) || $reaction_filter === $reaction_type) {
                $filtered_total += $count;
            }
        }
    }

    // Fetch a single page across every reaction (or one filtered reaction).
    // The previous implementation fetched `limit` rows once per type, which
    // could expand a 20-row request into 120 users and many follow queries.
    $reaction_scope_sql = !empty($reaction_types_sql)
        ? " AND r.`reaction` IN ({$reaction_types_sql})"
        : ' AND 1 = 0';
    $filter_sql = !empty($reaction_filter)
        ? " AND r.`reaction` = '" . Wo_Secure($reaction_filter) . "'"
        : '';
    $users_query = mysqli_query(
        $sqlConnect,
        "SELECT r.`id`, r.`user_id`, r.`reaction`, u.`first_name`, u.`last_name`, u.`username`, u.`avatar` FROM " . T_REACTIONS . " r INNER JOIN " . T_USERS . " u ON u.`user_id` = r.`user_id` WHERE r.`post_id` = {$post_id}{$reaction_scope_sql}{$filter_sql} ORDER BY r.`id` ASC LIMIT {$offset}, {$limit}"
    );
    $reaction_rows = array();
    $reaction_user_ids = array();
    if ($users_query && mysqli_num_rows($users_query)) {
        while ($reaction_row = mysqli_fetch_assoc($users_query)) {
            $reaction_rows[] = $reaction_row;
            $reaction_user_ids[(int) $reaction_row['user_id']] = true;
        }
    }

    // Resolve follow state for the whole page in one query instead of a
    // separate follow lookup for every rendered user row.
    $following_lookup = array();
    $viewer_id = !empty($wo['user']['user_id']) ? (int) $wo['user']['user_id'] : 0;
    if ($viewer_id > 0 && !empty($reaction_user_ids)) {
        $user_ids_sql = implode(',', array_keys($reaction_user_ids));
        $following_query = mysqli_query(
            $sqlConnect,
            "SELECT `following_id` FROM " . T_FOLLOWERS . " WHERE `follower_id` = {$viewer_id} AND `active` = '1' AND `following_id` IN ({$user_ids_sql})"
        );
        if ($following_query && mysqli_num_rows($following_query)) {
            while ($following_row = mysqli_fetch_assoc($following_query)) {
                $following_lookup[(int) $following_row['following_id']] = true;
            }
        }
    }

    foreach ($reaction_rows as $reaction_row) {
        $user_id = (int) $reaction_row['user_id'];
        $display_name = trim((string) $reaction_row['first_name'] . ' ' . (string) $reaction_row['last_name']);
        if (empty($display_name)) {
            $display_name = (string) $reaction_row['username'];
        }
        $reaction_users[] = array(
            'user_id' => $user_id,
            'first_name' => (string) $reaction_row['first_name'],
            'last_name' => (string) $reaction_row['last_name'],
            'name' => $display_name,
            'username' => (string) $reaction_row['username'],
            'avatar' => !empty($reaction_row['avatar']) ? Wo_GetMedia($reaction_row['avatar']) : '',
            'reaction' => (string) $reaction_row['reaction'],
            'is_following' => !empty($following_lookup[$user_id]) ? 1 : 0
        );
    }

    $next_offset = $offset + count($reaction_rows);
    $reached_end = $next_offset >= $filtered_total;

    $response_data = array(
        'api_status' => 200,
        'post_id' => (int) $post_id,
        'reactions' => $reaction_counts,
        'users' => $reaction_users,
        'next_offset' => $reached_end ? null : $next_offset,
        'reached_end' => $reached_end
    );
}
else {
    $error_code = 4;
    $error_message = 'post_id can not be empty';
}
