<?php

$action = isset($_POST['action']) ? (string)$_POST['action'] : '';

switch ($action) {
    case 'register':
        if (empty($wo['loggedin']) || empty($wo['user']['user_id'])) {
            $error_code = 2;
            $error_message = 'not_authorized';
            break;
        }
        $registration = VNSEEA_RegisterPushInstallation((int)$wo['user']['user_id'], $_POST);
        if (empty($registration['ok'])) {
            $error_code = 4;
            $error_message = $registration['error_code'];
            break;
        }
        $response_data = array(
            'api_status' => 200,
            'installation_id' => (string)$_POST['installation_id'],
            'provider' => (string)$_POST['provider']
        );
        break;

    case 'release':
        $installation_id = isset($_POST['installation_id']) ? (string)$_POST['installation_id'] : '';
        $device_secret = isset($_POST['device_secret']) ? (string)$_POST['device_secret'] : '';
        $release = VNSEEA_ReleasePushInstallation($installation_id, $device_secret);
        if (empty($release['ok'])) {
            $error_code = 4;
            $error_message = $release['error_code'];
            break;
        }
        $response_data = array(
            'api_status' => 200,
            'idempotent_replay' => !empty($release['idempotent_replay'])
        );
        break;

    case 'deactivate':
        if (empty($wo['loggedin']) || empty($wo['user']['user_id'])) {
            $error_code = 2;
            $error_message = 'not_authorized';
            break;
        }
        $deactivation = VNSEEA_DeactivatePushProvider((int)$wo['user']['user_id'], $_POST);
        if (empty($deactivation['ok'])) {
            $error_code = 4;
            $error_message = $deactivation['error_code'];
            break;
        }
        $response_data = array('api_status' => 200);
        break;

    default:
        $error_code = 4;
        $error_message = 'invalid_push_device_action';
        break;
}
