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
if (empty($_POST['user_id'])) {
    $error_code = 3;
    $error_message = 'user_id (POST) is missing';
}

$limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 20);
$following_offset = (!empty($_POST['following_offset']) && is_numeric($_POST['following_offset']) && $_POST['following_offset'] > 0 ? Wo_Secure($_POST['following_offset']) : 0);
$followers_offset = (!empty($_POST['followers_offset']) && is_numeric($_POST['followers_offset']) && $_POST['followers_offset'] > 0 ? Wo_Secure($_POST['followers_offset']) : 0);
if (!empty($_POST['type'])) {
    $types = explode(',', $_POST['type']);
    $user_id = Wo_Secure($_POST['user_id']);
    $requested_user_id = trim((string) $_POST['user_id']);
    $sort_by_activity = !empty($_POST['sort_by_activity'])
        && ctype_digit($requested_user_id)
        && (int) $user_id === (int) $wo['user']['user_id'];
    $activity_owner_user_id = (int) $wo['user']['user_id'];
    $get_relationship_users_by_activity = function ($direction) use ($sqlConnect, $wo, $activity_owner_user_id, $limit) {
        $owner_field = $direction === 'following' ? 'follower_id' : 'following_id';
        $related_field = $direction === 'following' ? 'following_id' : 'follower_id';
        $logged_user_id = (int) $wo['user']['user_id'];
        $query = "SELECT
                f.`{$related_field}` AS `related_user_id`,
                GREATEST(
                    COALESCE(MAX(f.`time`), 0),
                    COALESCE(MAX(a.`time`), 0),
                    COALESCE(MAX(n.`time`), 0)
                ) AS `relationship_activity_at`
            FROM " . T_FOLLOWERS . " f
            INNER JOIN " . T_USERS . " u
                ON u.`user_id` = f.`{$related_field}`
                AND u.`active` = '1'
            LEFT JOIN " . T_ACTIVITIES . " a
                ON a.`activity_type` IN ('following', 'friend')
                AND (
                    (a.`user_id` = f.`follower_id` AND a.`follow_id` = f.`following_id`)
                    OR
                    (a.`user_id` = f.`following_id` AND a.`follow_id` = f.`follower_id`)
                )
            LEFT JOIN " . T_NOTIFICATION . " n
                ON n.`type` IN ('following', 'accepted_request')
                AND (
                    (n.`notifier_id` = f.`follower_id` AND n.`recipient_id` = f.`following_id`)
                    OR
                    (n.`notifier_id` = f.`following_id` AND n.`recipient_id` = f.`follower_id`)
                )
            WHERE f.`{$owner_field}` = {$activity_owner_user_id}
            AND f.`{$related_field}` <> {$activity_owner_user_id}
            AND f.`active` = '1'
            AND u.`user_id` NOT IN (
                SELECT `blocked` FROM " . T_BLOCKS . " WHERE `blocker` = '{$logged_user_id}'
            )
            AND u.`user_id` NOT IN (
                SELECT `blocker` FROM " . T_BLOCKS . " WHERE `blocked` = '{$logged_user_id}'
            )
            GROUP BY f.`id`, f.`follower_id`, f.`following_id`
            ORDER BY `relationship_activity_at` DESC, f.`id` DESC
            LIMIT {$limit}";
        $result = mysqli_query($sqlConnect, $query);
        $users = array();
        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $user_data = Wo_UserData($row['related_user_id'], false);
                if (!empty($user_data['user_id'])) {
                    $user_data['relationship_activity_at'] = (int) $row['relationship_activity_at'];
                    $users[] = $user_data;
                }
            }
        }
        return $users;
    };
    $f_data = array('following' => array(), 'followers' => array());
    if (in_array('following', $types)) {
        $following = $sort_by_activity
            ? $get_relationship_users_by_activity('following')
            : Wo_GetFollowing($user_id, 'profile', $limit, $following_offset);
        foreach ($following as $key2 => $user_list) {
            $lastseen = ($user_list['lastseen'] > (time() - 60)) ? 'on' : 'off';
            $following[$key2] = $user_list;
            $following[$key2]['lastseen_unix_time'] = $user_list['lastseen'];
            $following[$key2]['lastseen_time_text'] = Wo_Time_Elapsed_String($user_list['lastseen']);
            $following[$key2]['lastseen'] = $lastseen;
            $following[$key2]['user_platform'] = Wo_GetPlatformFromUser_ID($user_list['user_id']);
            $following[$key2]['is_following'] = (Wo_IsFollowing($user_list['user_id'], $wo['user']['user_id'])) ? 1 : 0;

            foreach ($non_allowed as $key => $value) {
                unset($following[$key2][$value]);
            }
        }

        $f_data['following'] = $following;
    }

    if (in_array('followers', $types)) {
        $following = $sort_by_activity
            ? $get_relationship_users_by_activity('followers')
            : Wo_GetFollowers($user_id, 'profile', $limit, $followers_offset);
        foreach ($following as $key2 => $user_list) {
            $lastseen = ($user_list['lastseen'] > (time() - 60)) ? 'on' : 'off';
            $following[$key2] = $user_list;
            $following[$key2]['lastseen_unix_time'] = $user_list['lastseen'];
            $following[$key2]['lastseen_time_text'] = Wo_Time_Elapsed_String($user_list['lastseen']);
            $following[$key2]['lastseen'] = $lastseen;
            $following[$key2]['user_platform'] = Wo_GetPlatformFromUser_ID($user_list['user_id']);
            $following[$key2]['is_following'] = (Wo_IsFollowing($user_list['user_id'], $wo['user']['user_id'])) ? 1 : 0;

            foreach ($non_allowed as $key => $value) {
                unset($following[$key2][$value]);
            }
        }

        $f_data['followers'] = $following;
    }
    $response_data = array(
        'api_status' => 200,
        'data' => $f_data
    );
} else {
    $error_code = 4;
    $error_message = 'type can not be empty';
}
