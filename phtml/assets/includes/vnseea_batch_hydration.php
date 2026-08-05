<?php
// Fixed-query read models for App/Nuxt list endpoints. These helpers deliberately
// avoid the heavyweight Wo_UserData/Wo_PageData hydration paths.

function VNSEEA_NormalizeBatchIds($values)
{
    $ids = array();
    foreach ((array)$values as $value) {
        $id = (int)$value;
        if ($id > 0) {
            $ids[$id] = $id;
        }
    }
    return $ids;
}

function VNSEEA_ProfileMediaPostIdsBatch($user_ids)
{
    global $sqlConnect;
    $user_ids = VNSEEA_NormalizeBatchIds($user_ids);
    $result = array('avatar' => array(), 'cover' => array());
    if (empty($user_ids)) {
        return $result;
    }

    $query = mysqli_query(
        $sqlConnect,
        "SELECT `user_id`, `postType`, MAX(`id`) AS `post_id` FROM " . T_POSTS .
        " WHERE `user_id` IN (" . implode(',', $user_ids) . ")" .
        " AND `postType` IN ('profile_picture', 'profile_cover_picture')" .
        " GROUP BY `user_id`, `postType`"
    );
    if (!$query) {
        return $result;
    }
    while ($row = mysqli_fetch_assoc($query)) {
        $user_id = (int)$row['user_id'];
        $key = $row['postType'] === 'profile_cover_picture' ? 'cover' : 'avatar';
        $result[$key][$user_id] = (int)$row['post_id'];
    }
    return $result;
}

function VNSEEA_MediaFullVariant($path, $default_path = '')
{
    $path = (string)$path;
    if ($path === '' || ($default_path !== '' && $path === $default_path)) {
        return $path;
    }
    $extension = pathinfo($path, PATHINFO_EXTENSION);
    if ($extension === '') {
        return $path;
    }
    return substr($path, 0, -strlen($extension) - 1) . '_full.' . $extension;
}

function VNSEEA_BuildChatUserSummary($row, $profile_media = array())
{
    global $wo;
    if (empty($row) || !is_array($row)) {
        return array();
    }
    $user_id = !empty($row['user_id']) ? (int)$row['user_id'] : 0;
    if ($user_id < 1) {
        return array();
    }

    $avatar_raw = !empty($row['avatar']) ? (string)$row['avatar'] : '';
    $cover_raw = !empty($row['cover']) ? (string)$row['cover'] : '';
    $last_avatar_mod = !empty($row['last_avatar_mod']) ? (string)$row['last_avatar_mod'] : '0';
    $last_cover_mod = !empty($row['last_cover_mod']) ? (string)$row['last_cover_mod'] : '0';
    $name = trim((string)($row['first_name'] ?? '') . ' ' . (string)($row['last_name'] ?? ''));
    if ($name === '') {
        $name = !empty($row['username']) ? (string)$row['username'] : 'Người dùng';
    }
    $online_threshold = !empty($wo['config']['node_socket_flow']) && (string)$wo['config']['node_socket_flow'] === '1'
        ? time() - 2
        : time() - 60;

    return array(
        'user_id' => $user_id,
        'id' => $user_id,
        'username' => !empty($row['username']) ? (string)$row['username'] : '',
        'first_name' => !empty($row['first_name']) ? (string)$row['first_name'] : '',
        'last_name' => !empty($row['last_name']) ? (string)$row['last_name'] : '',
        'name' => $name,
        'avatar_org' => $avatar_raw,
        'cover_org' => $cover_raw,
        'avatar_full' => Wo_GetMedia(VNSEEA_MediaFullVariant($avatar_raw, !empty($wo['userDefaultAvatar']) ? $wo['userDefaultAvatar'] : '')),
        'cover_full' => Wo_GetMedia(VNSEEA_MediaFullVariant($cover_raw, !empty($wo['userDefaultCover']) ? $wo['userDefaultCover'] : '')),
        'avatar' => Wo_GetMedia($avatar_raw) . '?cache=' . $last_avatar_mod,
        'cover' => Wo_GetMedia($cover_raw) . '?cache=' . $last_cover_mod,
        'avatar_post_id' => !empty($profile_media['avatar'][$user_id]) ? (int)$profile_media['avatar'][$user_id] : 0,
        'cover_post_id' => !empty($profile_media['cover'][$user_id]) ? (int)$profile_media['cover'][$user_id] : 0,
        'verified' => !empty($row['verified']) ? (int)$row['verified'] : 0,
        'is_verified' => !empty($row['verified']) ? 1 : 0,
        'lastseen' => !empty($row['lastseen']) ? (int)$row['lastseen'] : 0,
        'lastseen_unix_time' => !empty($row['lastseen']) ? (int)$row['lastseen'] : 0,
        'lastseen_status' => !empty($row['lastseen']) && (int)$row['lastseen'] > $online_threshold ? 'on' : 'off',
        'active' => isset($row['active']) ? (int)$row['active'] : 1,
        'banned' => !empty($row['banned']) ? (int)$row['banned'] : 0,
        'type' => 'user',
        'url' => Wo_SeoLink('index.php?link1=timeline&u=' . (!empty($row['username']) ? $row['username'] : '')),
        'is_following' => 0,
        'is_following_me' => 0,
    );
}

function VNSEEA_GetChatUsersBatch($user_ids)
{
    global $sqlConnect;
    $user_ids = VNSEEA_NormalizeBatchIds($user_ids);
    if (empty($user_ids)) {
        return array();
    }

    if (empty($GLOBALS['vnseea_chat_user_batch_cache']) || !is_array($GLOBALS['vnseea_chat_user_batch_cache'])) {
        $GLOBALS['vnseea_chat_user_batch_cache'] = array('loaded' => array(), 'users' => array());
    }
    $cache =& $GLOBALS['vnseea_chat_user_batch_cache'];
    $missing_ids = array_diff_key($user_ids, $cache['loaded']);
    if (empty($missing_ids)) {
        return array_intersect_key($cache['users'], $user_ids);
    }

    $profile_media = VNSEEA_ProfileMediaPostIdsBatch($missing_ids);
    $query = mysqli_query(
        $sqlConnect,
        "SELECT `user_id`, `username`, `first_name`, `last_name`, `avatar`, `cover`," .
        " `verified`, `lastseen`, `last_avatar_mod`, `last_cover_mod`, `active`, `banned`" .
        " FROM " . T_USERS . " WHERE `user_id` IN (" . implode(',', $missing_ids) . ")"
    );
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $user = VNSEEA_BuildChatUserSummary($row, $profile_media);
            if (!empty($user['user_id'])) {
                $cache['users'][(int)$user['user_id']] = $user;
            }
        }
    }
    foreach ($missing_ids as $user_id) {
        $cache['loaded'][$user_id] = true;
    }
    return array_intersect_key($cache['users'], $user_ids);
}

function VNSEEA_BuildChatPageSummary($row)
{
    global $wo;
    if (empty($row) || !is_array($row) || empty($row['page_id'])) {
        return array();
    }
    $page_id = (int)$row['page_id'];
    $category = '';
    if (!empty($row['page_category']) && !empty($wo['page_categories'][$row['page_category']])) {
        $category = $wo['page_categories'][$row['page_category']];
    }
    return array_merge($row, array(
        'page_id' => $page_id,
        'id' => $page_id,
        'avatar_org' => !empty($row['avatar']) ? (string)$row['avatar'] : '',
        'avatar' => Wo_GetMedia(!empty($row['avatar']) ? $row['avatar'] : ''),
        'cover' => Wo_GetMedia(!empty($row['cover']) ? $row['cover'] : ''),
        'about' => !empty($row['page_description']) ? (string)$row['page_description'] : '',
        'type' => 'page',
        'url' => Wo_SeoLink('index.php?link1=timeline&u=' . (!empty($row['page_name']) ? $row['page_name'] : '')),
        'name' => !empty($row['page_title']) ? (string)$row['page_title'] : (string)($row['page_name'] ?? ''),
        'username' => !empty($row['page_name']) ? (string)$row['page_name'] : '',
        'category' => $category,
        'verified' => !empty($row['verified']) ? (int)$row['verified'] : 0,
        'is_verified' => !empty($row['verified']) ? 1 : 0,
        'is_page_onwer' => !empty($wo['user']['user_id']) && (int)$row['user_id'] === (int)$wo['user']['user_id'],
    ));
}

function VNSEEA_GetChatPagesBatch($page_ids)
{
    global $sqlConnect;
    $page_ids = VNSEEA_NormalizeBatchIds($page_ids);
    if (empty($page_ids)) {
        return array();
    }

    if (empty($GLOBALS['vnseea_chat_page_batch_cache']) || !is_array($GLOBALS['vnseea_chat_page_batch_cache'])) {
        $GLOBALS['vnseea_chat_page_batch_cache'] = array('loaded' => array(), 'pages' => array());
    }
    $cache =& $GLOBALS['vnseea_chat_page_batch_cache'];
    $missing_ids = array_diff_key($page_ids, $cache['loaded']);
    if (empty($missing_ids)) {
        return array_intersect_key($cache['pages'], $page_ids);
    }
    $query = mysqli_query(
        $sqlConnect,
        "SELECT * FROM " . T_PAGES . " WHERE `page_id` IN (" . implode(',', $missing_ids) . ")"
    );
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $page = VNSEEA_BuildChatPageSummary($row);
            if (!empty($page['page_id'])) {
                $cache['pages'][(int)$page['page_id']] = $page;
            }
        }
    }
    foreach ($missing_ids as $page_id) {
        $cache['loaded'][$page_id] = true;
    }
    return array_intersect_key($cache['pages'], $page_ids);
}

function VNSEEA_MessageBatchContextActive()
{
    return !empty($GLOBALS['vnseea_message_batch_context']['active']);
}

function VNSEEA_MessageBatchContextLoaded($bucket, $key)
{
    return VNSEEA_MessageBatchContextActive()
        && !empty($GLOBALS['vnseea_message_batch_context']['loaded'][$bucket][$key]);
}

