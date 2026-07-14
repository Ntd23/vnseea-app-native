<?php
// Canonical policy for newly-created VNSEEA group calls.

if (!function_exists('Wo_NormalizeNewGroupCallType')) {
    function Wo_NormalizeNewGroupCallType($call_type = 'video') {
        return 'video';
    }
}

if (!function_exists('Wo_CanStartNewGroupVideoCall')) {
    function Wo_CanStartNewGroupVideoCall($config = array()) {
        return !empty($config['video_chat']) && !empty($config['can_use_video_call']);
    }
}

if (!function_exists('Wo_ShouldNotifyNewGroupCall')) {
    function Wo_ShouldNotifyNewGroupCall($group_call = array()) {
        return is_array($group_call) && intval(isset($group_call['is_existing']) ? $group_call['is_existing'] : 0) !== 1;
    }
}
