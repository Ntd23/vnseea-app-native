<?php
$response_data = array(
    'api_status' => 400,
);

if (empty($_POST['page_id'])) {
    $error_code    = 3;
    $error_message = 'page_id (POST) is missing';
} elseif (empty($_POST['user_id'])) {
    $error_code    = 4;
    $error_message = 'user_id (POST) is missing';
}

if (empty($error_code)) {
    $page_id = Wo_Secure($_POST['page_id']);
    $user_id = Wo_Secure($_POST['user_id']);
    
    $page_data = Wo_PageData($page_id);
    
    if (empty($page_data)) {
        $error_code    = 6;
        $error_message = 'Page not found';
    } else {
        $register = Wo_RegsiterInvite($user_id, $page_id);
        
        if ($register) {
            $response_data = array(
                'api_status' => 200,
                'message' => 'Invite sent successfully'
            );
        } else {
            $error_code    = 7;
            $error_message = 'Could not send invite. User might already be invited or not allowed.';
        }
    }
}