function VNSEEA_GetMessageContextUser($user_id)
{
    $user_id = (int)$user_id;
    if ($user_id < 1) {
        return array();
    }
    if (VNSEEA_MessageBatchContextLoaded('users', $user_id)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['users'][$user_id])
            ? $GLOBALS['vnseea_message_batch_context']['users'][$user_id]
            : array();
    }
    return Wo_UserData($user_id);
}

function VNSEEA_GetMessageContextProduct($product_id)
{
    $product_id = (int)$product_id;
    if ($product_id < 1) {
        return array();
    }
    if (VNSEEA_MessageBatchContextLoaded('products', $product_id)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['products'][$product_id])
            ? $GLOBALS['vnseea_message_batch_context']['products'][$product_id]
            : array();
    }
    return Wo_GetProduct($product_id);
}

function VNSEEA_GetMessageContextOrder($hash)
{
    $hash = (string)$hash;
    if ($hash === '') {
        return array();
    }
    if (VNSEEA_MessageBatchContextLoaded('orders', $hash)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['orders'][$hash])
            ? $GLOBALS['vnseea_message_batch_context']['orders'][$hash]
            : array();
    }
    return array();
}

function VNSEEA_GetMessageContextStory($story_id)
{
    $story_id = (int)$story_id;
    if ($story_id < 1) {
        return array();
    }
    if (VNSEEA_MessageBatchContextLoaded('stories', $story_id)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['stories'][$story_id])
            ? $GLOBALS['vnseea_message_batch_context']['stories'][$story_id]
            : array();
    }
    global $wo;
    $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
    return function_exists('VNSEEA_GetMessageStorySnapshot')
        ? VNSEEA_GetMessageStorySnapshot($story_id, $viewer_id)
        : array();
}

function VNSEEA_GetMessageContextReply($message_id)
{
    $message_id = (int)$message_id;
    if ($message_id < 1) {
        return array();
    }
    if (VNSEEA_MessageBatchContextLoaded('replies', $message_id)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['replies'][$message_id])
            ? $GLOBALS['vnseea_message_batch_context']['replies'][$message_id]
            : array();
    }
    return GetMessageById($message_id);
}

function VNSEEA_LoadPostTreeRowsBatch($post_ids, $max_depth = 32)
{
    global $sqlConnect;
    $pending = VNSEEA_NormalizeBatchIds($post_ids);
    $rows = array();
    $max_depth = max(1, min(32, (int)$max_depth));
    for ($depth = 0; $depth < $max_depth && !empty($pending); $depth++) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_POSTS . " WHERE `id` IN (" . implode(',', $pending) . ")"
        );
        $next = array();
        if ($query) {
            while ($row = mysqli_fetch_assoc($query)) {
                $post_id = (int)$row['id'];
                $rows[$post_id] = $row;
                $parent_id = !empty($row['parent_id']) ? (int)$row['parent_id'] : 0;
                if ($parent_id > 0 && !isset($rows[$parent_id])) {
                    $next[$parent_id] = $parent_id;
                }
                $root_id = !empty($row['post_id']) ? (int)$row['post_id'] : 0;
                if ($root_id > 0 && !isset($rows[$root_id])) {
                    $next[$root_id] = $root_id;
                }
            }
        }
        $pending = array_diff_key($next, $rows);
    }
    return $rows;
}

function VNSEEA_GetPostHashtagsBatch($rows)
{
    global $sqlConnect;
    $ids = array();
    foreach ((array)$rows as $row) {
        if (!empty($row['postText']) && preg_match_all('/#\[([0-9]+)\]/i', $row['postText'], $matches)) {
            foreach ($matches[1] as $hashtag_id) {
                $hashtag_id = (int)$hashtag_id;
                if ($hashtag_id > 0) {
                    $ids[$hashtag_id] = $hashtag_id;
                }
            }
        }
    }
    if (empty($ids)) {
        return array();
    }
    $hashtags = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_HASHTAGS . " WHERE `id` IN (" . implode(',', $ids) . ")");
    if ($query) {
        while ($hashtag = mysqli_fetch_assoc($query)) {
            $hashtags[(int)$hashtag['id']] = $hashtag;
        }
    }
    return $hashtags;
}

function VNSEEA_RunWithMarkupBatchContext($texts, $callback, $known_users = array())
{
    global $sqlConnect;
    if (!is_callable($callback)) {
        return null;
    }
    $user_ids = array();
    $hashtag_ids = array();
    foreach ((array)$texts as $text) {
        $text = (string)$text;
        if ($text === '') {
            continue;
        }
        if (preg_match_all('/@\[([0-9]+)\]/i', $text, $mentions)) {
            foreach ($mentions[1] as $user_id) {
                $user_id = (int)$user_id;
                if ($user_id > 0) {
                    $user_ids[$user_id] = $user_id;
                }
            }
        }
        if (preg_match_all('/#\[([0-9]+)\]/i', $text, $hashtags)) {
            foreach ($hashtags[1] as $hashtag_id) {
                $hashtag_id = (int)$hashtag_id;
                if ($hashtag_id > 0) {
                    $hashtag_ids[$hashtag_id] = $hashtag_id;
                }
            }
        }
    }

    $users = is_array($known_users) ? $known_users : array();
    $missing_users = array_diff_key($user_ids, $users);
    if (!empty($missing_users)) {
        $users += VNSEEA_GetChatUsersBatch($missing_users);
    }
    $resolved_hashtags = array();
    if (!empty($hashtag_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_HASHTAGS . " WHERE `id` IN (" . implode(',', $hashtag_ids) . ")"
        );
        if ($query) {
            while ($hashtag = mysqli_fetch_assoc($query)) {
                $resolved_hashtags[(int)$hashtag['id']] = $hashtag;
            }
        }
    }

    $had_context = array_key_exists('vnseea_post_batch_context', $GLOBALS);
    $previous_context = $had_context ? $GLOBALS['vnseea_post_batch_context'] : null;
    $GLOBALS['vnseea_post_batch_context'] = array(
        'active' => true,
        'query_free' => true,
        'users' => $users,
        'hashtags' => $resolved_hashtags,
    );
    try {
        return $callback();
    } finally {
        if ($had_context) {
            $GLOBALS['vnseea_post_batch_context'] = $previous_context;
        } else {
            unset($GLOBALS['vnseea_post_batch_context']);
        }
    }
}

function VNSEEA_PostBatchMarkupUser($user_id)
{
    $user_id = (int)$user_id;
    if (!empty($GLOBALS['vnseea_post_batch_context']['query_free'])) {
        return !empty($GLOBALS['vnseea_post_batch_context']['users'][$user_id])
            ? $GLOBALS['vnseea_post_batch_context']['users'][$user_id]
            : array();
    }
    if (VNSEEA_MessageBatchContextActive()) {
        return VNSEEA_GetMessageContextUser($user_id);
    }
    return Wo_UserData($user_id);
}

function VNSEEA_IsPostQueryFreeHydration()
{
    return !empty($GLOBALS['vnseea_post_batch_context']['query_free']);
}

function VNSEEA_PostBatchHashtag($hashtag_id)
{
    $hashtag_id = (int)$hashtag_id;
    if (!empty($GLOBALS['vnseea_post_batch_context']['query_free'])) {
        return !empty($GLOBALS['vnseea_post_batch_context']['hashtags'][$hashtag_id])
            ? $GLOBALS['vnseea_post_batch_context']['hashtags'][$hashtag_id]
            : array();
    }
    if (VNSEEA_MessageBatchContextLoaded('hashtags', $hashtag_id)) {
        return !empty($GLOBALS['vnseea_message_batch_context']['hashtags'][$hashtag_id])
            ? $GLOBALS['vnseea_message_batch_context']['hashtags'][$hashtag_id]
            : array();
    }
    return Wo_GetHashtag($hashtag_id);
}

