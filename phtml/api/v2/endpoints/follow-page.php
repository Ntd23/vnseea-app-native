<?php
// English description: Toggles a user's follow state for a page using Wo_pages_follow.

$response_data = array(
    'api_status' => 400,
);

$follow_table = 'Wo_pages_follow';

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
        $user_id = Wo_Secure($wo['user']['user_id']);
        $now     = time();
        $exists  = mysqli_query($sqlConnect, "SELECT `id`, `active` FROM `{$follow_table}` WHERE `user_id` = {$user_id} AND `page_id` = {$page_id} LIMIT 1");
        $follow_message = 'followed';

        if ($exists && mysqli_num_rows($exists) > 0) {
            $row = mysqli_fetch_assoc($exists);
            $next_active = ((int) $row['active'] === 1) ? 0 : 1;
            $follow_message = $next_active === 1 ? 'followed' : 'unfollowed';
            mysqli_query($sqlConnect, "UPDATE `{$follow_table}` SET `active` = {$next_active}, `time` = {$now} WHERE `id` = " . Wo_Secure($row['id']));
        } else {
            mysqli_query($sqlConnect, "INSERT INTO `{$follow_table}` (`user_id`, `page_id`, `active`, `time`) VALUES ({$user_id}, {$page_id}, 1, {$now})");
        }

        $response_data = array(
            'api_status' => 200,
            'follow_status' => $follow_message
        );
    }
}
