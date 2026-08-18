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

if (!function_exists('Wo_CanonicalRealtimeRelayConfig')) {
    function Wo_CanonicalRealtimeRelayConfig()
    {
        static $config = null;
        if ($config !== null) {
            return $config;
        }

        $config = array(
            'internal_url' => trim((string) getenv('REALTIME_INTERNAL_URL')),
            'secret' => trim((string) getenv('REALTIME_SECRET'))
        );
        $env_path = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'client' . DIRECTORY_SEPARATOR . '.env';
        if (file_exists($env_path) && is_readable($env_path)) {
            $lines = @file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ((array) $lines as $line) {
                $line = trim((string) $line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                    continue;
                }
                list($key, $value) = array_pad(explode('=', $line, 2), 2, '');
                $key = trim($key);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if ($key === 'REALTIME_INTERNAL_URL' && $config['internal_url'] === '') {
                    $config['internal_url'] = $value;
                }
                if ($key === 'REALTIME_SECRET' && $config['secret'] === '') {
                    $config['secret'] = $value;
                }
            }
        }
        if ($config['internal_url'] === '') {
            $config['internal_url'] = 'http://127.0.0.1:3025';
        }
        return $config;
    }
}

if (!function_exists('Wo_PublishCanonicalLiveKitPayload')) {
    function Wo_PublishCanonicalLiveKitPayload($payload)
    {
        $config = Wo_CanonicalRealtimeRelayConfig();
        if (empty($config['internal_url']) || empty($config['secret']) || !function_exists('curl_init')) {
            return null;
        }

        $endpoint = rtrim($config['internal_url'], '/') . '/internal/livekit-call/publish';
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json; charset=utf-8',
            'X-Realtime-Secret: ' . $config['secret']
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 250);
        curl_setopt($ch, CURLOPT_TIMEOUT_MS, 750);
        curl_setopt($ch, CURLOPT_NOSIGNAL, true);
        $result = curl_exec($ch);
        $error = curl_error($ch);
        $status = intval(curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);

        if (function_exists('Wo_VnseeaCallDebugLog')) {
            Wo_VnseeaCallDebugLog('call_realtime_publish', array(
                'event' => !empty($payload['event']) ? $payload['event'] : '',
                'call_id' => !empty($payload['call_id']) ? $payload['call_id'] : '',
                'context' => !empty($payload['context']) ? $payload['context'] : 'direct',
                'http_status' => $status,
                'error' => $error !== '' ? $error : '-',
                'response_present' => $result !== false && $result !== '' ? 1 : 0
            ));
        }
        return $status >= 200 && $status < 300;
    }
}

if (!function_exists('Wo_CanonicalLiveKitGroupRecipientIds')) {
    function Wo_CanonicalLiveKitGroupRecipientIds($group_call)
    {
        global $sqlConnect;
        $call_id = intval(!empty($group_call['id']) ? $group_call['id'] : 0);
        $recipient_ids = array();
        if (!empty($group_call['created_by'])) {
            $recipient_ids[intval($group_call['created_by'])] = true;
        }
        if ($call_id > 0 && defined('T_GROUP_CALL_PARTICIPANTS')) {
            $query = mysqli_query(
                $sqlConnect,
                "SELECT `user_id` FROM " . T_GROUP_CALL_PARTICIPANTS . " WHERE `call_id` = '{$call_id}'"
            );
            if (!empty($query)) {
                while ($row = mysqli_fetch_assoc($query)) {
                    $user_id = intval(!empty($row['user_id']) ? $row['user_id'] : 0);
                    if ($user_id > 0) {
                        $recipient_ids[$user_id] = true;
                    }
                }
            }
        }
        return array_map('strval', array_keys($recipient_ids));
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

        $push_channels = VNSEEA_SendImmediateCallPush(
            (int)$recipient['user_id'],
            $notification_data,
            $notification['notification_title'],
            $call_type,
            'direct',
            true,
            $notification['request_data']
        );
        if (function_exists('Wo_VnseeaCallDebugLog')) {
            Wo_VnseeaCallDebugLog('call_push_dispatch_v2', array(
                'source' => $source,
                'call_id' => $call_id,
                'call_type' => $call_type,
                'from_id' => $caller_data['id'],
                'to_id' => !empty($recipient['user_id']) ? $recipient['user_id'] : 0,
                'onesignal' => $push_channels['onesignal'],
                'voip' => $push_channels['voip']
            ));
        }
        return $push_channels;
    }
}

if (!function_exists('Wo_PublishCanonicalLiveKitIncomingCall')) {
    function Wo_PublishCanonicalLiveKitIncomingCall($call_id, $call_type, $caller, $recipient, $room_name)
    {
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
        return Wo_PublishCanonicalLiveKitPayload($payload);
    }
}

