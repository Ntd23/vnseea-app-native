<?php
// English description: Shares canonical direct LiveKit call creation and push delivery across API v2 and Nuxt.

if (!function_exists('Wo_CanonicalLiveKitCallUuid')) {
    function Wo_CanonicalLiveKitCallUuid($call_id, $call_type)
    {
        $hex = md5('vnseea-livekit|' . $call_type . '|' . $call_id);
        return substr($hex, 0, 8) . '-' .
            substr($hex, 8, 4) . '-' .
            substr($hex, 12, 4) . '-' .
            substr($hex, 16, 4) . '-' .
            substr($hex, 20, 12);
    }
}

if (!function_exists('Wo_CanonicalLiveKitBase64UrlEncode')) {
    function Wo_CanonicalLiveKitBase64UrlEncode($value)
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}

if (!function_exists('Wo_CanonicalLiveKitActionSecret')) {
    function Wo_CanonicalLiveKitActionSecret()
    {
        global $wo;
        if (!empty($wo['config']['livekit_api_secret'])) {
            return trim($wo['config']['livekit_api_secret']);
        }
        if (!empty($wo['config']['widnows_app_api_key'])) {
            return trim($wo['config']['widnows_app_api_key']);
        }
        return '';
    }
}

if (!function_exists('Wo_CanonicalLiveKitSignActionToken')) {
    function Wo_CanonicalLiveKitSignActionToken($payload)
    {
        $secret = Wo_CanonicalLiveKitActionSecret();
        if ($secret === '') {
            return '';
        }
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $body = Wo_CanonicalLiveKitBase64UrlEncode($json);
        $signature = hash_hmac('sha256', $body, $secret);
        return $body . '.' . $signature;
    }
}

if (!function_exists('Wo_CanonicalLiveKitUser')) {
    function Wo_CanonicalLiveKitUser($user_data)
    {
        if (empty($user_data) || !is_array($user_data)) {
            return array(
                'id' => '',
                'name' => '',
                'avatar' => '',
                'username' => ''
            );
        }

        $avatar = !empty($user_data['avatar']) ? $user_data['avatar'] : '';
        if ($avatar !== '' && !filter_var($avatar, FILTER_VALIDATE_URL)) {
            $avatar = Wo_GetMedia(ltrim($avatar, '/'));
        }

        return array(
            'id' => (string) (!empty($user_data['user_id']) ? $user_data['user_id'] : ''),
            'name' => !empty($user_data['name']) ? $user_data['name'] : '',
            'avatar' => $avatar,
            'username' => !empty($user_data['username']) ? $user_data['username'] : ''
        );
    }
}

