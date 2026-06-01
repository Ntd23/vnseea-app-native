<?php 
if ($f == 'vote_up') {
    if (!empty($_GET['id']) && Wo_CheckMainSession($hash_id) === true) {
        $post_id = Wo_GetPostIDFromOptionID($_GET['id']);
        if (empty($post_id)) {
            $data = array(
                'status' => 400,
                'text' => 'invalid option id'
            );
            header("Content-type: application/json");
            echo json_encode($data);
            exit();
        } else {
            $option_id = Wo_Secure($_GET['id']);
            $user_id   = Wo_Secure($wo['user']['user_id']);
            $post_id   = Wo_Secure($post_id);

            if (Wo_IsOptionVoted($option_id, $user_id)) {
                mysqli_query($sqlConnect, "DELETE FROM " . T_VOTES . " WHERE `option_id` = '{$option_id}' AND `user_id` = '{$user_id}'");
                $data = array(
                    'status' => 200,
                    'votes' => Ju_GetPercentageOfOptionPost($post_id),
                    'voted_id' => 0
                );
                header("Content-type: application/json");
                echo json_encode($data);
                exit();
            }

            mysqli_query($sqlConnect, "DELETE FROM " . T_VOTES . " WHERE `post_id` = '{$post_id}' AND `user_id` = '{$user_id}'");
            $vote = Wo_VoteUp($_GET['id'], $wo['user']['user_id']);
            if ($vote) {
                $data = array(
                    'status' => 200,
                    'votes' => Ju_GetPercentageOfOptionPost($post_id),
                    'voted_id' => $option_id
                );
            }
        }
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
