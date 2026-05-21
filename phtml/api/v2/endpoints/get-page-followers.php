<?php
// English description: Lists users who follow a page through the Wo_pages_follow table.

$response_data = array(
    'api_status' => 400,
);

$follow_table = 'Wo_pages_follow';

if (!function_exists('Wo_EnsurePagesFollowTable')) {
    function Wo_EnsurePagesFollowTable($table) {
        global $sqlConnect;

        return mysqli_query($sqlConnect, "CREATE TABLE IF NOT EXISTS `{$table}` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` int(11) NOT NULL DEFAULT 0,
            `page_id` int(11) NOT NULL DEFAULT 0,
            `active` tinyint(1) NOT NULL DEFAULT 1,
            `time` int(11) NOT NULL DEFAULT 0,
            PRIMARY KEY (`id`),
            UNIQUE KEY `user_page` (`user_id`, `page_id`),
            KEY `page_active` (`page_id`, `active`),
            KEY `user_active` (`user_id`, `active`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
}

if (empty($_POST['page_id'])) {
    $error_code    = 3;
    $error_message = 'page_id (POST) is missing';
}

if (empty($error_code)) {
    $page_id   = Wo_Secure($_POST['page_id']);
    $page_data = Wo_PageData($page_id);

    if (empty($page_data)) {
        $error_code    = 6;
        $error_message = 'Page not found';
    } else if (empty($wo['user']['user_id'])) {
        $error_code    = 7;
        $error_message = 'User not authenticated';
    } else if (!Wo_EnsurePagesFollowTable($follow_table)) {
        $error_code    = 8;
        $error_message = 'Unable to prepare page follow table';
    } else {
        $users = array();
        $logged_user_id = Wo_Secure($wo['user']['user_id']);
        $query = mysqli_query($sqlConnect, "SELECT `user_id` FROM `{$follow_table}` WHERE `page_id` = {$page_id} AND `active` = '1' ORDER BY `time` DESC LIMIT 200");

        if ($query && mysqli_num_rows($query)) {
            while ($row = mysqli_fetch_assoc($query)) {
                $user_id = Wo_Secure($row['user_id']);
                $user = Wo_UserData($user_id);

                if (!empty($user)) {
                    foreach ($non_allowed as $key => $value) {
                        unset($user[$value]);
                    }

                    $user['is_friend'] = (
                        Wo_IsFollowing($user_id, $logged_user_id) === true &&
                        Wo_IsFollowing($logged_user_id, $user_id) === true
                    ) ? 1 : 0;
                    $user['is_requested'] = Wo_IsFollowRequested($user_id, $logged_user_id) === true ? 1 : 0;
                    $users[] = $user;
                }
            }
        }

        $response_data = array(
            'api_status' => 200,
            'data' => $users
        );
    }
}
