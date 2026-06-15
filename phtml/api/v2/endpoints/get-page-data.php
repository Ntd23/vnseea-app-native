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
    'api_status' => 400,
);
if (empty($_POST['page_id']) && empty($_POST['page_name'])) {
    $error_code    = 3;
    $error_message = 'page_id or page_name (POST) is missing';
}

if (empty($error_code)) {
    if (!empty($_POST['page_name'])) {
        $page_id = Wo_PageIdFromPagename($_POST['page_name']); // Wo_Secure is applied inside the function
    } else {
        $page_id = Wo_Secure($_POST['page_id']);
    }
    $page_data = Wo_PageData($page_id);
    if (empty($page_data)) {
        $error_code    = 6;
        $error_message = 'Page not found';
    } else {
        $response_data = array('api_status' => 200);
        
        foreach ($non_allowed as $key => $value) {
            unset($page_data[$value]);
        }

        $page_data['post_count'] = Wo_CountPagePosts($page_data['page_id']);
        $page_data['is_liked'] = Wo_IsPageLiked($page_data['page_id'], $wo['user']['user_id']);
        $page_data['likes_count'] = Wo_CountPageLikes($page_data['page_id']);
        $page_data['is_following'] = false;
        $logged_user_id = !empty($wo['user']['user_id']) ? $wo['user']['user_id'] : (!empty($wo['user']['id']) ? $wo['user']['id'] : 0);
        if (!empty($logged_user_id)) {
            $user_id = Wo_Secure($logged_user_id);
            $page_id = Wo_Secure($page_data['page_id']);
            $is_following_query = mysqli_query($sqlConnect, "SELECT `id` FROM `Wo_pages_follow` WHERE `user_id` = {$user_id} AND `page_id` = {$page_id} AND `active` = 1 LIMIT 1");
            if ($is_following_query && mysqli_num_rows($is_following_query) > 0) {
                $page_data['is_following'] = true;
            }
        }
        $page_data['followers_count'] = 0;
        $followers_count_query = mysqli_query($sqlConnect, "SELECT COUNT(`id`) as `count` FROM `Wo_pages_follow` WHERE `page_id` = " . Wo_Secure($page_data['page_id']) . " AND `active` = 1");
        if ($followers_count_query && $row = mysqli_fetch_assoc($followers_count_query)) {
            $page_data['followers_count'] = (int) $row['count'];
        }
        $page_data['call_action_type_text'] = '';
        if (!empty($page_data['call_action_type'])) {
            $page_data['call_action_type_text'] = $wo['call_action'][$page_data['call_action_type']];
        }
        $page_data['is_rated'] = false;
        if (Wo_IsPageRatingExists($page_id, $wo['user']['id'])) {
            $page_data['is_rated'] = true;
        }
        $page_data['admin_info'] = array();
        if ($wo['user']['id'] != $page_data['user_id'] && Wo_IsPageAdminExists($wo['user']['id'],$page_id)) {
            $page_data['admin_info'] = Wo_GetPageAdminInfo($wo['user']['id'],$page_id);
        }

        $response_data['page_data'] = $page_data;
    }
}