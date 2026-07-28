<?php

if (!function_exists('VNSEEA_NormalizeTaggedUserIds')) {
    function VNSEEA_NormalizeTaggedUserIds($value)
    {
        if ($value === null || $value === '' || $value === array()) {
            return array('valid' => true, 'ids' => array(), 'error_code' => null);
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (!is_array($decoded)) {
                return array('valid' => false, 'ids' => array(), 'error_code' => 'tagged_users_invalid');
            }
            $value = $decoded;
        }
        if (!is_array($value)) {
            return array('valid' => false, 'ids' => array(), 'error_code' => 'tagged_users_invalid');
        }
        if (count($value) > 20) {
            return array('valid' => false, 'ids' => array(), 'error_code' => 'tagged_users_limit');
        }

        $ids = array();
        $seen = array();
        foreach ($value as $candidate) {
            if (is_int($candidate)) {
                $normalized = $candidate;
            } elseif (is_string($candidate) && preg_match('/^[1-9][0-9]*$/', $candidate)) {
                $normalized = (int) $candidate;
            } else {
                return array('valid' => false, 'ids' => array(), 'error_code' => 'tagged_users_invalid');
            }
            if ($normalized < 1) {
                return array('valid' => false, 'ids' => array(), 'error_code' => 'tagged_users_invalid');
            }
            if (!isset($seen[$normalized])) {
                $seen[$normalized] = true;
                $ids[] = $normalized;
            }
        }

        return array('valid' => true, 'ids' => $ids, 'error_code' => null);
    }
}

if (!function_exists('VNSEEA_CanTagUserForPostRequest')) {
    function VNSEEA_CanTagUserForPostRequest($actor_id, $target_id, $request)
    {
        global $sqlConnect;

        $actor_id = (int) $actor_id;
        $target_id = (int) $target_id;
        if ($actor_id < 1 || $target_id < 1 || $actor_id === $target_id) {
            return false;
        }
        if (!function_exists('Wo_IsFollowing') || Wo_IsFollowing($target_id, $actor_id) !== true) {
            return false;
        }

        $target_query = mysqli_query(
            $sqlConnect,
            'SELECT `user_id` FROM ' . T_USERS .
            " WHERE `user_id` = {$target_id} AND `active` = '1' AND `banned` = '0' LIMIT 1"
        );
        if (!$target_query || mysqli_num_rows($target_query) !== 1) {
            return false;
        }

        $request = is_array($request) ? $request : array();
        $privacy = function_exists('VNSEEA_NormalizePostPrivacyRequest')
            ? VNSEEA_NormalizePostPrivacyRequest($request)
            : array('postPrivacy' => isset($request['postPrivacy']) ? (int) $request['postPrivacy'] : 0);
        if ((int) $privacy['postPrivacy'] === 3) {
            return false;
        }

        $page_id = !empty($request['page_id']) ? (int) $request['page_id'] : 0;
        $group_id = !empty($request['group_id']) ? (int) $request['group_id'] : 0;
        $event_id = !empty($request['event_id']) ? (int) $request['event_id'] : 0;

        if ($group_id > 0) {
            $group = function_exists('Wo_GroupData') ? Wo_GroupData($group_id) : array();
            if (empty($group['id'])) {
                return false;
            }
            if (!empty($group['user_id']) && (int) $group['user_id'] === $target_id) {
                return true;
            }
            return function_exists('Wo_IsGroupJoined') && Wo_IsGroupJoined($group_id, $target_id) === true;
        }

        if ($page_id > 0) {
            $page = function_exists('Wo_PageData') ? Wo_PageData($page_id) : array();
            if (empty($page['page_id']) && empty($page['id'])) {
                return false;
            }
            if (!empty($page['user_id']) && (int) $page['user_id'] === $target_id) {
                return true;
            }
            if ((int) $privacy['postPrivacy'] === 2) {
                return function_exists('Wo_IsPageLiked') && Wo_IsPageLiked($page_id, $target_id) === true;
            }
            return (int) $privacy['postPrivacy'] === 0;
        }

        if ($event_id > 0) {
            return function_exists('VNSEEA_CanAccessEvent') && VNSEEA_CanAccessEvent($event_id, $target_id);
        }

        return function_exists('VNSEEA_CanViewPersonalAudience')
            && VNSEEA_CanViewPersonalAudience((int) $privacy['postPrivacy'], $actor_id, $target_id);
    }
}

