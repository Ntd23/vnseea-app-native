<?php
if ($f == 'leave_group_call') {
    $data = array('status' => 400);
    $call_id = !empty($_GET['call_id']) ? intval($_GET['call_id']) : 0;
    if ($call_id > 0 && Wo_CheckMainSession($hash_id) === true) {
        $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
        $owns_endpoint = VNSEEA_IsLiveKitEndpointOwner('group_call', $call_id, intval($wo['user']['user_id']), 'participant', $endpoint_id);
        $group_call = $owns_endpoint ? Wo_LeaveGroupCall($call_id, $wo['user']['user_id']) : false;
        if (!empty($group_call)) {
            VNSEEA_ReleaseLiveKitEndpoint('group_call', $call_id, intval($wo['user']['user_id']), 'participant', $endpoint_id);
            $data = array(
                'status' => 200,
                'id' => intval($group_call['id']),
                'group_id' => intval($group_call['group_id']),
                'call_status' => !empty($group_call['status']) ? $group_call['status'] : 'ended',
                'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0)
            );
        }
        else if (!$owns_endpoint) {
            $data = array('status' => 409, 'error_code' => 'group_call_active_on_another_device');
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
