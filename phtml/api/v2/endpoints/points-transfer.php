<?php
// Canonical App/Nuxt endpoint for idempotent VNSEEA point transfers.

require_once 'assets/includes/vnseea_points_transfer.php';

$sender_id = !empty($wo['user']['user_id']) ? (int) $wo['user']['user_id'] : 0;
$result = Wo_TransferPoints(
    $sender_id,
    $_POST['recipient_user_id'] ?? null,
    $_POST['points'] ?? null,
    $_POST['request_id'] ?? null,
    $_POST['note'] ?? ''
);

http_response_code((int) $result['http_status']);
if (!empty($result['ok'])) {
    $response_data = array(
        'api_status' => 200,
        'success' => true,
        'message' => $result['message'],
        'request_id' => $result['request_id'],
        'idempotent_replay' => $result['idempotent_replay'],
        'recipient_id' => $result['recipient_id'],
        'recipient_name' => $result['recipient_name'],
        'points' => $result['points'],
        'sender_points' => $result['sender_points'],
        'recipient_points' => $result['recipient_points'],
        'sender_transaction_id' => $result['sender_transaction_id'],
        'recipient_transaction_id' => $result['recipient_transaction_id'],
    );
}
else {
    $response_data = array(
        'api_status' => (int) $result['http_status'],
        'success' => false,
        'request_id' => $result['request_id'],
        'error_code' => $result['error_code'],
        'message' => $result['message'],
        'errors' => array(
            'error_id' => $result['error_code'],
            'error_text' => $result['message'],
        ),
    );
}
