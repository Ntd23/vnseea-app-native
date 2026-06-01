<?php 
$response_data = array(
    'api_status' => 400,
);

if (empty($_POST['id'])) {
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
