<?php
// English description: Bridges authenticated v2 mobile requests to existing WoWonder LiveKit group call helpers.
require_once 'vendor/autoload.php';

$response_data = array(
    'api_status' => 400
);

$valid_actions = array('create', 'payload', 'join', 'leave', 'sync', 'incoming', 'decline', 'candidates', 'add_members');
$action = !empty($_POST['type']) ? Wo_Secure($_POST['type']) : '';

function Wo_ApiGroupCallError($error_id, $error_text, $api_status = 400) {
    return array(
        'api_status' => $api_status,
        'errors' => array(
            'error_id' => $error_id,
            'error_text' => $error_text
        )
    );
}

function Wo_ApiGroupCallType($value) {
    return Wo_NormalizeGroupCallType($value === 'audio' ? 'audio' : 'video');
}

function Wo_ApiGroupCallMediaUrl($value) {
    if (empty($value)) {
        return '';
    }
    return filter_var($value, FILTER_VALIDATE_URL) ? $value : Wo_GetMedia(ltrim($value, '/'));
}

function Wo_ApiGroupCallUser($user_data) {
    if (empty($user_data) || !is_array($user_data)) {
        return array(
            'id' => '',
            'name' => '',
            'avatar' => '',
            'username' => ''
        );
    }
    return array(
        'id' => (string) (!empty($user_data['user_id']) ? $user_data['user_id'] : ''),
        'name' => !empty($user_data['name']) ? $user_data['name'] : '',
        'avatar' => Wo_ApiGroupCallMediaUrl(!empty($user_data['avatar']) ? $user_data['avatar'] : ''),
        'username' => !empty($user_data['username']) ? $user_data['username'] : ''
    );
}

function Wo_ApiGroupCallGroup($group_data) {
    if (empty($group_data) || !is_array($group_data)) {
        return array(
            'id' => '',
            'name' => '',
            'avatar' => ''
        );
    }
    return array(
        'id' => (string) (!empty($group_data['group_id']) ? $group_data['group_id'] : ''),
        'name' => !empty($group_data['group_name']) ? $group_data['group_name'] : (!empty($group_data['group_title']) ? $group_data['group_title'] : ''),
        'avatar' => Wo_ApiGroupCallMediaUrl(!empty($group_data['avatar']) ? $group_data['avatar'] : '')
    );
}

function Wo_ApiGroupCallParticipant($participant) {
    return array(
        'id' => (string) (!empty($participant['user_id']) ? $participant['user_id'] : (!empty($participant['id']) ? $participant['id'] : '')),
        'name' => !empty($participant['name']) ? $participant['name'] : '',
        'avatar' => Wo_ApiGroupCallMediaUrl(!empty($participant['avatar']) ? $participant['avatar'] : ''),
        'username' => !empty($participant['username']) ? $participant['username'] : '',
        'joined_at' => intval(!empty($participant['joined_at']) ? $participant['joined_at'] : 0)
    );
}

function Wo_ApiGroupCallParticipants($participants) {
    $items = array();
    foreach ((array) $participants as $participant) {
        $items[] = Wo_ApiGroupCallParticipant($participant);
    }
    return $items;
}

function Wo_ApiGroupCallSummary($group_call) {
    return array(
        'id' => (string) intval(!empty($group_call['id']) ? $group_call['id'] : 0),
        'group_id' => (string) intval(!empty($group_call['group_id']) ? $group_call['group_id'] : 0),
        'call_type' => Wo_ApiGroupCallType(!empty($group_call['call_type']) ? $group_call['call_type'] : 'video'),
        'provider' => !empty($group_call['provider']) ? $group_call['provider'] : 'livekit',
        'room_name' => !empty($group_call['room_name']) ? $group_call['room_name'] : '',
        'status' => !empty($group_call['status']) ? $group_call['status'] : 'ended',
        'started_at' => intval(!empty($group_call['started_at']) ? $group_call['started_at'] : 0),
        'server_now' => time(),
        'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0)
    );
}

function Wo_ApiGroupCallUuid($call_id, $call_type) {
    $hex = md5('vnseea-livekit-group|' . $call_type . '|' . $call_id);
    return substr($hex, 0, 8) . '-' .
        substr($hex, 8, 4) . '-' .
        substr($hex, 12, 4) . '-' .
        substr($hex, 16, 4) . '-' .
        substr($hex, 20, 12);
}

