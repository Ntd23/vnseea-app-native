<?php
// Description: Defines when chat-style notifications should be emitted for direct call logs.

if (!function_exists('VNSEEA_IsDirectCallMessageType')) {
    function VNSEEA_IsDirectCallMessageType($type_two)
    {
        return in_array(strtolower(trim((string)$type_two)), array(
            'audio_call',
            'video_call'
        ), true);
    }
}

if (!function_exists('VNSEEA_MessageCallStatus')) {
    function VNSEEA_MessageCallStatus($message)
    {
        $raw_text = isset($message['text']) ? (string)$message['text'] : '';
        $payload = json_decode(htmlspecialchars_decode($raw_text), true);
        return is_array($payload) && !empty($payload['status'])
            ? strtolower(trim((string)$payload['status']))
            : '';
    }
}

if (!function_exists('VNSEEA_ShouldDeliverMessagePush')) {
    function VNSEEA_ShouldDeliverMessagePush($message)
    {
        $type_two = !empty($message['type_two']) ? (string)$message['type_two'] : '';
        if (!VNSEEA_IsDirectCallMessageType($type_two)) {
            return true;
        }

        return in_array(
            VNSEEA_MessageCallStatus($message),
            array('missed', 'no_answer'),
            true
        );
    }
}

if (!function_exists('VNSEEA_ShouldApplyCallLogStatusTransition')) {
    function VNSEEA_ShouldApplyCallLogStatusTransition($current_status, $next_status)
    {
        $current_status = strtolower(trim((string)$current_status));
        $next_status = strtolower(trim((string)$next_status));
        if (!in_array($next_status, array('missed', 'no_answer'), true)) {
            return true;
        }

        return in_array(
            $current_status,
            array('', 'calling', 'missed', 'no_answer'),
            true
        );
    }
}
