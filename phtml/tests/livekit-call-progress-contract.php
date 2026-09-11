<?php

$root = dirname(__DIR__);

function call_progress_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$migration = file_get_contents($root . '/database/migrations/20260909_livekit_call_progress.sql');
$helper = file_get_contents($root . '/assets/includes/vnseea_livekit_call.php');
$direct = file_get_contents($root . '/api/v2/endpoints/livekit.php');
$group = file_get_contents($root . '/api/v2/endpoints/group_call.php');
$relay = file_get_contents($root . '/nodejs/controllers/LiveKitCallController.js');

call_progress_assert(strpos($migration, 'Wo_LiveKitCallProgress') !== false, 'progress table migration must exist');
call_progress_assert(strpos($migration, 'call_endpoint') !== false, 'progress must be unique per device endpoint');
call_progress_assert(strpos($helper, "'device_received' => 10") !== false, 'device receipt must be the first progress rank');
call_progress_assert(strpos($helper, "'ringing' => 20") !== false, 'ringing must rank after device receipt');
call_progress_assert(strpos($helper, "'answering' => 30") !== false, 'answering must rank after ringing');
call_progress_assert(strpos($direct, "else if (\$action == 'progress')") !== false, 'direct calls must accept authenticated progress');
call_progress_assert(strpos($direct, "\$call_action == 'progress'") !== false, 'direct calls must accept signed native progress');
call_progress_assert(strpos($group, "else if (\$action == 'progress')") !== false, 'group calls must accept authenticated progress');
call_progress_assert(strpos($group, "\$call_action == 'progress'") !== false, 'group calls must accept signed native progress');
call_progress_assert(strpos($relay, 'livekit_call_progress') !== false, 'relay must emit direct progress');
call_progress_assert(strpos($relay, 'livekit_group_call_progress') !== false, 'relay must emit group progress');
call_progress_assert(strpos($relay, 'progress_endpoint_id') === false, 'relay must not expose installation identifiers');

echo "LiveKit call progress contract passed.\n";
