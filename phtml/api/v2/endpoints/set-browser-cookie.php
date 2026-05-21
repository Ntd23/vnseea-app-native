<?php
// English description: Sets the backend browser session from an API access token and redirects back to the Nuxt app.
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
$root_path = dirname(__DIR__, 3);
$previous_working_directory = getcwd();

if (!defined('T_APP_SESSIONS')) {
    chdir($root_path);
    require_once $root_path . '/assets/init.php';
    require_once $root_path . '/api/v2/init.php';
    if (function_exists('decryptConfigData')) {
        decryptConfigData();
    }
    if ($previous_working_directory !== false) {
        chdir($previous_working_directory);
    }
}

$response_data = array(
    'api_status' => 400,
);

$access_token = !empty($_POST['access_token']) ? Wo_Secure($_POST['access_token']) : '';

if (empty($access_token)) {
    $response_data = array(
        'api_status' => '404',
        'errors' => array(
            'error_id' => '1',
            'error_text' => 'Error: access_token is missing',
        ),
    );
    header('Content-Type: application/json');
    echo json_encode($response_data, JSON_PRETTY_PRINT);
    exit();
}

if (!empty(Wo_GetUserFromSessionID($access_token))) {
    $_SESSION['user_id'] = $access_token;
    setcookie('user_id', $access_token, time() + (10 * 365 * 24 * 60 * 60), '/');
    header('Location: ' . rtrim($wo['config']['site_url'], '/') . '/home?cache=' . time());
    exit();
}

$response_data = array(
    'api_status' => '404',
    'errors' => array(
        'error_id' => '2',
        'error_text' => 'Invalid or expired access_token',
    ),
);
header('Content-Type: application/json');
echo json_encode($response_data, JSON_PRETTY_PRINT);
exit();
