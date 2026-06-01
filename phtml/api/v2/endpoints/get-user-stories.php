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

$stories = array();

$options['offset'] = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0 ? Wo_Secure($_POST['offset']) : 0);
$options['limit'] = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 20);
$options['api'] = false;

$get_all_stories = Wo_GetFriendsStatusAPI($options);
$data_array = array();

if (!empty($get_all_stories) && is_array($get_all_stories)) {
    foreach ($get_all_stories as $key => $one_story) {
        $logged_user_id = Wo_Secure($wo['user']['id']);
        $story_user_id = Wo_Secure($one_story['user_id']);
        $is_muted = 0;

        $mute_query = mysqli_query($sqlConnect, "SELECT COUNT(*) AS count FROM " . T_MUTE_STORY . " WHERE `user_id` = '{$logged_user_id}' AND `story_user_id` = '{$story_user_id}'");

        if ($mute_query) {
            $mute_data = mysqli_fetch_assoc($mute_query);
            $is_muted = !empty($mute_data['count']) ? (int)$mute_data['count'] : 0;
        }

        if ($is_muted == 0) {
            $user_data = $one_story['user_data'];

            foreach ($non_allowed as $key => $value) {
                unset($user_data[$value]);
            }

            $user_data['stories'] = array();

            $get_stories = Wo_GetStroies(array('user' => $one_story['user_id']));

            if (!empty($get_stories) && is_array($get_stories)) {
                foreach ($get_stories as $key => $story) {
                    foreach ($non_allowed as $key => $value) {
                        unset($story['user_data'][$value]);
                    }

                    if (!empty($story['thumb']['filename'])) {
                        $story['thumbnail'] = $story['thumb']['filename'];
                        unset($story['thumb']);
                    } else {
                        $story['thumbnail'] = $story['user_data']['avatar'];
                    }

                    $story['time_text'] = Wo_Time_Elapsed_String($story['posted']);

                    $story_id = Wo_Secure($story['id']);
                    $story_owner_id = Wo_Secure($story['user_id']);
                    $view_count = 0;

                    $view_query = mysqli_query($sqlConnect, "SELECT COUNT(*) AS count FROM " . T_STORY_SEEN . " WHERE `story_id` = '{$story_id}' AND `user_id` != '{$story_owner_id}'");

                    if ($view_query) {
                        $view_data = mysqli_fetch_assoc($view_query);
                        $view_count = !empty($view_data['count']) ? (int)$view_data['count'] : 0;
                    }

                    $story['view_count'] = $view_count;

                    $user_data['stories'][] = $story;
                }
            }

            $data_array[] = $user_data;
        }
    }
}

$response_data = array(
    'api_status' => 200,
    'stories' => $data_array
);