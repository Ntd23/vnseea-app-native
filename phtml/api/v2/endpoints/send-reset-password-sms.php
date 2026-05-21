<?php
$response_data = array(
    'api_status' => 400,
);

if (empty($_POST['phone_num'])) {
    $error_code = 3;
    $error_message = 'phone_num (POST) is missing';
}

if (empty($error_code)) {
    $phone_num = preg_replace('/\D+/', '', $_POST['phone_num']);

    if (empty($phone_num)) {
        $error_code = 4;
        $error_message = 'Phone number is invalid';
    } elseif (!in_array(true, Wo_IsPhoneExist($phone_num))) {
        $error_code = 6;
        $error_message = 'Phone number not found';
    } else {
        $random_activation = Wo_Secure(rand(11111, 99999));
        $message = $wo['lang']['confirmation_code_is'] . ": {$random_activation}";
        $user_id = Wo_UserIdFromPhoneNumber($phone_num);
        $time_code_sent = time() + (60 * 60 * 12);
        $query = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `sms_code` = '{$random_activation}', `time_code_sent` = '{$time_code_sent}' WHERE `user_id` = {$user_id}");

        if ($query && Wo_SendSMSMessage($phone_num, $message) === true) {
            cache($user_id, 'users', 'delete');
            $response_data = array(
                'api_status' => 200,
                'message' => 'A password reset code has been sent to your phone.',
                'user_id' => $user_id,
            );
        } else {
            $error_code = 7;
            $error_message = 'Failed to send the SMS, please check your server SMS settings.';
        }
    }
}
