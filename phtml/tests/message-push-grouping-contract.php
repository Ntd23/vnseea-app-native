<?php
// English description: Verifies group chat pushes name the group and an album sends one aggregated push.

$root = dirname(__DIR__);
require_once $root . '/assets/includes/vnseea_push_delivery.php';
require_once $root . '/assets/includes/vnseea_message_media.php';

function push_grouping_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function push_grouping_equals($actual, $expected, $message)
{
    push_grouping_assert($actual === $expected, $message . "\nExpected: {$expected}\nActual: {$actual}");
}

// Group pushes say who sent to which group; direct pushes keep the sender.
push_grouping_equals(
    VNSEEA_MessagePushTitle('Nguyen Van A', 'group', 'Nhóm bạn thân', 'vietnamese'),
    'Nguyen Van A đã gửi đến Nhóm bạn thân',
    'Vietnamese group pushes must name the group'
);
push_grouping_equals(
    VNSEEA_MessagePushTitle('Nguyen Van A', 'group', 'Weekend', 'english'),
    'Nguyen Van A sent to Weekend',
    'English group pushes must name the group'
);
push_grouping_equals(
    VNSEEA_MessagePushTitle('Nguyen Van A', 'user', 'ignored', 'vi'),
    'Nguyen Van A',
    'direct pushes keep the sender as title'
);
push_grouping_equals(
    VNSEEA_MessagePushTitle('Nguyen Van A', 'group', '', 'vi'),
    'Nguyen Van A',
    'a group without a name falls back to the sender'
);
push_grouping_equals(VNSEEA_MessagePushTitle('', 'user', '', 'vi'), 'VNSEEA', 'a missing sender has a fallback');

// One album push describes every item.
push_grouping_equals(VNSEEA_MessageMediaGroupPushText(8, 0, '', 'vi'), 'Đã gửi 8 ảnh', 'photo albums');
push_grouping_equals(VNSEEA_MessageMediaGroupPushText(0, 2, '', 'vi'), 'Đã gửi 2 video', 'video albums');
push_grouping_equals(
    VNSEEA_MessageMediaGroupPushText(5, 2, 'Đi chơi nè', 'vi'),
    'Đã gửi 5 ảnh và 2 video: Đi chơi nè',
    'mixed albums keep the caption'
);
push_grouping_equals(
    VNSEEA_MessageMediaGroupPushText(1, 1, '', 'en'),
    'Sent 1 photo and 1 video',
    'English mixed albums'
);
push_grouping_equals(VNSEEA_MessageMediaGroupPushText(3, 0, '', 'en'), 'Sent 3 photos', 'English photo albums');
push_grouping_equals(
    VNSEEA_MessageMediaGroupPushText(1, 0, '', 'vi'),
    'Đã gửi một ảnh',
    'an album interrupted after one item reads naturally'
);

// The final item sends at once; otherwise the push waits for the rest.
push_grouping_assert(VNSEEA_MessageMediaGroupPushDelay(8, 8) === 0, 'the final album item must send immediately');
push_grouping_assert(VNSEEA_MessageMediaGroupPushDelay(3, 8) === 60, 'an unfinished album waits for the rest');
push_grouping_assert(VNSEEA_MessageMediaGroupPushDelay(3, 0) === 15, 'albums of unknown size use a short window');

// Only photo and video messages with a valid album id are grouped.
$photo = array('media' => 'upload/photos/2026/10/a_image.jpg', 'media_group_id' => 'media-1-abc');
push_grouping_equals(VNSEEA_MessagePushMediaGroupId($photo), 'media-1-abc', 'album photos are grouped');
push_grouping_equals(
    VNSEEA_MessagePushMediaGroupId(array('media' => 'upload/videos/2026/10/a_video.mp4', 'media_group_id' => 'media-1-abc')),
    'media-1-abc',
    'album videos are grouped'
);
push_grouping_equals(
    VNSEEA_MessagePushMediaGroupId(array('media' => '', 'media_group_id' => 'media-1-abc', 'text' => 'hi')),
    '',
    'text messages are never grouped'
);
push_grouping_equals(
    VNSEEA_MessagePushMediaGroupId(array('media' => 'upload/sounds/a.m4a', 'type_two' => 'audio', 'media_group_id' => 'media-1-abc')),
    '',
    'voice messages are never grouped'
);
push_grouping_equals(
    VNSEEA_MessagePushMediaGroupId(array('media' => 'upload/photos/a.jpg', 'media_group_id' => "x' OR 1=1")),
    '',
    'malformed album ids are ignored'
);
push_grouping_equals(VNSEEA_MessagePushMediaGroupId(array('media' => 'upload/photos/a.jpg')), '', 'ungrouped photos');

// The endpoint announces the album size for the push queue.
push_grouping_assert(VNSEEA_MessageMediaGroupSize('media-2') === 0, 'unknown albums have no size');
push_grouping_assert(VNSEEA_MessageMediaGroupSize('media-2', '8') === 8, 'the album size is remembered');
push_grouping_assert(VNSEEA_MessageMediaGroupSize('media-2') === 8, 'the album size is readable later in the request');
push_grouping_assert(VNSEEA_MessageMediaGroupSize('media-3', 500) === 0, 'oversized albums are ignored');
push_grouping_assert(VNSEEA_MessageMediaGroupSize('media-3', array(2)) === 0, 'non-numeric sizes are ignored');

$push_source = file_get_contents($root . '/assets/includes/vnseea_push_delivery.php');
push_grouping_assert(
    strpos($push_source, "'title' => VNSEEA_MessagePushTitle(\$sender_name, \$conversation['type'], \$group_name, \$language)") !== false,
    'message pushes must build their title per conversation'
);
push_grouping_assert(
    strpos($push_source, "'conversation_title' => \$conversation['type'] === 'group' ? \$group_name : ''") !== false,
    'group pushes must carry the group name for the Android conversation style'
);
push_grouping_assert(
    strpos($push_source, 'VNSEEA_UpsertMediaGroupPushDelivery(') !== false,
    'album items must update one queued push instead of adding more'
);
push_grouping_assert(
    strpos($push_source, "`status` IN ('pending','retry') AND (`lease_until` IS NULL OR `lease_until`<{\$now})") !== false,
    'an album push that is being sent or already sent must not be rewritten'
);
push_grouping_assert(
    strpos($push_source, "'pending',0,{\$next_attempt_at},NULL") !== false,
    'queued pushes must honour a delayed first attempt'
);

foreach (array('send-message.php', 'group_chat.php') as $endpoint_name) {
    $endpoint = file_get_contents($root . '/api/v2/endpoints/' . $endpoint_name);
    push_grouping_assert(
        strpos($endpoint, "isset(\$_POST['media_group_size']) ? \$_POST['media_group_size'] : 0") !== false,
        "{$endpoint_name} must pass the album size to the push queue"
    );
}

fwrite(STDOUT, "message push grouping contract: ok\n");
