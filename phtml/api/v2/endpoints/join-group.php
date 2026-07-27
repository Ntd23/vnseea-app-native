<?php
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
$response_data = array(
    'api_status' => 400,
);
if (empty($_POST['group_id'])) {
    $error_code    = 3;
    $error_message = 'group_id (POST) is missing';
}
if (empty($error_code)) {
    $group_id   = Wo_Secure($_POST['group_id']);
    $group_data = Wo_GroupData($group_id);
    if (empty($group_data)) {
        $error_code    = 6;
        $error_message = 'Group not found';
    } else {
        $join_action = !empty($_POST['action']) ? Wo_Secure($_POST['action']) : 'toggle';
        $join_message = 'invalid';
        $membership_status = 'not_joined';
        $is_owner = Wo_IsGroupOnwer($group_id);
        $is_joined = Wo_IsGroupJoined($group_id) === true;
        $is_requested = Wo_IsJoinRequested($group_id, $wo['user']['user_id']) === true;

        if ($join_action === 'join') {
            if ($is_owner) {
                $join_message = 'owner';
                $membership_status = 'owner';
            } elseif ($is_joined) {
                $join_message = 'joined';
                $membership_status = 'joined';
            } elseif ($is_requested) {
                $join_message = 'requested';
                $membership_status = 'requested';
            } elseif (Wo_RegisterGroupJoin($group_id, $wo['user']['user_id'])) {
                if ($group_data['join_privacy'] == 2) {
                    $join_message = 'requested';
                    $membership_status = 'requested';
                } else {
                    $join_message = 'joined';
                    $membership_status = 'joined';
                }
            }
        } elseif ($join_action === 'toggle') {
            if ($is_joined || $is_requested) {
                if (Wo_LeaveGroup($group_id, $wo['user']['user_id'])) {
                    $join_message = 'left';
                    $membership_status = 'not_joined';
                }
            } elseif (Wo_RegisterGroupJoin($group_id, $wo['user']['user_id'])) {
                if ($group_data['join_privacy'] == 2) {
                    $join_message = 'requested';
                    $membership_status = 'requested';
                } else {
                    $join_message = 'joined';
                    $membership_status = 'joined';
                }
            }
        }
        $response_data = array(
            'api_status' => 200,
            'join_status' => $join_message,
            'membership_status' => $membership_status
        );
    }
}
