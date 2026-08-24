<?php
// Asynchronous fan-out for new personal posts and stories from followed users.

if (!function_exists('VNSEEA_ContentNotificationJobsAvailable')) {
    function VNSEEA_ContentNotificationJobsAvailable()
    {
        global $sqlConnect;
        static $available = null;

        if ($available !== null) {
            return $available;
        }
        if (empty($sqlConnect) || !defined('T_CONTENT_NOTIFICATION_JOBS')) {
            $available = false;
            return false;
        }
        $table = mysqli_real_escape_string($sqlConnect, T_CONTENT_NOTIFICATION_JOBS);
        $query = mysqli_query($sqlConnect, "SHOW TABLES LIKE '{$table}'");
        $available = $query && mysqli_num_rows($query) > 0;
        return $available;
    }
}

if (!function_exists('VNSEEA_ContentNotificationIsEligiblePost')) {
    function VNSEEA_ContentNotificationIsEligiblePost($post)
    {
        if (!is_array($post)) {
            return false;
        }
        return !empty($post['id'])
            && !empty($post['user_id'])
            && (int) (isset($post['active']) ? $post['active'] : 0) === 1
            && empty($post['page_id'])
            && empty($post['group_id'])
            && empty($post['event_id'])
            && empty($post['page_event_id'])
            && empty($post['recipient_id'])
            && empty($post['is_anonymous'])
            && empty($post['live_time']);
    }
}

if (!function_exists('VNSEEA_ContentNotificationIsEligibleStory')) {
    function VNSEEA_ContentNotificationIsEligibleStory($story)
    {
        if (!is_array($story)) {
            return false;
        }
        return !empty($story['id'])
            && !empty($story['user_id'])
            && empty($story['ad_id'])
            && !empty($story['expire'])
            && (int) $story['expire'] > time();
    }
}

if (!function_exists('VNSEEA_EnqueueFollowerContentNotification')) {
    function VNSEEA_EnqueueFollowerContentNotification($content_type, $content_id, $author_id)
    {
        global $sqlConnect;

        $content_type = strtolower(trim((string) $content_type));
        $content_id = (int) $content_id;
        $author_id = (int) $author_id;
        if (!in_array($content_type, array('post', 'story'), true)
            || $content_id < 1
            || $author_id < 1
            || !VNSEEA_ContentNotificationJobsAvailable()) {
            return false;
        }

        $now = time();
        $type_sql = mysqli_real_escape_string($sqlConnect, $content_type);
        $query = mysqli_query(
            $sqlConnect,
            "INSERT INTO " . T_CONTENT_NOTIFICATION_JOBS .
            " (`content_type`,`content_id`,`author_id`,`cursor_follow_id`,`status`,`attempt_count`,`next_attempt_at`,`created_at`,`updated_at`)" .
            " VALUES ('{$type_sql}',{$content_id},{$author_id},0,'queued',0,{$now},{$now},{$now})" .
            " ON DUPLICATE KEY UPDATE `author_id`=VALUES(`author_id`)"
        );
        if (!$query) {
            error_log(
                '[vnseea-content-notification] enqueue_failed type=' . $content_type .
                ' content_id=' . $content_id . ' author_id=' . $author_id
            );
        }
        return (bool) $query;
    }
}

if (!function_exists('VNSEEA_LoadFollowerContentNotificationTarget')) {
    function VNSEEA_LoadFollowerContentNotificationTarget($content_type, $content_id)
    {
        global $sqlConnect;

        $table = $content_type === 'story' ? T_USER_STORY : T_POSTS;
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM {$table} WHERE `id`=" . (int) $content_id . ' LIMIT 1'
        );
        return $query && mysqli_num_rows($query) > 0
            ? mysqli_fetch_assoc($query)
            : array();
    }
}

if (!function_exists('VNSEEA_FollowerContentNotificationExists')) {
    function VNSEEA_FollowerContentNotificationExists(
        $content_type,
        $content_id,
        $author_id,
        $recipient_id
    ) {
        global $sqlConnect;

        $target_column = $content_type === 'story' ? 'story_id' : 'post_id';
        $type = $content_type === 'story' ? 'new_story' : 'new_post';
        $query = mysqli_query(
            $sqlConnect,
            'SELECT `id` FROM ' . T_NOTIFICATION .
            ' WHERE `recipient_id`=' . (int) $recipient_id .
            ' AND `notifier_id`=' . (int) $author_id .
            " AND `{$target_column}`=" . (int) $content_id .
            " AND `type`='{$type}' LIMIT 1"
        );
        return $query && mysqli_num_rows($query) > 0;
    }
}

