<?php
// Canonical LiveKit live-session creation shared by XHR and API v2.

function VNSEEA_LivePrivacyDatabaseValue($privacy)
{
    $privacy = (int) $privacy;
    if (!in_array($privacy, array(0, 1, 2, 3), true)) {
        $privacy = 0;
    }
    return (string) $privacy;
}

function VNSEEA_LiveCreateError($error_code, $extra = array())
{
    $errors = array(
        'live_video_disabled' => array(503, false),
        'live_permission_disabled' => array(403, false),
        'livekit_not_ready' => array(503, true),
        'live_already_running' => array(409, false),
        'live_post_insert_failed' => array(500, true),
        'live_post_finalize_failed' => array(500, true),
    );
    $definition = isset($errors[$error_code]) ? $errors[$error_code] : array(500, true);

    return array_merge(array(
        'status' => $definition[0],
        'error_code' => $error_code,
        'blocked_reason' => $error_code,
        'retryable' => $definition[1],
        'message' => 'Unable to create live session.',
    ), is_array($extra) ? $extra : array());
}

function VNSEEA_LivePostsHasAnonymousColumn()
{
    global $sqlConnect;
    static $has_column = null;

    if ($has_column !== null) {
        return $has_column;
    }
    if (empty($sqlConnect) || !defined('T_POSTS')) {
        $has_column = false;
        return $has_column;
    }

    $query = mysqli_query($sqlConnect, 'SHOW COLUMNS FROM ' . T_POSTS . " LIKE 'is_anonymous'");
    $has_column = $query !== false && mysqli_num_rows($query) > 0;
    if ($query instanceof mysqli_result) {
        mysqli_free_result($query);
    }
    return $has_column;
}

function VNSEEA_LogLiveCreateResult($source, $result, $extra = array())
{
    if (!function_exists('Wo_VnseeaCallDebugLog')) {
        return;
    }
    $fields = array_merge(array(
        'source' => (string) $source,
        'user_id' => isset($result['user_id']) ? (int) $result['user_id'] : 0,
        'role' => 'host',
        'status' => isset($result['status']) ? (int) $result['status'] : 500,
        'blocked_reason' => isset($result['blocked_reason']) ? $result['blocked_reason'] : '',
    ), is_array($extra) ? $extra : array());
    Wo_VnseeaCallDebugLog('live_create', $fields);
}

