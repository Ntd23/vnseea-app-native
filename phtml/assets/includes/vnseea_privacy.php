<?php

function VNSEEA_PrivacyArray($value)
{
    if (is_object($value)) {
        return get_object_vars($value);
    }
    return is_array($value) ? $value : array();
}

function VNSEEA_CurrentViewerId($viewer_id = 0)
{
    global $wo;
    $viewer_id = (int) $viewer_id;
    if ($viewer_id < 1 && !empty($wo['loggedin']) && !empty($wo['user']['user_id'])) {
        $viewer_id = (int) $wo['user']['user_id'];
    }
    return $viewer_id;
}

function VNSEEA_IsAnonymousPost($post)
{
    $post = VNSEEA_PrivacyArray($post);
    return !empty($post['is_anonymous']) || (isset($post['postPrivacy']) && (int) $post['postPrivacy'] === 4);
}

function VNSEEA_NormalizePostPrivacyRequest($request)
{
    $request = VNSEEA_PrivacyArray($request);
    $has_contract = isset($request['privacy_contract']) && $request['privacy_contract'] === 'audience_v2';
    $privacy = isset($request['postPrivacy']) ? (int) $request['postPrivacy'] : 0;
    $anonymous = $has_contract && !empty($request['is_anonymous']) ? 1 : 0;

    if ($privacy === 4) {
        $privacy = 0;
        $anonymous = 1;
    }
    if (!$has_contract && isset($request['postType']) && strtolower((string) $request['postType']) === 'reel' && $privacy === 2) {
        $privacy = 3;
    }
    if (!in_array($privacy, array(0, 1, 2, 3, 5, 6), true)) {
        $privacy = 0;
    }

    return VNSEEA_ApplyPostContextPrivacy(array(
        'postPrivacy' => $privacy,
        'is_anonymous' => $anonymous,
        'privacy_contract' => 'audience_v2'
    ), $request);
}

function VNSEEA_ApplyPostContextPrivacy($normalized, $request)
{
    $normalized = VNSEEA_PrivacyArray($normalized);
    $request = VNSEEA_PrivacyArray($request);
    $privacy = isset($normalized['postPrivacy']) ? (int) $normalized['postPrivacy'] : 0;
    $anonymous = !empty($normalized['is_anonymous']) ? 1 : 0;
    $post_type = '';
    if (isset($request['postType'])) {
        $post_type = strtolower((string) $request['postType']);
    } elseif (isset($request['post_type'])) {
        $post_type = strtolower((string) $request['post_type']);
    }
    $is_reel = !empty($request['is_reel']) || $post_type === 'reel';
    $is_live = $post_type === 'live';
    $is_page = !empty($request['page_id']);
    $is_group_or_event = !empty($request['group_id']) || !empty($request['event_id']) || !empty($request['page_event_id']);

    if ($is_group_or_event) {
        $privacy = 0;
        $anonymous = 0;
    } elseif ($is_page) {
        $privacy = in_array($privacy, array(0, 2, 5, 6), true) ? $privacy : 0;
        $anonymous = 0;
    } elseif ($is_reel || $is_live) {
        $anonymous = 0;
    } elseif ($anonymous) {
        $privacy = 0;
    }

    return array(
        'postPrivacy' => $privacy,
        'is_anonymous' => $anonymous,
        'privacy_contract' => 'audience_v2'
    );
}

function VNSEEA_NormalizeStoryPrivacyRequest($request)
{
    $request = VNSEEA_PrivacyArray($request);
    if (array_key_exists('privacy', $request)) {
        $privacy = (int) $request['privacy'];
    } elseif (array_key_exists('story_privacy', $request)) {
        $privacy = (int) $request['story_privacy'];
    } elseif (array_key_exists('postPrivacy', $request)) {
        $privacy = (int) $request['postPrivacy'];
    } else {
        $privacy = 2;
    }
    if (!in_array($privacy, array(0, 1, 2, 3), true)) {
        $privacy = 2;
    }
    return array(
        'privacy' => $privacy,
        'privacy_contract' => 'audience_v2'
    );
}

