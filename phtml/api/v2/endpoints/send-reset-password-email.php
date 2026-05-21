<?php
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
$response_data = array(
    'api_status' => 400,
);
if (empty($_POST['email'])) {
    $error_code    = 3;
    $error_message = 'email (POST) is missing';
}
if (empty($error_code)) {
    if (Wo_EmailExists($_POST['email']) === false) {
        $error_code    = 6;
        $error_message = 'Email not found';
    } else {
        $user_recover_data = Wo_UserData(Wo_UserIdFromEmail($_POST['email']));
        $user_id           = (int) $user_recover_data['user_id'];
        $subject           = $config['siteName'] . ' ' . $wo['lang']['password_rest_request'];

        // Generate a secure random code and store it with a 24h expiry
        $email_code     = bin2hex(random_bytes(16));
        $time_code_sent = time() + (60 * 60 * 24);
        mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `email_code` = '" . mysqli_real_escape_string($sqlConnect, $email_code) . "', `time_code_sent` = '{$time_code_sent}' WHERE `user_id` = {$user_id}");

        $reset_code = $user_id . '_' . $email_code;
        $user_recover_data['link'] = Wo_Link('reset-password?code=' . urlencode($reset_code) . '&email=' . urlencode($user_recover_data['email']));
        $wo['recover']             = $user_recover_data;
        $body                      = Wo_LoadPage('emails/recover');
        $send_message_data         = array(
            'from_email'   => $wo['config']['siteEmail'],
            'from_name'    => $wo['config']['siteName'],
            'to_email'     => $_POST['email'],
            'to_name'      => '',
            'subject'      => $subject,
            'charSet'      => 'utf-8',
            'message_body' => $body,
            'is_html'      => true
        );
        $send = Wo_SendMessage($send_message_data);
        if ($send) {
            $response_data = array(
                'api_status' => 200,
            );
        } else {
            $error_code    = 7;
            $error_message = 'Failed to send the email, please check your server email settings.';
        }
    }
}
