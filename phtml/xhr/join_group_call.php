<?php
require_once 'assets/includes/vnseea_livekit_call.php';

if ($f == 'join_group_call') {
    $data = array('status' => 400);
    $call_id = !empty($_GET['call_id']) ? intval($_GET['call_id']) : 0;
    if ($call_id > 0 && Wo_CheckMainSession($hash_id) === true) {
        $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
        $join_transaction = mysqli_begin_transaction($sqlConnect);
        $claim = $join_transaction
            ? VNSEEA_ClaimLiveKitEndpoint('group_call', $call_id, intval($wo['user']['user_id']), 'participant', $endpoint_id)
            : array('ok' => false, 'error_code' => 'transaction_failed');
        $group_call = !empty($claim['ok']) ? Wo_JoinGroupCall($call_id, $wo['user']['user_id']) : false;
        if (!empty($group_call) && $join_transaction) {
            if (!mysqli_commit($sqlConnect)) {
                mysqli_rollback($sqlConnect);
                $group_call = false;
            }
        }
        else if ($join_transaction) {
            mysqli_rollback($sqlConnect);
        }
        if (!empty($group_call)) {
            Wo_DismissCanonicalLiveKitGroupOtherEndpoints($group_call, $wo['user']['user_id'], $endpoint_id);
            $sync_data = Wo_GetGroupCallSyncData($call_id, $wo['user']['user_id']);
            Wo_PublishCanonicalLiveKitGroupState('sync', $group_call, array(
                'participants' => !empty($sync_data['participants']) ? $sync_data['participants'] : array(),
                'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0),
                'active_user_id' => (string) intval($wo['user']['user_id'])
            ));
            $data = array(
                'status' => 200,
                'id' => intval($group_call['id']),
                'group_id' => intval($group_call['group_id']),
                'call_type' => 'video',
                'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0),
                'url' => Wo_BuildGroupCallJoinUrl($group_call['id'], 'video'),
                'endpoint_owned' => true
            );
        }
        else if (!$join_transaction) {
            $data = array('status' => 500, 'error_code' => 'join_failed');
        }
        else if (empty($claim['ok'])) {
            $data = array('status' => 409, 'error_code' => 'group_call_active_on_another_device');
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