if (!function_exists('Wo_SendCanonicalLiveKitCallPush')) {
    function Wo_SendCanonicalLiveKitCallPush($recipient, $caller, $call_id, $call_type, $room_name, $source = 'unknown')
    {
        global $wo;
        if (empty($recipient) || !is_array($recipient)) {
            return false;
        }

        $call_type = ($call_type === 'audio') ? 'audio' : 'video';
        $caller_data = Wo_CanonicalLiveKitUser($caller);
        $expires_at = time() + 45;
        $action_token = Wo_CanonicalLiveKitSignActionToken(array(
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'from_id' => $caller_data['id'],
            'to_id' => (string) (!empty($recipient['user_id']) ? $recipient['user_id'] : ''),
            'room_name' => $room_name,
            'expires_at' => $expires_at
        ));
        $notification_data = array(
            'event_type' => 'livekit_call',
            'call_context' => 'direct',
            'provider' => 'livekit',
            'uuid' => Wo_CanonicalLiveKitCallUuid($call_id, $call_type),
            'from_id' => $caller_data['id'],
            'to_id' => (string) (!empty($recipient['user_id']) ? $recipient['user_id'] : ''),
            'name' => $caller_data['name'],
            'avatar' => $caller_data['avatar'],
            'call_type' => $call_type,
            'room_name' => $room_name,
            'call_id' => (string) $call_id,
            'expires_at' => (string) $expires_at,
            'action_token' => $action_token,
            'api_url' => rtrim($wo['config']['site_url'], '/') . '/api/livekit'
        );
        $notification = array(
            'notification_content' => ($call_type === 'video') ? 'is video calling you' : 'is audio calling you',
            'notification_title' => $caller_data['name'] !== '' ? $caller_data['name'] : 'VNSEEA',
            'notification_image' => $caller_data['avatar'],
            'notification_data' => $notification_data,
            'send_immediately' => true,
            'request_data' => array(
                'priority' => 10,
                'ttl' => 45,
                'collapse_id' => 'livekit_call_' . $call_type . '_' . $call_id
            )
        );

        $ios_device_ids = array_values(array_unique(array_filter(array(
            !empty($recipient['ios_m_device_id']) ? $recipient['ios_m_device_id'] : '',
            !empty($recipient['ios_n_device_id']) ? $recipient['ios_n_device_id'] : ''
        ))));
        $android_device_ids = array_values(array_unique(array_filter(array(
            !empty($recipient['android_m_device_id']) ? $recipient['android_m_device_id'] : '',
            !empty($recipient['android_n_device_id']) ? $recipient['android_n_device_id'] : ''
        ))));

        $ios_sent = false;
        if (!empty($ios_device_ids) && intval($wo['config']['ios_push_messages']) === 1) {
            $ios_sent = (bool) Wo_SendPushNotification(array(
                'send_to' => $ios_device_ids,
                'notification' => $notification
            ), 'ios_messenger');
        }

        $caller_name = $caller_data['name'] !== '' ? $caller_data['name'] : 'VNSEEA';
        $voip_sent = false;
        if (function_exists('Wo_ApiSendApnsVoipPush')) {
            $voip_sent = (bool) Wo_ApiSendApnsVoipPush($recipient, $notification_data, $caller_name, $call_type, 'direct');
        }

        $android_sent = false;
        if (!empty($android_device_ids) && intval($wo['config']['android_push_messages']) === 1) {
            $android_sent = (bool) Wo_SendPushNotification(array(
                'send_to' => $android_device_ids,
                'notification' => $notification
            ), 'android_messenger');
        }

        if (function_exists('Wo_VnseeaCallDebugLog')) {
            Wo_VnseeaCallDebugLog('call_push_dispatch', array(
                'source' => $source,
                'call_id' => $call_id,
                'call_type' => $call_type,
                'from_id' => $caller_data['id'],
                'to_id' => !empty($recipient['user_id']) ? $recipient['user_id'] : 0,
                'ios_device_count' => count($ios_device_ids),
                'android_device_count' => count($android_device_ids),
                'voip_token_present' => !empty($recipient['ios_voip_token']) ? 1 : 0,
                'ios_sent' => $ios_sent ? 1 : 0,
                'voip_sent' => $voip_sent ? 1 : 0,
                'android_sent' => $android_sent ? 1 : 0
            ));
        }

        return $ios_sent || $voip_sent || $android_sent;
    }
}

