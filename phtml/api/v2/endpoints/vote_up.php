<?php
$response_data = array(
    'api_status' => 400,
);

if (!empty($_POST['type']) && $_POST['type'] == 'voters') {
    $post_id = !empty($_POST['post_id']) ? Wo_Secure($_POST['post_id']) : 0;
    if (empty($post_id) || !is_numeric($post_id) || $post_id < 1) {
        $error_code    = 3;
        $error_message = 'post_id (POST) is missing';
    } else {
        $post = Wo_PostData($post_id);
        if (empty($post) || empty($post['poll_id'])) {
            $error_code    = 4;
            $error_message = 'invalid poll post id';
        } elseif (!empty($post['postPrivacy']) && (int)$post['postPrivacy'] === 4) {
            $error_code    = 5;
            $error_message = 'poll votes are anonymous';
        } else {
            $post_id = Wo_Secure($post_id);
            $voters = array();
            $query = "SELECT v.`user_id`, v.`option_id`, p.`text` AS `option_text`
                      FROM " . T_VOTES . " v
                      LEFT JOIN " . T_POLLS . " p ON p.`id` = v.`option_id`
                      WHERE v.`post_id` = '{$post_id}'
                      ORDER BY v.`id` DESC
                      LIMIT 200";
            $sql_query = mysqli_query($sqlConnect, $query);
            if ($sql_query) {
                while ($vote = mysqli_fetch_assoc($sql_query)) {
                    $user = Wo_UserData((int)$vote['user_id']);
                    if (empty($user)) {
                        continue;
                    }
                    $voters[] = array(
                        'user_id' => (string)$vote['user_id'],
                        'name' => !empty($user['name']) ? $user['name'] : '',
                        'username' => !empty($user['username']) ? $user['username'] : '',
                        'avatar' => !empty($user['avatar']) ? $user['avatar'] : '',
                        'avatar_org' => !empty($user['avatar_org']) ? $user['avatar_org'] : '',
                        'option_id' => (string)$vote['option_id'],
                        'option_text' => !empty($vote['option_text']) ? $vote['option_text'] : '',
                    );
                }
            }
            $response_data = array(
                'api_status' => 200,
                'voters' => $voters,
            );
        }
    }
} elseif (empty($_POST['id'])) {
    $error_code    = 3;
    $error_message = 'id (POST) is missing';
}
else{
    $post_id = Wo_GetPostIDFromOptionID($_POST['id']);
    if (empty($post_id)) {
        $error_code    = 4;
        $error_message = 'invalid option id';
    } else {
        $option_id = Wo_Secure($_POST['id']);
        $user_id   = Wo_Secure($wo['user']['user_id']);
        $post_id   = Wo_Secure($post_id);

        if (Wo_IsOptionVoted($option_id, $user_id)) {
            mysqli_query($sqlConnect, "DELETE FROM " . T_VOTES . " WHERE `option_id` = '{$option_id}' AND `user_id` = '{$user_id}'");
            $response_data = array(
                'api_status' => 200,
                'votes' => Ju_GetPercentageOfOptionPost($post_id),
                'voted_id' => 0
            );
        } else {
            mysqli_query($sqlConnect, "DELETE FROM " . T_VOTES . " WHERE `post_id` = '{$post_id}' AND `user_id` = '{$user_id}'");
            $vote = Wo_VoteUp($_POST['id'], $wo['user']['user_id']);
            if ($vote) {
                $response_data = array(
                    'api_status' => 200,
                    'votes' => Ju_GetPercentageOfOptionPost($post_id),
                    'voted_id' => $option_id
                );
            }
        }
    }
}