function VNSEEA_PrimePostAccessBatch($rows, $viewer_id = 0)
{
    global $wo, $sqlConnect;
    $viewer_id = (int)$viewer_id;
    $rows_by_id = array();
    $group_ids = array();
    $page_ids = array();
    $event_ids = array();
    $identity_ids = array();
    foreach ((array)$rows as $key => $row) {
        if (!is_array($row) || empty($row['id'])) {
            continue;
        }
        $post_id = (int)$row['id'];
        $rows_by_id[$post_id] = $row;
        foreach (array('user_id', 'recipient_id', 'shared_from') as $field) {
            $user_id = !empty($row[$field]) ? (int)$row[$field] : 0;
            if ($user_id > 0) {
                $identity_ids[$user_id] = $user_id;
            }
        }
        if (!empty($row['group_id'])) {
            $group_ids[(int)$row['group_id']] = (int)$row['group_id'];
        }
        if (!empty($row['page_id'])) {
            $page_ids[(int)$row['page_id']] = (int)$row['page_id'];
        }
        $event_id = !empty($row['event_id']) ? (int)$row['event_id'] : (!empty($row['page_event_id']) ? (int)$row['page_event_id'] : 0);
        if ($event_id > 0) {
            $event_ids[$event_id] = $event_id;
        }
    }

    $viewer_follows = array();
    $author_follows_viewer = array();
    if ($viewer_id > 0 && !empty($identity_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `follower_id`, `following_id` FROM " . T_FOLLOWERS .
            " WHERE `active` = '1' AND ((`follower_id` = {$viewer_id} AND `following_id` IN (" . implode(',', $identity_ids) . "))" .
            " OR (`following_id` = {$viewer_id} AND `follower_id` IN (" . implode(',', $identity_ids) . ")))"
        );
        if ($query) {
            while ($follow = mysqli_fetch_assoc($query)) {
                if ((int)$follow['follower_id'] === $viewer_id) {
                    $viewer_follows[(int)$follow['following_id']] = true;
                }
                if ((int)$follow['following_id'] === $viewer_id) {
                    $author_follows_viewer[(int)$follow['follower_id']] = true;
                }
            }
        }
    }

    $groups = array();
    if (!empty($group_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_GROUPS . " WHERE `id` IN (" . implode(',', $group_ids) . ")");
        if ($query) {
            while ($group = mysqli_fetch_assoc($query)) {
                $groups[(int)$group['id']] = $group;
            }
        }
    }
    $joined_groups = array();
    $requested_groups = array();
    if ($viewer_id > 0 && !empty($group_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `group_id`, `active` FROM " . T_GROUP_MEMBERS . " WHERE `user_id` = {$viewer_id} AND `group_id` IN (" . implode(',', $group_ids) . ")"
        );
        if ($query) {
            while ($membership = mysqli_fetch_assoc($query)) {
                if ((int)$membership['active'] === 1) {
                    $joined_groups[(int)$membership['group_id']] = true;
                } else {
                    $requested_groups[(int)$membership['group_id']] = true;
                }
            }
        }
    }
    $group_member_counts = array();
    if (!empty($group_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `group_id`, COUNT(`id`) AS `member_count` FROM " . T_GROUP_MEMBERS . " WHERE `active` = '1' AND `group_id` IN (" . implode(',', $group_ids) . ") GROUP BY `group_id`"
        );
        if ($query) {
            while ($count = mysqli_fetch_assoc($query)) {
                $group_member_counts[(int)$count['group_id']] = (int)$count['member_count'];
            }
        }
    }
    $reported_groups = array();
    if ($viewer_id > 0 && !empty($group_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `group_id` FROM " . T_REPORTS . " WHERE `user_id` = {$viewer_id} AND `group_id` IN (" . implode(',', $group_ids) . ")"
        );
        if ($query) {
            while ($report = mysqli_fetch_assoc($query)) {
                $reported_groups[(int)$report['group_id']] = true;
            }
        }
    }
    foreach ($groups as $group_id => $group) {
        $category_id = !empty($group['category']) ? (int)$group['category'] : 0;
        $group['group_id'] = $group_id;
        $group['avatar_org'] = !empty($group['avatar']) ? (string)$group['avatar'] : '';
        $group['avatar'] = Wo_GetMedia((string)($group['avatar'] ?? ''));
        $group['cover'] = Wo_GetMedia((string)($group['cover'] ?? ''));
        $group['url'] = Wo_SeoLink('index.php?link1=timeline&u=' . ($group['group_name'] ?? ''));
        $group['name'] = !empty($group['group_title']) ? $group['group_title'] : ($group['group_name'] ?? '');
        $group['category_id'] = $category_id;
        $group['type'] = 'group';
        $group['username'] = !empty($group['group_name']) ? $group['group_name'] : '';
        $group['category'] = !empty($wo['group_categories'][$category_id]) ? $wo['group_categories'][$category_id] : '';
        $group['is_reported'] = !empty($reported_groups[$group_id]);
        $group['group_sub_category'] = '';
        if (!empty($group['sub_category']) && !empty($wo['group_sub_categories'][$category_id])) {
            foreach ($wo['group_sub_categories'][$category_id] as $sub_category) {
                if ((int)$sub_category['id'] === (int)$group['sub_category']) {
                    $group['group_sub_category'] = $sub_category['lang'];
                    break;
                }
            }
        }
        $group['is_group_joined'] = !empty($requested_groups[$group_id]) ? 2 : (!empty($joined_groups[$group_id]) ? 1 : 0);
        $group['members_count'] = !empty($group_member_counts[$group_id]) ? $group_member_counts[$group_id] : 0;
        $groups[$group_id] = $group;
    }

    $pages = array();
    if (!empty($page_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_PAGES . " WHERE `page_id` IN (" . implode(',', $page_ids) . ")");
        if ($query) {
            while ($page = mysqli_fetch_assoc($query)) {
                $pages[(int)$page['page_id']] = $page;
            }
        }
    }
    $liked_pages = array();
    $admin_pages = array();
    if ($viewer_id > 0 && !empty($page_ids)) {
        $likes_query = mysqli_query(
            $sqlConnect,
            "SELECT `page_id` FROM " . T_PAGES_LIKES . " WHERE `user_id` = {$viewer_id} AND `active` = '1' AND `page_id` IN (" . implode(',', $page_ids) . ")"
        );
        if ($likes_query) {
            while ($like = mysqli_fetch_assoc($likes_query)) {
                $liked_pages[(int)$like['page_id']] = true;
            }
        }
        $admins_query = mysqli_query(
            $sqlConnect,
            "SELECT `page_id` FROM " . T_PAGE_ADMINS . " WHERE `user_id` = {$viewer_id} AND `page_id` IN (" . implode(',', $page_ids) . ")"
        );
        if ($admins_query) {
            while ($admin = mysqli_fetch_assoc($admins_query)) {
                $admin_pages[(int)$admin['page_id']] = true;
            }
        }
    }

    $events = array();
    if (!empty($event_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_EVENTS . " WHERE `id` IN (" . implode(',', $event_ids) . ")");
        if ($query) {
            while ($event = mysqli_fetch_assoc($query)) {
                $events[(int)$event['id']] = $event;
            }
        }
    }

    $blocked = array();
    if ($viewer_id > 0 && !empty($identity_ids)) {
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `blocker`, `blocked` FROM " . T_BLOCKS .
            " WHERE (`blocker` = {$viewer_id} AND `blocked` IN (" . implode(',', $identity_ids) . "))" .
            " OR (`blocked` = {$viewer_id} AND `blocker` IN (" . implode(',', $identity_ids) . "))"
        );
        if ($query) {
            while ($block = mysqli_fetch_assoc($query)) {
                $other_id = (int)$block['blocker'] === $viewer_id ? (int)$block['blocked'] : (int)$block['blocker'];
                $blocked[$other_id] = true;
            }
        }
    }

    return array(
        'viewer_id' => $viewer_id,
        'rows' => $rows_by_id,
        'viewer_follows' => $viewer_follows,
        'author_follows_viewer' => $author_follows_viewer,
        'groups' => $groups,
        'joined_groups' => $joined_groups,
        'requested_groups' => $requested_groups,
        'pages' => $pages,
        'liked_pages' => $liked_pages,
        'admin_pages' => $admin_pages,
        'events' => $events,
        'blocked_users' => $blocked,
        'is_system_admin' => $viewer_id > 0 && function_exists('Wo_IsAdmin') && Wo_IsAdmin(),
        'is_system_moderator' => $viewer_id > 0 && function_exists('Wo_IsModerator') && Wo_IsModerator(),
        'events_require_login' => !empty($wo['config']['events_visibility']),
    );
}

function VNSEEA_PostAccessCanView($row, $access)
{
    if (!is_array($row) || empty($row['id'])) {
        return false;
    }
    $viewer_id = !empty($access['viewer_id']) ? (int)$access['viewer_id'] : 0;
    $author_id = !empty($row['user_id']) ? (int)$row['user_id'] : 0;
    $privacy = isset($row['postPrivacy']) ? (int)$row['postPrivacy'] : 0;
    $event_id = !empty($row['event_id']) ? (int)$row['event_id'] : (!empty($row['page_event_id']) ? (int)$row['page_event_id'] : 0);
    if ($event_id > 0) {
        if (empty($access['events'][$event_id])) {
            return false;
        }
        $event = $access['events'][$event_id];
        $owner_id = !empty($event['poster_id']) ? (int)$event['poster_id'] : (!empty($event['user_id']) ? (int)$event['user_id'] : 0);
        return ($viewer_id > 0 && $viewer_id === $owner_id) || empty($access['events_require_login']) || $viewer_id > 0;
    }
    if (!empty($row['group_id'])) {
        $group_id = (int)$row['group_id'];
        if (empty($access['groups'][$group_id])) {
            return false;
        }
        $group = $access['groups'][$group_id];
        if ((int)($group['privacy'] ?? 1) !== 2) {
            return true;
        }
        return $viewer_id > 0 && (
            (!empty($group['user_id']) && (int)$group['user_id'] === $viewer_id)
            || !empty($access['joined_groups'][$group_id])
        );
    }
    if (!empty($row['page_id'])) {
        $page_id = (int)$row['page_id'];
        if ($privacy === 0 || $privacy === 5 || $privacy === 6) {
            return true;
        }
        if ($viewer_id < 1 || empty($access['pages'][$page_id])) {
            return false;
        }
        $page = $access['pages'][$page_id];
        if (!empty($page['user_id']) && (int)$page['user_id'] === $viewer_id) {
            return true;
        }
        return $privacy === 2 && !empty($access['liked_pages'][$page_id]);
    }
    if ($privacy === 0 || $privacy === 4 || $privacy === 5 || $privacy === 6) {
        return true;
    }
    if ($viewer_id > 0 && $viewer_id === $author_id) {
        return true;
    }
    if ($viewer_id < 1) {
        return false;
    }
    if ($privacy === 1) {
        return !empty($access['viewer_follows'][$author_id]) && !empty($access['author_follows_viewer'][$author_id]);
    }
    if ($privacy === 2) {
        return !empty($access['viewer_follows'][$author_id]);
    }
    return false;
}

function VNSEEA_PostAccessCanShareTree($row, $access)
{
    $seen = array();
    for ($depth = 0; $depth < 32; $depth++) {
        if (!is_array($row) || empty($row['id'])) {
            return false;
        }
        if ((int)($row['postPrivacy'] ?? 0) !== 0 || !empty($row['is_anonymous']) || (int)($row['postPrivacy'] ?? 0) === 4) {
            return false;
        }
        if (!VNSEEA_PostAccessCanView($row, $access)) {
            return false;
        }
        $parent_id = !empty($row['parent_id']) ? (int)$row['parent_id'] : 0;
        if ($parent_id < 1) {
            return true;
        }
        if (isset($seen[$parent_id]) || empty($access['rows'][$parent_id])) {
            return false;
        }
        $seen[$parent_id] = true;
        $row = $access['rows'][$parent_id];
    }
    return false;
}

