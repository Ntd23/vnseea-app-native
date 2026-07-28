<?php

$request = array(
    'query' => isset($_POST['query']) ? $_POST['query'] : '',
    'postPrivacy' => isset($_POST['postPrivacy']) ? $_POST['postPrivacy'] : 0,
    'privacy_contract' => isset($_POST['privacy_contract']) ? $_POST['privacy_contract'] : '',
    'page_id' => isset($_POST['page_id']) ? $_POST['page_id'] : 0,
    'group_id' => isset($_POST['group_id']) ? $_POST['group_id'] : 0,
    'event_id' => isset($_POST['event_id']) ? $_POST['event_id'] : 0,
    'cursor' => isset($_POST['cursor']) ? $_POST['cursor'] : '',
    'limit' => isset($_POST['limit']) ? $_POST['limit'] : 20,
    'user_ids' => isset($_POST['user_ids']) ? $_POST['user_ids'] : array()
);

if (mb_strlen(trim((string) $request['query'])) > 120) {
    $error_code = 20;
    $error_message = 'Search query is too long.';
} else {
    $result = VNSEEA_SearchTaggableUsers((int) $wo['user']['user_id'], $request);
    if (empty($result['valid'])) {
        $error_code = 21;
        $error_message = !empty($result['error_code']) ? $result['error_code'] : 'Unable to load taggable users.';
    } else {
        $response_data = array(
            'api_status' => 200,
            'data' => $result['data'],
            'next_cursor' => $result['next_cursor'],
            'has_more' => $result['has_more']
        );
    }
}
