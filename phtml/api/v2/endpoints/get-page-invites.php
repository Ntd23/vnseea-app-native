<?php
$response_data = array(
    'api_status' => 400,
);

if (empty($_POST['page_id'])) {
    $error_code    = 3;
    $error_message = 'page_id (POST) is missing';
}

if (empty($error_code)) {
    $page_id = Wo_Secure($_POST['page_id']);
    $page_data = Wo_PageData($page_id);
    
    if (empty($page_data)) {
        $error_code    = 6;
        $error_message = 'Page not found';
    } else {
        $users = Wo_GetPageInvites($page_id);
        
        if (is_array($users)) {
            foreach ($users as $key => $user) {
                foreach ($non_allowed as $k => $v) {
                    unset($users[$key][$v]);
                }
            }
            $response_data = array(
                'api_status' => 200,
                'data' => $users
            );
        } else {
            $response_data = array(
                'api_status' => 200,
                'data' => array()
            );
        }
    }
}
