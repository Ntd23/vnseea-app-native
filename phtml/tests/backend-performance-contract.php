<?php

$root = dirname(__DIR__);
$functions = file_get_contents($root . '/assets/includes/functions_one.php');
$get_chats = file_get_contents($root . '/api/v2/endpoints/get_chats.php');
$batch_hydration = file_get_contents($root . '/assets/includes/vnseea_batch_hydration.php');
$index_migration = file_get_contents($root . '/database/migrations/20260731_list_read_model_indexes.sql');
$parity_test = file_get_contents($root . '/tests/staging-list-read-model-parity.php');
$budget_test = file_get_contents($root . '/tests/staging-list-read-model-budget.php');

function assert_backend_performance_contract($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function backend_performance_function_source($source, $name, $next_name)
{
    $start = strpos($source, "function {$name}(");
    $end = strpos($source, "function {$next_name}(", $start);
    return $start !== false && $end !== false ? substr($source, $start, $end - $start) : '';
}

$header_start = strpos($functions, 'function Wo_GetMessagesHeader(');
$header_end = strpos($functions, 'function Wo_RegisterMessage(', $header_start);
$header_source = substr($functions, $header_start, $header_end - $header_start);
assert_backend_performance_contract(
    substr_count($header_source, 'mysqli_query($sqlConnect, $query_one)') === 1 &&
        strpos($header_source, 'ORDER BY `id` DESC LIMIT 1') !== false &&
        strpos($header_source, 'mysqli_num_rows($sql_query_one)') === false,
    'Wo_GetMessagesHeader must query only the latest message, not the full conversation history'
);

$chat_users_source = backend_performance_function_source($functions, 'Wo_GetMessagesUsersAPP2', 'Wo_GetPageChatList');
assert_backend_performance_contract(
    strpos($chat_users_source, 'VNSEEA_GetChatUsersBatch') !== false &&
        strpos($chat_users_source, 'Wo_UserData(') === false,
    'direct conversation users must be hydrated by one lightweight batch'
);

$message_headers_source = backend_performance_function_source($functions, 'VNSEEA_GetMessagesHeaderBatch', 'VNSEEA_GetUnreadMessageCountsBatch');
assert_backend_performance_contract(
    strpos($message_headers_source, 'UNION ALL') !== false &&
        strpos($message_headers_source, 'GROUP BY directional.`peer_id`') !== false &&
        strpos($message_headers_source, 'Wo_UserData(') === false &&
        strpos($message_headers_source, 'GetMessageById(') === false,
    'direct latest-message loading must use directional indexed batches without per-message hydration'
);

$page_headers_source = backend_performance_function_source($functions, 'VNSEEA_GetPageMessageHeadersBatch', 'Wo_GetMessagesHeader');
assert_backend_performance_contract(
    strpos($page_headers_source, 'VNSEEA_GetChatUsersBatch') !== false &&
        strpos($page_headers_source, 'VNSEEA_GetMessageContextReply') !== false &&
        strpos($page_headers_source, 'Wo_UserData(') === false,
    'page conversations must batch sender and reply data'
);

$page_chat_list_source = backend_performance_function_source($functions, 'Wo_GetMessagesPagesAPP', 'Wo_AddCommentBlogReactions');
assert_backend_performance_contract(
    strpos($page_chat_list_source, 'Wo_UserData(') === false &&
        strpos($page_chat_list_source, 'Wo_PageData(') === false &&
        strpos($page_chat_list_source, 'rawQuery(') === false,
    'the page conversation source must return raw references without per-item hydration'
);

assert_backend_performance_contract(
    strpos($get_chats, 'Wo_UserData(') === false &&
        strpos($get_chats, 'VNSEEA_GetChatUsersBatch($call_user_ids)') !== false &&
        strpos($get_chats, 'Wo_PageData(') === false &&
        strpos($get_chats, 'Wo_GetProduct(') === false &&
        strpos($get_chats, 'GetMessageById(') === false,
    'get_chats must use lightweight batches for conversations, call state and message metadata'
);

foreach (array(
    'VNSEEA_GetChatUsersBatch',
    'VNSEEA_GetChatPagesBatch',
    'VNSEEA_PrimeCanonicalMessageContextsBatch',
    'VNSEEA_GetMessageStoriesBatch',
    'VNSEEA_GetMarketplaceOrderContextsBatch',
    'VNSEEA_LoadPostTreeRowsBatch',
    'VNSEEA_PrimePostAccessBatch',
    'VNSEEA_PrimePostTypedDataBatch',
) as $helper) {
    assert_backend_performance_contract(
        strpos($batch_hydration, "function {$helper}(") !== false,
        "{$helper} batch read-model helper is missing"
    );
}
assert_backend_performance_contract(
    strpos($batch_hydration, 'function VNSEEA_MessageBatchContextLoaded(') !== false &&
        strpos($batch_hydration, "'loaded' => \$loaded") !== false &&
        strpos($functions, "VNSEEA_MessageBatchContextLoaded('orders', \$hash_id)") !== false &&
        strpos($functions, "VNSEEA_MessageBatchContextLoaded('stories', \$story_id)") !== false,
    'message batch context must distinguish known-missing data from unrelated legacy calls'
);

foreach (array(
    'VNSEEA_GetMessagesHeaderBatch',
    'VNSEEA_GetUnreadMessageCountsBatch',
    'VNSEEA_GetConversationMutesBatch',
    'VNSEEA_GetChatColorsBatch',
    'VNSEEA_GetPageMessageHeadersBatch',
    'VNSEEA_GetMessageReactionSummariesBatch',
) as $helper) {
    assert_backend_performance_contract(
        strpos($functions, "function {$helper}(") !== false,
        "{$helper} is missing"
    );
    assert_backend_performance_contract(
        strpos($get_chats, "{$helper}(") !== false || $helper === 'VNSEEA_GetMessageReactionSummariesBatch',
        "get_chats must use {$helper}"
    );
}

assert_backend_performance_contract(
    strpos($get_chats, "->where('chat_id'") === false &&
        strpos($get_chats, 'Wo_CountMessages(') === false &&
        strpos($get_chats, 'Wo_GetMessagesHeader(') === false &&
        strpos($get_chats, 'Wo_GetChatColor(') === false &&
        strpos($get_chats, 'Wo_GetPageMessages(') === false,
    'get_chats must not issue mute, unread, latest-message or color queries per conversation'
);
$groups_start = strpos($functions, 'function Wo_GetGroupsListAPP(');
$groups_end = strpos($functions, 'function Wo_GetPostCommentsSort(', $groups_start);
$groups_source = substr($functions, $groups_start, $groups_end - $groups_start);
assert_backend_performance_contract(
    strpos($groups_source, 'Wo_GetChatGroupLastMessage(') === false &&
        strpos($groups_source, 'Wo_GetGChatMemebers(') === false &&
        strpos($groups_source, 'Wo_CheckLastGroupAction(') === false &&
        strpos($groups_source, 'VNSEEA_GetChatUsersBatch') !== false &&
        strpos($groups_source, 'Wo_UserData(') === false,
    'group chat list must batch last messages, members and unread state'
);

assert_backend_performance_contract(
    strpos($batch_hydration, "'vnseea_chat_user_batch_cache'") !== false &&
        strpos($batch_hydration, "'vnseea_chat_page_batch_cache'") !== false &&
        substr_count($batch_hydration, "array('loaded' => array()") >= 2,
    'lightweight chat read models must retain request-scoped loaded sentinels'
);

foreach (array(
    'vnseea_user_page_time',
    'vnseea_direct_out_latest',
    'vnseea_direct_in_latest',
    'vnseea_direct_unread',
    'vnseea_group_active_members',
    'vnseea_post_reaction_user',
    'vnseea_follower_active_following',
    'vnseea_parent_post_media',
    'vnseea_post_option_user',
    'vnseea_mute_conversation',
    'vnseea_message_flags',
    'vnseea_product_post',
    'vnseea_job_post',
    'vnseea_offer_post',
    'vnseea_share_source',
    'vnseea_saved_user_post',
    'vnseea_page_like_user_active',
    'vnseea_group_member_active',
    'vnseea_cart_user_product',
) as $index_name) {
    assert_backend_performance_contract(
        strpos($index_migration, $index_name) !== false,
        "read-model index {$index_name} is missing"
    );
}

foreach (array(
    'VNSEEA_PrimePostDataBatch',
    'VNSEEA_PrimePostAlbumMediaBatch',
    'VNSEEA_PrimePostPollBatch',
    'VNSEEA_PrimeFeedSummaryPublishers',
    'VNSEEA_PostBatchUserData',
    'VNSEEA_PostBatchPageData',
) as $helper) {
    assert_backend_performance_contract(
        strpos($functions, "function {$helper}(") !== false,
        "{$helper} is missing"
    );
}
assert_backend_performance_contract(
    strpos($functions, "array('profile' => \$hydration_profile)") !== false &&
        strpos($functions, "implode(' UNION ALL ', \$metric_queries)") !== false &&
        strpos($functions, "['vnseea_post_batch_context']['metrics']") !== false,
    'feed posts must prime raw rows and aggregate viewer/count metrics before Wo_PostData hydration'
);

$post_data_start = strpos($functions, 'function Wo_PostData(');
$post_data_end = strpos($functions, 'function Wo_IsSubscriptionPaidForPublisher(', $post_data_start);
$post_data_source = substr($functions, $post_data_start, $post_data_end - $post_data_start);
assert_backend_performance_contract(
    strpos($post_data_source, '$is_query_free_batch') !== false &&
        strpos($post_data_source, "\$typed_context['products']") !== false &&
        strpos($post_data_source, 'VNSEEA_PostAccessCanView') !== false &&
        strpos($post_data_source, 'VNSEEA_PostAccessCanDelete') !== false &&
        strpos($post_data_source, 'VNSEEA_PostAccessCanShareTree') !== false,
    'feed Wo_PostData must assemble permissions and typed data from its query-free batch context'
);
assert_backend_performance_contract(
    strpos($batch_hydration, "array('user_id', 'recipient_id', 'shared_from')") !== false &&
        strpos($functions, 'VNSEEA_PrimeFeedSummaryPublishers($rows, $access)') !== false,
    'feed publisher follow state must reuse a batch covering authors, recipients and shared publishers'
);
assert_backend_performance_contract(
    strpos($post_data_source, 'unset($GLOBALS[\'vnseea_post_batch_context\'])') !== false &&
        strpos($post_data_source, 'Wo_PostData($post_id, $placement, $limited, $comments_limit)') !== false &&
        strpos($post_data_source, '$GLOBALS[\'vnseea_post_batch_context\'] = $previous_context') !== false,
    'an unrelated Wo_PostData call must fall back to canonical hydration without leaking batch context'
);
assert_backend_performance_contract(
    strpos($functions, "'query_free' => \$profile === 'feed_summary'") !== false &&
        strpos($functions, "'typed' => \$typed") !== false &&
        strpos($functions, "'hashtags' => \$hashtags") !== false &&
        strpos($batch_hydration, 'VNSEEA_PostBatchMarkupUser') !== false &&
        strpos($batch_hydration, 'VNSEEA_PostBatchHashtag') !== false,
    'feed text markup must consume preloaded mention and hashtag data'
);
foreach (array('product_id', 'job_id', 'offer_id') as $source_column) {
    assert_backend_performance_contract(
        strpos($batch_hydration, "SELECT `{$source_column}`, MIN(`id`) AS `post_id`") !== false,
        "{$source_column} must resolve to the canonical source post rather than a newer share"
    );
}
assert_backend_performance_contract(
    strpos($post_data_source, "\$is_feed_summary = !empty(\$batch_context['summary_post_ids'][\$story_id])") !== false &&
        strpos($post_data_source, "\$story['get_post_comments'] = array();") !== false,
    'feed_summary must return comment counts without hydrating comment rows'
);
assert_backend_performance_contract(
    strpos($functions, "`post_id` IN ({\$ids_sql}) OR `parent_id` IN ({\$ids_sql})") !== false &&
        strpos($post_data_source, "\$batch_context['album_media'][\$parent_id]") !== false,
    'feed media must be loaded once for all album and multi-image posts'
);
assert_backend_performance_contract(
    strpos($functions, 'COALESCE(v.`option_votes`, 0)') !== false &&
        strpos($functions, 'GROUP BY `option_id`') !== false &&
        strpos($post_data_source, "\$batch_context['poll_options'][\$story_id]") !== false,
    'feed poll options and viewer votes must be aggregated for the whole post batch'
);
assert_backend_performance_contract(
    strpos($functions, 'FROM ' . "' . T_USERS . '" . ' WHERE `user_id` IN (') !== false &&
        strpos($functions, 'FROM ' . "' . T_PAGES . '" . ' WHERE `page_id` IN (') !== false &&
        strpos($functions, "'users' => \$publishers['users']") !== false,
    'feed publishers must be loaded as lightweight user/page batches'
);

$posts_endpoint = file_get_contents($root . '/api/v2/endpoints/posts.php');
assert_backend_performance_contract(
    substr_count($posts_endpoint, "'hydration_profile' => 'feed_summary'") === 5,
    'all five App feed list endpoints must opt into feed_summary hydration'
);

assert_backend_performance_contract(
    strpos($parity_test, 'VNSEEA_PostAccessCanView') !== false &&
        strpos($parity_test, 'VNSEEA_CanViewPost') !== false &&
        strpos($parity_test, 'vnseea_parity_post_contract') !== false &&
        strpos($parity_test, "include \$root . '/api/v2/endpoints/get_chats.php'") !== false,
    'staging parity test must compare permissions, feed contracts and conversation latest-message semantics'
);
assert_backend_performance_contract(
    strpos($budget_test, '$simple_feed_growth') !== false &&
        strpos($budget_test, '$simple_feed_growth <= 2') !== false &&
        strpos($budget_test, "'comments_hydrated' => \$comments_hydrated") !== false,
    'staging query budget must detect per-post query growth on a homogeneous feed sample'
);

$post_tags = file_get_contents($root . '/assets/includes/vnseea_post_tags.php');
assert_backend_performance_contract(
    strpos($post_tags, 'function VNSEEA_GetPostTaggedUsersBatch(') !== false &&
        strpos($post_tags, "t.`post_id` IN (") !== false,
    'tagged users must be loaded once for the post batch'
);

echo "backend performance contract: ok\n";
