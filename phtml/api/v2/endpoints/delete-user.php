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
    'api_status' => 400
);
if (empty($_POST['password'])) {
    $error_code    = 4;
    $error_message = 'password_required';
}
if (empty($error_code)) {
    if (!Wo_HashPassword($_POST['password'], $wo['user']['password'])) {
        $error_code = 5;
        $error_message = 'password_mismatch';
    } else {
        $delete = Wo_DeleteUser($wo['user']['user_id']);
        if ($delete) {
            $response_data = array(
                'api_status' => 200,
                'message' => 'account_deleted'
            );
        } else {
            $error_code = 6;
            $error_message = 'delete_failed';
        }
    }
}
