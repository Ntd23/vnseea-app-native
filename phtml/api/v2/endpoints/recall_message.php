<?php
// English description: Recalls a message for every participant while preserving an audit tombstone.

$message_id = !empty($_POST['message_id']) && is_numeric($_POST['message_id'])
    ? (int)$_POST['message_id']
    : 0;
$current_user_id = (int)$wo['user']['user_id'];
$recall_prefix = '__VNSEEA_MESSAGE_RECALLED__:';

if ($message_id < 1) {
    $error_code = 4;
    $error_message = 'message_id is invalid.';
    return;
}

$message = $db->where('id', $message_id)->getOne(T_MESSAGES);
if (empty($message)) {
    $error_code = 5;
    $error_message = 'message not found.';
    return;
}
if ((int)$message->from_id !== $current_user_id) {
    $error_code = 6;
    $error_message = 'only the sender can recall this message.';
    return;
}

$recalled_at = time();
$recalled_by_name = !empty($wo['user']['name'])
    ? $wo['user']['name']
    : $wo['user']['username'];
$stored_text = html_entity_decode((string)$message->text, ENT_QUOTES, 'UTF-8');
$idempotent_replay = strpos($stored_text, $recall_prefix) === 0;

if ($idempotent_replay) {
    $encoded_payload = substr($stored_text, strlen($recall_prefix));
    $existing_payload = json_decode(base64_decode($encoded_payload), true);
    if (is_array($existing_payload)) {
        $recalled_at = !empty($existing_payload['deleted_at'])
            ? (int)$existing_payload['deleted_at']
            : $recalled_at;
        $recalled_by_name = !empty($existing_payload['deleted_by_name'])
            ? (string)$existing_payload['deleted_by_name']
            : $recalled_by_name;
    }
} else {
    $payload = base64_encode(json_encode(array(
        'deleted_at' => $recalled_at,
        'deleted_by' => $current_user_id,
        'deleted_by_name' => $recalled_by_name
    )));
    $recalled_text = Wo_Secure($recall_prefix . $payload);
    $update_data = array(
        'text' => $recalled_text,
        'media' => '',
        'mediaFileName' => '',
        'stickers' => '',
        'type_two' => ''
    );

    $db->startTransaction();
    $updated = $db->where('id', $message_id)
        ->where('from_id', $current_user_id)
        ->update(T_MESSAGES, $update_data);
    if ($updated === false || !$db->commit()) {
        $db->rollback();
        $error_code = 7;
        $error_message = 'unable to recall message.';
        return;
    }

    try {
        VNSEEA_PublishRealtimeMessageChange($message_id, $message);
    } catch (Throwable $exception) {
        error_log('VNSEEA message recall realtime publish failed: ' . $exception->getMessage());
    }
}

$response_data = array(
    'api_status' => 200,
    'message' => 'message recalled.',
    'message_id' => (string)$message_id,
    'recalled_at' => $recalled_at,
    'recalled_by' => (string)$current_user_id,
    'recalled_by_name' => $recalled_by_name,
    'idempotent_replay' => $idempotent_replay
);

