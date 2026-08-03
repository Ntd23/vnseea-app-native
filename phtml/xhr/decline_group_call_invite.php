<?php
if ($f == 'decline_group_call_invite') {
    $data = array(
        'status' => 404
    );
    $call_id = !empty($_GET['call_id']) ? intval($_GET['call_id']) : 0;
    if ($call_id > 0 && Wo_CheckMainSession($hash_id) === true) {
        $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
        $claim = VNSEEA_ClaimLiveKitEndpoint('group_call', $call_id, intval($wo['user']['user_id']), 'participant', $endpoint_id);
        $declined = !empty($claim['ok']) ? Wo_DeclineGroupCallInvite($call_id, $wo['user']['user_id']) : false;
        if (!empty($claim['ok'])) {
            VNSEEA_ReleaseLiveKitEndpoint('group_call', $call_id, intval($wo['user']['user_id']), 'participant', $endpoint_id);
        }
        if (!empty($declined)) {
            $data = array(
                'status' => 200
            );
        }
        else if (empty($claim['ok'])) {
            $data = array('status' => 409, 'error_code' => 'group_call_active_on_another_device');
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