function VNSEEA_PostAccessCanDelete($row, $access)
{
    if (!is_array($row) || empty($row['id']) || empty($access['viewer_id'])) {
        return false;
    }
    $viewer_id = (int)$access['viewer_id'];
    if ((!empty($row['user_id']) && (int)$row['user_id'] === $viewer_id)
        || (!empty($row['recipient_id']) && (int)$row['recipient_id'] === $viewer_id)) {
        return true;
    }
    if (!empty($row['page_id'])) {
        $page_id = (int)$row['page_id'];
        $page = !empty($access['pages'][$page_id]) ? $access['pages'][$page_id] : array();
        if ((!empty($page['user_id']) && (int)$page['user_id'] === $viewer_id) || !empty($access['admin_pages'][$page_id])) {
            return true;
        }
    }
    if (!empty($row['group_id'])) {
        $group = !empty($access['groups'][(int)$row['group_id']]) ? $access['groups'][(int)$row['group_id']] : array();
        if (!empty($group['user_id']) && (int)$group['user_id'] === $viewer_id) {
            return true;
        }
    }
    return !empty($access['is_system_admin']) || !empty($access['is_system_moderator']);
}

function VNSEEA_PostAccessIsBlocked($row, $access)
{
    if (!is_array($row) || !empty($row['group_id'])) {
        return false;
    }
    foreach (array('user_id', 'recipient_id') as $field) {
        if (!empty($row[$field]) && !empty($access['blocked_users'][(int)$row[$field]])) {
            return true;
        }
    }
    return false;
}

function VNSEEA_GetShareablePostIdsBatch($post_ids, $viewer_id)
{
    $post_ids = VNSEEA_NormalizeBatchIds($post_ids);
    if (empty($post_ids)) {
        return array();
    }
    $rows = VNSEEA_LoadPostTreeRowsBatch($post_ids);
    $access = VNSEEA_PrimePostAccessBatch($rows, $viewer_id);
    $shareable = array();
    foreach ($post_ids as $post_id) {
        $shareable[$post_id] = !empty($rows[$post_id]) && VNSEEA_PostAccessCanShareTree($rows[$post_id], $access);
    }
    return $shareable;
}

function VNSEEA_GetMessageStoriesBatch($story_ids, $viewer_id, $known_users = array())
{
    global $sqlConnect;
    $story_ids = VNSEEA_NormalizeBatchIds($story_ids);
    $viewer_id = (int)$viewer_id;
    if (empty($story_ids)) {
        return array();
    }
    $audience_sql = function_exists('VNSEEA_StoryAudienceSql')
        ? VNSEEA_StoryAudienceSql('s', $viewer_id)
        : '1 = 1';
    $stories = array();
    $user_ids = array();
    $source_post_ids = array();
    $query = mysqli_query(
        $sqlConnect,
        "SELECT s.* FROM " . T_USER_STORY . " s WHERE s.`id` IN (" . implode(',', $story_ids) . ")" .
        " AND (s.`expire` = 0 OR s.`expire` > " . time() . ") AND ({$audience_sql})"
    );
    if ($query) {
        while ($story = mysqli_fetch_assoc($query)) {
            $story_id = (int)$story['id'];
            $stories[$story_id] = $story;
            $user_ids[(int)$story['user_id']] = (int)$story['user_id'];
            if (($story['story_type'] ?? 'media') === 'shared_post' && !empty($story['source_post_id'])) {
                $source_post_ids[(int)$story['source_post_id']] = (int)$story['source_post_id'];
            }
        }
    }
    if (empty($stories)) {
        return array();
    }
    $shareable_posts = VNSEEA_GetShareablePostIdsBatch($source_post_ids, $viewer_id);
    foreach ($stories as $story_id => $story) {
        if (($story['story_type'] ?? 'media') === 'shared_post' && empty($shareable_posts[(int)$story['source_post_id']])) {
            unset($stories[$story_id]);
        }
    }
    if (empty($stories)) {
        return array();
    }
    $users = $known_users;
    $missing_users = array_diff_key($user_ids, $users);
    if (!empty($missing_users)) {
        $users += VNSEEA_GetChatUsersBatch($missing_users);
    }
    $media = array();
    $media_query = mysqli_query(
        $sqlConnect,
        "SELECT * FROM " . T_USER_STORY_MEDIA . " WHERE `story_id` IN (" . implode(',', array_keys($stories)) . ") ORDER BY `id` ASC"
    );
    if ($media_query) {
        while ($item = mysqli_fetch_assoc($media_query)) {
            $story_id = (int)$item['story_id'];
            $item['filename'] = Wo_GetMedia($item['filename']);
            $media[$story_id][$item['type']][] = $item;
        }
    }
    $snapshots = array();
    foreach ($stories as $story_id => $story) {
        $publisher = !empty($users[(int)$story['user_id']]) ? $users[(int)$story['user_id']] : array();
        $images = !empty($media[$story_id]['image']) ? $media[$story_id]['image'] : array();
        $videos = !empty($media[$story_id]['video']) ? $media[$story_id]['video'] : array();
        $thumbnail = !empty($story['thumbnail']) ? Wo_GetMedia($story['thumbnail']) : (!empty($images[0]['filename']) ? $images[0]['filename'] : '');
        $snapshots[$story_id] = array(
            'id' => $story_id,
            'user_id' => (int)$story['user_id'],
            'title' => !empty($story['title']) ? (string)$story['title'] : '',
            'description' => !empty($story['description']) ? (string)$story['description'] : '',
            'posted' => !empty($story['posted']) ? (int)$story['posted'] : 0,
            'expire' => !empty($story['expire']) ? (int)$story['expire'] : 0,
            'story_type' => !empty($story['story_type']) ? (string)$story['story_type'] : 'media',
            'source_post_id' => !empty($story['source_post_id']) ? (int)$story['source_post_id'] : 0,
            'thumbnail' => $thumbnail,
            'images' => $images,
            'videos' => $videos,
            'user_data' => array(
                'user_id' => !empty($publisher['user_id']) ? (int)$publisher['user_id'] : (int)$story['user_id'],
                'username' => !empty($publisher['username']) ? (string)$publisher['username'] : '',
                'name' => !empty($publisher['name']) ? (string)$publisher['name'] : '',
                'avatar' => !empty($publisher['avatar']) ? (string)$publisher['avatar'] : '',
                'url' => !empty($publisher['url']) ? (string)$publisher['url'] : '',
                'verified' => !empty($publisher['verified']) ? 1 : 0,
            ),
        );
    }
    return $snapshots;
}

function VNSEEA_GetMessageProductsBatch($product_ids)
{
    global $wo, $sqlConnect;
    $product_ids = VNSEEA_NormalizeBatchIds($product_ids);
    if (empty($product_ids)) {
        return array();
    }
    $ids_sql = implode(',', $product_ids);
    $rows = array();
    $owner_ids = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_PRODUCTS . " WHERE `id` IN ({$ids_sql})");
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $product_id = (int)$row['id'];
            $rows[$product_id] = $row;
            if (!empty($row['user_id'])) {
                $owner_ids[(int)$row['user_id']] = (int)$row['user_id'];
            }
        }
    }
    if (empty($rows)) {
        return array();
    }

    $images = array();
    $image_query = mysqli_query(
        $sqlConnect,
        "SELECT `id`, `image`, `product_id` FROM " . T_PRODUCTS_MEDIA .
        " WHERE `product_id` IN ({$ids_sql}) ORDER BY `id` DESC"
    );
    if ($image_query) {
        while ($image = mysqli_fetch_assoc($image_query)) {
            $product_id = (int)$image['product_id'];
            $path = (string)$image['image'];
            $extension = pathinfo($path, PATHINFO_EXTENSION);
            $small = $extension !== ''
                ? substr($path, 0, -strlen($extension) - 1) . '_small.' . $extension
                : $path;
            $image['image_org'] = Wo_GetMedia($small);
            $image['image'] = Wo_GetMedia($path);
            $images[$product_id][] = $image;
        }
    }

    $post_ids = array();
    $post_query = mysqli_query(
        $sqlConnect,
        "SELECT `product_id`, MIN(`id`) AS `post_id` FROM " . T_POSTS .
        " WHERE `product_id` IN ({$ids_sql}) GROUP BY `product_id`"
    );
    if ($post_query) {
        while ($post = mysqli_fetch_assoc($post_query)) {
            $post_ids[(int)$post['product_id']] = (int)$post['post_id'];
        }
    }

    $ratings = array();
    $rating_query = mysqli_query(
        $sqlConnect,
        "SELECT `product_id`, FLOOR(SUM(`star`) / COUNT(`id`)) AS `rating`, COUNT(`id`) AS `reviews_count`" .
        " FROM " . T_PRODUCT_REVIEW . " WHERE `product_id` IN ({$ids_sql}) GROUP BY `product_id`"
    );
    if ($rating_query) {
        while ($rating = mysqli_fetch_assoc($rating_query)) {
            $ratings[(int)$rating['product_id']] = $rating;
        }
    }

    $cart = array();
    $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
    if ($viewer_id > 0) {
        $cart_query = mysqli_query(
            $sqlConnect,
            "SELECT `product_id`, COUNT(`id`) AS `cart_count` FROM " . T_USERCARD .
            " WHERE `user_id` = {$viewer_id} AND `product_id` IN ({$ids_sql}) GROUP BY `product_id`"
        );
        if ($cart_query) {
            while ($cart_row = mysqli_fetch_assoc($cart_query)) {
                $cart[(int)$cart_row['product_id']] = (int)$cart_row['cart_count'];
            }
        }
    }
    $owners = VNSEEA_GetChatUsersBatch($owner_ids);

    $custom_fields = function_exists('Wo_GetCustomFields') ? Wo_GetCustomFields('product') : array();
    $description_texts = array_map(function ($product) {
        return (string)($product['description'] ?? '');
    }, $rows);
    return VNSEEA_RunWithMarkupBatchContext($description_texts, function () use ($rows, $images, $post_ids, $ratings, $cart, $owners, $custom_fields, $wo) {
        $products = array();
        foreach ($rows as $product_id => $product) {
            $product['images'] = !empty($images[$product_id]) ? $images[$product_id] : array();
            $product['time_text'] = Wo_Time_Elapsed_String(!empty($product['time']) ? $product['time'] : 0);
            $product['post_id'] = !empty($post_ids[$product_id]) ? $post_ids[$product_id] : 0;
            $product['edit_description'] = Wo_EditMarkup(br2nl((string)($product['description'] ?? ''), true, false, false));
            $product['description'] = Wo_Markup((string)($product['description'] ?? ''), true, false, false);
            if (!empty($wo['config']['useSeoFrindly'])) {
                $slug = Wo_SlugPost((string)($product['name'] ?? ''));
                $product['url'] = Wo_SeoLink('index.php?link1=post&id=' . $product['post_id']) . '_' . $slug;
                $product['reviews_url'] = Wo_SeoLink('index.php?link1=reviews&id=' . $product_id) . '_' . $slug;
                $product['seo_id'] = $product['post_id'] . '_' . $slug;
                $product['reviews_seo_id'] = $product_id . '_' . $slug;
            } else {
                $product['url'] = Wo_SeoLink('index.php?link1=post&id=' . $product['post_id']);
                $product['reviews_url'] = Wo_SeoLink('index.php?link1=reviews&id=' . $product_id);
                $product['seo_id'] = $product['post_id'];
                $product['reviews_seo_id'] = $product_id;
            }
            $product['product_sub_category'] = '';
            if (!empty($product['sub_category']) && !empty($wo['products_sub_categories'][$product['category']])) {
                foreach ($wo['products_sub_categories'][$product['category']] as $sub_category) {
                    if ((int)$sub_category['id'] === (int)$product['sub_category']) {
                        $product['product_sub_category'] = $sub_category['lang'];
                        break;
                    }
                }
            }
            $product['fields'] = array();
            foreach ((array)$custom_fields as $field) {
                if (!empty($field['fid']) && array_key_exists($field['fid'], $product)) {
                    $product['fields'][$field['fid']] = $product[$field['fid']];
                }
            }
            $product['added_to_cart'] = !empty($cart[$product_id]) ? $cart[$product_id] : 0;
            $product['user_data'] = !empty($owners[(int)$product['user_id']]) ? $owners[(int)$product['user_id']] : array();
            $product['rating'] = !empty($ratings[$product_id]['rating']) ? (int)$ratings[$product_id]['rating'] : 0;
            $product['reviews_count'] = !empty($ratings[$product_id]['reviews_count']) ? (int)$ratings[$product_id]['reviews_count'] : 0;
            $currency = !empty($product['currency']) ? $product['currency'] : (!empty($wo['config']['currency']) ? $wo['config']['currency'] : 'USD');
            $currency_rule = Wo_GetCurrencyRule($currency);
            $product['currency_code'] = $currency_rule['code'];
            $product['currency_symbol'] = $currency_rule['symbol'];
            $product['currency_rule'] = array(
                'decimals' => $currency_rule['decimals'],
                'decimal_sep' => $currency_rule['decimal_sep'],
                'thousand_sep' => $currency_rule['thousand_sep'],
            );
            $product['price_format'] = Wo_FormatPriceByCurrency($product['price'], $currency);
            $product['price_input_format'] = $product['price_format'];
            $product['point'] = isset($product['point']) ? max(0, (int)$product['point']) : 0;
            $products[$product_id] = $product;
        }
        return $products;
    }, $owners);
}

