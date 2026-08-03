<?php
if ($f == 'create_new_group_call') {
    $data = array('status' => 400);
    $group_id = !empty($_GET['group_id']) ? intval($_GET['group_id']) : 0;
    $call_type = Wo_NormalizeNewGroupCallType(!empty($_GET['call_type']) ? $_GET['call_type'] : 'video');
    $can_use = Wo_CanStartNewGroupVideoCall($wo['config']);
    if ($group_id > 0 && Wo_CheckMainSession($hash_id) === true && $can_use && Wo_IsGroupChatCallMember($group_id, $wo['user']['user_id'])) {
        $group_call = Wo_CreateNewGroupCall($group_id, $call_type, $wo['user']['user_id']);
        if (!empty($group_call)) {
            $endpoint_id = VNSEEA_GetRequestEndpointId($wo['user']['user_id']);
            $claim = VNSEEA_ClaimLiveKitEndpoint('group_call', intval($group_call['id']), intval($wo['user']['user_id']), 'participant', $endpoint_id);
            if (empty($claim['ok'])) {
                header("Content-type: application/json");
                echo json_encode(array('status' => 409, 'error_code' => 'group_call_active_on_another_device'));
                exit();
            }
            $group = Wo_GroupTabData($group_id, false);
            $data = array(
                'status' => 200,
                'id' => intval($group_call['id']),
                'group_id' => $group_id,
                'call_type' => $group_call['call_type'],
                'participant_count' => intval(!empty($group_call['participant_count']) ? $group_call['participant_count'] : 0),
                'url' => Wo_BuildGroupCallJoinUrl($group_call['id'], $group_call['call_type']),
                'group_name' => !empty($group['group_name']) ? $group['group_name'] : '',
                'is_existing' => !empty($group_call['is_existing']) ? 1 : 0,
                'endpoint_owned' => true
            );
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
