<?php
if ($f == 'answer_call') {
    require_once 'assets/includes/vnseea_livekit_call.php';
    $data = array(
        'status' => 404
    );
    if (!empty($_GET['id']) && !empty($_GET['type'])) {
        $id = Wo_Secure($_GET['id']);
        $user_id = Wo_Secure($wo['user']['user_id']);
        $endpoint_answer_idempotent = false;
        $endpoint_claimed = false;
        $answer_transaction = false;
        $call_type = $_GET['type'] == 'audio' ? 'audio' : 'video';
        $endpoint_scope = VNSEEA_DirectCallEndpointScope($call_type);
        $livekit_source = Wo_GetCallSourceById($id, $call_type);
        if (!empty($livekit_source) && is_array($livekit_source) && $livekit_source['provider'] === 'livekit') {
            $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
            $source_status = !empty($livekit_source['status']) ? $livekit_source['status'] : 'calling';
            if (intval(!empty($livekit_source['active']) ? $livekit_source['active'] : 0) === 1 && $source_status === 'answered') {
                if (!VNSEEA_IsLiveKitEndpointOwner($endpoint_scope, intval($id), intval($user_id), 'receiver', $endpoint_id)) {
                    header("Content-type: application/json");
                    echo json_encode(array('status' => 409, 'error_code' => 'call_answered_elsewhere'));
                    exit();
                }
                $endpoint_answer_idempotent = true;
            }
            else {
                $answer_transaction = mysqli_begin_transaction($sqlConnect);
                if (!$answer_transaction) {
                    header("Content-type: application/json");
                    echo json_encode(array('status' => 500, 'error_code' => 'call_answer_failed'));
                    exit();
                }
                $claim = VNSEEA_ClaimLiveKitEndpoint($endpoint_scope, intval($id), intval($user_id), 'receiver', $endpoint_id);
                if (empty($claim['ok'])) {
                    mysqli_rollback($sqlConnect);
                    header("Content-type: application/json");
                    echo json_encode(array('status' => 409, 'error_code' => 'call_answered_elsewhere'));
                    exit();
                }
                $endpoint_claimed = true;
            }
        }
        $claim_id = Wo_GetCallSessionClaim($user_id);
        $answered_rows = 0;
        if ($_GET['type'] == 'audio') {
            $provider = Wo_GetActiveCallProvider('audio');
            $query = mysqli_query($sqlConnect, "UPDATE " . T_AUDIO_CALLES . " SET `active` = 1, `status` = 'answered', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
            $answered_rows = mysqli_affected_rows($sqlConnect);
            if ($answered_rows <= 0) {
                $query = mysqli_query($sqlConnect, "UPDATE " . T_AGORA . " SET `active` = 1, `status` = 'answered', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND `status` = 'calling' AND `type` = 'audio'");
                $answered_rows = mysqli_affected_rows($sqlConnect);
                if ($answered_rows > 0) {
                    $provider = 'agora';
                }
            }
            if ($answered_rows > 0) {
                Wo_UpdateCallLog($id, 'audio', 'answered', array(
                    'provider' => $provider,
                    'started_at' => time(),
                    'status_by' => $wo['user']['user_id']
                ));
            }
        } else {
            $provider = Wo_GetActiveCallProvider('video');
            $query = mysqli_query($sqlConnect, "UPDATE " . T_VIDEOS_CALLES . " SET `active` = 1, `status` = 'answered', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
            $answered_rows = mysqli_affected_rows($sqlConnect);
            if ($answered_rows <= 0) {
                $query = mysqli_query($sqlConnect, "UPDATE " . T_AGORA . " SET `active` = 1, `status` = 'answered', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND `status` = 'calling' AND (`type` = 'video' OR `type` = '' OR `type` IS NULL)");
                $answered_rows = mysqli_affected_rows($sqlConnect);
                if ($answered_rows > 0) {
                    $provider = 'agora';
                }
            }
            if ($answered_rows > 0) {
                Wo_UpdateCallLog($id, 'video', 'answered', array(
                    'provider' => $provider,
                    'started_at' => time(),
                    'status_by' => $wo['user']['user_id']
                ));
            }
        }
        if ($answer_transaction) {
            if ($answered_rows > 0 && mysqli_commit($sqlConnect)) {
                $endpoint_claimed = false;
            }
            else {
                mysqli_rollback($sqlConnect);
                $answered_rows = 0;
                $endpoint_claimed = false;
            }
        }
        if ($answered_rows > 0 || $endpoint_answer_idempotent) {
            $data = array('status' => 200, 'endpoint_owned' => true);
            if (!empty($livekit_source) && is_array($livekit_source) && $livekit_source['provider'] === 'livekit') {
                $answered_source = Wo_GetCallSourceById($id, $call_type);
                Wo_PublishCanonicalLiveKitCallState('answered', $answered_source, $call_type, array(
                    'status' => 'answered',
                    'active' => true,
                    'finished' => false,
                    'peer_id' => (string) intval($user_id),
                    'started_at' => time(),
                    'started_at_ms' => (int) round(microtime(true) * 1000)
                ));
                Wo_DismissCanonicalLiveKitOtherEndpoints($answered_source, $call_type, $endpoint_id);
            }
            if ($_GET['type'] == 'audio') {
                $sql = Wo_GetCallSourceById($id, 'audio');
                if (!empty($sql) && is_array($sql)) {
                    $wo['incall']                 = $sql;
                    $wo['incall']['in_call_user'] = Wo_UserData($sql['from_id']);
                    if ($wo['incall']['provider'] != 'agora' && $wo['incall']['to_id'] == $wo['user']['user_id']) {
                        $wo['incall']['user']         = 1;
                        $wo['incall']['access_token'] = $wo['incall']['access_token'];
                    } else if ($wo['incall']['provider'] != 'agora' && $wo['incall']['from_id'] == $wo['user']['user_id']) {
                        $wo['incall']['user']         = 2;
                        $wo['incall']['access_token'] = $wo['incall']['access_token_2'];
                    }
                    $wo['incall']['room'] = $wo['incall']['room_name'];
                    $data['calls_html']   = Wo_LoadPage('modals/talking');
                }
            }
        }
        else if ($endpoint_claimed && !empty($endpoint_id)) {
            VNSEEA_ReleaseLiveKitEndpoint($endpoint_scope, intval($id), intval($user_id), 'receiver', $endpoint_id);
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
