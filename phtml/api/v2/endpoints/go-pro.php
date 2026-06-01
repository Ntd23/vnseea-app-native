<?php
// English description: Exposes active Pro packages as JSON for the Nuxt go-pro bridge using backend package configuration.

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

$packages = array();
foreach ($wo['pro_packages'] as $key => $package) {
    if (empty($package['status'])) {
        continue;
    }

    $package['type'] = $key;
    $packages[] = $package;
}

$response_data = array(
    'api_status' => 200,
    'membership_system' => !empty($wo['config']['membership_system']),
    'currency' => $wo['config']['currency'],
    'currency_symbol' => $wo['config']['currency_symbol_array'][$wo['config']['currency']],
    'current_pro_type' => !empty($wo['user']['pro_type']) ? $wo['user']['pro_type'] : '',
    'current_is_pro' => !empty($wo['user']['is_pro']),
    'packages' => $packages
);