function VNSEEA_GetMarketplaceOrderContextsBatch($hashes, $viewer_id, $known_products = array())
{
    global $sqlConnect;
    $clean_hashes = array();
    foreach ((array)$hashes as $hash) {
        $hash = trim((string)$hash);
        if ($hash !== '') {
            $clean_hashes[$hash] = $hash;
        }
    }
    $viewer_id = (int)$viewer_id;
    if (empty($clean_hashes) || $viewer_id < 1) {
        return array();
    }
    $quoted = array();
    foreach ($clean_hashes as $hash) {
        $quoted[] = "'" . Wo_Secure($hash) . "'";
    }
    $orders_by_hash = array();
    $buyer_ids = array();
    $address_ids = array();
    $product_ids = array();
    $query = mysqli_query(
        $sqlConnect,
        "SELECT * FROM " . T_USER_ORDERS . " WHERE `hash_id` IN (" . implode(',', $quoted) . ") ORDER BY `id` ASC"
    );
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $hash = (string)$row['hash_id'];
            $orders_by_hash[$hash][] = $row;
            $buyer_ids[(int)$row['user_id']] = (int)$row['user_id'];
            $address_ids[(int)$row['address_id']] = (int)$row['address_id'];
            $product_ids[(int)$row['product_id']] = (int)$row['product_id'];
        }
    }
    $buyers = VNSEEA_GetChatUsersBatch($buyer_ids);
    $products = $known_products;
    $missing_products = array_diff_key($product_ids, $products);
    if (!empty($missing_products)) {
        $products += VNSEEA_GetMessageProductsBatch($missing_products);
    }
    $addresses = array();
    if (!empty($address_ids)) {
        $address_query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_USER_ADDRESS . " WHERE `id` IN (" . implode(',', $address_ids) . ")"
        );
        if ($address_query) {
            while ($address = mysqli_fetch_assoc($address_query)) {
                $addresses[(int)$address['id']] = $address;
            }
        }
    }

    $contexts = array();
    foreach ($orders_by_hash as $hash => $orders) {
        $first = $orders[0];
        if ($viewer_id !== (int)$first['user_id'] && $viewer_id !== (int)$first['product_owner_id']) {
            continue;
        }
        $address = !empty($addresses[(int)$first['address_id']]) ? $addresses[(int)$first['address_id']] : array();
        $address_parts = array();
        foreach (array('address', 'city', 'zip', 'country') as $field) {
            if (!empty($address[$field])) {
                $address_parts[] = trim(strip_tags((string)$address[$field]));
            }
        }
        $items = array();
        $total = 0;
        $total_points = 0;
        foreach ($orders as $order) {
            $product_id = (int)$order['product_id'];
            $product = !empty($products[$product_id]) ? $products[$product_id] : array();
            $line_total = (float)$order['price'];
            $line_points = isset($order['point']) ? max(0, (int)$order['point']) : 0;
            $total += $line_total;
            $total_points += $line_points;
            $line_price = VNSEEA_FormatMarketplaceContextMoney($line_total);
            if ($line_points > 0) {
                $line_price .= ' · ' . VNSEEA_FormatMarketplaceContextPoints($line_points);
            }
            $items[] = array(
                'product_id' => (string)$product_id,
                'name' => !empty($product['name']) ? $product['name'] : 'Sản phẩm #' . $product_id,
                'image' => !empty($product['images'][0]['image']) ? $product['images'][0]['image'] : '',
                'quantity' => max(1, (int)$order['units']),
                'total' => $line_price,
            );
        }
        $buyer = !empty($buyers[(int)$first['user_id']]) ? $buyers[(int)$first['user_id']] : array();
        $order_total = VNSEEA_FormatMarketplaceContextMoney($total);
        if ($total_points > 0) {
            $order_total .= ' · ' . VNSEEA_FormatMarketplaceContextPoints($total_points);
        }
        $contexts[$hash] = array(
            'type' => 'order_request',
            'order_hash' => $hash,
            'buyer_name' => !empty($buyer['name']) ? $buyer['name'] : (!empty($buyer['username']) ? $buyer['username'] : 'Người mua'),
            'buyer_phone' => !empty($address['phone']) ? (string)$address['phone'] : '',
            'buyer_address' => implode(', ', $address_parts),
            'items' => $items,
            'total' => $order_total,
        );
    }
    return $contexts;
}

function VNSEEA_GetFeedEventsBatch($event_ids, $known_users = array())
{
    global $wo, $sqlConnect;
    $event_ids = VNSEEA_NormalizeBatchIds($event_ids);
    if (empty($event_ids)) {
        return array();
    }
    $rows = array();
    $user_ids = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_EVENTS . " WHERE `id` IN (" . implode(',', $event_ids) . ")");
    if ($query) {
        while ($event = mysqli_fetch_assoc($query)) {
            $rows[(int)$event['id']] = $event;
            if (!empty($event['poster_id'])) {
                $user_ids[(int)$event['poster_id']] = (int)$event['poster_id'];
            }
        }
    }
    $users = $known_users;
    $missing = array_diff_key($user_ids, $users);
    if (!empty($missing)) {
        $users += VNSEEA_GetChatUsersBatch($missing);
    }
    $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
    foreach ($rows as $event_id => $event) {
        $poster_id = !empty($event['poster_id']) ? (int)$event['poster_id'] : 0;
        $event['user_data'] = !empty($users[$poster_id]) ? $users[$poster_id] : array();
        $event['cover'] = Wo_GetMedia((string)($event['cover'] ?? ''));
        $event['is_owner'] = $viewer_id > 0 && $viewer_id === $poster_id;
        $event['user_id'] = $poster_id;
        $event['start_edit_date'] = !empty($event['start_date']) ? date($event['start_date']) : '';
        $event['start_date_js'] = !empty($event['start_date']) ? date('m/d/y', strtotime($event['start_date'] . ($event['start_time'] ?? ''))) : '';
        $event['start_date'] = !empty($event['start_date']) ? date($wo['config']['date_style'], strtotime($event['start_date'] . ($event['start_time'] ?? ''))) : '';
        $event['end_edit_date'] = !empty($event['end_date']) ? date($event['end_date']) : '';
        $event['end_date'] = !empty($event['end_date']) ? date($wo['config']['date_style'], strtotime($event['end_date'])) : '';
        $event['url'] = Wo_SeoLink('index.php?link1=show-event&eid=' . $event_id);
        $rows[$event_id] = $event;
    }
    return $rows;
}