if (!function_exists('Wo_PublishCanonicalLiveKitIncomingCall')) {
    function Wo_PublishCanonicalLiveKitIncomingCall($call_id, $call_type, $caller, $recipient, $room_name)
    {
        global $wo;
        $secret = Wo_CanonicalLiveKitActionSecret();
        if ($secret === '') {
            return false;
        }

        $port = !empty($wo['config']['nodejs_ssl']) && intval($wo['config']['nodejs_ssl']) === 1
            ? (!empty($wo['config']['nodejs_ssl_port']) ? intval($wo['config']['nodejs_ssl_port']) : 0)
            : (!empty($wo['config']['nodejs_port']) ? intval($wo['config']['nodejs_port']) : 0);
        $endpoint = $port > 0 ? 'http://127.0.0.1:' . $port . '/internal/livekit-call/publish' : '';
        if (!empty($wo['config']['livekit_socket_internal_url'])) {
            $endpoint = rtrim($wo['config']['livekit_socket_internal_url'], '/') . '/internal/livekit-call/publish';
        }
        if ($endpoint === '') {
            return false;
        }

        $caller_data = Wo_CanonicalLiveKitUser($caller);
        $payload = array(
            'event' => 'incoming',
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'from_id' => $caller_data['id'],
            'to_id' => (string) (!empty($recipient['user_id']) ? $recipient['user_id'] : ''),
            'provider' => 'livekit',
            'room_name' => $room_name,
            'peer' => $caller_data
        );
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json; charset=utf-8',
            'X-Vnseea-Internal-Secret: ' . hash_hmac('sha256', 'vnseea-livekit-internal', $secret)
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        $result = curl_exec($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (function_exists('Wo_VnseeaCallDebugLog')) {
            Wo_VnseeaCallDebugLog('call_realtime_publish', array(
                'call_id' => $call_id,
                'call_type' => $call_type,
                'http_status' => intval($status),
                'error' => $error !== '' ? $error : '-',
                'response_present' => $result !== false && $result !== '' ? 1 : 0
            ));
        }

        return intval($status) >= 200 && intval($status) < 300;
    }
}

if (!function_exists('Wo_PrepareCanonicalLiveKitDirectCall')) {
    function Wo_PrepareCanonicalLiveKitDirectCall($caller_id, $recipient_id)
    {
        global $sqlConnect;
        $caller_id = intval($caller_id);
        $recipient_id = intval($recipient_id);
        if ($caller_id <= 0 || $recipient_id <= 0) {
            return;
        }

        $tables = array(T_VIDEOS_CALLES, T_AUDIO_CALLES);
        $finished_statuses = "'ended','cancelled','no_answer','missed','declined'";
        $ringing_cutoff = time() - 45;
        foreach ($tables as $table) {
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'cancelled', `declined` = '1' WHERE `from_id` = '" . Wo_Secure($caller_id) . "' AND `to_id` = '" . Wo_Secure($recipient_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'no_answer' WHERE `to_id` = '" . Wo_Secure($recipient_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling') AND `time` > 0 AND `time` < '" . Wo_Secure($ringing_cutoff) . "'");
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0' WHERE (`from_id` IN ('" . Wo_Secure($caller_id) . "','" . Wo_Secure($recipient_id) . "') OR `to_id` IN ('" . Wo_Secure($caller_id) . "','" . Wo_Secure($recipient_id) . "')) AND `active` = '1' AND (`declined` = '1' OR `status` IN (" . $finished_statuses . "))");
        }
    }
}

if (!function_exists('Wo_CreateCanonicalLiveKitDirectCall')) {
    function Wo_CreateCanonicalLiveKitDirectCall($caller, $recipient, $call_type, $source = 'unknown')
    {
        $call_type = ($call_type === 'audio') ? 'audio' : 'video';
        $caller_id = intval(!empty($caller['user_id']) ? $caller['user_id'] : 0);
        $recipient_id = intval(!empty($recipient['user_id']) ? $recipient['user_id'] : 0);
        if ($caller_id <= 0 || $recipient_id <= 0 || $caller_id === $recipient_id) {
            return array(
                'status' => 400,
                'error_code' => 'recipient_missing',
                'message' => 'A valid recipient is required.'
            );
        }
        if (!Wo_IsLiveKitAvailable()) {
            return array(
                'status' => 503,
                'error_code' => 'livekit_not_configured',
                'message' => 'LiveKit is not configured.'
            );
        }

        $room_name = sha1(random_int(1111111, 9999999999));
        $call_data = array(
            'access_token' => '',
            'from_id' => Wo_Secure($caller_id),
            'to_id' => Wo_Secure($recipient_id),
            'access_token_2' => '',
            'room_name' => $room_name,
            'status' => 'calling'
        );
        $call_id = $call_type === 'audio'
            ? Wo_CreateNewAudioCall($call_data)
            : Wo_CreateNewVideoCall($call_data);
        if (intval($call_id) <= 0) {
            return array(
                'status' => 500,
                'error_code' => 'create_failed',
                'message' => 'Could not create call.'
            );
        }

        Wo_RegisterCallLog(array(
            'from_id' => $caller_id,
            'to_id' => $recipient_id,
            'call_id' => $call_id,
            'call_type' => $call_type,
            'provider' => 'livekit',
            'status' => 'calling'
        ));
        Wo_SendCanonicalLiveKitCallPush(
            $recipient,
            $caller,
            $call_id,
            $call_type,
            $room_name,
            $source
        );
        Wo_PublishCanonicalLiveKitIncomingCall(
            $call_id,
            $call_type,
            $caller,
            $recipient,
            $room_name
        );

        return array(
            'status' => 200,
            'busy' => false,
            'provider' => 'livekit',
            'call_type' => $call_type,
            'call_status' => 'calling',
            'id' => (string) $call_id,
            'room_name' => $room_name,
            'peer' => Wo_CanonicalLiveKitUser($recipient)
        );
    }
}
