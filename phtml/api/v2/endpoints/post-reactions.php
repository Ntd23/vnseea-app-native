<?php
// English description: Returns reaction counts and users for one post as JSON for Nuxt feed reaction modals.

if (!empty($_GET['post_id']) && is_numeric($_GET['post_id']) && $_GET['post_id'] > 0) {
    $post_id = Wo_Secure($_GET['post_id']);
    $limit = (!empty($_GET['limit']) && is_numeric($_GET['limit']) && $_GET['limit'] > 0) ? min(100, (int) $_GET['limit']) : 50;
    $offset = (!empty($_GET['offset']) && is_numeric($_GET['offset']) && $_GET['offset'] > 0) ? (int) $_GET['offset'] : 0;
    $reaction_filter = (!empty($_GET['reaction'])) ? Wo_Secure($_GET['reaction']) : '';
    $reaction_types = array_keys($wo['reactions_types']);
    $reaction_users = array();
    $reaction_counts = array();

    foreach ($reaction_types as $reaction_type) {
        $count = Wo_CountReactions($post_id, $reaction_type, 'post');

        if ($count > 0) {
            $reaction_counts[] = array(
                'reaction' => $reaction_type,
                'count' => $count
            );
        }

        if (!empty($reaction_filter) && $reaction_filter != $reaction_type) {
            continue;
        }

        $users = Wo_GetPostReactionUsers($post_id, $reaction_type, $limit, $offset, 'post');

        if (!empty($users)) {
            foreach ($users as $user) {
                foreach ($non_allowed as $field) {
                    unset($user[$field]);
                }

                $user['reaction'] = $reaction_type;
                $user['is_following'] = (Wo_IsFollowing($user['user_id'], $wo['user']['user_id'])) ? 1 : 0;
                $reaction_users[] = $user;
            }
        }
    }

    $response_data = array(
        'api_status' => 200,
        'post_id' => (int) $post_id,
        'reactions' => $reaction_counts,
        'users' => $reaction_users
    );
}
else {
    $error_code = 4;
    $error_message = 'post_id can not be empty';
}
