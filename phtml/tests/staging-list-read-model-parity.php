<?php

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$root = !empty($argv[1]) ? rtrim($argv[1], '/') : dirname(__DIR__);
$viewer_id = !empty($argv[2]) ? (int)$argv[2] : 1;
$limit = !empty($argv[3]) ? max(1, min(30, (int)$argv[3])) : 20;
if (!is_file($root . '/assets/init.php')) {
    fwrite(STDERR, "Invalid application root\n");
    exit(1);
}

$_SERVER['HTTP_HOST'] = 'staging.vnseea.vn';
$_SERVER['REQUEST_URI'] = '/api/read-model-parity';
$_SERVER['HTTPS'] = 'on';
$_SERVER['SERVER_PORT'] = 443;

chdir($root);
require $root . '/assets/init.php';

$wo['loggedin'] = false;
$wo['user'] = Wo_UserData($viewer_id);
if (empty($wo['user']['user_id'])) {
    fwrite(STDERR, "Parity viewer not found\n");
    exit(1);
}
$wo['loggedin'] = true;
$wo['lang'] = Wo_LangsFromDB($wo['user']['language']);

function vnseea_parity_scalar($value)
{
    if (is_bool($value)) {
        return $value ? 1 : 0;
    }
    if ($value === null) {
        return null;
    }
    return is_numeric($value) ? (string)$value : (string)$value;
}

function vnseea_parity_pick($value, $fields)
{
    $value = is_object($value) ? get_object_vars($value) : $value;
    if (!is_array($value)) {
        return array();
    }
    $result = array();
    foreach ($fields as $field) {
        $result[$field] = array_key_exists($field, $value)
            ? vnseea_parity_scalar($value[$field])
            : null;
    }
    return $result;
}

function vnseea_parity_media($items)
{
    $result = array();
    foreach ((array)$items as $item) {
        $result[] = vnseea_parity_pick($item, array('id', 'post_id', 'parent_id', 'product_id', 'image'));
    }
    return $result;
}

function vnseea_parity_post_contract($post)
{
    if (!is_array($post)) {
        return null;
    }
    $result = vnseea_parity_pick($post, array(
        'id', 'post_id', 'user_id', 'recipient_id', 'page_id', 'group_id', 'event_id',
        'page_event_id', 'postPrivacy', 'is_anonymous', 'post_comments', 'post_shares',
        'post_likes', 'post_wonders', 'is_liked', 'is_wondered', 'is_post_saved',
        'is_post_reported', 'can_delete', 'can_share',
    ));
    $result['publisher'] = vnseea_parity_pick($post['publisher'] ?? array(), array(
        'user_id', 'page_id', 'username', 'name', 'avatar', 'verified', 'is_following',
    ));
    $result['photo_album'] = vnseea_parity_media($post['photo_album'] ?? array());
    $result['photo_multi'] = vnseea_parity_media($post['photo_multi'] ?? array());
    $result['options'] = array_map(function ($option) {
        return vnseea_parity_pick($option, array('id', 'post_id', 'text', 'option_votes', 'all'));
    }, (array)($post['options'] ?? array()));
    $result['reaction'] = vnseea_parity_pick($post['reaction'] ?? array(), array('count', 'is_reacted', 'type'));
    $result['product'] = vnseea_parity_pick($post['product'] ?? array(), array(
        'id', 'post_id', 'name', 'price', 'currency', 'rating', 'reviews_count', 'added_to_cart',
    ));
    $result['product_images'] = vnseea_parity_media($post['product']['images'] ?? array());
    $result['event'] = vnseea_parity_pick($post['event'] ?? array(), array('id', 'poster_id', 'name', 'cover'));
    $result['job'] = vnseea_parity_pick($post['job'] ?? array(), array('id', 'post_id', 'title', 'apply', 'apply_count'));
    $result['offer'] = vnseea_parity_pick($post['offer'] ?? array(), array('id', 'post_id', 'discount_type', 'offer_text'));
    $result['blog'] = vnseea_parity_pick($post['blog'] ?? array(), array('id', 'title', 'comments_count'));
    $result['fund'] = vnseea_parity_pick($post['fund'] ?? array(), array('id', 'funding_id', 'raised', 'all_donation'));
    $result['fund_data'] = vnseea_parity_pick($post['fund_data'] ?? array(), array('id', 'raised', 'all_donation'));
    $result['forum'] = vnseea_parity_pick($post['forum'] ?? array(), array('id', 'name', 'description'));
    $result['thread'] = vnseea_parity_pick($post['thread'] ?? array(), array('id', 'forum', 'headline', 'user'));
    return $result;
}

