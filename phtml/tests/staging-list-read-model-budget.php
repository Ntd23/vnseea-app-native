<?php

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$root = !empty($argv[1]) ? rtrim($argv[1], '/') : dirname(__DIR__);
$user_id = !empty($argv[2]) ? (int)$argv[2] : 1;
$small_limit = !empty($argv[3]) ? max(1, min(20, (int)$argv[3])) : 5;
$large_limit = !empty($argv[4]) ? max($small_limit, min(50, (int)$argv[4])) : 20;
if (!is_file($root . '/assets/init.php')) {
    fwrite(STDERR, "Invalid application root\n");
    exit(1);
}

$_SERVER['HTTP_HOST'] = 'staging.vnseea.vn';
$_SERVER['REQUEST_URI'] = '/api/read-model-budget';
$_SERVER['HTTPS'] = 'on';
$_SERVER['SERVER_PORT'] = 443;

chdir($root);
require $root . '/assets/init.php';

$wo['loggedin'] = false;
$wo['user'] = Wo_UserData($user_id);
if (empty($wo['user']['user_id'])) {
    fwrite(STDERR, "Benchmark user not found\n");
    exit(1);
}
$wo['loggedin'] = true;
$wo['lang'] = Wo_LangsFromDB($wo['user']['language']);

function vnseea_read_model_db_stats($sqlConnect)
{
    return function_exists('mysqli_get_connection_stats') ? mysqli_get_connection_stats($sqlConnect) : array();
}

function vnseea_read_model_query_delta($before, $after)
{
    foreach (array('com_query', 'result_set_queries') as $key) {
        if (isset($after[$key])) {
            return (int)$after[$key] - (isset($before[$key]) ? (int)$before[$key] : 0);
        }
    }
    return null;
}

$measure_conversations = function ($limit) use ($root, $sqlConnect) {
    global $wo, $db;
    unset($GLOBALS['vnseea_message_batch_context']);
    unset($GLOBALS['vnseea_chat_user_batch_cache'], $GLOBALS['vnseea_chat_page_batch_cache']);
    $_POST = array(
        'data_type' => 'all',
        'user_limit' => $limit,
        'group_limit' => $limit,
        'page_limit' => $limit,
    );
    $before = vnseea_read_model_db_stats($sqlConnect);
    $started = microtime(true);
    $response_data = array();
    include $root . '/api/v2/endpoints/get_chats.php';
    $after = vnseea_read_model_db_stats($sqlConnect);
    return array(
        'items' => !empty($response_data['data']) ? count($response_data['data']) : 0,
        'queries' => vnseea_read_model_query_delta($before, $after),
        'elapsed_seconds' => round(microtime(true) - $started, 6),
    );
};

$measure_feed = function ($limit) use ($sqlConnect) {
    unset($GLOBALS['vnseea_post_batch_context']);
    unset($GLOBALS['vnseea_chat_user_batch_cache'], $GLOBALS['vnseea_chat_page_batch_cache']);
    $before = vnseea_read_model_db_stats($sqlConnect);
    $started = microtime(true);
    $posts = Wo_GetPosts(array(
        'limit' => $limit,
        'after_post_id' => 0,
        'placement' => 'multi_image_post',
        'hydration_profile' => 'feed_summary',
        'anonymous' => true,
    ));
    $after = vnseea_read_model_db_stats($sqlConnect);
    $comments_hydrated = 0;
    foreach ((array)$posts as $post) {
        $comments_hydrated += !empty($post['get_post_comments']) && is_array($post['get_post_comments'])
            ? count($post['get_post_comments'])
            : 0;
    }
    return array(
        'items' => count((array)$posts),
        'queries' => vnseea_read_model_query_delta($before, $after),
        'elapsed_seconds' => round(microtime(true) - $started, 6),
        'comments_hydrated' => $comments_hydrated,
    );
};

