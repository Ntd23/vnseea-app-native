<?php
// English description: Bridges authenticated v2 mobile requests to the existing LiveKit call backend.
require_once 'vendor/autoload.php';

$response_data = array(
    'api_status' => 400
);

$valid_actions = array('create', 'answer', 'payload', 'check', 'close', 'incoming');
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
    $started_at = 0;
    $duration = 0;

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
            $duration = !empty($payload['duration']) ? intval($payload['duration']) : 0;
        }
    }

    $elapsed = $started_at > 0 ? max(0, $server_now - $started_at) : 0;
    if ($duration > 0) {
        $elapsed = max($elapsed, $duration);
    }

    return array(
        'started_at' => $started_at,
        'server_now' => $server_now,
        'elapsed' => $elapsed
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

function Wo_ApiLiveKitSendCallPush($recipient, $caller, $call_id, $call_type, $room_name) {
    global $wo;
    if (empty($recipient) || !is_array($recipient)) {
        return;
    }

    $caller_data = Wo_ApiLiveKitUser($caller);
    $notification_data = array(
        'provider' => 'livekit',
        'uuid' => Wo_ApiLiveKitCallUuid($call_id, $call_type),
        'from_id' => $caller_data['id'],
        'name' => $caller_data['name'],
        'avatar' => $caller_data['avatar'],
        'call_type' => $call_type,
        'room_name' => $room_name,
        'call_id' => $call_id
    );
    $notification = array(
        'notification_content' => ($call_type == 'video') ? 'is video calling you' : 'is audio calling you',
        'notification_title' => !empty($caller['name']) ? $caller['name'] : 'VNSEEA',
        'notification_image' => !empty($caller['avatar']) ? $caller['avatar'] : '',
        'notification_data' => $notification_data
    );

    if (!empty($recipient['ios_m_device_id']) && $wo['config']['ios_push_messages'] == 1) {
        Wo_SendPushNotification(array(
            'send_to' => array($recipient['ios_m_device_id']),
            'notification' => $notification
        ), 'ios_messenger');
    }
    if (!empty($recipient['android_m_device_id']) && $wo['config']['android_push_messages'] == 1) {
        Wo_SendPushNotification(array(
            'send_to' => array($recipient['android_m_device_id']),
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

    return array(
        'api_status' => 200,
        'provider' => 'livekit',
        'call' => array(
            'id' => (string) $call_id,
            'type' => $call_type,
            'room_name' => $room_name,
            'source_room_name' => $room_request,
            'status' => $call_status,
            'started_at' => $timing['started_at']
        ),
        'started_at' => $timing['started_at'],
        'server_now' => $timing['server_now'],
        'elapsed' => $timing['elapsed'],
        'current_user' => $current_user,
        'peer' => Wo_ApiLiveKitUser($peer),
        'livekit' => array(
            'ws_url' => $ws_url,
            'token' => \Firebase\JWT\JWT::encode($payload, $api_secret, 'HS256')
        )
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
    $call_source = ($call_id > 0) ? Wo_GetCallSourceById($call_id, $call_type) : false;
    if (empty($call_source)) {
        $response_data = Wo_ApiLiveKitError('call_not_found', 'Call not found.', 404);
    }
    else if (intval($call_source['to_id']) !== intval($wo['user']['user_id'])) {
        $response_data = Wo_ApiLiveKitError('call_forbidden', 'You cannot answer this call.', 403);
    }
    else {
        $table = ($call_type == 'audio') ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
        $claim_id = Wo_GetCallSessionClaim($wo['user']['user_id']);
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = 1, `status` = 'answered', `called` = '" . Wo_Secure($claim_id) . "' WHERE `id` = '" . Wo_Secure($call_id) . "' AND `to_id` = '" . Wo_Secure($wo['user']['user_id']) . "' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
        $answered_rows = mysqli_affected_rows($sqlConnect);
        $answered_source = Wo_GetCallSourceById($call_id, $call_type);
        $already_answered = !empty($answered_source) && is_array($answered_source) && intval($answered_source['to_id']) === intval($wo['user']['user_id']) && intval(!empty($answered_source['active']) ? $answered_source['active'] : 0) === 1 && (!empty($answered_source['status']) ? $answered_source['status'] : '') === 'answered';
        if ($answered_rows > 0) {
            Wo_UpdateCallLog($call_id, $call_type, 'answered', array(
                'provider' => 'livekit',
                'started_at' => time(),
                'status_by' => $wo['user']['user_id']
            ));
        }
        if ($answered_rows > 0 || $already_answered) {
            $answered_source = Wo_GetCallSourceById($call_id, $call_type);
            $timing = Wo_ApiLiveKitTiming($answered_source, $call_type);
            $response_data = array(
                'api_status' => 200,
                'call_id' => (string) $call_id,
                'call_type' => $call_type,
                'call_status' => 'answered',
                'active' => true,
                'started_at' => $timing['started_at'],
                'server_now' => $timing['server_now'],
                'elapsed' => $timing['elapsed']
            );
        }
        else {
            $response_data = Wo_ApiLiveKitError('call_not_available', 'Call is no longer available.', 409);
        }
    }
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
        $response_data = array(
            'api_status' => 200,
            'call_id' => (string) $call_id,
            'call_type' => $call_type,
            'call_status' => $call_status,
            'active' => intval(!empty($call_source['active']) ? $call_source['active'] : 0),
            'finished' => in_array($call_status, array('declined', 'cancelled', 'no_answer', 'missed', 'ended')),
            'started_at' => $timing['started_at'],
            'server_now' => $timing['server_now'],
            'elapsed' => $timing['elapsed']
        );
    }
}
else if ($action == 'close') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $call_type = Wo_ApiLiveKitCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $status = !empty($_POST['status']) ? Wo_Secure($_POST['status']) : 'cancelled';
    $duration = !empty($_POST['duration']) ? intval($_POST['duration']) : 0;
    $final_status = in_array($status, array('ended', 'declined', 'no_answer', 'missed')) ? $status : 'cancelled';
    if ($call_id > 0) {
        $table = ($call_type == 'audio') ? T_AUDIO_CALLES : T_VIDEOS_CALLES;
        mysqli_query($sqlConnect, "UPDATE " . $table . " SET `active` = '0', `status` = '" . Wo_Secure($final_status) . "', `declined` = '" . ($final_status == 'declined' ? '1' : '0') . "' WHERE `id` = '" . Wo_Secure($call_id) . "'");
        Wo_UpdateCallLog($call_id, $call_type, ($final_status == 'missed' ? 'no_answer' : $final_status), array(
            'provider' => 'livekit',
            'duration' => $duration,
            'ended_at' => time(),
            'status_by' => $wo['user']['user_id']
        ));
    }
    $response_data = array(
        'api_status' => 200,
        'call_id' => (string) $call_id,
        'call_type' => $call_type,
        'call_status' => $final_status,
        'active' => false,
        'finished' => true,
        'duration' => $duration
    );
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