$errors = array();
$previous_message_context = isset($GLOBALS['vnseea_message_batch_context'])
    ? $GLOBALS['vnseea_message_batch_context']
    : null;
$GLOBALS['vnseea_message_batch_context'] = array(
    'active' => true,
    'loaded' => array(
        'users' => array(), 'products' => array(), 'orders' => array(),
        'stories' => array(), 'hashtags' => array(), 'replies' => array(),
    ),
);
$fallback_user = VNSEEA_GetMessageContextUser($viewer_id);
if ((int)($fallback_user['user_id'] ?? 0) !== $viewer_id) {
    $errors[] = array('scope' => 'message_context_fallback', 'user_id' => $viewer_id);
}
if ($previous_message_context === null) {
    unset($GLOBALS['vnseea_message_batch_context']);
} else {
    $GLOBALS['vnseea_message_batch_context'] = $previous_message_context;
}
$post_ids = array();
$post_query = mysqli_query(
    $sqlConnect,
    'SELECT `id` FROM ' . T_POSTS . " WHERE `active` = '1' AND `multi_image_post` = 0 ORDER BY `id` DESC LIMIT {$limit}"
);
if ($post_query) {
    while ($post = mysqli_fetch_assoc($post_query)) {
        $post_ids[(int)$post['id']] = (int)$post['id'];
    }
}

$tree_rows = VNSEEA_LoadPostTreeRowsBatch($post_ids);
$access = VNSEEA_PrimePostAccessBatch($tree_rows, $viewer_id);
foreach ($post_ids as $post_id) {
    if (empty($tree_rows[$post_id])) {
        continue;
    }
    $row = $tree_rows[$post_id];
    $checks = array(
        'can_view' => array(
            VNSEEA_PostAccessCanView($row, $access),
            VNSEEA_CanViewPost($row, $viewer_id),
        ),
        'can_delete' => array(
            VNSEEA_PostAccessCanDelete($row, $access),
            Wo_CanDeletePost($row, $viewer_id),
        ),
        'can_share' => array(
            VNSEEA_PostAccessCanShareTree($row, $access),
            VNSEEA_CanSharePostTree($row, $viewer_id),
        ),
    );
    foreach ($checks as $name => $values) {
        if ((bool)$values[0] !== (bool)$values[1]) {
            $errors[] = array('scope' => 'post_permission', 'post_id' => $post_id, 'field' => $name, 'batch' => $values[0], 'legacy' => $values[1]);
        }
    }
}

VNSEEA_PrimePostDataBatch($post_ids, array('profile' => 'feed_summary'));
$summaries = array();
foreach ($post_ids as $post_id) {
    $summaries[$post_id] = Wo_PostData($post_id);
}
unset($GLOBALS['vnseea_post_batch_context']);
foreach ($post_ids as $post_id) {
    $legacy = Wo_PostData($post_id);
    $summary_contract = vnseea_parity_post_contract($summaries[$post_id]);
    $legacy_contract = vnseea_parity_post_contract($legacy);
    if ($summary_contract !== $legacy_contract) {
        $errors[] = array(
            'scope' => 'post_contract',
            'post_id' => $post_id,
            'batch' => $summary_contract,
            'legacy' => $legacy_contract,
        );
    }
}