$simple_post_ids = array();
$simple_post_query = mysqli_query(
    $sqlConnect,
    'SELECT `id` FROM ' . T_POSTS . " WHERE `active` = '1'" .
    " AND (`post_id` = 0 OR `post_id` = `id`) AND `parent_id` = 0" .
    " AND `product_id` = 0 AND `page_event_id` = 0 AND `event_id` = 0" .
    " AND `job_id` = 0 AND `offer_id` = 0 AND `blog_id` = 0" .
    " AND `fund_id` = 0 AND `fund_raise_id` = 0 AND `forum_id` = 0 AND `thread_id` = 0" .
    " AND `poll_id` = 0 AND `multi_image` = 0 AND `multi_image_post` = 0" .
    " AND (`album_name` IS NULL OR `album_name` = '') AND (`stream_name` IS NULL OR `stream_name` = '')" .
    " ORDER BY `id` DESC LIMIT {$large_limit}"
);
if ($simple_post_query) {
    while ($simple_post = mysqli_fetch_assoc($simple_post_query)) {
        $simple_post_ids[] = (int)$simple_post['id'];
    }
}
$measure_simple_feed = function ($post_ids) use ($sqlConnect) {
    unset($GLOBALS['vnseea_post_batch_context']);
    unset($GLOBALS['vnseea_chat_user_batch_cache'], $GLOBALS['vnseea_chat_page_batch_cache']);
    $before = vnseea_read_model_db_stats($sqlConnect);
    $started = microtime(true);
    VNSEEA_PrimePostDataBatch($post_ids, array('profile' => 'feed_summary'));
    $posts = array();
    foreach ($post_ids as $post_id) {
        $post = Wo_PostData($post_id);
        if (!empty($post)) {
            $posts[] = $post;
        }
    }
    $after = vnseea_read_model_db_stats($sqlConnect);
    return array(
        'items' => count($posts),
        'queries' => vnseea_read_model_query_delta($before, $after),
        'elapsed_seconds' => round(microtime(true) - $started, 6),
    );
};

$conversation_small = $measure_conversations($small_limit);
$conversation_large = $measure_conversations($large_limit);
$feed_small = $measure_feed($small_limit);
$feed_large = $measure_feed($large_limit);
$simple_feed_small = $measure_simple_feed(array_slice($simple_post_ids, 0, $small_limit));
$simple_feed_large = $measure_simple_feed(array_slice($simple_post_ids, 0, $large_limit));

$conversation_growth = $conversation_small['queries'] !== null && $conversation_large['queries'] !== null
    ? $conversation_large['queries'] - $conversation_small['queries']
    : null;
$feed_growth = $feed_small['queries'] !== null && $feed_large['queries'] !== null
    ? $feed_large['queries'] - $feed_small['queries']
    : null;
$simple_feed_growth = $simple_feed_small['queries'] !== null && $simple_feed_large['queries'] !== null
    ? $simple_feed_large['queries'] - $simple_feed_small['queries']
    : null;
$simple_feed_has_comparable_sample = count($simple_post_ids) >= $small_limit;
$passed = $feed_large['comments_hydrated'] === 0
    && ($conversation_growth === null || $conversation_growth <= 12)
    && ($feed_growth === null || $feed_growth <= 16)
    && (!$simple_feed_has_comparable_sample || $simple_feed_growth === null || $simple_feed_growth <= 2);

echo json_encode(array(
    'limits' => array('small' => $small_limit, 'large' => $large_limit),
    'conversation' => array(
        'small' => $conversation_small,
        'large' => $conversation_large,
        'query_growth' => $conversation_growth,
    ),
    'feed' => array(
        'small' => $feed_small,
        'large' => $feed_large,
        'query_growth' => $feed_growth,
    ),
    'simple_feed' => array(
        'available_posts' => count($simple_post_ids),
        'small' => $simple_feed_small,
        'large' => $simple_feed_large,
        'query_growth' => $simple_feed_growth,
    ),
    'passed' => $passed,
), JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($passed ? 0 : 1);
