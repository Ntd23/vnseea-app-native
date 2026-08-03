<?php 
if ($f == 'decline_call') {
    $data = array(
        'status' => 404
    );
    if (!empty($_GET['id']) && !empty($_GET['type'])) {
        $id = Wo_Secure($_GET['id']);
        $user_id = Wo_Secure($wo['user']['user_id']);
        $endpoint_claimed = false;
        $declined_rows = 0;
        $call_type = $_GET['type'] == 'video' ? 'video' : 'audio';
        $endpoint_scope = VNSEEA_DirectCallEndpointScope($call_type);
        $livekit_source = Wo_GetCallSourceById($id, $call_type);
        if (!empty($livekit_source) && is_array($livekit_source) && $livekit_source['provider'] === 'livekit') {
            $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
            $claim = VNSEEA_ClaimLiveKitEndpoint($endpoint_scope, intval($id), intval($user_id), 'receiver', $endpoint_id);
            if (empty($claim['ok'])) {
                header("Content-type: application/json");
                echo json_encode(array('status' => 409, 'error_code' => 'call_answered_elsewhere'));
                exit();
            }
            $endpoint_claimed = true;
        }
        $claim_id = Wo_GetCallSessionClaim($user_id);
        if ($_GET['type'] == 'video') {
            $provider = Wo_GetActiveCallProvider('video');
            $query = mysqli_query($sqlConnect, "UPDATE " . T_VIDEOS_CALLES . " SET `declined` = '1', `status` = 'declined', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
            $declined_rows = mysqli_affected_rows($sqlConnect);
            if ($declined_rows <= 0) {
                $query = mysqli_query($sqlConnect, "UPDATE " . T_AGORA . " SET `declined` = '1', `status` = 'declined', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND `status` = 'calling' AND (`type` = 'video' OR `type` = '' OR `type` IS NULL)");
                $declined_rows = mysqli_affected_rows($sqlConnect);
                if ($declined_rows > 0) {
                    $provider = 'agora';
                }
            }
            if ($declined_rows > 0) {
                Wo_UpdateCallLog($id, 'video', 'declined', array(
                    'provider' => $provider,
                    'status_by' => $wo['user']['user_id']
                ));
            }
        } else {
            $provider = Wo_GetActiveCallProvider('audio');
            $query = mysqli_query($sqlConnect, "UPDATE " . T_AUDIO_CALLES . " SET `declined` = '1', `status` = 'declined', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND (`status` = '' OR `status` = 'calling')");
            $declined_rows = mysqli_affected_rows($sqlConnect);
            if ($declined_rows <= 0) {
                $query = mysqli_query($sqlConnect, "UPDATE " . T_AGORA . " SET `declined` = '1', `status` = 'declined', `called` = '{$claim_id}' WHERE `id` = '$id' AND `to_id` = '$user_id' AND `active` = '0' AND (`declined` = '0' OR `declined` IS NULL) AND `status` = 'calling' AND `type` = 'audio'");
                $declined_rows = mysqli_affected_rows($sqlConnect);
                if ($declined_rows > 0) {
                    $provider = 'agora';
                }
            }
            if ($declined_rows > 0) {
                Wo_UpdateCallLog($id, 'audio', 'declined', array(
                    'provider' => $provider,
                    'status_by' => $wo['user']['user_id']
                ));
            }
        }
        if (!empty($query) && $declined_rows > 0) {
            if ($endpoint_claimed) {
                VNSEEA_ReleaseLiveKitEndpoint($endpoint_scope, intval($id));
            }
            $data = array(
                'status' => 200
            );
        }
        else if ($endpoint_claimed && !empty($endpoint_id)) {
            VNSEEA_ReleaseLiveKitEndpoint($endpoint_scope, intval($id), intval($user_id), 'receiver', $endpoint_id);
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