function VNSEEA_CreateLiveSession($request = array(), $source = 'unknown')
{
    global $wo, $db;
    $request = is_array($request) ? $request : array();
    $user_id = !empty($wo['user']['id']) ? (int) $wo['user']['id'] : 0;

    if (empty($wo['config']['live_video'])) {
        $result = VNSEEA_LiveCreateError('live_video_disabled', array('user_id' => $user_id));
        VNSEEA_LogLiveCreateResult($source, $result);
        return $result;
    }
    if (empty($wo['config']['can_use_live'])) {
        $result = VNSEEA_LiveCreateError('live_permission_disabled', array('user_id' => $user_id));
        VNSEEA_LogLiveCreateResult($source, $result);
        return $result;
    }
    if (!Wo_IsLiveKitAvailable()) {
        $result = VNSEEA_LiveCreateError('livekit_not_ready', array('user_id' => $user_id));
        VNSEEA_LogLiveCreateResult($source, $result);
        return $result;
    }

    $active_live = (int) $db
        ->where('user_id', $user_id)
        ->where('stream_name', '', '!=')
        ->where('live_ended', 0)
        ->where('live_time', time() - 5, '>=')
        ->getValue(T_POSTS, 'COUNT(*)');
    if ($active_live > 0) {
        $result = VNSEEA_LiveCreateError('live_already_running', array(
            'user_id' => $user_id,
            'active_live' => $active_live,
        ));
        VNSEEA_LogLiveCreateResult($source, $result);
        return $result;
    }

    $stream_name = !empty($request['stream_name'])
        ? Wo_Secure($request['stream_name'])
        : Wo_GenerateLiveStreamName($user_id);
    $live_title = !empty($request['title']) ? Wo_Secure(trim($request['title'])) : '';
    $live_description = !empty($request['description']) ? Wo_Secure(trim($request['description'])) : '';
    $join_payload = Wo_GetLiveKitLivestreamJoinPayload($stream_name, 'host', $user_id, $wo['user']);
    if ($stream_name === '' || empty($join_payload)) {
        $result = VNSEEA_LiveCreateError('livekit_not_ready', array('user_id' => $user_id));
        VNSEEA_LogLiveCreateResult($source, $result, array('stream_name' => $stream_name));
        return $result;
    }

    $privacy_request = $request;
    if (!isset($privacy_request['postPrivacy']) && isset($request['post_privacy'])) {
        $privacy_request['postPrivacy'] = $request['post_privacy'];
    }
    $privacy_request['postType'] = 'live';
    $privacy = VNSEEA_NormalizePostPrivacyRequest($privacy_request);
    $privacy_value = VNSEEA_LivePrivacyDatabaseValue($privacy['postPrivacy']);
    $post_text = implode(PHP_EOL . PHP_EOL, array_values(array_filter(array(
        $live_title,
        $live_description,
    ), function ($value) {
        return $value !== '';
    })));
    $now = time();
    $post_data = array(
        'user_id' => $user_id,
        'postText' => $post_text,
        'postType' => 'live',
        'postPrivacy' => VNSEEA_LivePrivacyDatabaseValue($privacy_value),
        'stream_name' => $stream_name,
        'time' => $now,
        'live_time' => $now,
        'live_ended' => 0,
    );
    if (VNSEEA_LivePostsHasAnonymousColumn()) {
        $post_data['is_anonymous'] = '0';
    }

    $db->startTransaction();
    try {
        $locked_user = $db->rawQueryOne(
            'SELECT `user_id` FROM ' . T_USERS . ' WHERE `user_id` = ? FOR UPDATE',
            array($user_id)
        );
        if (empty($locked_user)) {
            throw new RuntimeException('live_post_insert_failed:0');
        }

        // The preliminary check avoids unnecessary token work in the common case.
        // This locked check closes the App/Web race for the same host.
        $locked_active_live = (int) $db
            ->where('user_id', $user_id)
            ->where('stream_name', '', '!=')
            ->where('live_ended', 0)
            ->where('live_time', time() - 5, '>=')
            ->getValue(T_POSTS, 'COUNT(*)');
        if ($locked_active_live > 0) {
            throw new RuntimeException('live_already_running:' . $locked_active_live);
        }

        $post_id = $db->insert(T_POSTS, $post_data);
        if (empty($post_id)) {
            $db_error = method_exists($db, 'getLastErrno') ? (int) $db->getLastErrno() : 0;
            throw new RuntimeException('live_post_insert_failed:' . $db_error);
        }
        $finalized = $db->where('id', $post_id)->update(T_POSTS, array('post_id' => (string) $post_id));
        if (!$finalized) {
            $db_error = method_exists($db, 'getLastErrno') ? (int) $db->getLastErrno() : 0;
            throw new RuntimeException('live_post_finalize_failed:' . $db_error);
        }
        if (!$db->commit()) {
            $db_error = method_exists($db, 'getLastErrno') ? (int) $db->getLastErrno() : 0;
            throw new RuntimeException('live_post_finalize_failed:' . $db_error);
        }
    } catch (Throwable $exception) {
        $db->rollback();
        $parts = explode(':', $exception->getMessage(), 2);
        $error_code = in_array($parts[0], array(
            'live_already_running',
            'live_post_insert_failed',
            'live_post_finalize_failed',
        ), true)
            ? $parts[0]
            : 'live_post_insert_failed';
        $db_error = isset($parts[1]) ? (int) $parts[1] : 0;
        $error_extra = array('user_id' => $user_id);
        if ($error_code === 'live_already_running') {
            $error_extra['active_live'] = $db_error;
        }
        $result = VNSEEA_LiveCreateError($error_code, $error_extra);
        VNSEEA_LogLiveCreateResult($source, $result, array(
            'stream_name' => $stream_name,
            'privacy_value' => $privacy_value,
            'privacy_type' => gettype($privacy_value),
            'db_error_code' => $db_error,
        ));
        return $result;
    }

    Wo_notifyUsersLive($post_id);
    $result = array(
        'status' => 200,
        'user_id' => $user_id,
        'post_id' => (int) $post_id,
        'provider' => 'livekit',
        'stream_name' => $stream_name,
        'room_name' => $join_payload['room_name'],
        'ws_url' => $join_payload['ws_url'],
        'token' => $join_payload['token'],
        'is_host' => true,
        'title' => $live_title,
        'description' => $live_description,
        'post_url' => Wo_SeoLink('index.php?link1=post&id=' . $post_id),
        'started_at' => $now,
    );
    VNSEEA_LogLiveCreateResult($source, $result, array(
        'post_id' => (int) $post_id,
        'stream_name' => $stream_name,
        'room_name' => $join_payload['room_name'],
        'ws_url' => $join_payload['ws_url'],
        'privacy_value' => $privacy_value,
        'privacy_type' => gettype($privacy_value),
    ));
    return $result;
}