if (!function_exists('Wo_PublishCanonicalLiveKitCallState')) {
    function Wo_PublishCanonicalLiveKitCallState($event, $call_source, $call_type, $extra = array())
    {
        if (empty($call_source) || !is_array($call_source)) {
            return null;
        }
        $payload = array_merge(array(
            'event' => $event,
            'call_id' => (string) intval($call_source['id']),
            'call_type' => $call_type === 'audio' ? 'audio' : 'video',
            'from_id' => (string) intval($call_source['from_id']),
            'to_id' => (string) intval($call_source['to_id']),
            'provider' => 'livekit',
        ), is_array($extra) ? $extra : array());
        return Wo_PublishCanonicalLiveKitPayload($payload);
    }
}

if (!function_exists('Wo_DismissCanonicalLiveKitOtherEndpoints')) {
    function Wo_DismissCanonicalLiveKitOtherEndpoints($call_source, $call_type, $endpoint_id)
    {
        global $wo;
        if (empty($call_source) || !is_array($call_source)) {
            return;
        }
        $call_id = intval($call_source['id']);
        VNSEEA_SendImmediateCallPush(
            intval($call_source['to_id']),
            array(
                'event_type' => 'livekit_call_closed',
                'call_context' => 'direct',
                'provider' => 'livekit',
                'call_id' => (string) $call_id,
                'call_type' => $call_type,
                'status' => 'answered_elsewhere',
                'uuid' => Wo_CanonicalLiveKitCallUuid($call_id, $call_type),
                'api_url' => rtrim($wo['config']['site_url'], '/') . '/api/livekit'
            ),
            'VNSEEA',
            $call_type,
            'direct',
            true,
            array(),
            $endpoint_id,
            true
        );
    }
}

if (!function_exists('Wo_CanonicalLiveKitGroupCallUuid')) {
    function Wo_CanonicalLiveKitGroupCallUuid($call_id)
    {
        $hex = md5('vnseea-livekit-group|video|' . intval($call_id));
        return substr($hex, 0, 8) . '-' .
            substr($hex, 8, 4) . '-' .
            substr($hex, 12, 4) . '-' .
            substr($hex, 16, 4) . '-' .
            substr($hex, 20, 12);
    }
}

if (!function_exists('Wo_PublishCanonicalLiveKitGroupState')) {
    function Wo_PublishCanonicalLiveKitGroupState($event, $group_call, $extra = array())
    {
        if (empty($group_call) || !is_array($group_call)) {
            return null;
        }
        $server_now = time();
        $server_now_ms = (int) round(microtime(true) * 1000);
        $started_at = intval(!empty($group_call['started_at']) ? $group_call['started_at'] : 0);
        $started_at_ms = $started_at > 0 ? $started_at * 1000 : 0;
        $payload = array_merge(array(
            'context' => 'group',
            'event' => $event,
            'call_id' => (string) intval(!empty($group_call['id']) ? $group_call['id'] : 0),
            'group_id' => (string) intval(!empty($group_call['group_id']) ? $group_call['group_id'] : 0),
            'call_type' => 'video',
            'provider' => 'livekit',
            'room_name' => !empty($group_call['room_name']) ? $group_call['room_name'] : '',
            'status' => !empty($group_call['status']) ? $group_call['status'] : 'active',
            'started_at' => $started_at,
            'started_at_ms' => $started_at_ms,
            'server_now' => $server_now,
            'server_now_ms' => $server_now_ms,
            'elapsed' => $started_at > 0 ? max(0, $server_now - $started_at) : 0,
            'elapsed_ms' => $started_at_ms > 0 ? max(0, $server_now_ms - $started_at_ms) : 0,
        ), is_array($extra) ? $extra : array());
        if (empty($payload['recipient_ids'])) {
            $payload['recipient_ids'] = Wo_CanonicalLiveKitGroupRecipientIds($group_call);
        }
        return Wo_PublishCanonicalLiveKitPayload($payload);
    }
}

if (!function_exists('Wo_DismissCanonicalLiveKitGroupOtherEndpoints')) {
    function Wo_DismissCanonicalLiveKitGroupOtherEndpoints($group_call, $user_id, $endpoint_id)
    {
        global $wo;
        if (empty($group_call) || !is_array($group_call)) {
            return;
        }
        $call_id = intval(!empty($group_call['id']) ? $group_call['id'] : 0);
        if ($call_id < 1) {
            return;
        }
        VNSEEA_SendImmediateCallPush(
            intval($user_id),
            array(
                'event_type' => 'livekit_group_call_closed',
                'call_context' => 'group',
                'provider' => 'livekit_group',
                'call_id' => (string) $call_id,
                'group_id' => (string) intval(!empty($group_call['group_id']) ? $group_call['group_id'] : 0),
                'call_type' => 'video',
                'status' => 'answered_elsewhere',
                'uuid' => Wo_CanonicalLiveKitGroupCallUuid($call_id),
                'api_url' => rtrim($wo['config']['site_url'], '/') . '/api/group_call'
            ),
            'VNSEEA',
            'video',
            'group',
            true,
            array(),
            $endpoint_id,
            true
        );
    }
}

