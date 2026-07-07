<?php
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
function Wo_VnseeaLogoutDebugLog($event, $context = array()) {
    $log_dir = dirname(dirname(dirname(__DIR__))) . '/xhr/logs';
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0755, true);
    }
    $payload = array(
        'event' => $event,
        'time' => date('c'),
        'context' => Wo_VnseeaLogoutDebugSanitize($context)
    );
    $line = '[vnseea_logout_debug] ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    error_log($line);
    @file_put_contents($log_dir . '/vnseea_logout_debug.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function Wo_VnseeaLogoutDebugSanitize($value) {
    if (is_array($value)) {
        $result = array();
        foreach ($value as $key => $item) {
            $result[$key] = Wo_VnseeaLogoutDebugSanitize($item);
        }
        return $result;
    }
    if (is_object($value)) {
        return Wo_VnseeaLogoutDebugSanitize(json_decode(json_encode($value), true));
    }
    if (is_string($value)) {
        return str_replace(array("\r", "\n"), ' ', $value);
    }
    return $value;
}

function Wo_VnseeaLogoutMaskValue($value) {
    if (empty($value) || !is_string($value)) {
        return array(
            'present' => 0,
            'length' => 0,
            'suffix' => ''
        );
    }
    return array(
        'present' => 1,
        'length' => strlen($value),
        'suffix' => substr($value, -8)
    );
}

$response_data       = array(
    'api_status' => 400
);
$access_token        = Wo_Secure($_GET['access_token']);
$user_id             = $wo['user']['user_id'];
Wo_VnseeaLogoutDebugLog('logout_request', array(
    'user_id' => $user_id,
    'access_token_masked' => Wo_VnseeaLogoutMaskValue($access_token)
));
$remove_access_token = mysqli_query($sqlConnect, "DELETE FROM " . T_APP_SESSIONS . " WHERE `session_id` = '{$access_token}'");
if ($remove_access_token) {
    Wo_VnseeaLogoutDebugLog('logout_access_token_deleted', array(
        'user_id' => $user_id,
        'access_token_masked' => Wo_VnseeaLogoutMaskValue($access_token)
    ));
    //$update = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `device_id` = '' WHERE `user_id` = '{$user_id}'");
    $update  = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `android_m_device_id` = '' , `ios_m_device_id` = '' , `android_n_device_id` = '' , `ios_n_device_id` = '' WHERE `user_id` = '{$user_id}'");
    if ($update) {
        Wo_VnseeaLogoutDebugLog('logout_device_ids_cleared', array(
            'user_id' => $user_id,
            'android_m_device_id_cleared' => 1,
            'ios_m_device_id_cleared' => 1,
            'android_n_device_id_cleared' => 1,
            'ios_n_device_id_cleared' => 1
        ));
        cache($user_id, 'users', 'delete');
        $response_data = array(
            'api_status' => 200
        );
    } else {
        Wo_VnseeaLogoutDebugLog('logout_device_ids_clear_error', array(
            'user_id' => $user_id,
            'db_error' => mysqli_error($sqlConnect)
        ));
    }
} else {
    Wo_VnseeaLogoutDebugLog('logout_access_token_delete_error', array(
        'user_id' => $user_id,
        'access_token_masked' => Wo_VnseeaLogoutMaskValue($access_token),
        'db_error' => mysqli_error($sqlConnect)
    ));
}
