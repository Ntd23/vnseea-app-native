<?php
// English description: Tells the uploader whether their Bunny Stream videos finished encoding, and publishes the post, reel or story waiting on one when its webhook was missed.

$raw_ids = isset($_POST['upload_ids']) ? (string) $_POST['upload_ids'] : '';
$upload_ids = array();
foreach (explode(',', $raw_ids) as $raw_id) {
    $raw_id = trim($raw_id);
    if ($raw_id !== '' && ctype_digit($raw_id) && (int) $raw_id > 0) {
        $upload_ids[(int) $raw_id] = (int) $raw_id;
    }
    if (count($upload_ids) >= 10) {
        break;
    }
}
if (empty($upload_ids)) {
    $error_code = 4;
    $error_message = 'upload_ids is required.';
    return;
}

$uploads = array();
foreach ($upload_ids as $upload_id) {
    $row = VNSEEA_BunnyLoadUpload($upload_id);
    if (empty($row) || (int) $row['user_id'] !== (int) $wo['user']['user_id']) {
        continue;
    }
    if (isset($row['publish_state']) && $row['publish_state'] === 'pending') {
        VNSEEA_BunnyRefreshUploadStatus($row, 10);
        $row = VNSEEA_BunnyFinalizePublish($upload_id);
    }
    $payload = !empty($row['publish_payload']) ? json_decode((string) $row['publish_payload'], true) : array();
    $uploads[] = array(
        'upload_id' => (string) $row['id'],
        'purpose' => (string) $row['purpose'],
        'status' => VNSEEA_BunnyClientUploadStatus((string) $row['status']),
        'publish_state' => isset($row['publish_state']) ? (string) $row['publish_state'] : '',
        'needs_review' => is_array($payload) && !empty($payload['requires_approval']),
        'post_id' => !empty($row['post_id']) ? (string) $row['post_id'] : '',
        'story_id' => !empty($row['story_id']) ? (string) $row['story_id'] : '',
    );
}
$response_data = array('api_status' => 200, 'uploads' => $uploads);