function VNSEEA_IsMutualActiveFriend($author_id, $viewer_id, $following = null)
{
    $author_id = (int) $author_id;
    $viewer_id = (int) $viewer_id;
    if ($author_id < 1 || $viewer_id < 1 || $author_id === $viewer_id) {
        return $author_id > 0 && $author_id === $viewer_id;
    }
    if (!is_callable($following)) {
        $following = function ($following_id, $follower_id) {
            return function_exists('Wo_IsFollowing') && Wo_IsFollowing($following_id, $follower_id) === true;
        };
    }
    return $following($author_id, $viewer_id) === true && $following($viewer_id, $author_id) === true;
}

function VNSEEA_CanViewPersonalAudience($privacy, $author_id, $viewer_id, $following = null)
{
    $privacy = (int) $privacy;
    $author_id = (int) $author_id;
    $viewer_id = (int) $viewer_id;
    if ($privacy === 0 || $privacy === 4 || $privacy === 5 || $privacy === 6) {
        return true;
    }
    if ($author_id > 0 && $author_id === $viewer_id) {
        return true;
    }
    if ($viewer_id < 1) {
        return false;
    }
    if (!is_callable($following)) {
        $following = function ($following_id, $follower_id) {
            return function_exists('Wo_IsFollowing') && Wo_IsFollowing($following_id, $follower_id) === true;
        };
    }
    if ($privacy === 1) {
        return VNSEEA_IsMutualActiveFriend($author_id, $viewer_id, $following);
    }
    if ($privacy === 2) {
        return $following($author_id, $viewer_id) === true;
    }
    return false;
}

function VNSEEA_CanViewPost($post, $viewer_id = 0)
{
    $post = VNSEEA_PrivacyArray($post);
    if (empty($post)) {
        return false;
    }
    $viewer_id = VNSEEA_CurrentViewerId($viewer_id);
    $privacy = isset($post['postPrivacy']) ? (int) $post['postPrivacy'] : 0;
    $author_id = !empty($post['user_id']) ? (int) $post['user_id'] : 0;

    if (!empty($post['event_id']) || !empty($post['page_event_id'])) {
        $event_id = !empty($post['event_id']) ? (int) $post['event_id'] : (int) $post['page_event_id'];
        return VNSEEA_CanAccessEvent($event_id, $viewer_id);
    }

    if (!empty($post['group_id'])) {
        $group_id = (int) $post['group_id'];
        $group = function_exists('Wo_GroupData') ? VNSEEA_PrivacyArray(Wo_GroupData($group_id)) : array();
        if (empty($group)) {
            return false;
        }
        if ((int) (!empty($group['privacy']) ? $group['privacy'] : 1) !== 2) {
            return true;
        }
        if ($viewer_id < 1) {
            return false;
        }
        if (!empty($group['user_id']) && (int) $group['user_id'] === $viewer_id) {
            return true;
        }
        return function_exists('Wo_IsGroupJoined') && Wo_IsGroupJoined($group_id, $viewer_id) === true;
    }

    if (!empty($post['page_id'])) {
        if ($privacy === 0 || $privacy === 5 || $privacy === 6) {
            return true;
        }
        if ($viewer_id < 1) {
            return false;
        }
        $page_id = (int) $post['page_id'];
        $page = function_exists('Wo_PageData') ? VNSEEA_PrivacyArray(Wo_PageData($page_id)) : array();
        if (!empty($page['user_id']) && (int) $page['user_id'] === $viewer_id) {
            return true;
        }
        if ($privacy !== 2) {
            return false;
        }
        return function_exists('Wo_IsPageLiked') && Wo_IsPageLiked($page_id, $viewer_id) === true;
    }

    return VNSEEA_CanViewPersonalAudience($privacy, $author_id, $viewer_id);
}

