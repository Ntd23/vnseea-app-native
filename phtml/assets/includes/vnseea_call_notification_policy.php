<?php
// Description: Defines identity, transitions, and chat-push behavior for direct call logs.

if (!function_exists('VNSEEA_IsDirectCallMessageType')) {
    function VNSEEA_IsDirectCallMessageType($type_two)
    {
        return in_array(strtolower(trim((string)$type_two)), array(
            'audio_call',
            'video_call'
        ), true);
    }
}

if (!function_exists('VNSEEA_CallMessagePayload')) {
    function VNSEEA_CallMessagePayload($message)
    {
        if (!is_array($message)) {
            return array();
        }
        $raw_text = isset($message['or_text'])
            ? (string)$message['or_text']
            : (isset($message['text']) ? (string)$message['text'] : '');
        $payload = json_decode(htmlspecialchars_decode($raw_text), true);
        return is_array($payload) ? $payload : array();
    }
}

if (!function_exists('VNSEEA_NormalizeCallMessageProvider')) {
    function VNSEEA_NormalizeCallMessageProvider($provider)
    {
        $provider = preg_replace('/[^a-z0-9_]/i', '', strtolower(trim((string)$provider)));
        return $provider !== '' ? $provider : 'twilio';
    }
}

if (!function_exists('VNSEEA_CallMessageMatches')) {
    function VNSEEA_CallMessageMatches($message, $call_id, $call_type = 'audio', $provider = 'twilio', $from_id = 0, $to_id = 0)
    {
        if (!is_array($message) || (int)$call_id < 1) {
            return false;
        }

        $call_type = $call_type === 'video' ? 'video' : 'audio';
        $message_type = !empty($message['type_two']) ? strtolower(trim((string)$message['type_two'])) : '';
        if ($message_type !== '' && $message_type !== $call_type . '_call') {
            return false;
        }

        $payload = VNSEEA_CallMessagePayload($message);
        if ((int)($payload['call_id'] ?? 0) !== (int)$call_id) {
            return false;
        }
        $payload_type = !empty($payload['call_type']) && $payload['call_type'] === 'video' ? 'video' : 'audio';
        if ($payload_type !== $call_type) {
            return false;
        }
        if (VNSEEA_NormalizeCallMessageProvider($payload['provider'] ?? 'twilio') !== VNSEEA_NormalizeCallMessageProvider($provider)) {
            return false;
        }

        $from_id = (int)$from_id;
        $to_id = (int)$to_id;
        if ($from_id > 0 && $to_id > 0) {
            $message_from_id = (int)($message['from_id'] ?? ($payload['initiator_id'] ?? 0));
            $message_to_id = (int)($message['to_id'] ?? ($payload['receiver_id'] ?? 0));
            if ($message_from_id !== $from_id || $message_to_id !== $to_id) {
                return false;
            }
            if (!empty($payload['initiator_id']) && (int)$payload['initiator_id'] !== $from_id) {
                return false;
            }
            if (!empty($payload['receiver_id']) && (int)$payload['receiver_id'] !== $to_id) {
                return false;
            }
        }

        return true;
    }
}

if (!function_exists('VNSEEA_MessageCallStatus')) {
    function VNSEEA_MessageCallStatus($message)
    {
        $payload = VNSEEA_CallMessagePayload($message);
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
