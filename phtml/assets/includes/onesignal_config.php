<?php
// English description: Sends OneSignal push notifications for web and mobile clients.
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
        return false;
    }
    if (empty($data['notification']['notification_content'])) {
        return false;
    }
    if (empty($data['send_to'])) {
        return false;
    }
    if ($wo['config']['push'] == 0) {
        return false;
    }
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
    $final_request_data                           = array(
        'app_id' => $app_id,
        'include_player_ids' => $data['send_to'],
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
    curl_close($ch);
    if (!empty($livekit_payload)) {
        error_log('[onesignal_livekit_response] ' . json_encode(array(
            'curl_error' => $curl_error,
            'response' => $response
        )));
    }
    $response = json_decode($response);
    if (!empty($response->id)) {
        return $response->id;
    }
    return false;
}
?>