if (!function_exists('VNSEEA_RegisterFollowerContentNotification')) {
    function VNSEEA_RegisterFollowerContentNotification(
        $content_type,
        $content,
        $author,
        $recipient_id
    ) {
        $content_id = (int) $content['id'];
        $author_id = (int) $author['user_id'];
        $recipient_id = (int) $recipient_id;
        if ($recipient_id < 1 || $recipient_id === $author_id) {
            return true;
        }
        if ($content_type === 'post') {
            if (!VNSEEA_CanViewPost($content, $recipient_id)) {
                return true;
            }
            $type = 'new_post';
            $target = array('post_id' => $content_id);
            $url = 'index.php?link1=post&id=' . $content_id;
        } else {
            if (!VNSEEA_CanViewStory($content, $recipient_id)
                || !VNSEEA_CanViewSharedPostStory($content, $recipient_id)) {
                return true;
            }
            $type = 'new_story';
            $target = array('story_id' => $content_id);
            $url = 'index.php?link1=timeline&u=' . rawurlencode((string) $author['username']) .
                '&story=true&story_id=' . $content_id;
        }
        if (VNSEEA_FollowerContentNotificationExists(
            $content_type,
            $content_id,
            $author_id,
            $recipient_id
        )) {
            return true;
        }
        if (function_exists('Wo_IsBlocked') && Wo_IsBlocked($recipient_id)) {
            return true;
        }
        return Wo_RegisterNotification(array_merge(array(
            'recipient_id' => $recipient_id,
            'notifier_id' => $author_id,
            'type' => $type,
            'text' => '',
            'url' => $url,
            'session_id' => 'follower-content-fanout',
            'skip_email' => true,
            'skip_post_hydration' => true
        ), $target));
    }
}

if (!function_exists('VNSEEA_CompleteFollowerContentNotificationJob')) {
    function VNSEEA_CompleteFollowerContentNotificationJob($job_id, $now)
    {
        global $sqlConnect;
        return mysqli_query(
            $sqlConnect,
            'UPDATE ' . T_CONTENT_NOTIFICATION_JOBS .
            " SET `status`='done',`lease_until`=NULL,`last_error`=NULL," .
            "`completed_at`={$now},`updated_at`={$now} WHERE `id`=" . (int) $job_id
        );
    }
}

if (!function_exists('VNSEEA_FailFollowerContentNotificationJob')) {
    function VNSEEA_FailFollowerContentNotificationJob($job, $message)
    {
        global $sqlConnect;

        $now = time();
        $attempt_count = (int) $job['attempt_count'] + 1;
        $retry_delays = array(60, 300, 900, 3600);
        $status = $attempt_count >= 5 ? 'dead' : 'retry';
        $delay_index = min(max(0, $attempt_count - 1), count($retry_delays) - 1);
        $next_attempt_at = $status === 'dead' ? $now : $now + $retry_delays[$delay_index];
        $error = mysqli_real_escape_string($sqlConnect, substr((string) $message, 0, 255));
        mysqli_query(
            $sqlConnect,
            'UPDATE ' . T_CONTENT_NOTIFICATION_JOBS .
            " SET `status`='{$status}',`attempt_count`={$attempt_count}," .
            "`next_attempt_at`={$next_attempt_at},`lease_until`=NULL," .
            "`last_error`='{$error}',`updated_at`={$now} WHERE `id`=" . (int) $job['id']
        );
    }
}