if (!function_exists('VNSEEA_SavePostTaggedUsers')) {
    function VNSEEA_SavePostTaggedUsers($post_id, $actor_id, $tagged_user_ids)
    {
        global $sqlConnect;

        $post_id = (int) $post_id;
        $actor_id = (int) $actor_id;
        $normalized = VNSEEA_NormalizeTaggedUserIds($tagged_user_ids);
        if (!$normalized['valid'] || $post_id < 1 || $actor_id < 1) {
            return false;
        }
        if (empty($normalized['ids'])) {
            return true;
        }

        $post_query = mysqli_query($sqlConnect, 'SELECT * FROM ' . T_POSTS . " WHERE `id` = {$post_id} LIMIT 1");
        if (!$post_query || mysqli_num_rows($post_query) !== 1) {
            return false;
        }
        $post = mysqli_fetch_assoc($post_query);

        foreach ($normalized['ids'] as $target_id) {
            if (!VNSEEA_CanTagUserForPostRequest($actor_id, $target_id, $post)) {
                return false;
            }
        }

        $created_at = time();
        foreach ($normalized['ids'] as $target_id) {
            $insert = mysqli_query(
                $sqlConnect,
                'INSERT INTO ' . T_POST_TAGGED_USERS .
                " (`post_id`, `user_id`, `tagged_by`, `created_at`) VALUES ({$post_id}, {$target_id}, {$actor_id}, {$created_at})" .
                ' ON DUPLICATE KEY UPDATE `tagged_by` = VALUES(`tagged_by`), `created_at` = VALUES(`created_at`)'
            );
            if (!$insert) {
                return false;
            }
        }
        return true;
    }
}

if (!function_exists('VNSEEA_GetPostTaggedUsers')) {
    function VNSEEA_GetPostTaggedUsers($post_id)
    {
        global $sqlConnect;

        $post_id = (int) $post_id;
        if ($post_id < 1) {
            return array();
        }
        $query = mysqli_query(
            $sqlConnect,
            'SELECT u.`user_id`, u.`username`, u.`first_name`, u.`last_name`, u.`avatar` ' .
            'FROM ' . T_POST_TAGGED_USERS . ' t ' .
            'INNER JOIN ' . T_USERS . ' u ON u.`user_id` = t.`user_id` ' .
            "WHERE t.`post_id` = {$post_id} AND u.`active` = '1' AND u.`banned` = '0' " .
            'ORDER BY t.`id` ASC'
        );
        if (!$query) {
            return array();
        }

        $users = array();
        while ($user = mysqli_fetch_assoc($query)) {
            $name = trim($user['first_name'] . ' ' . $user['last_name']);
            if ($name === '') {
                $name = $user['username'];
            }
            $users[] = array(
                'user_id' => (string) $user['user_id'],
                'name' => $name,
                'username' => $user['username'],
                'avatar' => function_exists('Wo_GetMedia') ? Wo_GetMedia($user['avatar']) : $user['avatar']
            );
        }
        return $users;
    }
}