function VNSEEA_CanAccessEvent($event_id, $viewer_id = 0)
{
    global $wo;
    $event_id = (int) $event_id;
    if ($event_id < 1 || !function_exists('Wo_EventData')) {
        return false;
    }
    $event = VNSEEA_PrivacyArray(Wo_EventData($event_id));
    if (empty($event)) {
        return false;
    }
    $viewer_id = VNSEEA_CurrentViewerId($viewer_id);
    $owner_id = !empty($event['poster_id']) ? (int) $event['poster_id'] : (!empty($event['user_id']) ? (int) $event['user_id'] : 0);
    if ($owner_id > 0 && $owner_id === $viewer_id) {
        return true;
    }
    if (!empty($wo['config']['events_visibility']) && $viewer_id < 1) {
        return false;
    }
    return true;
}

function VNSEEA_IsShareableSource($post)
{
    $post = VNSEEA_PrivacyArray($post);
    return !empty($post) && isset($post['postPrivacy']) && (int) $post['postPrivacy'] === 0 && !VNSEEA_IsAnonymousPost($post);
}

function VNSEEA_CanSharePost($post, $viewer_id = 0)
{
    return VNSEEA_IsShareableSource($post) && VNSEEA_CanViewPost($post, $viewer_id);
}

function VNSEEA_CanSharePostTree($post, $viewer_id = 0, $loader = null)
{
    $post = VNSEEA_PrivacyArray($post);
    if (empty($post)) {
        return false;
    }
    if (!is_callable($loader)) {
        $loader = function ($post_id) {
            global $sqlConnect;
            $post_id = (int) $post_id;
            if ($post_id < 1 || empty($sqlConnect)) {
                return array();
            }
            $query = mysqli_query($sqlConnect, 'SELECT * FROM ' . T_POSTS . " WHERE `id` = {$post_id} LIMIT 1");
            return ($query && mysqli_num_rows($query)) ? mysqli_fetch_assoc($query) : array();
        };
    }

    $seen = array();
    for ($depth = 0; $depth < 32; $depth++) {
        if (!VNSEEA_CanSharePost($post, $viewer_id)) {
            return false;
        }
        $parent_id = !empty($post['parent_id']) ? (int) $post['parent_id'] : 0;
        if ($parent_id < 1) {
            return true;
        }
        if (!empty($seen[$parent_id])) {
            return false;
        }
        $seen[$parent_id] = true;
        $post = VNSEEA_PrivacyArray($loader($parent_id));
        if (empty($post)) {
            return false;
        }
    }
    return false;
}

function VNSEEA_PrepareSharedPostCloneData(
    $post,
    $actor_id,
    $target_id,
    $target_type,
    $source_post_id,
    $post_url,
    $created_at
) {
    $post = VNSEEA_PrivacyArray($post);
    $actor_id = (int) $actor_id;
    $target_id = (int) $target_id;
    $source_post_id = (int) $source_post_id;
    $target_type = strtolower(trim((string) $target_type));

    if (
        empty($post)
        || $actor_id < 1
        || $target_id < 1
        || $source_post_id < 1
        || !in_array($target_type, array('user', 'timeline', 'page', 'group'), true)
    ) {
        return array();
    }

    unset($post['id']);
    $post['user_id'] = $actor_id;
    $post['page_id'] = 0;
    $post['group_id'] = 0;
    $post['event_id'] = 0;
    $post['recipient_id'] = 0;

    if ($target_type === 'page') {
        $post['user_id'] = 0;
        $post['page_id'] = $target_id;
    } elseif ($target_type === 'group') {
        $post['group_id'] = $target_id;
    } else {
        $post['user_id'] = $target_id;
    }

    $post['post_id'] = 0;
    $post['post_url'] = (string) $post_url;
    $post['parent_id'] = $source_post_id;
    $post['boosted'] = 0;
    $post['time'] = (int) $created_at;
    $post['postText'] = '';
    $post['postType'] = '';
    $post['comments_status'] = 1;

    return $post;
}

