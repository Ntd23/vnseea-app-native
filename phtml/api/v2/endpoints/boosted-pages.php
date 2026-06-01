<?php
// English description: Returns current user's boosted pages for the Nuxt account menu route.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['loggedin']) && !empty($_GET['access_token'])) {
    $session_user_id = 0;

    if (function_exists('Wo_GetUserFromSessionID')) {
        $resolved_user_id = Wo_GetUserFromSessionID($_GET['access_token']);
        if (!empty($resolved_user_id)) {
            $session_user_id = (int) $resolved_user_id;
        }
    }

    if (empty($session_user_id) && function_exists('Wo_ValidateAccessToken')) {
        $resolved_user_id = Wo_ValidateAccessToken($_GET['access_token']);
        if (!empty($resolved_user_id)) {
            $session_user_id = (int) $resolved_user_id;
        }
    }

    if (!empty($session_user_id)) {
        $wo['user'] = Wo_UserData($session_user_id);
        $wo['loggedin'] = !empty($wo['user']['user_id']);
    }
}

if (empty($wo['loggedin']) || empty($wo['user']['user_id'])) {
    $error_code = 2;
    $error_message = 'Authentication is required';
}
else if ($wo['config']['pages'] == 0) {
    $error_code = 3;
    $error_message = 'Pages system is disabled';
}
else if ($wo['user']['is_pro'] == 0) {
    $error_code = 5;
    $error_message = 'Pro membership is required';
}
else if (in_array($wo['user']['pro_type'], array_keys($wo['pro_packages'])) && $wo['pro_packages'][$wo['user']['pro_type']]['pages_promotion'] < 1) {
    $error_code = 6;
    $error_message = 'Your Pro package does not include boosted pages';
}

if (empty($error_code)) {
    $pages = Wo_GetBoostedPages($wo['user']['user_id']);

    $response_data = array(
        'api_status' => 200,
        'data' => is_array($pages) ? $pages : array()
    );
}
