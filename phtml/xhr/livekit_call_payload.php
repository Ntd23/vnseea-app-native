<?php
if ($f == 'livekit_call_payload') {
    require_once 'vendor/autoload.php';

    $data = array(
        'status' => 404,
        'error' => 'call_not_found'
    );

    if (Wo_CheckMainSession($hash_id) === true && !empty($_GET['id'])) {
        $call_id = intval($_GET['id']);
        $call_type = (!empty($_GET['type']) && $_GET['type'] == 'audio') ? 'audio' : 'video';
        $user_id = intval($wo['user']['user_id']);
        $call_source = Wo_GetCallSourceById($call_id, $call_type);

        if (!empty($call_source) && is_array($call_source)) {
            $is_caller = intval($call_source['from_id']) === $user_id;
            $is_receiver = intval($call_source['to_id']) === $user_id;
            $call_status = isset($call_source['status']) ? $call_source['status'] : '';
            $call_active = intval(!empty($call_source['active']) ? $call_source['active'] : 0);
            $is_final = in_array($call_status, array('declined', 'cancelled', 'no_answer', 'missed', 'ended'));

            if (!$is_caller && !$is_receiver) {
                $data = array(
                    'status' => 403,
                    'error' => 'call_forbidden'
                );
            }
            else if (intval(!empty($call_source['declined']) ? $call_source['declined'] : 0) === 1 || $is_final) {
                $data = array(
                    'status' => 410,
                    'error' => 'call_finished',
                    'call_status' => $call_status
                );
            }
            else if ($call_active !== 1 || $call_status !== 'answered') {
                $data = array(
                    'status' => 409,
                    'error' => 'call_not_answered',
                    'call_status' => $call_status,
                    'active' => $call_active
                );
            }
            else {
                $endpoint_id = VNSEEA_GetRequestEndpointId($user_id);
                $endpoint_role = $is_caller ? 'caller' : 'receiver';
                $endpoint_scope = VNSEEA_DirectCallEndpointScope($call_type);
                $lease = VNSEEA_GetLiveKitEndpointLease($endpoint_scope, $call_id, $user_id, $endpoint_role);
                if (empty($lease) || intval($lease['active']) !== 1) {
                    VNSEEA_ClaimLiveKitEndpoint($endpoint_scope, $call_id, $user_id, $endpoint_role, $endpoint_id);
                }
                if (!VNSEEA_IsLiveKitEndpointOwner($endpoint_scope, $call_id, $user_id, $endpoint_role, $endpoint_id)) {
                    $data = array(
                        'status' => 409,
                        'error' => 'call_active_on_another_device'
                    );
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode($data);
                    exit();
                }
                $room_request = !empty($call_source['room_name']) ? $call_source['room_name'] : $call_id;
                $room_name = 'wowonder' . md5($room_request);
                $ws_url = Wo_GetLiveKitServerUrl();
                $api_key = !empty($wo['config']['livekit_api_key']) ? trim($wo['config']['livekit_api_key']) : '';
                $api_secret = !empty($wo['config']['livekit_api_secret']) ? trim($wo['config']['livekit_api_secret']) : '';
                $configured = ($ws_url !== '' && $api_key !== '' && $api_secret !== '');

                if ($configured && class_exists('\\Firebase\\JWT\\JWT')) {
                    $user_name = !empty($wo['user']['name']) ? $wo['user']['name'] : 'User';
                    $avatar = !empty($wo['user']['avatar']) ? $wo['user']['avatar'] : '';
                    if (!empty($avatar) && !filter_var($avatar, FILTER_VALIDATE_URL)) {
                        $avatar = Wo_GetMedia(ltrim($avatar, '/'));
                    }
                    $peer_id = $is_caller ? intval($call_source['to_id']) : intval($call_source['from_id']);
                    $peer = Wo_UserData($peer_id);
                    $peer_avatar = !empty($peer['avatar']) ? $peer['avatar'] : '';
                    if (!empty($peer_avatar) && !filter_var($peer_avatar, FILTER_VALIDATE_URL)) {
                        $peer_avatar = Wo_GetMedia(ltrim($peer_avatar, '/'));
                    }
                    $identity = VNSEEA_BuildLiveKitParticipantIdentity('direct_call', $user_id, $call_id, $endpoint_id);
                    $payload = array(
                        'iss' => $api_key,
                        'sub' => $identity,
                        'nbf' => time() - 300,
                        'exp' => time() + 3600,
                        'name' => $user_name,
                        'metadata' => json_encode(array(
                            'user_id' => (string) $user_id,
                            'name' => $user_name,
                            'avatar' => $avatar
                        ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'video' => array(
                            'roomJoin' => true,
                            'room' => $room_name,
                            'canPublish' => true,
                            'canSubscribe' => true,
                            'canPublishData' => true
                        )
                    );

                    $data = array(
                        'status' => 200,
                        'provider' => 'livekit',
                        'call' => array(
                            'id' => $call_id,
                            'type' => $call_type,
                            'room_name' => $room_name,
                            'source_room_name' => $room_request,
                            'status' => $call_status,
                            'started_at' => time()
                        ),
                        'current_user' => array(
                            'id' => $user_id,
                            'name' => $user_name,
                            'avatar' => $avatar
                        ),
                        'peer' => array(
                            'id' => $peer_id,
                            'name' => !empty($peer['name']) ? $peer['name'] : '',
                            'avatar' => $peer_avatar
                        ),
                        'livekit' => array(
                            'ws_url' => $ws_url,
                            'token' => \Firebase\JWT\JWT::encode($payload, $api_secret, 'HS256')
                        ),
                        'endpoint_owned' => true
                    );
                }
                else {
                    $data = array(
                        'status' => 500,
                        'error' => 'livekit_not_configured'
                    );
                }
            }
        }
    }

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Content-type: application/json');
    echo json_encode($data);
    exit();
}