if (!function_exists('VNSEEA_ProcessFollowerContentNotificationJob')) {
    function VNSEEA_ProcessFollowerContentNotificationJob($job, $follower_batch_size = 50)
    {
        global $wo, $sqlConnect;

        $content_type = (string) $job['content_type'];
        $content_id = (int) $job['content_id'];
        $author_id = (int) $job['author_id'];
        $content = VNSEEA_LoadFollowerContentNotificationTarget($content_type, $content_id);
        $eligible = $content_type === 'story'
            ? VNSEEA_ContentNotificationIsEligibleStory($content)
            : VNSEEA_ContentNotificationIsEligiblePost($content);
        if (!$eligible || (int) $content['user_id'] !== $author_id) {
            VNSEEA_CompleteFollowerContentNotificationJob((int) $job['id'], time());
            return 1;
        }

        $author = Wo_UserData($author_id);
        if (empty($author['user_id'])) {
            throw new RuntimeException('content author is unavailable');
        }
        $cursor = (int) $job['cursor_follow_id'];
        $batch = max(1, min(200, (int) $follower_batch_size));
        $followers_query = mysqli_query(
            $sqlConnect,
            'SELECT follow.`id`,follow.`follower_id` FROM ' . T_FOLLOWERS . ' follow' .
            ' INNER JOIN ' . T_USERS . ' follower ON follower.`user_id`=follow.`follower_id`' .
            " WHERE follow.`following_id`={$author_id} AND follow.`active` = '1'" .
            " AND follow.`notify` = '1'" .
            " AND follower.`active` = '1' AND follow.`id`>{$cursor}" .
            " ORDER BY follow.`id` ASC LIMIT {$batch}"
        );
        if (!$followers_query) {
            throw new RuntimeException('unable to load content followers');
        }

        $previous_user = isset($wo['user']) ? $wo['user'] : null;
        $previous_logged_in = isset($wo['loggedin']) ? $wo['loggedin'] : false;
        $wo['user'] = $author;
        $wo['loggedin'] = true;
        $row_count = 0;
        $last_follow_id = $cursor;
        try {
            while ($follower = mysqli_fetch_assoc($followers_query)) {
                $row_count++;
                $last_follow_id = (int) $follower['id'];
                $registered = VNSEEA_RegisterFollowerContentNotification(
                    $content_type,
                    $content,
                    $author,
                    (int) $follower['follower_id']
                );
                if (!$registered) {
                    throw new RuntimeException(
                        'unable to register follower content notification'
                    );
                }
            }
        } finally {
            $wo['user'] = $previous_user;
            $wo['loggedin'] = $previous_logged_in;
        }

        $now = time();
        if ($row_count < $batch) {
            VNSEEA_CompleteFollowerContentNotificationJob((int) $job['id'], $now);
        } else {
            mysqli_query(
                $sqlConnect,
                'UPDATE ' . T_CONTENT_NOTIFICATION_JOBS .
                " SET `cursor_follow_id`={$last_follow_id},`status`='queued'," .
                "`next_attempt_at`={$now},`lease_until`=NULL,`last_error`=NULL," .
                "`updated_at`={$now} WHERE `id`=" . (int) $job['id']
            );
        }
        return max(1, $row_count);
    }
}

if (!function_exists('VNSEEA_ProcessFollowerContentNotificationQueue')) {
    function VNSEEA_ProcessFollowerContentNotificationQueue($job_limit = 2, $follower_batch_size = 50)
    {
        global $sqlConnect;

        if (!VNSEEA_ContentNotificationJobsAvailable()) {
            return 0;
        }
        $now = time();
        $job_limit = max(1, min(20, (int) $job_limit));
        $query = mysqli_query(
            $sqlConnect,
            'SELECT * FROM ' . T_CONTENT_NOTIFICATION_JOBS .
            " WHERE ((`status` IN ('queued','retry') AND `next_attempt_at`<={$now})" .
            " OR (`status`='processing' AND (`lease_until` IS NULL OR `lease_until`<{$now})))" .
            " ORDER BY `id` ASC LIMIT {$job_limit}"
        );
        if (!$query) {
            return 0;
        }

        $processed = 0;
        while ($job = mysqli_fetch_assoc($query)) {
            $job_id = (int) $job['id'];
            $lease_until = $now + 120;
            $claimed = mysqli_query(
                $sqlConnect,
                'UPDATE ' . T_CONTENT_NOTIFICATION_JOBS .
                " SET `status`='processing',`lease_until`={$lease_until},`updated_at`={$now}" .
                " WHERE `id`={$job_id} AND ((`status` IN ('queued','retry')" .
                " AND `next_attempt_at`<={$now}) OR (`status`='processing'" .
                " AND (`lease_until` IS NULL OR `lease_until`<{$now})))"
            );
            if (!$claimed || mysqli_affected_rows($sqlConnect) !== 1) {
                continue;
            }
            try {
                $processed += VNSEEA_ProcessFollowerContentNotificationJob(
                    $job,
                    $follower_batch_size
                );
            } catch (Throwable $caught) {
                VNSEEA_FailFollowerContentNotificationJob($job, $caught->getMessage());
                error_log(
                    '[vnseea-content-notification] process_failed job_id=' . $job_id .
                    ' code=' . (int) $caught->getCode()
                );
            }
        }
        return $processed;
    }
}
