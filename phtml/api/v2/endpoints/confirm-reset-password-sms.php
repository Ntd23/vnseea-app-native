<?php
$response_data = array(
    'api_status' => 400,
);

$required_fields = array(
    'user_id',
    'code'
);

foreach ($required_fields as $value) {
    if (empty($_POST[$value]) && empty($error_code)) {
        $error_code = 3;
        $error_message = $value . ' (POST) is missing';
    }
}

if (empty($error_code)) {
    $user_id = (int) $_POST['user_id'];
    $confirm_code = $_POST['code'];

    if (Wo_ConfirmSMSUser($user_id, $confirm_code) === false) {
        $error_code = 4;
        $error_message = 'Wrong confirmation code.';
    } else {
        $user = Wo_UserData($user_id);

        if (empty($user) || empty($user['email'])) {
            $error_code = 5;
            $error_message = 'User not found';
        } else {
            $response_data = array(
                'api_status' => 200,
                'message' => 'Phone number verified. You can reset your password now.',
                'reset_code' => $user_id . '_' . $user['password'],
                'email' => $user['email'],
            );
        }
    }
}
