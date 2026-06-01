<?php
// English description: Bootstrap the current authenticated backend user and PHP session data for Nuxt bridges.
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
$bootstrapped_standalone = false;

if (!isset($wo) || !is_array($wo)) {
    $bootstrapped_standalone = true;
    header_remove('Server');
    header('Content-type: application/json');

    $root_path = dirname(__DIR__, 3);
    $previous_working_directory = getcwd();

    if ($root_path && is_dir($root_path)) {
        chdir($root_path);
    }

    require_once $root_path . '/assets/init.php';
    require_once $root_path . '/api/v2/init.php';

    if (function_exists('decryptConfigData')) {
        decryptConfigData();
    }

    if ($previous_working_directory) {
        chdir($previous_working_directory);
    }
}

$response_data = array(
    'api_status' => 400,
);

$session_id = '';
if (!empty($_GET['session_id'])) {
    $session_id = $_GET['session_id'];
}

$current_user_id = 0;
if (!empty($session_id) && function_exists('Wo_GetUserFromSessionID')) {
    $resolved_user_id = Wo_GetUserFromSessionID($session_id);
    if (!empty($resolved_user_id)) {
        $current_user_id = (int) $resolved_user_id;
    }
}

if (empty($current_user_id) && !empty($wo['loggedin']) && $wo['loggedin'] === true && !empty($wo['user']['user_id'])) {
    $current_user_id = (int) $wo['user']['user_id'];
}