function VNSEEA_GetFeedJobsBatch($job_ids, $post_rows = array())
{
    global $wo, $sqlConnect;
    $job_ids = VNSEEA_NormalizeBatchIds($job_ids);
    if (empty($job_ids)) {
        return array();
    }
    $rows = array();
    $page_ids = array();
    $user_ids = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_JOB . " WHERE `id` IN (" . implode(',', $job_ids) . ")");
    if ($query) {
        while ($job = mysqli_fetch_assoc($query)) {
            $rows[(int)$job['id']] = $job;
            if (!empty($job['page_id'])) {
                $page_ids[(int)$job['page_id']] = (int)$job['page_id'];
            } elseif (!empty($job['user_id'])) {
                $user_ids[(int)$job['user_id']] = (int)$job['user_id'];
            }
        }
    }
    $pages = VNSEEA_GetChatPagesBatch($page_ids);
    $users = VNSEEA_GetChatUsersBatch($user_ids);
    $post_ids = array();
    $post_query = mysqli_query(
        $sqlConnect,
        "SELECT `job_id`, MIN(`id`) AS `post_id` FROM " . T_POSTS .
        " WHERE `job_id` IN (" . implode(',', $job_ids) . ") GROUP BY `job_id`"
    );
    if ($post_query) {
        while ($post = mysqli_fetch_assoc($post_query)) {
            $post_ids[(int)$post['job_id']] = (int)$post['post_id'];
        }
    }
    $apply = array();
    $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
    $apply_query = mysqli_query(
        $sqlConnect,
        "SELECT `job_id`, COUNT(`id`) AS `apply_count`, MAX(CASE WHEN `user_id` = {$viewer_id} THEN 1 ELSE 0 END) AS `viewer_applied`" .
        " FROM " . T_JOB_APPLY . " WHERE `job_id` IN (" . implode(',', $job_ids) . ") GROUP BY `job_id`"
    );
    if ($apply_query) {
        while ($item = mysqli_fetch_assoc($apply_query)) {
            $apply[(int)$item['job_id']] = $item;
        }
    }
    foreach ($rows as $job_id => $job) {
        $job = VNSEEA_HydrateJobCurrency($job);
        foreach (array('question_one_answers', 'question_two_answers', 'question_three_answers') as $field) {
            if (!empty($job[$field])) {
                $job[$field] = json_decode($job[$field], true);
            }
        }
        $page_id = !empty($job['page_id']) ? (int)$job['page_id'] : 0;
        $user_id = !empty($job['user_id']) ? (int)$job['user_id'] : 0;
        $job['page'] = $page_id > 0 && !empty($pages[$page_id]) ? $pages[$page_id] : '';
        if ($page_id < 1) {
            $job['user'] = !empty($users[$user_id]) ? $users[$user_id] : array();
        }
        $job['apply'] = !empty($apply[$job_id]['viewer_applied']);
        $job['apply_count'] = !empty($apply[$job_id]['apply_count']) ? (int)$apply[$job_id]['apply_count'] : 0;
        $job['post_id'] = !empty($post_ids[$job_id]) ? $post_ids[$job_id] : 0;
        $job['url'] = Wo_SeoLink('index.php?link1=post&id=' . $job['post_id']);
        $rows[$job_id] = $job;
    }
    return $rows;
}

function VNSEEA_GetFeedOffersBatch($offer_ids, $post_rows = array())
{
    global $wo, $sqlConnect;
    $offer_ids = VNSEEA_NormalizeBatchIds($offer_ids);
    if (empty($offer_ids)) {
        return array();
    }
    $rows = array();
    $page_ids = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_OFFER . " WHERE `id` IN (" . implode(',', $offer_ids) . ")");
    if ($query) {
        while ($offer = mysqli_fetch_assoc($query)) {
            $rows[(int)$offer['id']] = $offer;
            if (!empty($offer['page_id'])) {
                $page_ids[(int)$offer['page_id']] = (int)$offer['page_id'];
            }
        }
    }
    $pages = VNSEEA_GetChatPagesBatch($page_ids);
    $post_ids = array();
    $post_query = mysqli_query(
        $sqlConnect,
        "SELECT `offer_id`, MIN(`id`) AS `post_id` FROM " . T_POSTS .
        " WHERE `offer_id` IN (" . implode(',', $offer_ids) . ") GROUP BY `offer_id`"
    );
    if ($post_query) {
        while ($post = mysqli_fetch_assoc($post_query)) {
            $post_ids[(int)$post['offer_id']] = (int)$post['post_id'];
        }
    }
    foreach ($rows as $offer_id => $offer) {
        $page_id = !empty($offer['page_id']) ? (int)$offer['page_id'] : 0;
        $offer['page'] = !empty($pages[$page_id]) ? $pages[$page_id] : array();
        $offer['image'] = Wo_GetMedia((string)($offer['image'] ?? ''));
        $offer['expire_date'] = !empty($offer['expire_date']) ? date($wo['config']['date_style'], strtotime($offer['expire_date'])) : '';
        $offer['offer_text'] = !empty($wo['lang']['free_shipping']) ? $wo['lang']['free_shipping'] : 'Free shipping';
        $currency = !empty($offer['currency']) && !empty($wo['currencies'][$offer['currency']]['symbol']) ? $wo['currencies'][$offer['currency']]['symbol'] : '$';
        $offer['currency'] = $currency;
        if (($offer['discount_type'] ?? '') === 'discount_percent' && !empty($offer['discount_percent'])) {
            $offer['offer_text'] = $offer['discount_percent'] . '% Off';
        } elseif (($offer['discount_type'] ?? '') === 'discount_amount' && !empty($offer['discount_amount'])) {
            $offer['offer_text'] = $offer['discount_amount'] . $currency . ' Off';
        } elseif (($offer['discount_type'] ?? '') === 'buy_get_discount' && !empty($offer['discount_percent']) && !empty($offer['buy']) && !empty($offer['get_price'])) {
            $offer['offer_text'] = ($wo['lang']['buy'] ?? 'Buy') . ' ' . $offer['buy'] . ' ' . ($wo['lang']['get'] ?? 'get') . ' ' . $offer['get_price'] . ' / %' . $offer['discount_percent'] . ' Off';
        } elseif (($offer['discount_type'] ?? '') === 'spend_get_off' && !empty($offer['spend']) && !empty($offer['amount_off'])) {
            $offer['offer_text'] = ($wo['lang']['spend'] ?? 'Spend') . ' ' . $offer['spend'] . $currency . ' ' . ($wo['lang']['get'] ?? 'get') . ' ' . $offer['amount_off'] . $currency . ' Off';
        }
        $offer['post_id'] = !empty($post_ids[$offer_id]) ? $post_ids[$offer_id] : 0;
        $offer['url'] = Wo_SeoLink('index.php?link1=post&id=' . $offer['post_id']);
        $rows[$offer_id] = $offer;
    }
    return $rows;
}

function VNSEEA_GetFeedBlogsBatch($blog_ids)
{
    global $wo, $sqlConnect;
    $blog_ids = VNSEEA_NormalizeBatchIds($blog_ids);
    if (empty($blog_ids)) {
        return array();
    }
    $active_sql = !empty($wo['config']['blog_approval']) && !Wo_IsAdmin() ? " AND `active` = '1'" : '';
    $rows = array();
    $user_ids = array();
    $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_BLOG . " WHERE `id` IN (" . implode(',', $blog_ids) . "){$active_sql}");
    if ($query) {
        while ($blog = mysqli_fetch_assoc($query)) {
            $rows[(int)$blog['id']] = $blog;
            if (!empty($blog['user'])) {
                $user_ids[(int)$blog['user']] = (int)$blog['user'];
            }
        }
    }
    $users = VNSEEA_GetChatUsersBatch($user_ids);
    $comments = array();
    $comment_query = mysqli_query(
        $sqlConnect,
        "SELECT `blog_id`, COUNT(`id`) AS `comment_count` FROM " . T_BLOG_COMM . " WHERE `blog_id` IN (" . implode(',', $blog_ids) . ") GROUP BY `blog_id`"
    );
    if ($comment_query) {
        while ($comment = mysqli_fetch_assoc($comment_query)) {
            $comments[(int)$comment['blog_id']] = (int)$comment['comment_count'];
        }
    }
    foreach ($rows as $blog_id => $blog) {
        $author_id = !empty($blog['user']) ? (int)$blog['user'] : 0;
        $blog['author'] = !empty($users[$author_id]) ? $users[$author_id] : array();
        $blog['thumbnail'] = Wo_GetMedia((string)($blog['thumbnail'] ?? ''));
        $blog['tags_array'] = @explode(',', (string)($blog['tags'] ?? ''));
        $slug = Wo_SlugPost((string)($blog['title'] ?? ''));
        $blog['url'] = !empty($wo['config']['useSeoFrindly'])
            ? Wo_SeoLink('index.php?link1=read-blog&id=' . $blog_id . '_' . $slug)
            : Wo_SeoLink('index.php?link1=read-blog&id=' . $blog_id);
        $blog['comments_count'] = !empty($comments[$blog_id]) ? $comments[$blog_id] : 0;
        $blog['category_link'] = Wo_SeoLink('index.php?link1=blog-category&id=' . ($blog['category'] ?? 0));
        $blog['category_name'] = !empty($wo['blog_categories'][$blog['category']]) ? $wo['blog_categories'][$blog['category']] : '';
        $blog['is_post_admin'] = !empty($wo['user']['user_id']) && $author_id === (int)$wo['user']['user_id'];
        $rows[$blog_id] = $blog;
    }
    return $rows;
}

