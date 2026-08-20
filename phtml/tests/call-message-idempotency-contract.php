<?php

$root = dirname(__DIR__);
$policy_path = $root . '/assets/includes/vnseea_call_notification_policy.php';
$functions_path = $root . '/assets/includes/functions_two.php';
$push_path = $root . '/assets/includes/vnseea_push_delivery.php';

function assert_call_message_contract($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

require_once $policy_path;

function call_message_fixture($status, $notification_id = 'provider-uuid')
{
    return array(
        'id' => 99,
        'from_id' => 1766,
        'to_id' => 2189,
        'type_two' => 'video_call',
        'notification_id' => $notification_id,
        'text' => htmlspecialchars(json_encode(array(
            'call_id' => 304,
            'call_type' => 'video',
            'provider' => 'livekit',
            'status' => $status,
            'initiator_id' => 1766,
            'receiver_id' => 2189,
        ), JSON_UNESCAPED_UNICODE), ENT_QUOTES, 'UTF-8'),
    );
}

foreach (array('calling', 'answered', 'ended', 'cancelled', 'declined', 'busy') as $status) {
    assert_call_message_contract(
        VNSEEA_ShouldDeliverMessagePush(call_message_fixture($status)) === false,
        "{$status} must not create a second chat-style call push"
    );
}
foreach (array('missed', 'no_answer') as $status) {
    assert_call_message_contract(
        VNSEEA_ShouldDeliverMessagePush(call_message_fixture($status)) === true,
        "{$status} must remain eligible for the missed-call push"
    );
}
assert_call_message_contract(
    VNSEEA_ShouldDeliverMessagePush(array('type_two' => '', 'text' => 'hello')) === true,
    'normal messages must keep their push behavior'
);
assert_call_message_contract(
    VNSEEA_ShouldApplyCallLogStatusTransition('answered', 'no_answer') === false &&
        VNSEEA_ShouldApplyCallLogStatusTransition('ended', 'missed') === false &&
        VNSEEA_ShouldApplyCallLogStatusTransition('calling', 'missed') === true,
    'late timeout callbacks must not overwrite answered or ended calls'
);

$uuid_overwritten_message = call_message_fixture('answered', '6f53a6e5-5bf8-4bd5-a9f3-9b26727d5fc0');
assert_call_message_contract(
    VNSEEA_CallMessageMatches($uuid_overwritten_message, 304, 'video', 'livekit', 1766, 2189) === true,
    'call payload must remain discoverable after a provider UUID overwrites notification_id'
);
assert_call_message_contract(
    VNSEEA_CallMessageMatches($uuid_overwritten_message, 304, 'audio', 'livekit', 1766, 2189) === false &&
        VNSEEA_CallMessageMatches($uuid_overwritten_message, 304, 'video', 'livekit', 1766, 9999) === false,
    'fallback lookup must not join a different call type or participant pair'
);

$functions = file_get_contents($functions_path);
$push = file_get_contents($push_path);
assert_call_message_contract(
    strpos($functions, 'function Wo_FindCallLogMessage') !== false &&
        substr_count($functions, 'Wo_FindCallLogMessage(') >= 5 &&
        strpos($functions, 'ORDER BY `id` DESC LIMIT 50') !== false,
    'register, update, payload and display-type paths must share the bounded fallback lookup'
);
assert_call_message_contract(
    strpos($push, 'VNSEEA_ShouldDeliverMessagePush($message)') !== false &&
        strpos($push, "WHEN `type_two` IN ('audio_call','video_call') THEN `notification_id`") !== false,
    'push delivery must preserve call-log identity and suppress non-missed call messages'
);

echo "call message idempotency contract: OK\n";
