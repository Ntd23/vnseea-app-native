<?php
// English description: Exposes forum sections and forums as JSON for the Nuxt forum bridge while reusing existing WoWonder forum functions.

$response_data = array(
    'api_status' => 400
);

$limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50) ? Wo_Secure($_POST['limit']) : 20;
$offset = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0) ? Wo_Secure($_POST['offset']) : 0;
$keyword = !empty($_POST['keyword']) ? Wo_Secure($_POST['keyword']) : '';

if ($wo['config']['forum'] == 0) {
    $error_code = 5;
    $error_message = 'forum is disabled';
}

if (empty($error_code)) {
    $sections = Wo_GetForumSec(array(
        'forums' => true,
        'limit' => $limit,
        'offset' => $offset,
        'search' => !empty($keyword),
        'keyword' => $keyword
    ));

    $response_data = array(
        'api_status' => 200,
        'can_create' => !empty($wo['config']['can_use_forum']),
        'sections' => $sections,
        'has_more' => count($sections) >= $limit,
        'next_offset' => !empty($sections) ? end($sections)['id'] : null
    );
}