function VNSEEA_ResolveShareableSourcePostId($post_id, $viewer_id = 0, $loader = null)
{
    $post_id = (int) $post_id;
    if ($post_id < 1) {
        return 0;
    }
    if (!is_callable($loader)) {
        $loader = function ($source_post_id) {
            global $sqlConnect;
            $source_post_id = (int) $source_post_id;
            if ($source_post_id < 1 || empty($sqlConnect)) {
                return array();
            }
            $query = mysqli_query($sqlConnect, 'SELECT * FROM ' . T_POSTS . " WHERE `id` = {$source_post_id} LIMIT 1");
            return ($query && mysqli_num_rows($query)) ? mysqli_fetch_assoc($query) : array();
        };
    }

    $viewer_id = VNSEEA_CurrentViewerId($viewer_id);
    $seen = array();
    for ($depth = 0; $depth < VNSEEA_MAX_SHARED_POST_DEPTH; $depth++) {
        if (isset($seen[$post_id])) {
            return 0;
        }
        $seen[$post_id] = true;
        $post = VNSEEA_PrivacyArray($loader($post_id));
        if (empty($post) || !VNSEEA_CanSharePost($post, $viewer_id)) {
            return 0;
        }
        $parent_id = !empty($post['parent_id']) ? (int) $post['parent_id'] : 0;
        if ($parent_id < 1) {
            return !empty($post['id']) ? (int) $post['id'] : $post_id;
        }
        $post_id = $parent_id;
    }
    return 0;
}

function VNSEEA_CanViewSharedPostStory($story, $viewer_id = 0)
{
    $story = VNSEEA_PrivacyArray($story);
    $story_type = !empty($story['story_type']) ? (string) $story['story_type'] : 'media';
    if ($story_type !== 'shared_post') {
        return true;
    }
    $source_post_id = !empty($story['source_post_id']) ? (int) $story['source_post_id'] : 0;
    return $source_post_id > 0 && VNSEEA_ResolveShareableSourcePostId($source_post_id, $viewer_id) > 0;
}

function VNSEEA_CanViewStory($story, $viewer_id = 0)
{
    $story = VNSEEA_PrivacyArray($story);
    if (empty($story)) {
        return false;
    }
    if (!empty($story['ad_id'])) {
        return true;
    }
    $privacy = isset($story['privacy']) ? (int) $story['privacy'] : 2;
    return VNSEEA_CanViewPersonalAudience(
        $privacy,
        !empty($story['user_id']) ? (int) $story['user_id'] : 0,
        VNSEEA_CurrentViewerId($viewer_id)
    );
}

function VNSEEA_StoryAudienceSql($alias, $viewer_id)
{
    $alias = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $alias);
    $prefix = $alias === '' ? '' : $alias . '.';
    $viewer_id = (int) $viewer_id;
    if ($viewer_id < 1) {
        return "COALESCE({$prefix}`privacy`, 2) = 0";
    }
    return "({$prefix}`user_id` = {$viewer_id} OR COALESCE({$prefix}`privacy`, 2) = 0" .
        " OR (COALESCE({$prefix}`privacy`, 2) = 2 AND EXISTS (SELECT 1 FROM " . T_FOLLOWERS . " vf WHERE vf.`following_id` = {$prefix}`user_id` AND vf.`follower_id` = {$viewer_id} AND vf.`active` = 1))" .
        " OR (COALESCE({$prefix}`privacy`, 2) = 1 AND EXISTS (SELECT 1 FROM " . T_FOLLOWERS . " vf1 WHERE vf1.`following_id` = {$prefix}`user_id` AND vf1.`follower_id` = {$viewer_id} AND vf1.`active` = 1)" .
        " AND EXISTS (SELECT 1 FROM " . T_FOLLOWERS . " vf2 WHERE vf2.`following_id` = {$viewer_id} AND vf2.`follower_id` = {$prefix}`user_id` AND vf2.`active` = 1)))";
}

function VNSEEA_AnonymousIdentity($anonymous_label = 'Anonymous', $anonymous_avatar = '')
{
    return array(
        'id' => 0,
        'user_id' => 0,
        'username' => 'anonymous',
        'name' => $anonymous_label,
        'avatar' => $anonymous_avatar,
        'avatar_org' => $anonymous_avatar,
        'url' => ''
    );
}