unset($GLOBALS['vnseea_message_batch_context']);
$_POST = array(
    'data_type' => 'all',
    'user_limit' => $limit,
    'group_limit' => $limit,
    'page_limit' => $limit,
);
$response_data = array();
include $root . '/api/v2/endpoints/get_chats.php';
$conversation_count = 0;
foreach ((array)($response_data['data'] ?? array()) as $chat) {
    $conversation_count++;
    $chat_type = !empty($chat['chat_type']) ? $chat['chat_type'] : 'user';
    $last_message = !empty($chat['last_message']) && is_array($chat['last_message']) ? $chat['last_message'] : array();
    if ($chat_type === 'user') {
        $peer_id = !empty($chat['user_id']) ? (int)$chat['user_id'] : 0;
        $legacy_user = $peer_id > 0 ? Wo_UserData($peer_id) : array();
        foreach (array('username', 'name', 'avatar') as $field) {
            if (vnseea_parity_scalar($chat[$field] ?? null) !== vnseea_parity_scalar($legacy_user[$field] ?? null)) {
                $errors[] = array('scope' => 'direct_user', 'chat_id' => $chat['chat_id'] ?? 0, 'field' => $field);
            }
        }
        $latest_query = mysqli_query(
            $sqlConnect,
            'SELECT `id` FROM ' . T_MESSAGES . " WHERE `page_id` = 0 AND ((`from_id` = {$viewer_id} AND `to_id` = {$peer_id} AND `deleted_one` = '0') OR (`from_id` = {$peer_id} AND `to_id` = {$viewer_id} AND `deleted_two` = '0')) ORDER BY `id` DESC LIMIT 1"
        );
        $latest = $latest_query && mysqli_num_rows($latest_query) ? mysqli_fetch_assoc($latest_query) : array();
        if ((int)($last_message['id'] ?? 0) !== (int)($latest['id'] ?? 0)) {
            $errors[] = array('scope' => 'direct_latest', 'peer_id' => $peer_id, 'batch' => $last_message['id'] ?? 0, 'legacy' => $latest['id'] ?? 0);
        }
    } elseif ($chat_type === 'group') {
        $group_id = !empty($chat['group_id']) ? (int)$chat['group_id'] : (int)($chat['chat_id'] ?? 0);
        $cleared_id = VNSEEA_GetGroupHistoryClearMessageId($group_id, $viewer_id);
        $latest_query = mysqli_query(
            $sqlConnect,
            'SELECT `id` FROM ' . T_MESSAGES . " WHERE `group_id` = {$group_id} AND `id` > {$cleared_id} ORDER BY `id` DESC LIMIT 1"
        );
        $latest = $latest_query && mysqli_num_rows($latest_query) ? mysqli_fetch_assoc($latest_query) : array();
        if ((int)($last_message['id'] ?? 0) !== (int)($latest['id'] ?? 0)) {
            $errors[] = array('scope' => 'group_latest', 'group_id' => $group_id, 'batch' => $last_message['id'] ?? 0, 'legacy' => $latest['id'] ?? 0);
        }
    } elseif ($chat_type === 'page' && !empty($last_message)) {
        $page_id = !empty($chat['page_id']) ? (int)$chat['page_id'] : (int)($chat['id'] ?? 0);
        $from_id = (int)$last_message['from_id'];
        $to_id = (int)$last_message['to_id'];
        $latest_query = mysqli_query(
            $sqlConnect,
            'SELECT `id` FROM ' . T_MESSAGES . " WHERE `page_id` = {$page_id} AND ((`from_id` = {$from_id} AND `to_id` = {$to_id}) OR (`from_id` = {$to_id} AND `to_id` = {$from_id})) ORDER BY `id` DESC LIMIT 1"
        );
        $latest = $latest_query && mysqli_num_rows($latest_query) ? mysqli_fetch_assoc($latest_query) : array();
        if ((int)$last_message['id'] !== (int)($latest['id'] ?? 0)) {
            $errors[] = array('scope' => 'page_latest', 'page_id' => $page_id, 'batch' => $last_message['id'], 'legacy' => $latest['id'] ?? 0);
        }
    }
    if (!empty($last_message['reply_id']) && (int)($last_message['reply']['id'] ?? 0) !== (int)$last_message['reply_id']) {
        $errors[] = array('scope' => 'message_reply', 'message_id' => $last_message['id'] ?? 0);
    }
    if (!empty($last_message['product_id']) && (int)($last_message['product']['id'] ?? 0) !== (int)$last_message['product_id']) {
        $errors[] = array('scope' => 'message_product', 'message_id' => $last_message['id'] ?? 0);
    }
}

$result = array(
    'viewer_id' => $viewer_id,
    'sampled_posts' => count($post_ids),
    'sampled_conversations' => $conversation_count,
    'error_count' => count($errors),
    'errors' => $errors,
    'passed' => empty($errors),
);
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
exit(empty($errors) ? 0 : 1);
