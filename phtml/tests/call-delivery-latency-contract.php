<?php

$root = dirname(__DIR__);

function assert_call_latency_contract($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$push_path = $root . '/assets/includes/vnseea_push_delivery.php';
$direct_path = $root . '/assets/includes/vnseea_livekit_call.php';
$push_source = file_get_contents($push_path);
$direct_source = file_get_contents($direct_path);

$realtime_position = strpos(
    $direct_source,
    '$realtime_sent = Wo_PublishCanonicalLiveKitIncomingCall('
);
$push_position = strpos(
    $direct_source,
    '$push_channels = Wo_SendCanonicalLiveKitCallPush('
);
assert_call_latency_contract(
    $realtime_position !== false &&
        $push_position !== false &&
        $realtime_position < $push_position,
    'direct calls must publish realtime before waiting on external push providers'
);

require_once $push_path;
assert_call_latency_contract(
    function_exists('VNSEEA_DeduplicateCallPushTargets'),
    'immediate call delivery must deduplicate provider targets before dispatch'
);

$targets = VNSEEA_DeduplicateCallPushTargets(array(
    array('platform' => 'ios', 'token' => 'ios-token-a'),
    array('platform' => 'ios', 'token' => 'ios-token-a'),
    array('platform' => 'ios', 'token' => 'ios-token-b'),
    array('platform' => 'android', 'token' => 'android-token-a'),
    array('platform' => 'android', 'token' => ''),
));
assert_call_latency_contract(
    count($targets) === 3,
    'duplicate and empty call push targets must be removed'
);

assert_call_latency_contract(
    function_exists('VNSEEA_BuildOneSignalCallRequestPayload'),
    'call delivery must expose a testable OneSignal payload builder'
);
$request = VNSEEA_BuildOneSignalCallRequestPayload(
    'android',
    'subscription-token',
    array(
        'call_id' => '42',
        'call_type' => 'audio',
        'call_context' => 'direct',
        'client_endpoint_id' => 'pi_installation_42',
        'expires_at' => '1045',
        'title' => 'Caller',
        'body' => 'Incoming call'
    ),
    array('ttl' => 60, 'priority' => 10),
    'onesignal-app',
    'request-uuid',
    1000
);
assert_call_latency_contract(
    $request['ttl'] === 45 &&
        $request['priority'] === 10 &&
        $request['collapse_id'] === 'livekit_call_audio_42' &&
        $request['include_subscription_ids'] === array('subscription-token') &&
        $request['data']['client_endpoint_id'] === 'pi_installation_42',
    'direct call payload must preserve endpoint ownership and a usable TTL'
);
$passive_group_request = VNSEEA_BuildOneSignalCallRequestPayload(
    'ios',
    'ios-subscription-token',
    array(
        'call_id' => '84',
        'call_type' => 'video',
        'call_context' => 'group',
        'ring_mode' => 'passive',
        'expires_at' => '2030'
    ),
    array(),
    'onesignal-ios-app',
    'ios-request-uuid',
    2000
);
assert_call_latency_contract(
    $passive_group_request['ttl'] === 30 &&
        $passive_group_request['priority'] === 5 &&
        $passive_group_request['collapse_id'] === 'livekit_group_call_84' &&
        $passive_group_request['ios_sound'] === 'default',
    'passive group call payload must keep its expiry and low priority'
);

assert_call_latency_contract(
    strpos($push_source, 'curl_multi_init()') !== false &&
        strpos($push_source, 'include_subscription_ids') !== false &&
        strpos($push_source, 'VNSEEA_DeduplicateCallPushTargets') !== false,
    'OneSignal and APNs VoIP requests must share a concurrent transport'
);
assert_call_latency_contract(
    strpos($push_source, "'apns_voip_delivery_response'") !== false &&
        strpos($push_source, "'duration_ms'") !== false &&
        strpos($push_source, "'target_count'") !== false,
    'call delivery must log provider latency, target count and APNs failures'
);
assert_call_latency_contract(
    strpos($direct_source, "'duration_ms' =>") !== false,
    'realtime publish logs must include relay latency'
);

echo "call delivery latency contract: OK\n";