if (!function_exists('VNSEEA_SearchTaggableUsers')) {
    function VNSEEA_SearchTaggableUsers($actor_id, $request)
    {
        global $sqlConnect;

        $actor_id = (int) $actor_id;
        $request = is_array($request) ? $request : array();
        $limit = isset($request['limit']) ? (int) $request['limit'] : 20;
        $limit = max(1, min(20, $limit));
        $cursor = !empty($request['cursor']) && ctype_digit((string) $request['cursor'])
            ? (int) $request['cursor']
            : 0;
        $query_text = isset($request['query']) ? trim((string) $request['query']) : '';
        $explicit = VNSEEA_NormalizeTaggedUserIds(isset($request['user_ids']) ? $request['user_ids'] : array());
        if (!$explicit['valid']) {
            return array('valid' => false, 'error_code' => $explicit['error_code'], 'data' => array());
        }

        $conditions = array(
            "u.`active` = '1'",
            "u.`banned` = '0'",
            "u.`user_id` <> {$actor_id}",
            "f.`follower_id` = {$actor_id}",
            "f.`active` = '1'"
        );
        if (!empty($explicit['ids'])) {
            $conditions[] = 'u.`user_id` IN (' . implode(',', $explicit['ids']) . ')';
        } elseif ($cursor > 0) {
            $conditions[] = "u.`user_id` > {$cursor}";
        }
        if ($query_text !== '') {
            $safe_query = Wo_Secure($query_text);
            $conditions[] = "(u.`username` LIKE '%{$safe_query}%' OR u.`first_name` LIKE '%{$safe_query}%' OR u.`last_name` LIKE '%{$safe_query}%' OR CONCAT(u.`first_name`, ' ', u.`last_name`) LIKE '%{$safe_query}%')";
        }
        $conditions[] = 'NOT EXISTS (SELECT 1 FROM ' . T_BLOCKS . " b WHERE (b.`blocker` = {$actor_id} AND b.`blocked` = u.`user_id`) OR (b.`blocked` = {$actor_id} AND b.`blocker` = u.`user_id`))";

        $fetch_limit = !empty($explicit['ids']) ? count($explicit['ids']) : max(60, $limit * 4);
        $sql = 'SELECT DISTINCT u.`user_id`, u.`username`, u.`first_name`, u.`last_name`, u.`avatar` ' .
            'FROM ' . T_USERS . ' u INNER JOIN ' . T_FOLLOWERS . ' f ON f.`following_id` = u.`user_id` ' .
            'WHERE ' . implode(' AND ', $conditions) .
            ' ORDER BY u.`user_id` ASC LIMIT ' . (int) $fetch_limit;
        $query = mysqli_query($sqlConnect, $sql);
        if (!$query) {
            return array('valid' => false, 'error_code' => 'taggable_users_failed', 'data' => array());
        }

        $candidate_count = mysqli_num_rows($query);
        $data = array();
        $last_scanned_id = $cursor;
        while ($candidate = mysqli_fetch_assoc($query)) {
            $target_id = (int) $candidate['user_id'];
            $last_scanned_id = max($last_scanned_id, $target_id);
            if (!VNSEEA_CanTagUserForPostRequest($actor_id, $target_id, $request)) {
                continue;
            }
            $name = trim($candidate['first_name'] . ' ' . $candidate['last_name']);
            $data[] = array(
                'user_id' => (string) $target_id,
                'name' => $name !== '' ? $name : $candidate['username'],
                'username' => $candidate['username'],
                'avatar' => function_exists('Wo_GetMedia') ? Wo_GetMedia($candidate['avatar']) : $candidate['avatar']
            );
            if (empty($explicit['ids']) && count($data) > $limit) {
                break;
            }
        }

        $has_extra_result = count($data) > $limit;
        $has_more = empty($explicit['ids'])
            && ($has_extra_result || $candidate_count >= $fetch_limit);
        if ($has_extra_result) {
            $data = array_slice($data, 0, $limit);
            $last = end($data);
            $last_scanned_id = !empty($last['user_id']) ? (int) $last['user_id'] : $last_scanned_id;
        }

        if (!empty($explicit['ids'])) {
            $order = array_flip(array_map('strval', $explicit['ids']));
            usort($data, function ($left, $right) use ($order) {
                return $order[(string) $left['user_id']] - $order[(string) $right['user_id']];
            });
        }

        return array(
            'valid' => true,
            'error_code' => null,
            'data' => $data,
            'next_cursor' => $has_more ? (string) $last_scanned_id : null,
            'has_more' => $has_more
        );
    }
}

if (!function_exists('VNSEEA_NotifyPostTaggedUsers')) {
    function VNSEEA_NotifyPostTaggedUsers($post_id, $actor_id, $tagged_user_ids)
    {
        global $sqlConnect;

        $post_id = (int) $post_id;
        $actor_id = (int) $actor_id;
        $normalized = VNSEEA_NormalizeTaggedUserIds($tagged_user_ids);
        if (!$normalized['valid'] || empty($normalized['ids'])) {
            return 0;
        }

        $query = mysqli_query($sqlConnect, 'SELECT `postText`, `page_id` FROM ' . T_POSTS . " WHERE `id` = {$post_id} LIMIT 1");
        if (!$query || mysqli_num_rows($query) !== 1) {
            return 0;
        }
        $post = mysqli_fetch_assoc($query);
        $inline_mentions = array();
        if (preg_match_all('/@\[([0-9]+)\]/', isset($post['postText']) ? $post['postText'] : '', $matches)) {
            $inline_mentions = array_map('intval', $matches[1]);
        }

        $notified = 0;
        foreach ($normalized['ids'] as $target_id) {
            if ($target_id === $actor_id || in_array($target_id, $inline_mentions, true)) {
                continue;
            }
            $notification = array(
                'recipient_id' => $target_id,
                'page_id' => !empty($post['page_id']) ? (int) $post['page_id'] : 0,
                'type' => 'post_mention',
                'post_id' => $post_id,
                'url' => 'index.php?link1=post&id=' . $post_id
            );
            if (function_exists('Wo_RegisterNotification') && Wo_RegisterNotification($notification)) {
                $notified++;
            }
        }
        return $notified;
    }
}