function VNSEEA_ProtectAnonymousNotification($data, $loader = null)
{
    $data = VNSEEA_PrivacyArray($data);
    $post_id = !empty($data['post_id']) ? (int) $data['post_id'] : 0;
    $notifier_id = !empty($data['notifier_id']) ? (int) $data['notifier_id'] : 0;
    if ($post_id < 1 || $notifier_id < 1) {
        return $data;
    }
    if (!is_callable($loader)) {
        $loader = function ($id) {
            global $sqlConnect;
            $id = (int) $id;
            if ($id < 1 || empty($sqlConnect)) {
                return array();
            }
            $query = mysqli_query($sqlConnect, 'SELECT `id`, `user_id`, `postPrivacy`, `is_anonymous` FROM ' . T_POSTS . " WHERE `id` = {$id} LIMIT 1");
            return ($query && mysqli_num_rows($query)) ? mysqli_fetch_assoc($query) : array();
        };
    }
    $post = VNSEEA_PrivacyArray($loader($post_id));
    if (!empty($post['user_id']) && (int) $post['user_id'] === $notifier_id && VNSEEA_IsAnonymousPost($post)) {
        $data['type2'] = 'anonymous';
    }
    return $data;
}

function VNSEEA_RedactAnonymousComment($comment, $post, $viewer_id = 0, $anonymous_label = 'Anonymous', $anonymous_avatar = '')
{
    $comment = VNSEEA_PrivacyArray($comment);
    $post = VNSEEA_PrivacyArray($post);
    if (empty($comment) || !VNSEEA_IsAnonymousPost($post)) {
        return $comment;
    }
    $owner_id = !empty($post['user_id']) ? (int) $post['user_id'] : 0;
    $viewer_id = VNSEEA_CurrentViewerId($viewer_id);
    if ($owner_id < 1 || (int) $comment['user_id'] !== $owner_id || $viewer_id === $owner_id) {
        return $comment;
    }
    $comment['user_id'] = 0;
    $comment['publisher'] = VNSEEA_AnonymousIdentity($anonymous_label, $anonymous_avatar);
    $comment['url'] = '';
    $comment['onwer'] = false;
    $comment['is_anonymous_owner'] = 1;
    return $comment;
}

function VNSEEA_RedactAnonymousPost($post, $viewer_id = 0, $anonymous_label = 'Anonymous', $anonymous_avatar = '')
{
    $post = VNSEEA_PrivacyArray($post);
    if (!VNSEEA_IsAnonymousPost($post)) {
        return $post;
    }
    $post['is_anonymous'] = 1;
    $viewer_id = (int) $viewer_id;
    $owner_id = !empty($post['user_id']) ? (int) $post['user_id'] : 0;
    if ($owner_id > 0 && $owner_id === $viewer_id) {
        return $post;
    }
    $anonymous = VNSEEA_AnonymousIdentity($anonymous_label, $anonymous_avatar);
    if (!empty($post['get_post_comments']) && is_array($post['get_post_comments'])) {
        foreach ($post['get_post_comments'] as $key => $comment) {
            $post['get_post_comments'][$key] = VNSEEA_RedactAnonymousComment($comment, $post, $viewer_id, $anonymous_label, $anonymous_avatar);
        }
    }
    $post['user_id'] = 0;
    $post['publisher'] = $anonymous;
    if (array_key_exists('user_data', $post)) {
        $post['user_data'] = $anonymous;
    }
    $post['shared_from'] = false;
    $post['via'] = false;
    $post['admin'] = false;
    $post['is_owner'] = false;
    $post['can_delete'] = false;
    $post['can_share'] = false;
    return $post;
}

if (!defined('VNSEEA_MAX_SHARED_POST_DEPTH')) {
    define('VNSEEA_MAX_SHARED_POST_DEPTH', 8);
}

function VNSEEA_SanitizeSharedPostInfo($post, $non_allowed = array())
{
    $post = VNSEEA_PrivacyArray($post);
    $non_allowed = is_array($non_allowed) ? $non_allowed : array();

    unset($post['get_post_comments']);
    $post['shared_info'] = null;

    foreach (array('publisher', 'user_data') as $identity_key) {
        if (empty($post[$identity_key]) || !is_array($post[$identity_key])) {
            $post[$identity_key] = null;
            continue;
        }
        foreach ($non_allowed as $field) {
            unset($post[$identity_key][$field]);
        }
    }

    return $post;
}