function VNSEEA_GetFeedFundingBatch($fund_ids, $raise_ids, $post_rows = array())
{
    global $wo, $sqlConnect;
    $fund_ids = VNSEEA_NormalizeBatchIds($fund_ids);
    $raise_ids = VNSEEA_NormalizeBatchIds($raise_ids);
    $funds = array();
    $raises = array();
    $needed_fund_ids = $fund_ids;
    if (!empty($raise_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_FUNDING_RAISE . " WHERE `id` IN (" . implode(',', $raise_ids) . ")");
        if ($query) {
            while ($raise = mysqli_fetch_assoc($query)) {
                $raises[(int)$raise['id']] = $raise;
                if (!empty($raise['funding_id'])) {
                    $needed_fund_ids[(int)$raise['funding_id']] = (int)$raise['funding_id'];
                }
            }
        }
    }
    if (!empty($needed_fund_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_FUNDING . " WHERE `id` IN (" . implode(',', $needed_fund_ids) . ")");
        if ($query) {
            while ($fund = mysqli_fetch_assoc($query)) {
                $funds[(int)$fund['id']] = $fund;
            }
        }
    }
    $aggregates = array();
    if (!empty($needed_fund_ids)) {
        $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `funding_id`, COALESCE(SUM(`amount`), 0) AS `raised`, COUNT(`id`) AS `all_donation`," .
            " MAX(CASE WHEN `user_id` = {$viewer_id} THEN 1 ELSE 0 END) AS `is_donate` FROM " . T_FUNDING_RAISE .
            " WHERE `funding_id` IN (" . implode(',', $needed_fund_ids) . ") GROUP BY `funding_id`"
        );
        if ($query) {
            while ($aggregate = mysqli_fetch_assoc($query)) {
                $aggregates[(int)$aggregate['funding_id']] = $aggregate;
            }
        }
    }
    $user_ids = array();
    foreach ($funds as $fund) {
        if (!empty($fund['user_id'])) {
            $user_ids[(int)$fund['user_id']] = (int)$fund['user_id'];
        }
    }
    foreach ($raises as $raise) {
        if (!empty($raise['user_id'])) {
            $user_ids[(int)$raise['user_id']] = (int)$raise['user_id'];
        }
    }
    $users = VNSEEA_GetChatUsersBatch($user_ids);
    foreach ($funds as $fund_id => $fund) {
        $aggregate = !empty($aggregates[$fund_id]) ? $aggregates[$fund_id] : array();
        $fund['image'] = Wo_GetMedia((string)($fund['image'] ?? ''));
        $fund['raised'] = !empty($aggregate['raised']) ? (float)$aggregate['raised'] : 0;
        $fund['all_donation'] = !empty($aggregate['all_donation']) ? (int)$aggregate['all_donation'] : 0;
        $fund['is_donate'] = !empty($aggregate['is_donate']) ? 1 : 0;
        $amount = !empty($fund['amount']) ? (float)$fund['amount'] : 0;
        $fund['bar'] = $amount > 0 ? min(100, ($fund['raised'] * 100) / $amount) : 0;
        $fund['user_data'] = !empty($users[(int)$fund['user_id']]) ? $users[(int)$fund['user_id']] : array();
        $funds[$fund_id] = $fund;
    }
    foreach ($raises as $raise_id => $raise) {
        $raise['user_data'] = !empty($users[(int)$raise['user_id']]) ? $users[(int)$raise['user_id']] : array();
        $raise['fund'] = !empty($funds[(int)$raise['funding_id']]) ? $funds[(int)$raise['funding_id']] : array();
        $raises[$raise_id] = $raise;
    }
    return array('funds' => $funds, 'raises' => $raises);
}

function VNSEEA_GetFeedForumBatch($forum_ids, $thread_ids)
{
    global $sqlConnect;
    $forum_ids = VNSEEA_NormalizeBatchIds($forum_ids);
    $thread_ids = VNSEEA_NormalizeBatchIds($thread_ids);
    $forums = array();
    if (!empty($forum_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_FORUMS . " WHERE `id` IN (" . implode(',', $forum_ids) . ")");
        if ($query) {
            while ($forum = mysqli_fetch_assoc($query)) {
                $forum['name_lang'] = Wo_ReplaceText($forum['name']);
                $forum['description_lang'] = Wo_ReplaceText($forum['description']);
                if (strlen($forum['description']) > 200) {
                    $forum['description'] = substr($forum['description'], 0, 200) . '...';
                }
                $forums[(int)$forum['id']] = $forum;
            }
        }
    }
    $threads = array();
    $user_ids = array();
    if (!empty($thread_ids)) {
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_FORUM_THREADS . " WHERE `posted` > 0 AND `id` IN (" . implode(',', $thread_ids) . ")");
        if ($query) {
            while ($thread = mysqli_fetch_assoc($query)) {
                $threads[(int)$thread['id']] = $thread;
                if (!empty($thread['user'])) {
                    $user_ids[(int)$thread['user']] = (int)$thread['user'];
                }
            }
        }
    }
    $users = VNSEEA_GetChatUsersBatch($user_ids);
    foreach ($threads as $thread_id => $thread) {
        $thread['user_data'] = !empty($users[(int)$thread['user']]) ? $users[(int)$thread['user']] : array();
        $thread['url'] = Wo_SeoLink('index.php?link1=showthread&tid=' . $thread_id);
        $thread['author_url'] = !empty($thread['user_data']['username']) ? Wo_SeoLink('index.php?link1=timeline&u=' . $thread['user_data']['username']) : '';
        $thread['orginal_headline'] = $thread['headline'];
        $thread['headline'] = Wo_GetShortTitle($thread['headline'], true);
        $thread['edit_url'] = Wo_SeoLink('index.php?link1=edithread&tid=' . $thread_id);
        $threads[$thread_id] = $thread;
    }
    return array('forums' => $forums, 'threads' => $threads);
}

function VNSEEA_GetPostAlbumNavigationBatch($rows)
{
    global $sqlConnect;
    $post_ids = VNSEEA_NormalizeBatchIds(array_keys((array)$rows));
    $navigation = array();
    foreach ($post_ids as $post_id) {
        $navigation[$post_id] = array('have_next_image' => true, 'have_pre_image' => true);
    }
    if (empty($post_ids)) {
        return $navigation;
    }
    $query = mysqli_query(
        $sqlConnect,
        "SELECT `post_id`, `parent_id` FROM " . T_ALBUMS_MEDIA . " WHERE `post_id` IN (" . implode(',', $post_ids) . ") AND `parent_id` <> 0 ORDER BY `parent_id`, `post_id`"
    );
    $by_parent = array();
    if ($query) {
        while ($item = mysqli_fetch_assoc($query)) {
            $by_parent[(int)$item['parent_id']][] = (int)$item['post_id'];
        }
    }
    foreach ($by_parent as $parent_posts) {
        $unique = array_values(array_unique($parent_posts));
        sort($unique, SORT_NUMERIC);
        $last = count($unique) - 1;
        foreach ($unique as $index => $post_id) {
            if (!isset($navigation[$post_id])) {
                continue;
            }
            $navigation[$post_id]['have_next_image'] = $index > 0;
            $navigation[$post_id]['have_pre_image'] = $index < $last;
        }
    }
    return $navigation;
}

function VNSEEA_GetLiveSubscriberCountsBatch($post_ids)
{
    global $sqlConnect;
    $post_ids = VNSEEA_NormalizeBatchIds($post_ids);
    if (empty($post_ids)) {
        return array();
    }
    $counts = array();
    $query = mysqli_query(
        $sqlConnect,
        "SELECT `post_id`, COUNT(`id`) AS `subscriber_count` FROM " . T_LIVE_SUB . " WHERE `post_id` IN (" . implode(',', $post_ids) . ") AND `time` >= " . (time() - 6) . " GROUP BY `post_id`"
    );
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $counts[(int)$row['post_id']] = (int)$row['subscriber_count'];
        }
    }
    return $counts;
}

function VNSEEA_GetPaidPublisherIdsBatch($publisher_ids, $viewer_id)
{
    global $sqlConnect;
    $publisher_ids = VNSEEA_NormalizeBatchIds($publisher_ids);
    $viewer_id = (int)$viewer_id;
    if (empty($publisher_ids) || $viewer_id < 1) {
        return array();
    }
    $paid = array();
    $query = mysqli_query(
        $sqlConnect,
        "SELECT m.`user_id`, s.`last_payment_date`, m.`paid_every` FROM " . T_MONETIZATION_SUBSCRIBTION . " s" .
        " INNER JOIN " . T_USER_MONETIZATION . " m ON m.`id` = s.`monetization_id`" .
        " WHERE s.`user_id` = {$viewer_id} AND s.`status` = 1 AND m.`status` = 1 AND m.`user_id` IN (" . implode(',', $publisher_ids) . ")"
    );
    if ($query) {
        while ($row = mysqli_fetch_assoc($query)) {
            $expires = strtotime($row['last_payment_date']) + ((int)$row['paid_every'] * 86400);
            if ($expires >= time()) {
                $paid[(int)$row['user_id']] = true;
            }
        }
    }
    return $paid;
}

function VNSEEA_PrimePostTypedDataBatch($rows, $publishers = array())
{
    global $wo;
    $ids = array(
        'product' => array(), 'event' => array(), 'job' => array(), 'offer' => array(),
        'blog' => array(), 'fund' => array(), 'raise' => array(), 'forum' => array(), 'thread' => array(),
        'live_posts' => array(), 'paid_publishers' => array(),
    );
    foreach ((array)$rows as $post) {
        foreach (array(
            'product_id' => 'product', 'page_event_id' => 'event', 'event_id' => 'event',
            'job_id' => 'job', 'offer_id' => 'offer', 'blog_id' => 'blog', 'fund_id' => 'fund',
            'fund_raise_id' => 'raise', 'forum_id' => 'forum', 'thread_id' => 'thread',
        ) as $field => $bucket) {
            if (!empty($post[$field])) {
                $ids[$bucket][(int)$post[$field]] = (int)$post[$field];
            }
        }
        if (!empty($post['stream_name']) && !empty($post['live_time']) && empty($post['live_ended'])) {
            $ids['live_posts'][(int)$post['id']] = (int)$post['id'];
        }
        if ((int)($post['postPrivacy'] ?? 0) === 6 && !empty($post['user_id'])) {
            $ids['paid_publishers'][(int)$post['user_id']] = (int)$post['user_id'];
        }
    }
    $funding = VNSEEA_GetFeedFundingBatch($ids['fund'], $ids['raise'], $rows);
    $forums = VNSEEA_GetFeedForumBatch($ids['forum'], $ids['thread']);
    $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
    return array(
        'products' => VNSEEA_GetMessageProductsBatch($ids['product']),
        'events' => VNSEEA_GetFeedEventsBatch($ids['event'], $publishers['users'] ?? array()),
        'jobs' => VNSEEA_GetFeedJobsBatch($ids['job'], $rows),
        'offers' => VNSEEA_GetFeedOffersBatch($ids['offer'], $rows),
        'blogs' => VNSEEA_GetFeedBlogsBatch($ids['blog']),
        'funds' => $funding['funds'],
        'raises' => $funding['raises'],
        'forums' => $forums['forums'],
        'threads' => $forums['threads'],
        'live_counts' => VNSEEA_GetLiveSubscriberCountsBatch($ids['live_posts']),
        'album_navigation' => VNSEEA_GetPostAlbumNavigationBatch($rows),
        'paid_publishers' => VNSEEA_GetPaidPublisherIdsBatch($ids['paid_publishers'], $viewer_id),
    );
}

