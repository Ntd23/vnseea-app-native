<?php
// English description: Sends OneSignal push notifications for web and mobile clients.
function Wo_VnseeaPushDebugLog($event, $context = array()) {
    $log_dir = dirname(dirname(__DIR__)) . '/xhr/logs';
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0755, true);
    }
    $payload = array(
        'event' => $event,
        'time' => date('c'),
        'context' => Wo_VnseeaPushDebugSanitize($context)
    );
    $line = '[vnseea_push_debug] ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    error_log($line);
    @file_put_contents($log_dir . '/vnseea_push_debug.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function Wo_VnseeaPushDebugSanitize($value) {
    if (is_array($value)) {
        $result = array();
        foreach ($value as $key => $item) {
            $result[$key] = Wo_VnseeaPushDebugSanitize($item);
        }
        return $result;
    }
    if (is_object($value)) {
        return Wo_VnseeaPushDebugSanitize(json_decode(json_encode($value), true));
    }
    if (is_string($value)) {
        $clean = str_replace(array("\r", "\n"), ' ', $value);
        if (strlen($clean) > 500) {
            return substr($clean, 0, 500) . '...';
        }
        return $clean;
    }
    return $value;
}

function Wo_VnseeaPushMaskValue($value) {
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

function Wo_VnseeaPushMaskList($values) {
    if (!is_array($values)) {
        $values = array($values);
    }
    $masked = array();
    foreach ($values as $value) {
        $masked[] = Wo_VnseeaPushMaskValue($value);
    }
    return $masked;
}

function Wo_LiveKitPushDataFromContent($content) {
    if (empty($content) || !is_string($content)) {
        return false;
    }
    $decoded_content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $payload = json_decode($decoded_content, true);
    if (empty($payload) || !is_array($payload)) {
        $payload = json_decode($content, true);
    }
    if (empty($payload) || !is_array($payload)) {
        return false;
    }
    $event_type = !empty($payload['event_type']) ? $payload['event_type'] : '';
    $provider = !empty($payload['provider']) ? $payload['provider'] : '';
    if ($event_type != 'livekit_call' && $event_type != 'livekit_group_call' && $provider != 'livekit') {
        return false;
    }
    if (empty($payload['event_type']) && $provider == 'livekit') {
        $is_group = (!empty($payload['call_context']) && $payload['call_context'] == 'group') || (!empty($payload['type']) && $payload['type'] == 'group') || !empty($payload['group_id']);
        $payload['event_type'] = $is_group ? 'livekit_group_call' : 'livekit_call';
    }
    return $payload;
}

function Wo_LiveKitPushContent($payload) {
    $is_group = (!empty($payload['event_type']) && $payload['event_type'] == 'livekit_group_call') || (!empty($payload['call_context']) && $payload['call_context'] == 'group');
    $call_type = (!empty($payload['call_type']) && $payload['call_type'] == 'audio') ? 'audio' : 'video';
    if ($is_group) {
        return ($call_type == 'audio') ? 'Cuộc gọi nhóm thoại đến' : 'Cuộc gọi nhóm video đến';
    }
    return ($call_type == 'audio') ? 'Cuộc gọi thoại đến' : 'Cuộc gọi video đến';
}

function Wo_SendPushNotification($data = array(), $push_type = 'chat') {
    global $sqlConnect, $wo;
    if (empty($data)) {
        Wo_VnseeaPushDebugLog('onesignal_send_skipped', array(
            'push_type' => $push_type,
            'reason' => 'data_empty'
        ));
        return false;
    }
    if (empty($data['notification']['notification_content'])) {
        Wo_VnseeaPushDebugLog('onesignal_send_skipped', array(
            'push_type' => $push_type,
            'reason' => 'content_empty',
            'send_to_count' => !empty($data['send_to']) && is_array($data['send_to']) ? count($data['send_to']) : 0
        ));
        return false;
    }
    if (empty($data['send_to'])) {
        Wo_VnseeaPushDebugLog('onesignal_send_skipped', array(
            'push_type' => $push_type,
            'reason' => 'send_to_empty',
            'content_present' => 1
        ));
        return false;
    }
    if ($wo['config']['push'] == 0) {
        Wo_VnseeaPushDebugLog('onesignal_send_skipped', array(
            'push_type' => $push_type,
            'reason' => 'global_push_disabled',
            'send_to_count' => is_array($data['send_to']) ? count($data['send_to']) : 1,
            'send_to_masked' => Wo_VnseeaPushMaskList($data['send_to'])
        ));
        return false;
    }
    $default_mobile_notification_sound = 'app_notification_sound';
    $default_android_notification_channel = 'vnseea_notifications_sound_v1';
    $app_id  = '';
    $app_key = '';
    if ($push_type == 'android_messenger') {
        $app_id  = $wo['config']['android_m_push_id'];
        $app_key = $wo['config']['android_m_push_key'];
    } else if ($push_type == 'ios_messenger') {
        $app_id  = $wo['config']['ios_m_push_id'];
        $app_key = $wo['config']['ios_m_push_key'];
    } else if ($push_type == 'android_native') {
        $app_id  = $wo['config']['android_n_push_id'];
        $app_key = $wo['config']['android_n_push_key'];
    } else if ($push_type == 'ios_native') {
        $app_id  = $wo['config']['ios_n_push_id'];
        $app_key = $wo['config']['ios_n_push_key'];
    } else if ($push_type == 'web') {
        $app_id  = $wo['config']['web_push_id'];
        $app_key = $wo['config']['web_push_key'];
    }
    $livekit_payload = false;
    if (!empty($data['notification']['notification_data']) && is_array($data['notification']['notification_data'])) {
        $livekit_payload = Wo_LiveKitPushDataFromContent(json_encode($data['notification']['notification_data']));
    }
    if (empty($livekit_payload)) {
        $livekit_payload = Wo_LiveKitPushDataFromContent($data['notification']['notification_content']);
    }
    if (!empty($livekit_payload)) {
        $data['notification']['notification_data'] = array_merge($livekit_payload, !empty($data['notification']['notification_data']) && is_array($data['notification']['notification_data']) ? $data['notification']['notification_data'] : array());
        $data['notification']['notification_content'] = Wo_LiveKitPushContent($data['notification']['notification_data']);
        $data['notification']['send_immediately'] = true;
        if (empty($data['notification']['request_data']) || !is_array($data['notification']['request_data'])) {
            $data['notification']['request_data'] = array();
        }
        $data['notification']['request_data'] = array_merge(array(
            'ttl' => 45,
            'android_visibility' => 1,
            'android_group' => 'vnseea_livekit_calls',
            'collapse_id' => 'livekit_call_' . (!empty($data['notification']['notification_data']['call_id']) ? $data['notification']['notification_data']['call_id'] : time())
        ), $data['notification']['request_data']);
        unset($data['notification']['request_data']['android_channel_id']);
    }
    $data['notification']['notification_content'] = Wo_EmoPhone($data['notification']['notification_content']);
    $data['notification']['notification_content'] = Wo_EditMarkup($data['notification']['notification_content']);
    $recipient_player_ids = $data['send_to'];
    $final_request_data                           = array(
        'app_id' => $app_id,
        'include_player_ids' => $recipient_player_ids,
        'isChrome' => false,
        'contents' => array(
            'en' => $data['notification']['notification_content']
        ),
        'headings' => array(
            'en' => $data['notification']['notification_title']
        ),
        'android_led_color' => 'FF0000FF',
        'priority' => 10
    );
    if (empty($data['notification']['send_immediately'])) {
        $final_request_data['send_after'] = new \DateTime('1 second');
    }
    if (!empty($data['notification']['notification_data'])) {
        $final_request_data['data'] = $data['notification']['notification_data'];
    }
    if (!empty($data['notification']['notification_image'])) {
        $final_request_data['large_icon'] = $data['notification']['notification_image'];
    }
    if (!empty($data['notification']['request_data']) && is_array($data['notification']['request_data'])) {
        foreach ($data['notification']['request_data'] as $key => $value) {
            $final_request_data[$key] = $value;
        }
    }
    if (empty($livekit_payload)) {
        if ($push_type == 'android_messenger' || $push_type == 'android_native') {
            if (empty($final_request_data['android_sound'])) {
                $final_request_data['android_sound'] = $default_mobile_notification_sound;
            }
            if (empty($final_request_data['android_channel_id']) && empty($final_request_data['existing_android_channel_id'])) {
                $final_request_data['existing_android_channel_id'] = $default_android_notification_channel;
            }
        }
        if ($push_type == 'ios_messenger' || $push_type == 'ios_native') {
            if (empty($final_request_data['ios_sound'])) {
                $final_request_data['ios_sound'] = $default_mobile_notification_sound . '.mp3';
            }
        }
    }
    if (!empty($livekit_payload)) {
        error_log('[onesignal_livekit_payload] ' . json_encode(array(
            'push_type' => $push_type,
            'send_to_count' => is_array($data['send_to']) ? count($data['send_to']) : 0,
            'event_type' => !empty($final_request_data['data']['event_type']) ? $final_request_data['data']['event_type'] : '',
            'call_id' => !empty($final_request_data['data']['call_id']) ? $final_request_data['data']['call_id'] : '',
            'call_type' => !empty($final_request_data['data']['call_type']) ? $final_request_data['data']['call_type'] : '',
            'content' => $final_request_data['contents']['en'],
            'has_action_token' => !empty($final_request_data['data']['action_token'])
        )));
    }
    Wo_VnseeaPushDebugLog('onesignal_send_attempt', array(
        'push_type' => $push_type,
        'send_to_count' => is_array($recipient_player_ids) ? count($recipient_player_ids) : 1,
        'send_to_masked' => Wo_VnseeaPushMaskList($recipient_player_ids),
        'app_id_present' => !empty($app_id) ? 1 : 0,
        'app_id_masked' => Wo_VnseeaPushMaskValue($app_id),
        'app_key_present' => !empty($app_key) ? 1 : 0,
        'global_push_enabled' => !empty($wo['config']['push']) ? 1 : 0,
        'ios_push_messages' => !empty($wo['config']['ios_push_messages']) ? 1 : 0,
        'ios_push_native' => !empty($wo['config']['ios_push_native']) ? 1 : 0,
        'android_push_messages' => !empty($wo['config']['android_push_messages']) ? 1 : 0,
        'android_push_native' => !empty($wo['config']['android_push_native']) ? 1 : 0,
        'notification_title_present' => !empty($data['notification']['notification_title']) ? 1 : 0,
        'notification_content_present' => !empty($data['notification']['notification_content']) ? 1 : 0,
        'notification_data_type' => !empty($final_request_data['data']['type']) ? $final_request_data['data']['type'] : '',
        'notification_data_call_id' => !empty($final_request_data['data']['call_id']) ? $final_request_data['data']['call_id'] : '',
        'is_livekit' => !empty($livekit_payload) ? 1 : 0,
        'android_channel' => !empty($final_request_data['existing_android_channel_id']) ? $final_request_data['existing_android_channel_id'] : '',
        'ios_sound' => !empty($final_request_data['ios_sound']) ? $final_request_data['ios_sound'] : ''
    ));
    $fields = json_encode($final_request_data);
    $ch     = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://onesignal.com/api/v1/notifications");
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json; charset=utf-8',
        'Authorization: Basic ' . $app_key
    ));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!empty($livekit_payload)) {
        error_log('[onesignal_livekit_response] ' . json_encode(array(
            'curl_error' => $curl_error,
            'response' => $response
        )));
    }
    $decoded_response = json_decode($response);
    Wo_VnseeaPushDebugLog('onesignal_send_response', array(
        'push_type' => $push_type,
        'http_status' => $http_status,
        'curl_error' => $curl_error,
        'response_id_present' => !empty($decoded_response->id) ? 1 : 0,
        'response_id_masked' => !empty($decoded_response->id) ? Wo_VnseeaPushMaskValue($decoded_response->id) : Wo_VnseeaPushMaskValue(''),
        'recipients' => !empty($decoded_response->recipients) ? $decoded_response->recipients : 0,
        'errors' => !empty($decoded_response->errors) ? $decoded_response->errors : '',
        'response_preview' => is_string($response) ? substr(str_replace(array("\r", "\n"), ' ', $response), 0, 400) : '',
        'send_to_count' => is_array($recipient_player_ids) ? count($recipient_player_ids) : 1
    ));
    if (!empty($decoded_response->id)) {
        return $decoded_response->id;
    }
    return false;
}
?>
