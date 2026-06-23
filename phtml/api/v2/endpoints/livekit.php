<?php
// English description: Bridges authenticated v2 mobile requests to the existing LiveKit call backend.
require_once 'vendor/autoload.php';

$response_data = array(
    'api_status' => 400
);

$valid_actions = array('create', 'answer', 'payload', 'check', 'close', 'incoming', 'native_action', 'register_voip_token');
$action = !empty($_POST['type']) ? Wo_Secure($_POST['type']) : '';

function Wo_ApiLiveKitError($error_id, $error_text, $api_status = 400) {
    return array(
        'api_status' => $api_status,
        'errors' => array(
            'error_id' => $error_id,
            'error_text' => $error_text
        )
    );
}

function Wo_ApiLiveKitDebugLog($type, $fields = array()) {
    $parts = array('[vnseea_call_debug]', 'type=' . $type);
    if (!empty($fields) && is_array($fields)) {
        foreach ($fields as $key => $value) {
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $value = str_replace(array("\n", "\r"), ' ', (string) $value);
            $parts[] = $key . '=' . $value;
        }
    }
    $line = implode(' ', $parts);
    error_log($line);

    $log_dir = realpath(__DIR__ . '/../../../xhr/logs');
    if ($log_dir === false) {
        $log_dir = __DIR__ . '/../../../xhr/logs';
        if (!is_dir($log_dir)) {
            @mkdir($log_dir, 0755, true);
        }
    }
    $log_file = rtrim($log_dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vnseea_call_debug.log';
    @file_put_contents($log_file, date('c') . ' ' . $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function Wo_ApiLiveKitCallType($value) {
    return ($value === 'audio') ? 'audio' : 'video';
}

function Wo_ApiLiveKitCallTables() {
    return array(
        'video' => T_VIDEOS_CALLES,
        'audio' => T_AUDIO_CALLES
    );
}

function Wo_ApiLiveKitSourceId($source) {
    if (empty($source) || !is_array($source)) {
        return 0;
    }

    foreach (array('id', 'call_id', 'calls_id') as $key) {
        if (!empty($source[$key]) && is_numeric($source[$key])) {
            return intval($source[$key]);
        }
    }

    return 0;
}

function Wo_ApiLiveKitCancelPendingCallsBetween($caller_id, $recipient_id) {
    global $sqlConnect;

    $caller_id = intval($caller_id);
    $recipient_id = intval($recipient_id);
    if ($caller_id <= 0 || $recipient_id <= 0) {
        return;
    }

    foreach (Wo_ApiLiveKitCallTables() as $table) {
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'cancelled', `declined` = '1' WHERE `from_id` = '" . Wo_Secure($caller_id) . "' AND `to_id` = '" . Wo_Secure($recipient_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
    }
}

function Wo_ApiLiveKitExpireStaleRingingCalls($user_id) {
    global $sqlConnect;

    $user_id = intval($user_id);
    if ($user_id <= 0) {
        return;
    }

    $ringing_cutoff = time() - 45;
    foreach (Wo_ApiLiveKitCallTables() as $table) {
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'no_answer' WHERE `to_id` = '" . Wo_Secure($user_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling') AND `time` > 0 AND `time` < '" . Wo_Secure($ringing_cutoff) . "'");
    }
}

function Wo_ApiLiveKitClearFinishedActiveCalls($user_id) {
    global $sqlConnect;

    $user_id = intval($user_id);
    if ($user_id <= 0) {
        return;
    }

    $finished_statuses = "'ended','cancelled','no_answer','missed','declined'";
    foreach (Wo_ApiLiveKitCallTables() as $table) {
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0' WHERE (`from_id` = '" . Wo_Secure($user_id) . "' OR `to_id` = '" . Wo_Secure($user_id) . "') AND `active` = '1' AND (`declined` = '1' OR `status` IN (" . $finished_statuses . "))");
    }
}

function Wo_ApiLiveKitUser($user_data) {
    if (empty($user_data) || !is_array($user_data)) {
        return array(
            'id' => '',
            'name' => '',
            'avatar' => '',
            'username' => ''
        );
    }

    $avatar = !empty($user_data['avatar']) ? $user_data['avatar'] : '';
    if (!empty($avatar) && !filter_var($avatar, FILTER_VALIDATE_URL)) {
        $avatar = Wo_GetMedia(ltrim($avatar, '/'));
    }

    return array(
        'id' => (string) (!empty($user_data['user_id']) ? $user_data['user_id'] : ''),
        'name' => !empty($user_data['name']) ? $user_data['name'] : '',
        'avatar' => $avatar,
        'username' => !empty($user_data['username']) ? $user_data['username'] : ''
    );
}

function Wo_ApiLiveKitTiming($call_source, $call_type) {
    $server_now = time();
    $server_now_ms = (int) round(microtime(true) * 1000);
    $started_at = 0;
    $started_at_ms = 0;
    $duration = 0;
    $duration_ms = 0;

    if (!empty($call_source) && is_array($call_source) && !empty($call_source['id'])) {
        $payload = Wo_GetCallLogPayload(
            intval($call_source['id']),
            $call_type,
            'livekit',
            intval(!empty($call_source['from_id']) ? $call_source['from_id'] : 0),
            intval(!empty($call_source['to_id']) ? $call_source['to_id'] : 0)
        );
        if (!empty($payload) && is_array($payload)) {
            $started_at = !empty($payload['started_at']) ? intval($payload['started_at']) : 0;
            $started_at_ms = !empty($payload['started_at_ms']) ? intval($payload['started_at_ms']) : 0;
            $duration = !empty($payload['duration']) ? intval($payload['duration']) : 0;
            $duration_ms = !empty($payload['duration_ms']) ? intval($payload['duration_ms']) : 0;
        }
    }
    if ($started_at_ms <= 0 && $started_at > 0) {
        $started_at_ms = $started_at * 1000;
    }
    if ($started_at <= 0 && $started_at_ms > 0) {
        $started_at = (int) floor($started_at_ms / 1000);
    }
    if ($duration_ms <= 0 && $duration > 0) {
        $duration_ms = $duration * 1000;
    }

    $elapsed = $started_at > 0 ? max(0, $server_now - $started_at) : 0;
    $elapsed_ms = $started_at_ms > 0 ? max(0, $server_now_ms - $started_at_ms) : 0;
    if ($duration > 0) {
        $elapsed = max($elapsed, $duration);
    }
    if ($duration_ms > 0) {
        $elapsed_ms = max($elapsed_ms, $duration_ms);
    }

    return array(
        'started_at' => $started_at,
        'server_now' => $server_now,
        'elapsed' => $elapsed,
        'started_at_ms' => $started_at_ms,
        'server_now_ms' => $server_now_ms,
        'elapsed_ms' => $elapsed_ms
    );
}

function Wo_ApiLiveKitCallUuid($call_id, $call_type) {
    $hex = md5('vnseea-livekit|' . $call_type . '|' . $call_id);
    return substr($hex, 0, 8) . '-' .
        substr($hex, 8, 4) . '-' .
        substr($hex, 12, 4) . '-' .
        substr($hex, 16, 4) . '-' .
        substr($hex, 20, 12);
}

function Wo_ApiLiveKitBase64UrlEncode($value) {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function Wo_ApiLiveKitBase64UrlDecode($value) {
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }
    return base64_decode(strtr($value, '-_', '+/'));
}

function Wo_ApiLiveKitActionSecret() {
    global $wo;
    if (!empty($wo['config']['livekit_api_secret'])) {
        return trim($wo['config']['livekit_api_secret']);
    }
    if (!empty($wo['config']['widnows_app_api_key'])) {
        return trim($wo['config']['widnows_app_api_key']);
    }
    return '';
}

function Wo_ApiLiveKitSignActionToken($payload) {
    $secret = Wo_ApiLiveKitActionSecret();
    if ($secret === '') {
        return '';
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $body = Wo_ApiLiveKitBase64UrlEncode($json);
    $signature = hash_hmac('sha256', $body, $secret);
    return $body . '.' . $signature;
}

function Wo_ApiLiveKitUserColumnExists($column) {
    global $sqlConnect;
    $column = Wo_Secure($column);
    $query = mysqli_query($sqlConnect, "SHOW COLUMNS FROM " . T_USERS . " LIKE '" . $column . "'");
    return $query && mysqli_num_rows($query) > 0;
}

function Wo_ApiLiveKitSendVoipPush($recipient, $notification_data, $caller_name, $call_type) {
    if (!function_exists('Wo_ApiSendApnsVoipPush')) {
        return false;
    }
    return Wo_ApiSendApnsVoipPush($recipient, $notification_data, $caller_name, $call_type, 'direct');
}

function Wo_ApiLiveKitVerifyActionToken($token) {
    $secret = Wo_ApiLiveKitActionSecret();
    if ($secret === '' || empty($token) || strpos($token, '.') === false) {
        return false;
    }
    list($body, $signature) = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $body, $secret);
    if (!hash_equals($expected, $signature)) {
        return false;
    }
    $payload = json_decode(Wo_ApiLiveKitBase64UrlDecode($body), true);
    if (empty($payload) || !is_array($payload)) {
        return false;
    }
    if (!empty($payload['expires_at']) && intval($payload['expires_at']) < time()) {
        return false;
    }
    return $payload;
}

function Wo_ApiLiveKitInternalSecret() {
    $secret = Wo_ApiLiveKitActionSecret();
    return $secret === '' ? '' : hash_hmac('sha256', 'vnseea-livekit-internal', $secret);
}

function Wo_ApiLiveKitPublishRealtime($event, $call_source, $call_type, $extra = array()) {
    global $wo;
    if (empty($call_source) || !is_array($call_source)) {
        return;
    }
    $secret = Wo_ApiLiveKitInternalSecret();
    if ($secret === '') {
        return;
    }
    $port = !empty($wo['config']['nodejs_ssl']) && intval($wo['config']['nodejs_ssl']) === 1
        ? (!empty($wo['config']['nodejs_ssl_port']) ? intval($wo['config']['nodejs_ssl_port']) : 0)
        : (!empty($wo['config']['nodejs_port']) ? intval($wo['config']['nodejs_port']) : 0);
    if ($port <= 0) {
        return;
    }
    $endpoint = 'http://127.0.0.1:' . $port . '/internal/livekit-call/publish';
    if (!empty($wo['config']['livekit_socket_internal_url'])) {
        $endpoint = rtrim($wo['config']['livekit_socket_internal_url'], '/') . '/internal/livekit-call/publish';
    }
    $payload = array_merge(array(
        'event' => $event,
        'call_id' => (string) Wo_ApiLiveKitSourceId($call_source),
        'call_type' => $call_type,
        'from_id' => (string) intval(!empty($call_source['from_id']) ? $call_source['from_id'] : 0),
        'to_id' => (string) intval(!empty($call_source['to_id']) ? $call_source['to_id'] : 0)
    ), $extra);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json; charset=utf-8',
        'X-Vnseea-Internal-Secret: ' . $secret
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
    error_log('[livekit_publish] event=' . $event .
        ' call_id=' . $payload['call_id'] .
        ' from_id=' . $payload['from_id'] .
        ' to_id=' . $payload['to_id'] .
        ' endpoint=' . $endpoint .
        ' http=' . intval($status) .
        ' error=' . ($error ? $error : '-') .
        ' body=' . substr((string) $result, 0, 160));
}

function Wo_ApiLiveKitTimingFields($timing) {
    return array(
        'started_at' => $timing['started_at'],
        'server_now' => $timing['server_now'],
        'elapsed' => $timing['elapsed'],
        'started_at_ms' => $timing['started_at_ms'],
        'server_now_ms' => $timing['server_now_ms'],
        'elapsed_ms' => $timing['elapsed_ms']
    );
}

function Wo_ApiLiveKitSendCallPush($recipient, $caller, $call_id, $call_type, $room_name) {
    global $wo;
    if (empty($recipient) || !is_array($recipient)) {
        return;
    }

    $caller_data = Wo_ApiLiveKitUser($caller);
    $expires_at = time() + 45;
    $action_token = Wo_ApiLiveKitSignActionToken(array(
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
        'uuid' => Wo_ApiLiveKitCallUuid($call_id, $call_type),
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
        'notification_content' => ($call_type == 'video') ? 'is video calling you' : 'is audio calling you',
        'notification_title' => !empty($caller['name']) ? $caller['name'] : 'VNSEEA',
        'notification_image' => !empty($caller['avatar']) ? $caller['avatar'] : '',
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

    if (!empty($ios_device_ids) && $wo['config']['ios_push_messages'] == 1) {
        Wo_SendPushNotification(array(
            'send_to' => $ios_device_ids,
            'notification' => $notification
        ), 'ios_messenger');
    }
    Wo_ApiLiveKitSendVoipPush($recipient, $notification_data, !empty($caller['name']) ? $caller['name'] : 'VNSEEA', $call_type);
    if (!empty($android_device_ids) && $wo['config']['android_push_messages'] == 1) {
        Wo_SendPushNotification(array(
            'send_to' => $android_device_ids,
            'notification' => $notification
        ), 'android_messenger');
    }
}

function Wo_ApiLiveKitCreateCall($recipient, $recipient_id, $call_type) {
    global $wo;

    $room_script = sha1(rand(1111111, 9999999999));
    $call_data = array(
        'access_token' => '',
        'from_id' => Wo_Secure($wo['user']['user_id']),
        'to_id' => Wo_Secure($recipient_id),
        'access_token_2' => '',
        'room_name' => $room_script,
        'status' => 'calling'
    );
    $insert_id = ($call_type == 'audio') ? Wo_CreateNewAudioCall($call_data) : Wo_CreateNewVideoCall($call_data);
    if ($insert_id <= 0) {
        return Wo_ApiLiveKitError('create_failed', 'Could not create call.');
    }

    Wo_RegisterCallLog(array(
        'from_id' => $wo['user']['user_id'],
        'to_id' => $recipient_id,
        'call_id' => $insert_id,
        'call_type' => $call_type,
        'provider' => 'livekit',
        'status' => 'calling'
    ));
    Wo_ApiLiveKitSendCallPush($recipient, $wo['user'], $insert_id, $call_type, $room_script);
    Wo_ApiLiveKitPublishRealtime('incoming', array(
        'id' => $insert_id,
        'from_id' => $wo['user']['user_id'],
        'to_id' => $recipient_id,
        'room_name' => $room_script
    ), $call_type, array(
        'provider' => 'livekit',
        'room_name' => $room_script,
        'peer' => Wo_ApiLiveKitUser($wo['user'])
    ));

    return array(
        'api_status' => 200,
        'busy' => false,
        'provider' => 'livekit',
        'call_type' => $call_type,
        'call_status' => 'calling',
        'id' => (string) $insert_id,
        'room_name' => $room_script,
        'peer' => Wo_ApiLiveKitUser($recipient)
    );
}

function Wo_ApiLiveKitBuildPayload($call_id, $call_type) {
    global $wo;

    $call_source = Wo_GetCallSourceById($call_id, $call_type);
    if (empty($call_source) || !is_array($call_source)) {
        return Wo_ApiLiveKitError('call_not_found', 'Call not found.', 404);
    }

    $user_id = intval($wo['user']['user_id']);
    $is_caller = intval($call_source['from_id']) === $user_id;
    $is_receiver = intval($call_source['to_id']) === $user_id;
    if (!$is_caller && !$is_receiver) {
        return Wo_ApiLiveKitError('call_forbidden', 'You cannot access this call.', 403);
    }

    $call_status = !empty($call_source['status']) ? $call_source['status'] : 'calling';
    $call_active = intval(!empty($call_source['active']) ? $call_source['active'] : 0);
    $is_final = in_array($call_status, array('declined', 'cancelled', 'no_answer', 'missed', 'ended'));

    if (intval(!empty($call_source['declined']) ? $call_source['declined'] : 0) === 1 || $is_final) {
        return array(
            'api_status' => 200,
            'finished' => true,
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'call_status' => $call_status,
            'active' => $call_active
        );
    }

    if ($call_active !== 1 || $call_status !== 'answered') {
        return array(
            'api_status' => 200,
            'join_ready' => false,
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'call_status' => 'not_answered',
            'active' => $call_active
        );
    }

    $ws_url = Wo_GetLiveKitServerUrl();
    $api_key = !empty($wo['config']['livekit_api_key']) ? trim($wo['config']['livekit_api_key']) : '';
    $api_secret = !empty($wo['config']['livekit_api_secret']) ? trim($wo['config']['livekit_api_secret']) : '';
    if ($ws_url === '' || $api_key === '' || $api_secret === '' || !class_exists('\\Firebase\\JWT\\JWT')) {
        return Wo_ApiLiveKitError('livekit_not_configured', 'LiveKit is not configured.', 500);
    }

    $room_request = !empty($call_source['room_name']) ? $call_source['room_name'] : $call_id;
    $room_name = 'wowonder' . md5($room_request);
    $peer_id = $is_caller ? intval($call_source['to_id']) : intval($call_source['from_id']);
    $peer = Wo_UserData($peer_id);
    $current_user = Wo_ApiLiveKitUser($wo['user']);
    $identity = 'user_' . $user_id . '_' . substr(sha1($wo['user']['user_id'] . '|' . $room_name), 0, 12);
    $timing = Wo_ApiLiveKitTiming($call_source, $call_type);

    $payload = array(
        'iss' => $api_key,
        'sub' => $identity,
        'nbf' => time() - 300,
        'exp' => time() + 3600,
        'name' => $current_user['name'],
        'metadata' => json_encode(array(
            'user_id' => (string) $user_id,
            'name' => $current_user['name'],
            'avatar' => $current_user['avatar']
        ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'video' => array(
            'roomJoin' => true,
            'room' => $room_name,
            'canPublish' => true,
            'canSubscribe' => true,
            'canPublishData' => true
        )
    );
    Wo_ApiLiveKitDebugLog('payload', array(
        'user_id' => $user_id,
        'call_id' => $call_id,
        'call_type' => $call_type,
        'raw_room_name' => $room_request,
        'livekit_room' => $room_name,
        'token_room' => $payload['video']['room'],
        'status' => $call_status,
        'active' => $call_active,
        'started_at' => $timing['started_at'],
        'started_at_ms' => $timing['started_at_ms'],
        'elapsed' => $timing['elapsed'],
        'elapsed_ms' => $timing['elapsed_ms'],
        'ws_url' => $ws_url
    ));

    return array_merge(array(
        'api_status' => 200,
        'provider' => 'livekit',
        'call' => array(
            'id' => (string) $call_id,
            'type' => $call_type,
            'room_name' => $room_name,
            'source_room_name' => $room_request,
            'status' => $call_status,
            'started_at' => $timing['started_at'],
            'started_at_ms' => $timing['started_at_ms']
        ),
        'current_user' => $current_user,
        'peer' => Wo_ApiLiveKitUser($peer),
        'livekit' => array(
            'ws_url' => $ws_url,
            'token' => \Firebase\JWT\JWT::encode($payload, $api_secret, 'HS256')
        )
    ), Wo_ApiLiveKitTimingFields($timing));
}

function Wo_ApiLiveKitAnswerCall($call_id, $call_type, $actor_id) {
    global $sqlConnect;

    $call_source = ($call_id > 0) ? Wo_GetCallSourceById($call_id, $call_type) : false;
    if (empty($call_source)) {
        return Wo_ApiLiveKitError('call_not_found', 'Call not found.', 404);
    }
    if (intval($call_source['to_id']) !== intval($actor_id)) {
        return Wo_ApiLiveKitError('call_forbidden', 'You cannot answer this call.', 403);
    }

    $table = ($call_type == 'audio') ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
    $claim_id = Wo_GetCallSessionClaim($actor_id);
    mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = 1, `status` = 'answered', `called` = '" . Wo_Secure($claim_id) . "' WHERE `id` = '" . Wo_Secure($call_id) . "' AND `to_id` = '" . Wo_Secure($actor_id) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
    $answered_rows = mysqli_affected_rows($sqlConnect);
    $answered_source = Wo_GetCallSourceById($call_id, $call_type);
    $already_answered = !empty($answered_source) && is_array($answered_source) && intval($answered_source['to_id']) === intval($actor_id) && intval(!empty($answered_source['active']) ? $answered_source['active'] : 0) === 1 && (!empty($answered_source['status']) ? $answered_source['status'] : '') === 'answered';
    if ($answered_rows > 0) {
        $started_at_ms = (int) round(microtime(true) * 1000);
        Wo_UpdateCallLog($call_id, $call_type, 'answered', array(
            'provider' => 'livekit',
            'started_at' => (int) floor($started_at_ms / 1000),
            'started_at_ms' => $started_at_ms,
            'status_by' => $actor_id
        ));
    }
    if ($answered_rows <= 0 && !$already_answered) {
        return Wo_ApiLiveKitError('call_not_available', 'Call is no longer available.', 409);
    }

    $answered_source = Wo_GetCallSourceById($call_id, $call_type);
    $timing = Wo_ApiLiveKitTiming($answered_source, $call_type);
    Wo_ApiLiveKitDebugLog('answer', array(
        'call_id' => $call_id,
        'call_type' => $call_type,
        'actor_id' => $actor_id,
        'affected_rows' => $answered_rows,
        'already_answered' => $already_answered ? 1 : 0,
        'status' => !empty($answered_source['status']) ? $answered_source['status'] : '',
        'active' => intval(!empty($answered_source['active']) ? $answered_source['active'] : 0),
        'started_at' => $timing['started_at'],
        'started_at_ms' => $timing['started_at_ms'],
        'elapsed' => $timing['elapsed'],
        'elapsed_ms' => $timing['elapsed_ms']
    ));
    Wo_ApiLiveKitPublishRealtime('answered', $answered_source, $call_type, array_merge(array(
        'status' => 'answered',
        'active' => true,
        'finished' => false,
        'peer_id' => (string) $actor_id
    ), Wo_ApiLiveKitTimingFields($timing)));

    return array_merge(array(
        'api_status' => 200,
        'call_id' => (string) $call_id,
        'call_type' => $call_type,
        'call_status' => 'answered',
        'active' => true
    ), Wo_ApiLiveKitTimingFields($timing));
}

function Wo_ApiLiveKitCloseCall($call_id, $call_type, $status, $duration, $actor_id = 0) {
    global $sqlConnect;

    $final_status = in_array($status, array('ended', 'declined', 'no_answer', 'missed')) ? $status : 'cancelled';
    $call_source = ($call_id > 0) ? Wo_GetCallSourceById($call_id, $call_type) : false;
    if ($call_id > 0) {
        $table = ($call_type == 'audio') ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = '" . Wo_Secure($final_status) . "', `declined` = '" . ($final_status == 'declined' ? '1' : '0') . "' WHERE `id` = '" . Wo_Secure($call_id) . "'");
        Wo_UpdateCallLog($call_id, $call_type, ($final_status == 'missed' ? 'no_answer' : $final_status), array(
            'provider' => 'livekit',
            'duration' => $duration,
            'duration_ms' => $duration * 1000,
            'ended_at' => time(),
            'ended_at_ms' => (int) round(microtime(true) * 1000),
            'status_by' => $actor_id > 0 ? $actor_id : 0
        ));
    }
    if (!empty($call_source) && is_array($call_source)) {
        Wo_ApiLiveKitPublishRealtime($final_status == 'declined' ? 'declined' : 'closed', $call_source, $call_type, array(
            'status' => $final_status,
            'active' => false,
            'finished' => true,
            'peer_id' => (string) $actor_id,
            'duration' => $duration
        ));
    }

    return array(
        'api_status' => 200,
        'call_id' => (string) $call_id,
        'call_type' => $call_type,
        'call_status' => $final_status,
        'active' => false,
        'finished' => true,
        'duration' => $duration
    );
}

if (empty($action) || !in_array($action, $valid_actions)) {
    $response_data = Wo_ApiLiveKitError('type_missing', 'type can not be empty.');
}
else if (!Wo_IsLiveKitAvailable()) {
    $response_data = Wo_ApiLiveKitError('livekit_not_configured', 'LiveKit is not configured.', 500);
}
else if ($action == 'create') {
    $recipient_id = !empty($_POST['recipient_id']) ? intval($_POST['recipient_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    if ($recipient_id <= 0 || $recipient_id == intval($wo['user']['user_id'])) {
        $response_data = Wo_ApiLiveKitError('recipient_missing', 'recipient_id can not be empty.');
    }
    else {
        $recipient = Wo_UserData($recipient_id);
        if (empty($recipient)) {
            $response_data = Wo_ApiLiveKitError('recipient_not_found', 'Recipient not found.', 404);
        }
        else {
            Wo_ApiLiveKitCancelPendingCallsBetween($wo['user']['user_id'], $recipient_id);
            Wo_ApiLiveKitExpireStaleRingingCalls($recipient_id);
            Wo_ApiLiveKitClearFinishedActiveCalls($wo['user']['user_id']);
            Wo_ApiLiveKitClearFinishedActiveCalls($recipient_id);

            if (Wo_IsUserBusy($recipient_id)) {
                Wo_RegisterCallLog(array(
                    'from_id' => $wo['user']['user_id'],
                    'to_id' => $recipient_id,
                    'call_id' => 0,
                    'call_type' => $call_type,
                    'provider' => 'livekit',
                    'status' => 'busy'
                ));
                $response_data = array(
                    'api_status' => 200,
                    'busy' => true,
                    'provider' => 'livekit',
                    'call_type' => $call_type,
                    'call_status' => 'busy',
                    'id' => '0',
                    'peer' => Wo_ApiLiveKitUser($recipient)
                );
            }
            else {
                $response_data = Wo_ApiLiveKitCreateCall($recipient, $recipient_id, $call_type);
            }
        }
    }
}
else if ($action == 'answer') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $response_data = Wo_ApiLiveKitAnswerCall($call_id, $call_type, intval($wo['user']['user_id']));
}
else if ($action == 'payload') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $response_data = Wo_ApiLiveKitBuildPayload($call_id, $call_type);
}
else if ($action == 'check') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $call_source = ($call_id > 0) ? Wo_GetCallSourceById($call_id, $call_type) : false;
    if (empty($call_source)) {
        $response_data = Wo_ApiLiveKitError('call_not_found', 'Call not found.', 404);
    }
    else {
        $call_status = !empty($call_source['status']) ? $call_source['status'] : 'calling';
        if ($call_status == 'calling' && !empty($call_source['time']) && (time() - intval($call_source['time'])) > 43) {
            $table = ($call_type == 'audio') ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
            mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = 'no_answer' WHERE `id` = '" . Wo_Secure($call_id) . "'");
            Wo_UpdateCallLog($call_id, $call_type, 'no_answer', array(
                'provider' => 'livekit',
                'status_by' => $wo['user']['user_id']
            ));
            $call_status = 'no_answer';
        }
        $call_source = Wo_GetCallSourceById($call_id, $call_type);
        $timing = Wo_ApiLiveKitTiming($call_source, $call_type);
        Wo_ApiLiveKitDebugLog('check', array(
            'user_id' => intval($wo['user']['user_id']),
            'call_id' => $call_id,
            'call_type' => $call_type,
            'status' => $call_status,
            'active' => intval(!empty($call_source['active']) ? $call_source['active'] : 0),
            'started_at' => $timing['started_at'],
            'started_at_ms' => $timing['started_at_ms'],
            'elapsed' => $timing['elapsed'],
            'elapsed_ms' => $timing['elapsed_ms']
        ));
        $response_data = array_merge(array(
            'api_status' => 200,
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'call_status' => $call_status,
            'active' => intval(!empty($call_source['active']) ? $call_source['active'] : 0),
            'finished' => in_array($call_status, array('declined', 'cancelled', 'no_answer', 'missed', 'ended'))
        ), Wo_ApiLiveKitTimingFields($timing));
    }
}
else if ($action == 'close') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $status = !empty($_POST['status']) ? Wo_Secure($_POST['status']) : 'cancelled';
    $duration = !empty($_POST['duration']) ? intval($_POST['duration']) : 0;
    $response_data = Wo_ApiLiveKitCloseCall($call_id, $call_type, $status, $duration, intval($wo['user']['user_id']));
}
else if ($action == 'native_action') {
    $token = !empty($_POST['action_token']) ? $_POST['action_token'] : '';
    $payload = Wo_ApiLiveKitVerifyActionToken($token);
    if (empty($payload) || !is_array($payload)) {
        $response_data = Wo_ApiLiveKitError('invalid_action_token', 'Invalid call action token.', 403);
    }
    else {
        $call_id = !empty($payload['call_id']) ? intval($payload['call_id']) : 0;
        $call_type = Wo_ApiLiveKitCallType(!empty($payload['call_type']) ? $payload['call_type'] : 'video');
        $actor_id = !empty($payload['to_id']) ? intval($payload['to_id']) : 0;
        $call_action = !empty($_POST['call_action']) ? Wo_Secure($_POST['call_action']) : '';
        if ($call_action == 'answer') {
            $response_data = Wo_ApiLiveKitAnswerCall($call_id, $call_type, $actor_id);
        }
        else if ($call_action == 'decline') {
            $response_data = Wo_ApiLiveKitCloseCall($call_id, $call_type, 'declined', 0, $actor_id);
        }
        else if ($call_action == 'close') {
            $duration = !empty($_POST['duration']) ? intval($_POST['duration']) : 0;
            $response_data = Wo_ApiLiveKitCloseCall($call_id, $call_type, 'ended', $duration, $actor_id);
        }
        else {
            $response_data = Wo_ApiLiveKitError('invalid_call_action', 'Invalid call action.', 400);
        }
    }
}
else if ($action == 'register_voip_token') {
    $token = !empty($_POST['token']) ? Wo_Secure($_POST['token']) : '';
    if ($token === '') {
        $response_data = Wo_ApiLiveKitError('token_missing', 'token can not be empty.');
    }
    else if (!Wo_ApiLiveKitUserColumnExists('ios_voip_token')) {
        $response_data = array(
            'api_status' => 200,
            'synced' => false,
            'message' => 'ios_voip_token column is not available.'
        );
    }
    else {
        mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `ios_voip_token` = '" . Wo_Secure($token) . "' WHERE `user_id` = '" . Wo_Secure($wo['user']['user_id']) . "'");
        $response_data = array(
            'api_status' => 200,
            'synced' => true
        );
    }
}
else if ($action == 'incoming') {
    $requested_type = !empty($_POST['call_type']) ? $_POST['call_type'] : '';
    $types = ($requested_type == 'audio' || $requested_type == 'video') ? array($requested_type) : array('video', 'audio');
    $incoming_call = null;
    foreach ($types as $call_type) {
        $source = Wo_CheckFroInCalls($call_type);
        if (!empty($source) && is_array($source) && $source['provider'] == 'livekit') {
            $source_id = Wo_ApiLiveKitSourceId($source);
            if ($source_id <= 0) {
                continue;
            }
            $incoming_call = array(
                'call_id' => (string) $source_id,
                'call_type' => $call_type,
                'provider' => 'livekit',
                'room_name' => !empty($source['room_name']) ? $source['room_name'] : '',
                'peer' => Wo_ApiLiveKitUser(Wo_UserData($source['from_id']))
            );
            break;
        }
    }
    $response_data = array(
        'api_status' => 200,
        'incoming_call' => $incoming_call
    );
}
