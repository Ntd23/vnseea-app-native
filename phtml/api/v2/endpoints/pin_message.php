<?php

$message_id = !empty($_POST['message_id']) ? (int)$_POST['message_id'] : 0;
$chat_id = !empty($_POST['chat_id']) ? (int)$_POST['chat_id'] : 0;
$pin_action = !empty($_POST['pin']) ? (string)$_POST['pin'] : '';
$chat_type = !empty($_POST['type']) ? (string)$_POST['type'] : '';

if ($message_id < 1 || $chat_id < 1 || !in_array($pin_action, array('yes', 'no')) || !in_array($chat_type, array('user', 'page', 'group')) || !VNSEEA_IsMessageInAuthorizedChat($chat_type, $chat_id, $message_id)) {
    $error_code = 4;
    $error_message = 'message_id and chat_id and pin and type are invalid';
    return;
}

if ($chat_type === 'page') {
    $info = $db->where('user_id', $wo['user']['id'])->where('message_id', $message_id)->getOne(T_MUTE);
    if (!empty($info)) {
        $mutation_succeeded = $db->where('id', $info->id)->update(T_MUTE, array('pin' => $pin_action, 'time' => time()));
    } else {
        $mutation_succeeded = (bool)$db->insert(T_MUTE, array('user_id' => $wo['user']['id'], 'type' => 'page', 'time' => time(), 'pin' => $pin_action, 'message_id' => $message_id, 'chat_id' => $chat_id));
    }
    if ($mutation_succeeded === false) {
        $error_code = 5;
        $error_message = 'could not update pinned message';
        return;
    }
    VNSEEA_PublishRealtimeMessageChange($message_id);
    $response_data = array('api_status' => 200, 'message' => 'message updated');
    return;
}

$message = $db->where('id', $message_id)->getOne(T_MESSAGES);
if (empty($message) || (!empty($message->type_two) && $message->type_two === 'message_pin_event')) {
    $error_code = 4;
    $error_message = 'message can not be pinned';
    return;
}
$existing_pin = VNSEEA_GetSharedMessagePin($message_id);
$current_user_id = (int)$wo['user']['user_id'];
if ($pin_action === 'yes' && !empty($existing_pin)) {
    $response_data = array('api_status' => 200, 'message' => 'message already pinned', 'idempotent_replay' => true, 'pinned_by_user_id' => (string)$existing_pin->pinned_by, 'can_unpin' => VNSEEA_CanUnpinSharedMessage($existing_pin, $chat_type, $chat_id));
    return;
}
if ($pin_action === 'no') {
    if (empty($existing_pin)) {
        $response_data = array('api_status' => 200, 'message' => 'message already unpinned', 'idempotent_replay' => true);
        return;
    }
    if (!VNSEEA_CanUnpinSharedMessage($existing_pin, $chat_type, $chat_id)) {
        $error_code = 6;
        $error_message = 'you are not allowed to unpin this message';
        return;
    }
    $db->startTransaction();
    try {
        if (!$db->where('message_id', $message_id)->delete(T_MESSAGE_PINS)) throw new Exception('could not remove shared message pin');
        $db->commit();
        VNSEEA_PublishRealtimeMessageChange($message_id, $message);
        $response_data = array('api_status' => 200, 'message' => 'message unpinned');
    } catch (Exception $exception) {
        $db->rollback();
        $error_code = 5;
        $error_message = 'could not update pinned message';
    }
    return;
}

$pinned_at = time();
$other_user_id = (int)$message->from_id === $current_user_id ? (int)$message->to_id : (int)$message->from_id;
$event_data = array('from_id' => $current_user_id, 'to_id' => $chat_type === 'user' ? $other_user_id : 0, 'group_id' => $chat_type === 'group' ? $chat_id : 0, 'text' => 'message_pinned', 'time' => $pinned_at, 'type_two' => 'message_pin_event', 'reply_id' => $message_id, 'seen' => 0);
$db->startTransaction();
try {
    $pin_id = $db->insert(T_MESSAGE_PINS, array('message_id' => $message_id, 'pinned_by' => $current_user_id, 'pinned_at' => $pinned_at));
    if (empty($pin_id)) throw new Exception('could not create shared message pin');
    $event_id = $db->insert(T_MESSAGES, $event_data);
    if (empty($event_id)) throw new Exception('could not create message pin event');
    $db->commit();
    if ($chat_type === 'user') Wo_CreateUserChat($other_user_id, $current_user_id);
    VNSEEA_EnqueueMessagePush($event_id);
    VNSEEA_PublishRealtimeMessageChange($event_id);
    $response_data = array('api_status' => 200, 'message' => 'message pinned', 'event_message_id' => (string)$event_id, 'pinned_by_user_id' => (string)$current_user_id, 'can_unpin' => true);
} catch (Exception $exception) {
    $db->rollback();
    $concurrent_pin = VNSEEA_GetSharedMessagePin($message_id);
    if (!empty($concurrent_pin)) {
        $response_data = array('api_status' => 200, 'message' => 'message already pinned', 'idempotent_replay' => true, 'pinned_by_user_id' => (string)$concurrent_pin->pinned_by, 'can_unpin' => VNSEEA_CanUnpinSharedMessage($concurrent_pin, $chat_type, $chat_id));
    } else {
        $error_code = 5;
        $error_message = 'could not update pinned message';
    }
}