/**
 * Adds a privacy-checked, flattened source post to an API post payload.
 * Wo_PostData remains the authorization boundary for every hop.
 */
function VNSEEA_AttachSharedPostInfo($post, $non_allowed = array())
{
    $post = VNSEEA_PrivacyArray($post);
    $post['shared_info'] = null;
    $parent_id = !empty($post['parent_id']) ? (int) $post['parent_id'] : 0;
    if ($parent_id < 1 || !function_exists('Wo_PostData')) {
        return $post;
    }

    $visited = array();
    $current_id = !empty($post['id']) ? (int) $post['id'] : 0;
    if ($current_id > 0) {
        $visited[$current_id] = true;
    }

    $source = array();
    for ($depth = 0; $depth < VNSEEA_MAX_SHARED_POST_DEPTH; $depth++) {
        if ($parent_id < 1 || isset($visited[$parent_id])) {
            return $post;
        }
        $visited[$parent_id] = true;

        $source = VNSEEA_PrivacyArray(Wo_PostData($parent_id));
        if (empty($source)) {
            return $post;
        }

        $next_parent_id = !empty($source['parent_id']) ? (int) $source['parent_id'] : 0;
        if ($next_parent_id < 1) {
            $post['shared_info'] = VNSEEA_SanitizeSharedPostInfo($source, $non_allowed);
            return $post;
        }
        $parent_id = $next_parent_id;
    }

    return $post;
}

function VNSEEA_AttachSharedPostInfoToResponseData($data, $non_allowed = array())
{
    if (!is_array($data)) {
        return $data;
    }
    if (isset($data['id']) || isset($data['post_id'])) {
        return VNSEEA_AttachSharedPostInfo($data, $non_allowed);
    }

    foreach ($data as $key => $item) {
        if (is_array($item) && (isset($item['id']) || isset($item['post_id']))) {
            $data[$key] = VNSEEA_AttachSharedPostInfo($item, $non_allowed);
        }
    }
    return $data;
}

function VNSEEA_CanMutatePost($post_id, $viewer_id = 0)
{
    global $sqlConnect;
    static $permission_cache = array();

    $post_id = (int) $post_id;
    $viewer_id = VNSEEA_CurrentViewerId($viewer_id);
    if ($post_id < 1 || empty($sqlConnect)) {
        return false;
    }

    $cache_key = $viewer_id . ':' . $post_id;
    if (array_key_exists($cache_key, $permission_cache)) {
        return $permission_cache[$cache_key];
    }

    $columns = '`id`, `post_id`, `parent_id`, `user_id`, `page_id`, `group_id`, `event_id`, `page_event_id`, `postPrivacy`, `is_anonymous`';
    $query = mysqli_query($sqlConnect, 'SELECT ' . $columns . ' FROM ' . T_POSTS . " WHERE `id` = {$post_id} LIMIT 1");
    if (!$query || !mysqli_num_rows($query)) {
        $permission_cache[$cache_key] = false;
        return false;
    }

    $post = mysqli_fetch_assoc($query);
    $canonical_post_id = !empty($post['post_id']) ? (int) $post['post_id'] : 0;
    if ($canonical_post_id > 0 && $canonical_post_id !== (int) $post['id']) {
        $canonical_query = mysqli_query($sqlConnect, 'SELECT ' . $columns . ' FROM ' . T_POSTS . " WHERE `id` = {$canonical_post_id} LIMIT 1");
        if (!$canonical_query || !mysqli_num_rows($canonical_query)) {
            $permission_cache[$cache_key] = false;
            return false;
        }
        $post = mysqli_fetch_assoc($canonical_query);
    }

    $can_mutate = VNSEEA_CanViewPost($post, $viewer_id);
    if ($can_mutate && !empty($post['parent_id'])) {
        $can_mutate = VNSEEA_CanSharePostTree($post, $viewer_id);
    }
    $permission_cache[$cache_key] = $can_mutate;
    return $can_mutate;
}
