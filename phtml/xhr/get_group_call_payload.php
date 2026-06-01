<?php
if ($f == 'get_group_call_payload') {
    require_once 'vendor/autoload.php';

    $data = array('status' => 400);
    $call_id = !empty($_GET['call_id']) ? intval($_GET['call_id']) : 0;

    if ($call_id > 0 && Wo_CheckMainSession($hash_id) === true) {
        $user_id = intval($wo['user']['user_id']);
        $sync_data = Wo_GetGroupCallSyncData($call_id, $user_id);

        if (!empty($sync_data) && !empty($sync_data['call'])) {
            $group_call = $sync_data['call'];

            if (!empty($group_call['status']) && $group_call['status'] === 'active') {
                $user_avatar = '';
                if (!empty($wo['user']['avatar'])) {
                    $user_avatar = filter_var($wo['user']['avatar'], FILTER_VALIDATE_URL)
                        ? $wo['user']['avatar']
                        : Wo_GetMedia($wo['user']['avatar']);
                }

                $token = '';
                $livekit_configured = Wo_IsLiveKitAvailable();

                if ($livekit_configured && class_exists('\Firebase\JWT\JWT')) {
                    $payload = array(
                        'iss' => trim($wo['config']['livekit_api_key']),
                        'sub' => 'groupcall_user_' . $user_id . '_' . substr(sha1(session_id() . '|' . $group_call['room_name']), 0, 12),
                        'nbf' => time() - 300,
                        'exp' => time() + 3600,
                        'name' => !empty($wo['user']['name']) ? $wo['user']['name'] : 'You',
                        'metadata' => json_encode(array(
                            'user_id' => (string) $user_id,
                            'name' => !empty($wo['user']['name']) ? $wo['user']['name'] : 'You',
                            'avatar' => $user_avatar,
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
                    $token = \Firebase\JWT\JWT::encode($payload, trim($wo['config']['livekit_api_secret']), 'HS256');
                }

                $data = array(
                    'status' => 200,
                    'call' => array(
                        'id' => intval($group_call['id']),
                        'group_id' => intval($group_call['group_id']),
                        'call_type' => $group_call['call_type'],
                        'room_name' => $group_call['room_name'],
                        'started_at' => intval(!empty($group_call['started_at']) ? $group_call['started_at'] : time()),
                        'server_now' => time(),
                        'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0),
                        'status' => !empty($group_call['status']) ? $group_call['status'] : 'ended'
                    ),
                    'group' => $sync_data['group'],
                    'current_user' => array(
                        'id' => $user_id,
                        'name' => !empty($wo['user']['name']) ? $wo['user']['name'] : 'You',
                        'avatar' => $user_avatar
                    ),
                    'livekit' => array(
                        'configured' => $livekit_configured ? 1 : 0,
                        'ws_url' => Wo_GetLiveKitServerUrl(),
                        'token' => $token
                    ),
                    'participants' => !empty($sync_data['participants']) ? $sync_data['participants'] : array()
                );
            }
        }
    }

    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
