<?php

// Authenticated current-state collections for saved/reacted/commented/shared posts.

require_once 'assets/includes/vnseea_post_activity.php';

$category = VNSEEA_PostActivityNormalizeCategory(isset($_POST['category']) ? $_POST['category'] : null);
$limit = VNSEEA_PostActivityNormalizeLimit(isset($_POST['limit']) ? $_POST['limit'] : null);
$cursor = null;

if ($category === null) {
    $error_code = 4;
    $error_message = 'category must be one of saved, reaction, comment, share';
}
else if ($limit === null) {
    $error_code = 5;
    $error_message = 'limit must be an integer between 1 and 30';
}
else if (!empty($_POST['cursor'])) {
    $cursor = VNSEEA_PostActivityDecodeCursor($_POST['cursor']);
    if ($cursor === null) {
        $error_code = 6;
        $error_message = 'cursor is invalid';
    }
}
if (empty($error_code)) {
    $page = VNSEEA_GetPostActivityPage((int) $wo['user']['user_id'], $category, $limit, $cursor);
    if ($page === false) {
        $error_code = 7;
        $error_message = 'Could not load post activity';
    }
    else {
        $response_data = array(
            'api_status' => 200,
            'data' => $page['items'],
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['has_more'],
        );
    }
}
