<?php
// English description: Records lightweight mobile recommendation events without affecting existing feed endpoints.

$response_data = array(
    'api_status' => 400
);

function WoApiRecommendationEvent_ReadString($key, $default = '') {
    if (!isset($_POST[$key])) {
        return $default;
    }
    return trim((string) $_POST[$key]);
}

function WoApiRecommendationEvent_ReadInt($key, $default = 0, $min = 0, $max = 2147483647) {
    if (!isset($_POST[$key]) || !is_numeric($_POST[$key])) {
        return $default;
    }
    $value = (int) $_POST[$key];
    if ($value < $min) {
        return $min;
    }
    if ($value > $max) {
        return $max;
    }
    return $value;
}

function WoApiRecommendationEvent_EnsureTable() {
    global $db;

    $query = "CREATE TABLE IF NOT EXISTS `wo_recommendation_events` (
        `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        `user_id` BIGINT UNSIGNED NOT NULL,
        `post_id` BIGINT UNSIGNED NOT NULL,
        `event_type` VARCHAR(32) NOT NULL,
        `value` VARCHAR(64) DEFAULT NULL,
        `weight` FLOAT NOT NULL DEFAULT 1,
        `duration_ms` INT UNSIGNED NOT NULL DEFAULT 0,
        `created_at` INT UNSIGNED NOT NULL,
        PRIMARY KEY (`id`),
        KEY `user_time` (`user_id`, `created_at`),
        KEY `user_post` (`user_id`, `post_id`),
        KEY `post_type` (`post_id`, `event_type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    try {
        $db->rawQuery($query);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

$allowed_events = array(
    'impression',
    'click',
    'reaction',
    'comment',
    'share',
    'video_watch',
    'hide',
    'report',
    'hashtag'
);

$event = WoApiRecommendationEvent_ReadString('event');
$post_id = WoApiRecommendationEvent_ReadInt('post_id', 0, 0);
$value = WoApiRecommendationEvent_ReadString('value');
$duration_ms = WoApiRecommendationEvent_ReadInt('duration_ms', 0, 0);
$viewer_id = (int) $wo['user']['user_id'];

if ($event === '' || !in_array($event, $allowed_events)) {
    $error_code = 4;
    $error_message = 'event is invalid';
} elseif ($event !== 'hashtag' && $post_id <= 0) {
    $error_code = 5;
    $error_message = 'post_id must be numeric and greater than 0';
}

if (empty($error_code)) {
    if (!WoApiRecommendationEvent_EnsureTable()) {
        $error_code = 6;
        $error_message = 'recommendation event table could not be created';
    }
}

if (empty($error_code)) {
    $safe_event = Wo_Secure($event);
    $safe_value = Wo_Secure(substr($value, 0, 64));
    $weight = 1.0;
    if ($event === 'click') {
        $weight = 2.0;
    } elseif ($event === 'reaction') {
        $weight = 3.0;
    } elseif ($event === 'comment') {
        $weight = 4.0;
    } elseif ($event === 'share') {
        $weight = 5.0;
    } elseif ($event === 'video_watch') {
        $weight = min(8.0, 1.0 + ($duration_ms / 5000));
    } elseif ($event === 'hide' || $event === 'report') {
        $weight = -10.0;
    }

    $created_at = time();
    $insert = $db->insert('wo_recommendation_events', array(
        'user_id' => $viewer_id,
        'post_id' => $post_id,
        'event_type' => $safe_event,
        'value' => $safe_value,
        'weight' => $weight,
        'duration_ms' => $duration_ms,
        'created_at' => $created_at
    ));

    if (!empty($insert)) {
        $response_data = array(
            'api_status' => 200,
            'event_id' => $insert
        );
    } else {
        $error_code = 7;
        $error_message = 'recommendation event could not be saved';
    }
}
?>
