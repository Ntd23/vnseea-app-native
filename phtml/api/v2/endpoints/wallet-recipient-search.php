<?php
// English description: Searches active backend users that can receive wallet transfers.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $keyword = '';
    if (!empty($_GET['q'])) {
        $keyword = Wo_Secure($_GET['q']);
    }
    elseif (!empty($_POST['q'])) {
        $keyword = Wo_Secure($_POST['q']);
    }

    $users = array();

    if (strlen($keyword) >= 2 || is_numeric($keyword)) {
        $escaped = mysqli_real_escape_string($sqlConnect, $keyword);
        $current_user_id = (int) $wo['user']['user_id'];
        $id_filter = is_numeric($keyword) ? "OR `user_id` = " . (int) $keyword : "";
        $query = mysqli_query($sqlConnect, "
            SELECT `user_id`, `username`, `first_name`, `last_name`, `avatar`, `email`
            FROM " . T_USERS . "
            WHERE `active` = '1'
              AND `banned` = '0'
              AND `user_id` <> {$current_user_id}
              AND (
                `username` LIKE '%{$escaped}%'
                OR `first_name` LIKE '%{$escaped}%'
                OR `last_name` LIKE '%{$escaped}%'
                OR `email` LIKE '%{$escaped}%'
                {$id_filter}
              )
            ORDER BY `user_id` DESC
            LIMIT 8
        ");

        if ($query) {
            while ($user = mysqli_fetch_assoc($query)) {
                $name = trim($user['first_name'] . ' ' . $user['last_name']);
                if ($name === '') {
                    $name = $user['username'];
                }

                $users[] = array(
                    'id' => (int) $user['user_id'],
                    'name' => $name,
                    'username' => $user['username'],
                    'avatar' => !empty($user['avatar']) ? Wo_GetMedia($user['avatar']) : '',
                );
            }
        }
    }

    $response_data = array(
        'api_status' => 200,
        'items' => $users
    );
}