if (!function_exists('Wo_ExpireCanonicalLiveKitRingingCalls')) {
    function Wo_ExpireCanonicalLiveKitRingingCalls($recipient_id, $ringing_cutoff = 0)
    {
        global $sqlConnect;

        $recipient_id = intval($recipient_id);
        $ringing_cutoff = intval($ringing_cutoff);
        if ($recipient_id <= 0) {
            return 0;
        }
        if ($ringing_cutoff <= 0) {
            $ringing_cutoff = time() - 45;
        }

        $expired_count = 0;
        $sources = array(
            array('table' => T_VIDEOS_CALLES, 'call_type' => 'video'),
            array('table' => T_AUDIO_CALLES, 'call_type' => 'audio')
        );
        foreach ($sources as $source) {
            $table = $source['table'];
            $call_type = $source['call_type'];
            $where = "`to_id` = '{$recipient_id}'" .
                " AND `active` = '0'" .
                " AND (`declined` = '0' OR `declined` IS NULL)" .
                " AND (`status` = '' OR `status` = 'calling')" .
                " AND `time` > 0 AND `time` < '{$ringing_cutoff}'";
            $query = mysqli_query(
                $sqlConnect,
                "SELECT `id`,`from_id`,`to_id` FROM " . $table . " WHERE {$where}"
            );
            if (!$query) {
                continue;
            }
            while ($call = mysqli_fetch_assoc($query)) {
                $call_id = intval($call['id']);
                $updated = mysqli_query(
                    $sqlConnect,
                    "UPDATE " . $table .
                    " SET `active` = '0', `status` = 'no_answer'" .
                    " WHERE `id` = '{$call_id}' AND {$where}"
                );
                if (!$updated || mysqli_affected_rows($sqlConnect) !== 1) {
                    continue;
                }
                $expired_count++;
                if (function_exists('Wo_UpdateCallLog')) {
                    Wo_UpdateCallLog($call_id, $call_type, 'no_answer', array(
                        'provider' => 'livekit',
                        'from_id' => intval($call['from_id']),
                        'to_id' => intval($call['to_id']),
                        'ended_at' => time()
                    ));
                }
            }
        }
        return $expired_count;
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
        Wo_ExpireCanonicalLiveKitRingingCalls($recipient_id, $ringing_cutoff);
        foreach ($tables as $table) {
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'cancelled', `declined` = '1' WHERE `from_id` = '" . Wo_Secure($caller_id) . "' AND `to_id` = '" . Wo_Secure($recipient_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
        }
        foreach ($tables as $table) {
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0' WHERE (`from_id` IN ('" . Wo_Secure($caller_id) . "','" . Wo_Secure($recipient_id) . "') OR `to_id` IN ('" . Wo_Secure($caller_id) . "','" . Wo_Secure($recipient_id) . "')) AND `active` = '1' AND (`declined` = '1' OR `status` IN (" . $finished_statuses . "))");
        }
    }
}

if (!function_exists('Wo_CreateCanonicalLiveKitDirectCall')) {
    function Wo_CreateCanonicalLiveKitDirectCall($caller, $recipient, $call_type, $source = 'unknown', $endpoint_id = '')
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

        $endpoint_id = VNSEEA_NormalizeClientEndpointId($endpoint_id);
        if ($endpoint_id === '') {
            $endpoint_id = VNSEEA_GetRequestEndpointId($caller_id);
        }
        $endpoint_claim = VNSEEA_ClaimLiveKitEndpoint(VNSEEA_DirectCallEndpointScope($call_type), $call_id, $caller_id, 'caller', $endpoint_id);
        if (empty($endpoint_claim['ok'])) {
            $table = $call_type === 'audio' ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
            mysqli_query($GLOBALS['sqlConnect'], "UPDATE " . $table . " SET `active`=0,`status`='cancelled',`declined`=1 WHERE `id`=" . intval($call_id));
            return array(
                'status' => 409,
                'error_code' => 'call_active_on_another_device',
                'message' => 'Call is active on another device.'
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
        $push_channels = Wo_SendCanonicalLiveKitCallPush(
            $recipient,
            $caller,
            $call_id,
            $call_type,
            $room_name,
            $source
        );
        $realtime_sent = Wo_PublishCanonicalLiveKitIncomingCall(
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
            'peer' => Wo_CanonicalLiveKitUser($recipient),
            'delivery' => VNSEEA_BuildCallDeliveryState($realtime_sent, $push_channels)
        );
    }
}
