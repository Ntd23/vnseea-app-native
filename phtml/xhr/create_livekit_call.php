<?php
// English description: Creates a canonical LiveKit direct call for the authenticated Nuxt bridge.
if ($f == 'create_livekit_call') {
    require_once 'assets/includes/vnseea_livekit_call.php';

    $data = array(
        'status' => 400,
        'error_code' => 'invalid_request',
        'message' => 'Invalid call request.'
    );
    $recipient_id = !empty($_GET['recipient_id']) ? intval($_GET['recipient_id']) : 0;
    $call_type = (!empty($_GET['call_type']) && $_GET['call_type'] === 'audio') ? 'audio' : 'video';

    if (Wo_CheckMainSession($hash_id) !== true || empty($wo['user']['user_id'])) {
        $data = array(
            'status' => 401,
            'error_code' => 'unauthorized',
            'message' => 'Authentication is required.'
        );
    }
    else if ($recipient_id <= 0 || $recipient_id === intval($wo['user']['user_id'])) {
        $data = array(
            'status' => 400,
            'error_code' => 'recipient_missing',
            'message' => 'A valid recipient is required.'
        );
    }
    else if (!Wo_IsLiveKitAvailable()) {
        $data = array(
            'status' => 503,
            'error_code' => 'livekit_not_configured',
            'message' => 'LiveKit is not configured.'
        );
    }
    else {
        $recipient = Wo_UserData($recipient_id);
        if (empty($recipient) || !is_array($recipient)) {
            $data = array(
                'status' => 404,
                'error_code' => 'recipient_not_found',
                'message' => 'Recipient not found.'
            );
        }
        else {
            Wo_PrepareCanonicalLiveKitDirectCall($wo['user']['user_id'], $recipient_id);
            if (Wo_IsUserBusy($recipient_id)) {
                Wo_RegisterCallLog(array(
                    'from_id' => $wo['user']['user_id'],
                    'to_id' => $recipient_id,
                    'call_id' => 0,
                    'call_type' => $call_type,
                    'provider' => 'livekit',
                    'status' => 'busy'
                ));
                $data = array(
                    'status' => 200,
                    'busy' => true,
                    'provider' => 'livekit',
                    'call_type' => $call_type,
                    'call_status' => 'busy',
                    'id' => 0,
                    'message' => 'Recipient is busy.'
                );
            }
            else {
                $data = Wo_CreateCanonicalLiveKitDirectCall(
                    $wo['user'],
                    $recipient,
                    $call_type,
                    'nuxt',
                    VNSEEA_GetRequestEndpointId($wo['user']['user_id'])
                );
            }
        }
    }

    header('Content-Type: application/json; charset=utf-8');
    if (ob_get_length()) {
        ob_clean();
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}