function VNSEEA_PrimeCanonicalMessageContextsBatch($messages)
{
    global $wo, $sqlConnect;
    $messages = array_values(array_filter((array)$messages, 'is_array'));
    if (empty($messages)) {
        return array();
    }
    $user_ids = array();
    $product_ids = array();
    $order_hashes = array();
    $reply_ids = array();
    $story_ids = array();
    $hashtag_ids = array();
    foreach ($messages as $message) {
        if (!empty($message['from_id'])) {
            $user_ids[(int)$message['from_id']] = (int)$message['from_id'];
        }
        if (!empty($message['product_id'])) {
            $product_ids[(int)$message['product_id']] = (int)$message['product_id'];
        }
        if (!empty($message['market_order_hash'])) {
            $order_hashes[(string)$message['market_order_hash']] = (string)$message['market_order_hash'];
        }
        if (!empty($message['reply_id'])) {
            $reply_ids[(int)$message['reply_id']] = (int)$message['reply_id'];
        }
        if (!empty($message['story_id'])) {
            $story_ids[(int)$message['story_id']] = (int)$message['story_id'];
        }
        if (!empty($message['text'])) {
            if (preg_match_all('/@\[([0-9]+)\]/i', $message['text'], $mentions)) {
                foreach ($mentions[1] as $mention_id) {
                    $user_ids[(int)$mention_id] = (int)$mention_id;
                }
            }
            if (preg_match_all('/#\[([0-9]+)\]/i', $message['text'], $hashtags)) {
                foreach ($hashtags[1] as $hashtag_id) {
                    $hashtag_ids[(int)$hashtag_id] = (int)$hashtag_id;
                }
            }
        }
    }
    $existing = !empty($GLOBALS['vnseea_message_batch_context']) && is_array($GLOBALS['vnseea_message_batch_context'])
        ? $GLOBALS['vnseea_message_batch_context']
        : array();
    $users = !empty($existing['users']) ? $existing['users'] : array();
    $products = !empty($existing['products']) ? $existing['products'] : array();
    $orders = !empty($existing['orders']) ? $existing['orders'] : array();
    $stories = !empty($existing['stories']) ? $existing['stories'] : array();
    $context_hashtags = !empty($existing['hashtags']) ? $existing['hashtags'] : array();
    $replies = !empty($existing['replies']) ? $existing['replies'] : array();
    $loaded = !empty($existing['loaded']) && is_array($existing['loaded']) ? $existing['loaded'] : array();
    foreach (array('users', 'products', 'orders', 'stories', 'hashtags', 'replies') as $bucket) {
        if (empty($loaded[$bucket]) || !is_array($loaded[$bucket])) {
            $loaded[$bucket] = array();
        }
    }
    foreach (array(
        'users' => $users,
        'products' => $products,
        'orders' => $orders,
        'stories' => $stories,
        'hashtags' => $context_hashtags,
        'replies' => $replies,
    ) as $bucket => $values) {
        foreach (array_keys($values) as $key) {
            $loaded[$bucket][$key] = true;
        }
    }
    $missing_reply_ids = array_diff_key($reply_ids, $loaded['replies']);
    $raw_replies = array();
    if (!empty($missing_reply_ids)) {
        $reply_query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_MESSAGES . " WHERE `id` IN (" . implode(',', $missing_reply_ids) . ")"
        );
        if ($reply_query) {
            while ($reply = mysqli_fetch_assoc($reply_query)) {
                $reply_id = (int)$reply['id'];
                $raw_replies[$reply_id] = $reply;
                if (!empty($reply['from_id'])) {
                    $user_ids[(int)$reply['from_id']] = (int)$reply['from_id'];
                }
                if (!empty($reply['product_id'])) {
                    $product_ids[(int)$reply['product_id']] = (int)$reply['product_id'];
                }
                if (!empty($reply['market_order_hash'])) {
                    $order_hashes[(string)$reply['market_order_hash']] = (string)$reply['market_order_hash'];
                }
                if (!empty($reply['story_id'])) {
                    $story_ids[(int)$reply['story_id']] = (int)$reply['story_id'];
                }
                if (!empty($reply['text'])) {
                    if (preg_match_all('/@\[([0-9]+)\]/i', $reply['text'], $mentions)) {
                        foreach ($mentions[1] as $mention_id) {
                            $user_ids[(int)$mention_id] = (int)$mention_id;
                        }
                    }
                    if (preg_match_all('/#\[([0-9]+)\]/i', $reply['text'], $hashtags)) {
                        foreach ($hashtags[1] as $hashtag_id) {
                            $hashtag_ids[(int)$hashtag_id] = (int)$hashtag_id;
                        }
                    }
                }
            }
        }
    }
    $missing_users = array_diff_key($user_ids, $loaded['users']);
    $missing_products = array_diff_key($product_ids, $loaded['products']);
    $missing_orders = array_diff_key($order_hashes, $loaded['orders']);
    if (!empty($missing_users)) {
        $users += VNSEEA_GetChatUsersBatch($missing_users);
    }
    if (!empty($missing_products)) {
        $products += VNSEEA_GetMessageProductsBatch($missing_products);
    }
    if (!empty($missing_orders)) {
        $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
        $orders += VNSEEA_GetMarketplaceOrderContextsBatch($missing_orders, $viewer_id, $products);
    }
    $missing_stories = array_diff_key($story_ids, $loaded['stories']);
    if (!empty($missing_stories)) {
        $viewer_id = !empty($wo['user']['user_id']) ? (int)$wo['user']['user_id'] : 0;
        $stories += VNSEEA_GetMessageStoriesBatch($missing_stories, $viewer_id, $users);
    }
    $missing_hashtags = array_diff_key($hashtag_ids, $loaded['hashtags']);
    if (!empty($missing_hashtags)) {
        $hashtag_query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_HASHTAGS . " WHERE `id` IN (" . implode(',', $missing_hashtags) . ")"
        );
        if ($hashtag_query) {
            while ($hashtag = mysqli_fetch_assoc($hashtag_query)) {
                $context_hashtags[(int)$hashtag['id']] = $hashtag;
            }
        }
    }
    foreach (array(
        'users' => $user_ids,
        'products' => $product_ids,
        'orders' => $order_hashes,
        'stories' => $story_ids,
        'hashtags' => $hashtag_ids,
        'replies' => $reply_ids,
    ) as $bucket => $values) {
        foreach ($values as $key) {
            $loaded[$bucket][$key] = true;
        }
    }
    $GLOBALS['vnseea_message_batch_context'] = array(
        'active' => true,
        'users' => $users,
        'products' => $products,
        'orders' => $orders,
        'stories' => $stories,
        'hashtags' => $context_hashtags,
        'replies' => $replies,
        'loaded' => $loaded,
    );
    if (!empty($raw_replies)) {
        $reaction_summaries = VNSEEA_GetMessageReactionSummariesBatch(array_keys($raw_replies));
        $message_flags = array();
        $flag_query = mysqli_query(
            $sqlConnect,
            "SELECT `message_id`, MAX(`pin` = 'yes') AS `pin_yes`, MAX(`fav` = 'yes') AS `fav_yes`" .
            " FROM " . T_MUTE . " WHERE `user_id` = " . (int)$wo['user']['user_id'] .
            " AND `message_id` IN (" . implode(',', array_keys($raw_replies)) . ") GROUP BY `message_id`"
        );
        if ($flag_query) {
            while ($flag = mysqli_fetch_assoc($flag_query)) {
                $message_flags[(int)$flag['message_id']] = $flag;
            }
        }
        foreach ($raw_replies as $reply_id => $reply) {
            $sender_id = (int)$reply['from_id'];
            $reply['messageUser'] = !empty($users[$sender_id]) ? $users[$sender_id] : array();
            $reply['or_text'] = $reply['text'];
            $reply['text'] = Wo_Emo(Wo_Markup($reply['text']));
            $reply['onwer'] = $sender_id === (int)$wo['user']['user_id'] ? 1 : 0;
            if (!empty($reply['stickers']) && !Wo_IsUrl($reply['stickers'])) {
                $reply['stickers'] = Wo_GetMedia($reply['stickers']);
            }
            $reply['reaction'] = !empty($reaction_summaries[$reply_id])
                ? $reaction_summaries[$reply_id]
                : VNSEEA_EmptyMessageReactionSummary();
            $reply['pin'] = !empty($message_flags[$reply_id]['pin_yes']) ? 'yes' : 'no';
            $reply['fav'] = !empty($message_flags[$reply_id]['fav_yes']) ? 'yes' : 'no';
            $replies[$reply_id] = VNSEEA_AttachCanonicalMessageContext($reply);
        }
        $GLOBALS['vnseea_message_batch_context']['replies'] = $replies;
    }
    return $GLOBALS['vnseea_message_batch_context'];
}
