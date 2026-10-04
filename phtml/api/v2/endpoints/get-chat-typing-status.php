<?php
// English description: Tells the signed-in user whether a chat partner is typing or recording a voice message to them, the read side of set-chat-typing-status for clients without a PHP browser session.
$response_data = array(
    'api_status' => 400,
);
$recipient_id = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
if ($recipient_id < 1) {
    $error_code    = 3;
    $error_message = 'user_id (POST) is missing';
}
if (empty($error_code)) {
    $is_recording = $db->where('follower_id', $wo['user']['id'])
        ->where('following_id', $recipient_id)
        ->where('is_typing', 2)
        ->getValue(T_FOLLOWERS, 'COUNT(*)');
    $response_data = array(
        'api_status' => 200,
        'typing' => Wo_IsTyping($recipient_id) ? 1 : 0,
        'recording' => $is_recording > 0 ? 1 : 0,
    );
}
