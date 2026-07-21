<?php
$current_user_id = (int)$wo['user']['user_id'];
$sender_ids = array();

if (!empty($_POST['recipient_id']) && is_numeric($_POST['recipient_id']) && $_POST['recipient_id'] > 0) {
    $recipient_id = (int)Wo_Secure($_POST['recipient_id']);
    $unread_messages = $db->where('to_id', $current_user_id)
                          ->where('from_id', $recipient_id)
                          ->where('seen', 0)
                          ->get(T_MESSAGES, null, array('from_id'));
    foreach ($unread_messages as $unread_message) {
        $sender_ids[(int)$unread_message->from_id] = true;
    }
    $marked_as_read = $db->where('to_id', $current_user_id)
                         ->where('from_id', $recipient_id)
                         ->where('seen', 0)
                         ->update(T_MESSAGES, array('seen' => time()));
}
else {
    $unread_messages = $db->where('to_id', $current_user_id)
                          ->where('seen', 0)
                          ->get(T_MESSAGES, null, array('from_id'));
    foreach ($unread_messages as $unread_message) {
        $sender_ids[(int)$unread_message->from_id] = true;
    }
    $marked_as_read = Wo_MarkAllChatsAsRead($current_user_id);
}

if ($marked_as_read !== false) {
    Wo_PublishRealtimeNotification($current_user_id, 0, 'message');
    foreach (array_keys($sender_ids) as $sender_id) {
        if ($sender_id > 0 && $sender_id !== $current_user_id) {
            Wo_PublishRealtimeNotification($sender_id, 0, 'message');
        }
    }
}
$response_data = array(
                    'api_status' => 200
                );