function Wo_ApiGroupCallSendPush($user_ids, $group_call, $caller) {
    global $wo;
    $call_id = intval(!empty($group_call['id']) ? $group_call['id'] : 0);
    $call_type = Wo_ApiGroupCallType(!empty($group_call['call_type']) ? $group_call['call_type'] : 'video');
    if ($call_id <= 0) {
        return;
    }
    $group = Wo_GroupTabData($group_call['group_id'], false);
    $group_data = Wo_ApiGroupCallGroup($group);
    $caller_data = Wo_ApiGroupCallUser($caller);
    $notification_data = array(
        'provider' => 'livekit_group',
        'call_context' => 'group',
        'uuid' => Wo_ApiGroupCallUuid($call_id, $call_type),
        'call_id' => (string) $call_id,
        'group_id' => (string) intval($group_call['group_id']),
        'group_name' => $group_data['name'],
        'group_avatar' => $group_data['avatar'],
        'caller_id' => $caller_data['id'],
        'caller_name' => $caller_data['name'],
        'caller_avatar' => $caller_data['avatar'],
        'call_type' => $call_type,
        'room_name' => !empty($group_call['room_name']) ? $group_call['room_name'] : ''
    );
    foreach (array_unique(array_map('intval', (array) $user_ids)) as $user_id) {
        if ($user_id <= 0 || $user_id == intval($caller_data['id'])) {
            continue;
        }
        $recipient = Wo_UserData($user_id);
        if (empty($recipient)) {
            continue;
        }
        $notification = array(
            'notification_content' => ($call_type == 'video') ? 'started a group video call' : 'started a group audio call',
            'notification_title' => $group_data['name'] !== '' ? $group_data['name'] : 'VNSEEA',
            'notification_image' => $group_data['avatar'],
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
}

function Wo_ApiGroupCallPayload($call_id) {
    global $wo;
    $call_id = intval($call_id);
    $user_id = intval($wo['user']['user_id']);
    $sync_data = Wo_GetGroupCallSyncData($call_id, $user_id);
    if (empty($sync_data) || empty($sync_data['call'])) {
        return Wo_ApiGroupCallError('call_not_found', 'Group call not found.', 404);
    }
    $group_call = $sync_data['call'];
    if (!empty($group_call['status']) && $group_call['status'] !== 'active') {
        return Wo_ApiGroupCallError('call_ended', 'Group call has ended.', 410);
    }
    if (!Wo_IsLiveKitAvailable() || !class_exists('\Firebase\JWT\JWT')) {
        return Wo_ApiGroupCallError('livekit_not_configured', 'LiveKit is not configured.', 500);
    }

    $current_user = Wo_ApiGroupCallUser($wo['user']);
    $payload = array(
        'iss' => trim($wo['config']['livekit_api_key']),
        'sub' => 'groupcall_user_' . $user_id . '_' . substr(sha1($wo['user']['user_id'] . '|' . $group_call['room_name']), 0, 12),
        'nbf' => time() - 300,
        'exp' => time() + 3600,
        'name' => $current_user['name'],
        'metadata' => json_encode(array(
            'user_id' => (string) $user_id,
            'name' => $current_user['name'],
            'avatar' => $current_user['avatar'],
            'group_id' => (string) $group_call['group_id']
        ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'video' => array(
            'roomJoin' => true,
            'room' => $group_call['room_name'],
            'canPublish' => true,
            'canSubscribe' => true,
            'canPublishData' => true
        )
    );

    return array(
        'api_status' => 200,
        'call' => Wo_ApiGroupCallSummary($group_call),
        'group' => Wo_ApiGroupCallGroup($sync_data['group']),
        'current_user' => $current_user,
        'livekit' => array(
            'configured' => 1,
            'ws_url' => Wo_GetLiveKitServerUrl(),
            'token' => \Firebase\JWT\JWT::encode($payload, trim($wo['config']['livekit_api_secret']), 'HS256')
        ),
        'participants' => Wo_ApiGroupCallParticipants(!empty($sync_data['participants']) ? $sync_data['participants'] : array())
    );
}

if (empty($action) || !in_array($action, $valid_actions)) {
    $response_data = Wo_ApiGroupCallError('type_missing', 'type can not be empty.');
}
else if (!Wo_IsLiveKitAvailable()) {
    $response_data = Wo_ApiGroupCallError('livekit_not_configured', 'LiveKit is not configured.', 500);
}
else if ($action == 'create') {
    $group_id = !empty($_POST['group_id']) ? intval($_POST['group_id']) : 0;
    $call_type = Wo_ApiGroupCallType(!empty($_POST['call_type']) ? $_POST['call_type'] : 'video');
    $can_use = ($call_type == 'audio') ? (!empty($wo['config']['audio_chat']) && !empty($wo['config']['can_use_audio_call'])) : (!empty($wo['config']['video_chat']) && !empty($wo['config']['can_use_video_call']));
    if ($group_id <= 0) {
        $response_data = Wo_ApiGroupCallError('group_missing', 'group_id can not be empty.');
    }
    else if (!$can_use || !Wo_IsGroupChatCallMember($group_id, $wo['user']['user_id'])) {
        $response_data = Wo_ApiGroupCallError('group_forbidden', 'You cannot start this group call.', 403);
    }
    else {
        $group_call = Wo_CreateNewGroupCall($group_id, $call_type, $wo['user']['user_id']);
        if (empty($group_call)) {
            $response_data = Wo_ApiGroupCallError('create_failed', 'Could not create group call.');
        }
        else {
            Wo_ApiGroupCallSendPush(Wo_GetGroupChatCallMemberIds($group_id), $group_call, $wo['user']);
            $group = Wo_GroupTabData($group_id, false);
            $response_data = array(
                'api_status' => 200,
                'call' => Wo_ApiGroupCallSummary($group_call),
                'group' => Wo_ApiGroupCallGroup($group),
                'is_existing' => (!empty($group_call['time']) && intval($group_call['time']) < time()) ? 1 : 0
            );
        }
    }
}
else if ($action == 'payload') {
    $response_data = Wo_ApiGroupCallPayload(!empty($_POST['call_id']) ? intval($_POST['call_id']) : 0);
}
else if ($action == 'join') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $group_call = Wo_JoinGroupCall($call_id, $wo['user']['user_id']);
    $response_data = empty($group_call)
        ? Wo_ApiGroupCallError('join_failed', 'Could not join group call.', 404)
        : array('api_status' => 200, 'call' => Wo_ApiGroupCallSummary($group_call));
}
else if ($action == 'leave') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $group_call = Wo_LeaveGroupCall($call_id, $wo['user']['user_id']);
    $response_data = empty($group_call)
        ? Wo_ApiGroupCallError('leave_failed', 'Could not leave group call.', 404)
        : array('api_status' => 200, 'call' => Wo_ApiGroupCallSummary($group_call));
}
else if ($action == 'sync') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $sync_data = Wo_GetGroupCallSyncData($call_id, $wo['user']['user_id']);
    if (empty($sync_data) || empty($sync_data['call'])) {
        $response_data = Wo_ApiGroupCallError('call_not_found', 'Group call not found.', 404);
    }
    else {
        $response_data = array(
            'api_status' => 200,
            'call' => Wo_ApiGroupCallSummary($sync_data['call']),
            'group' => Wo_ApiGroupCallGroup($sync_data['group']),
            'participants' => Wo_ApiGroupCallParticipants(!empty($sync_data['participants']) ? $sync_data['participants'] : array())
        );
    }
}
else if ($action == 'incoming') {
    $expected_call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $group_call = Wo_GetPendingGroupCallInvite($wo['user']['user_id'], $expected_call_id);
    if (empty($group_call)) {
        $response_data = array('api_status' => 200, 'incoming_call' => null);
    }
    else {
        $response_data = array(
            'api_status' => 200,
            'incoming_call' => array(
                'call_id' => (string) intval($group_call['id']),
                'group_id' => (string) intval($group_call['group_id']),
                'call_type' => Wo_ApiGroupCallType($group_call['call_type']),
                'room_name' => !empty($group_call['room_name']) ? $group_call['room_name'] : '',
                'group' => array(
                    'id' => (string) intval($group_call['group_id']),
                    'name' => !empty($group_call['group_name']) ? $group_call['group_name'] : '',
                    'avatar' => Wo_ApiGroupCallMediaUrl(!empty($group_call['group_avatar']) ? $group_call['group_avatar'] : '')
                ),
                'caller' => Wo_ApiGroupCallUser(!empty($group_call['caller_data']) ? $group_call['caller_data'] : array()),
                'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0)
            )
        );
    }
}
else if ($action == 'decline') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $declined = Wo_DeclineGroupCallInvite($call_id, $wo['user']['user_id']);
    $response_data = empty($declined)
        ? Wo_ApiGroupCallError('decline_failed', 'Could not decline group call invite.', 404)
        : array('api_status' => 200);
}
else if ($action == 'candidates') {
    $group_id = !empty($_POST['group_id']) ? intval($_POST['group_id']) : 0;
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    if ($group_id <= 0) {
        $response_data = Wo_ApiGroupCallError('group_missing', 'group_id can not be empty.');
    }
    else {
        $response_data = array(
            'api_status' => 200,
            'candidates' => Wo_ApiGroupCallParticipants(Wo_GetGroupCallCandidates($group_id, $call_id, $wo['user']['user_id']))
        );
    }
}
else if ($action == 'add_members') {
    $call_id = !empty($_POST['call_id']) ? intval($_POST['call_id']) : 0;
    $raw_ids = !empty($_POST['user_ids']) ? $_POST['user_ids'] : array();
    if (is_string($raw_ids)) {
        $raw_ids = explode(',', $raw_ids);
    }
    $user_ids = array_values(array_unique(array_filter(array_map('intval', (array) $raw_ids))));
    $invited = Wo_AddGroupCallMembers($call_id, $user_ids, $wo['user']['user_id']);
    $group_call = Wo_GetGroupCallById($call_id);
    if (!empty($invited) && !empty($group_call)) {
        Wo_ApiGroupCallSendPush($invited, $group_call, $wo['user']);
    }
    $response_data = array(
        'api_status' => 200,
        'invited_user_ids' => array_map('strval', $invited),
        'count' => count($invited)
    );
}