if (empty($current_user_id)) {
    $response_data = array(
        'api_status' => '401',
        'errors' => array(
            'error_id' => '1',
            'error_text' => 'User is not authenticated',
        ),
    );
} else {
    $current_user = Wo_UserData($current_user_id);
    // Keep bootstrap lightweight; profile detail refresh can fail under strict SQL mode and break session hash creation.
    $ads_currency = !empty($wo['config']['ads_currency']) ? (string) $wo['config']['ads_currency'] : (!empty($wo['config']['currency']) ? (string) $wo['config']['currency'] : 'USD');
    $currency_symbol = function_exists('Wo_GetCurrency') ? Wo_GetCurrency($ads_currency) : '$';
    $exchange_rates = array();

    if (!empty($wo['config']['exchange'])) {
        if (is_array($wo['config']['exchange'])) {
            $exchange_rates = $wo['config']['exchange'];
        } else {
            $decoded_exchange_rates = json_decode(html_entity_decode($wo['config']['exchange']), true);
            if (is_array($decoded_exchange_rates)) {
                $exchange_rates = $decoded_exchange_rates;
            }
        }
    }

    $exchange_needs_refresh = empty($exchange_rates)
        || empty($exchange_rates['VND'])
        || (!empty($wo['config']['exchange_update']) && (int) $wo['config']['exchange_update'] < time());

    if ($exchange_needs_refresh && !empty($wo['config']['exchangerate_key']) && function_exists('fetchDataFromURL')) {
        $exchange_base_currency = !empty($wo['config']['currency']) ? (string) $wo['config']['currency'] : $ads_currency;
        $request = fetchDataFromURL("https://v6.exchangerate-api.com/v6/" . $wo['config']['exchangerate_key'] . "/latest/" . $exchange_base_currency);
        $exchange = json_decode($request, true);

        if (!empty($exchange) && !empty($exchange['result']) && $exchange['result'] === 'success' && !empty($exchange['conversion_rates']) && is_array($exchange['conversion_rates'])) {
            $exchange_rates = $exchange['conversion_rates'];
            if (function_exists('Wo_SaveConfig')) {
                Wo_SaveConfig('exchange', json_encode($exchange_rates));
                Wo_SaveConfig('exchange_update', (time() + (60 * 60 * 12)));
            }
        }
    }

    $vnd_exchange_rate = 0;
    if (!empty($exchange_rates['VND']) && is_numeric($exchange_rates['VND']) && (float) $exchange_rates['VND'] > 1000) {
        $vnd_exchange_rate = (float) $exchange_rates['VND'];
    } elseif (!empty($exchange_rates['USD']) && is_numeric($exchange_rates['USD']) && (float) $exchange_rates['USD'] > 0 && (float) $exchange_rates['USD'] < 1) {
        $vnd_exchange_rate = 1 / (float) $exchange_rates['USD'];
    } elseif ($ads_currency === 'VND' && !empty($wo['config']['usd_to_vnd_rate']) && is_numeric($wo['config']['usd_to_vnd_rate'])) {
        $vnd_exchange_rate = (float) $wo['config']['usd_to_vnd_rate'];
    } elseif ($ads_currency === 'VND') {
        $vnd_exchange_rate = 25000;
    }

    $usd_to_wallet_rate = 1;
    if ($ads_currency === 'VND') {
        $usd_to_wallet_rate = $vnd_exchange_rate;
    } elseif ($ads_currency === 'USD') {
        $usd_to_wallet_rate = 1;
    } elseif ($ads_currency !== 'USD' && !empty($exchange_rates[$ads_currency]) && is_numeric($exchange_rates[$ads_currency])) {
        $usd_to_wallet_rate = (float) $exchange_rates[$ads_currency];
    }

    $notification_settings = array();
    if (!empty($current_user['notification_settings'])) {
        $decoded_notification_settings = json_decode(html_entity_decode($current_user['notification_settings']), true);
        if (is_array($decoded_notification_settings)) {
            $notification_settings = $decoded_notification_settings;
        }
    }

    $current_pro_type = isset($current_user['pro_type']) ? (string) $current_user['pro_type'] : '';
    $current_pro_package = (!empty($current_pro_type) && !empty($wo['pro_packages'][$current_pro_type]) && is_array($wo['pro_packages'][$current_pro_type]))
        ? $wo['pro_packages'][$current_pro_type]
        : array();

    $response_data = array(
        'api_status' => 200,
        'user_data' => array(
            'user_id' => (int) $current_user['user_id'],
            'name' => !empty($current_user['name'])
                ? $current_user['name']
                : (!empty(trim(($current_user['first_name'] ?? '') . ' ' . ($current_user['last_name'] ?? '')))
                    ? trim(($current_user['first_name'] ?? '') . ' ' . ($current_user['last_name'] ?? ''))
                    : (!empty($current_user['username']) ? $current_user['username'] : 'User')),
            'username' => !empty($current_user['username']) ? $current_user['username'] : '',
            'avatar' => !empty($current_user['avatar']) ? $current_user['avatar'] : '',
            'cover' => !empty($current_user['cover']) ? $current_user['cover'] : '',
            'admin' => isset($current_user['admin']) ? (int) $current_user['admin'] : 0,
            'email' => !empty($current_user['email']) ? $current_user['email'] : '',
            'phone_number' => !empty($current_user['phone_number']) ? $current_user['phone_number'] : '',
            'gender' => !empty($current_user['gender']) ? $current_user['gender'] : '',
            'birthday' => !empty($current_user['birthday']) ? $current_user['birthday'] : '',
            'country_id' => isset($current_user['country_id']) ? (string) $current_user['country_id'] : '',
            'website' => !empty($current_user['website']) ? $current_user['website'] : '',
            'about' => !empty($current_user['about']) ? $current_user['about'] : '',
            'first_name' => !empty($current_user['first_name']) ? $current_user['first_name'] : '',
            'last_name' => !empty($current_user['last_name']) ? $current_user['last_name'] : '',
            'working' => !empty($current_user['working']) ? $current_user['working'] : '',
            'working_link' => !empty($current_user['working_link']) ? $current_user['working_link'] : '',
            'address' => !empty($current_user['address']) ? $current_user['address'] : '',
            'school' => !empty($current_user['school']) ? $current_user['school'] : '',
            'school_completed' => isset($current_user['school_completed']) ? (int) $current_user['school_completed'] : 0,
            'relationship_id' => isset($current_user['relationship_id']) ? (string) $current_user['relationship_id'] : '',
            'facebook' => !empty($current_user['facebook']) ? $current_user['facebook'] : '',
            'twitter' => !empty($current_user['twitter']) ? $current_user['twitter'] : '',
            'linkedin' => !empty($current_user['linkedin']) ? $current_user['linkedin'] : '',
            'instagram' => !empty($current_user['instagram']) ? $current_user['instagram'] : '',
            'youtube' => !empty($current_user['youtube']) ? $current_user['youtube'] : '',
            'vk' => !empty($current_user['vk']) ? $current_user['vk'] : '',
            'message_privacy' => isset($current_user['message_privacy']) ? (string) $current_user['message_privacy'] : '',
            'follow_privacy' => isset($current_user['follow_privacy']) ? (string) $current_user['follow_privacy'] : '',
            'friend_privacy' => isset($current_user['friend_privacy']) ? (string) $current_user['friend_privacy'] : '',
            'post_privacy' => !empty($current_user['post_privacy']) ? $current_user['post_privacy'] : '',
            'showlastseen' => isset($current_user['showlastseen']) ? (string) $current_user['showlastseen'] : '',
            'confirm_followers' => isset($current_user['confirm_followers']) ? (string) $current_user['confirm_followers'] : '',
            'show_activities_privacy' => isset($current_user['show_activities_privacy']) ? (string) $current_user['show_activities_privacy'] : '',
            'visit_privacy' => isset($current_user['visit_privacy']) ? (string) $current_user['visit_privacy'] : '',
            'birth_privacy' => isset($current_user['birth_privacy']) ? (string) $current_user['birth_privacy'] : '',
            'status' => isset($current_user['status']) ? (string) $current_user['status'] : '',
            'share_my_location' => isset($current_user['share_my_location']) ? (string) $current_user['share_my_location'] : '',
            'share_my_data' => isset($current_user['share_my_data']) ? (string) $current_user['share_my_data'] : '',
            'e_liked' => isset($current_user['e_liked']) ? (int) $current_user['e_liked'] : 0,
            'e_shared' => isset($current_user['e_shared']) ? (int) $current_user['e_shared'] : 0,
            'e_wondered' => isset($current_user['e_wondered']) ? (int) $current_user['e_wondered'] : 0,
            'e_commented' => isset($current_user['e_commented']) ? (int) $current_user['e_commented'] : 0,
            'e_followed' => isset($current_user['e_followed']) ? (int) $current_user['e_followed'] : 0,
            'e_liked_page' => isset($current_user['e_liked_page']) ? (int) $current_user['e_liked_page'] : 0,
            'e_visited' => isset($current_user['e_visited']) ? (int) $current_user['e_visited'] : 0,
            'e_mentioned' => isset($current_user['e_mentioned']) ? (int) $current_user['e_mentioned'] : 0,
            'e_joined_group' => isset($current_user['e_joined_group']) ? (int) $current_user['e_joined_group'] : 0,
            'e_accepted' => isset($current_user['e_accepted']) ? (int) $current_user['e_accepted'] : 0,
            'e_profile_wall_post' => isset($current_user['e_profile_wall_post']) ? (int) $current_user['e_profile_wall_post'] : 0,
            'e_sentme_msg' => isset($current_user['e_sentme_msg']) ? (int) $current_user['e_sentme_msg'] : 0,
            'notification_settings' => $notification_settings,
            'two_factor' => isset($current_user['two_factor']) ? (int) $current_user['two_factor'] : 0,
            'two_factor_verified' => isset($current_user['two_factor_verified']) ? (int) $current_user['two_factor_verified'] : 0,
            'two_factor_method' => !empty($current_user['two_factor_method']) ? $current_user['two_factor_method'] : '',
            'background_image_status' => isset($current_user['background_image_status']) ? (int) $current_user['background_image_status'] : 0,
            'css_file' => !empty($current_user['css_file']) ? $current_user['css_file'] : '',
            'verified' => isset($current_user['verified']) ? (int) $current_user['verified'] : 0,
            'active' => isset($current_user['active']) ? (int) $current_user['active'] : 0,
            'pro_type' => $current_pro_type,
            'is_pro' => isset($current_user['is_pro']) ? (int) $current_user['is_pro'] : 0,
            'can_boost_posts' => !empty($current_pro_package['posts_promotion']) ? (int) $current_pro_package['posts_promotion'] : 0,
            'can_boost_pages' => !empty($current_pro_package['pages_promotion']) ? (int) $current_pro_package['pages_promotion'] : 0,
            'wallet' => $current_user['wallet'] ?? null,
            'points' => $current_user['points'] ?? null,
            'points_config' => array(
                'point_allow_withdrawal' => isset($wo['config']['point_allow_withdrawal']) ? (int) $wo['config']['point_allow_withdrawal'] : 0,
                'dollar_to_point_cost' => isset($wo['config']['dollar_to_point_cost']) ? (float) $wo['config']['dollar_to_point_cost'] : 0,
                'ads_currency' => $ads_currency,
                'currency_symbol' => $currency_symbol,
                'point_base_currency' => 'USD',
                'wallet_currency' => $ads_currency,
                'wallet_exchange_rate' => $usd_to_wallet_rate,
                'display_currency' => 'VND',
                'display_currency_symbol' => function_exists('Wo_GetCurrency') ? Wo_GetCurrency('VND') : '₫',
                'display_exchange_rate' => $vnd_exchange_rate,
                'exchange_update' => isset($wo['config']['exchange_update']) ? (int) $wo['config']['exchange_update'] : 0,
            ),
            'session_hash' => function_exists('Wo_CreateSession') ? Wo_CreateSession() : '',
        ),
    );
}

if ($bootstrapped_standalone === true) {
    header('Content-Type: application/json');
    echo json_encode($response_data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}
