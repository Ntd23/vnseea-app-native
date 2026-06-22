<?php
// English description: Receives verified LiveKit webhooks and synchronizes backend call and livestream state.

if ($f == 'livekit_webhook') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    if ($s !== 'events') {
        http_response_code(404);
        echo json_encode(array('status' => 404, 'message' => 'LiveKit webhook route not found.'));
        exit();
    }

    if (!function_exists('Wo_LiveKitWebhookJson')) {
        function Wo_LiveKitWebhookJson($status, $payload = array())
        {
            http_response_code(intval($status));
            echo json_encode(array_merge(array('status' => intval($status)), $payload), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit();
        }
    }

    if (!function_exists('Wo_LiveKitWebhookHeader')) {
        function Wo_LiveKitWebhookHeader($name)
        {
            $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
            if (!empty($_SERVER[$key])) {
                return trim((string) $_SERVER[$key]);
            }
            if ($name === 'Authorization') {
                if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
                    return trim((string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
                }
                if (!empty($_SERVER['Authorization'])) {
                    return trim((string) $_SERVER['Authorization']);
                }
            }
            return '';
        }
    }

    if (!function_exists('Wo_LiveKitWebhookToken')) {
        function Wo_LiveKitWebhookToken()
        {
            $authorization = Wo_LiveKitWebhookHeader('Authorization');
            if ($authorization === '') {
                return '';
            }
            if (preg_match('/^\s*Bearer\s+(.+)\s*$/i', $authorization, $matches)) {
                return trim($matches[1]);
            }
            return trim($authorization);
        }
    }

    if (!function_exists('Wo_LiveKitWebhookHashMatches')) {
        function Wo_LiveKitWebhookHashMatches($claim, $raw_body)
        {
            $claim = trim((string) $claim);
            if ($claim === '') {
                return false;
            }
            $binary = hash('sha256', $raw_body, true);
            $hex = hash('sha256', $raw_body);
            $base64 = base64_encode($binary);
            $base64url = rtrim(strtr($base64, '+/', '-_'), '=');
            return hash_equals($claim, $hex) || hash_equals($claim, $base64) || hash_equals($claim, $base64url);
        }
    }

    if (!function_exists('Wo_LiveKitWebhookConfigValue')) {
        function Wo_LiveKitWebhookConfigValue($primary_key, $fallback_key = '')
        {
            global $wo;
            if (!empty($wo['config'][$primary_key])) {
                return trim((string) $wo['config'][$primary_key]);
            }
            if ($fallback_key !== '' && !empty($wo['config'][$fallback_key])) {
                return trim((string) $wo['config'][$fallback_key]);
            }
            return '';
        }
    }

    if (!function_exists('Wo_LiveKitWebhookVerify')) {
        function Wo_LiveKitWebhookVerify($raw_body)
        {
            $api_key = Wo_LiveKitWebhookConfigValue('livekit_webhook_api_key', 'livekit_api_key');
            $api_secret = Wo_LiveKitWebhookConfigValue('livekit_webhook_api_secret', 'livekit_api_secret');
            $token = Wo_LiveKitWebhookToken();
            if ($api_key === '' || $api_secret === '' || $token === '') {
                return false;
            }
            require_once 'vendor/autoload.php';
            if (!class_exists('\Firebase\JWT\JWT') || !class_exists('\Firebase\JWT\Key')) {
                return false;
            }
            try {
                $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($api_secret, 'HS256'));
            }
            catch (Exception $exception) {
                return false;
            }
            $claims = json_decode(json_encode($decoded), true);
            if (empty($claims) || !is_array($claims)) {
                return false;
            }
            if (!empty($claims['iss']) && !hash_equals($api_key, (string) $claims['iss'])) {
                return false;
            }
            if (isset($claims['sha256']) && !Wo_LiveKitWebhookHashMatches($claims['sha256'], $raw_body)) {
                return false;
            }
            return true;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookTable')) {
        function Wo_LiveKitWebhookTable()
        {
            return 'Wo_LiveKitWebhookEvents';
        }
    }

    if (!function_exists('Wo_EnsureLiveKitWebhookTable')) {
        function Wo_EnsureLiveKitWebhookTable()
        {
            global $sqlConnect;
            $table = Wo_LiveKitWebhookTable();
            $query = "CREATE TABLE IF NOT EXISTS `{$table}` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `event_id` varchar(191) NOT NULL DEFAULT '',
                `event_type` varchar(64) NOT NULL DEFAULT '',
                `room_name` varchar(191) NOT NULL DEFAULT '',
                `payload_hash` char(64) NOT NULL DEFAULT '',
                `received_at` int(11) NOT NULL DEFAULT '0',
                `processed_at` int(11) NOT NULL DEFAULT '0',
                PRIMARY KEY (`id`),
                UNIQUE KEY `event_id` (`event_id`),
                KEY `room_name` (`room_name`),
                KEY `event_type` (`event_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            return mysqli_query($sqlConnect, $query);
        }
    }

    if (!function_exists('Wo_LiveKitWebhookRoomName')) {
        function Wo_LiveKitWebhookRoomName($payload)
        {
            if (!empty($payload['room']) && is_array($payload['room']) && !empty($payload['room']['name'])) {
                return trim((string) $payload['room']['name']);
            }
            if (!empty($payload['roomName'])) {
                return trim((string) $payload['roomName']);
            }
            if (!empty($payload['room_name'])) {
                return trim((string) $payload['room_name']);
            }
            return '';
        }
    }

    if (!function_exists('Wo_LiveKitWebhookParticipantMeta')) {
        function Wo_LiveKitWebhookParticipantMeta($payload)
        {
            $participant = (!empty($payload['participant']) && is_array($payload['participant'])) ? $payload['participant'] : array();
            $metadata = array();
            if (!empty($participant['metadata'])) {
                $decoded = json_decode((string) $participant['metadata'], true);
                if (is_array($decoded)) {
                    $metadata = $decoded;
                }
            }
            $identity = !empty($participant['identity']) ? (string) $participant['identity'] : '';
            $user_id = !empty($metadata['user_id']) ? intval($metadata['user_id']) : 0;
            if ($user_id <= 0 && preg_match('/(?:^|_)user_([0-9]+)/', $identity, $matches)) {
                $user_id = intval($matches[1]);
            }
            if ($user_id <= 0 && preg_match('/^live_(?:host|viewer)_([0-9]+)/', $identity, $matches)) {
                $user_id = intval($matches[1]);
            }
            $role = !empty($metadata['role']) ? (string) $metadata['role'] : '';
            if ($role === '' && strpos($identity, 'live_host_') === 0) {
                $role = 'host';
            }
            return array(
                'user_id' => $user_id,
                'role' => $role,
                'identity' => $identity
            );
        }
    }

    if (!function_exists('Wo_LiveKitWebhookStoreEvent')) {
        function Wo_LiveKitWebhookStoreEvent($event_id, $event_type, $room_name, $payload_hash)
        {
            global $sqlConnect;
            if (!Wo_EnsureLiveKitWebhookTable()) {
                return false;
            }
            $table = Wo_LiveKitWebhookTable();
            $now = time();
            $query = mysqli_query($sqlConnect, "INSERT INTO `{$table}` (`event_id`, `event_type`, `room_name`, `payload_hash`, `received_at`, `processed_at`) VALUES ('" . Wo_Secure($event_id) . "', '" . Wo_Secure($event_type) . "', '" . Wo_Secure($room_name) . "', '" . Wo_Secure($payload_hash) . "', '{$now}', '0')");
            if (!$query && intval(mysqli_errno($sqlConnect)) === 1062) {
                return 'duplicate';
            }
            return $query ? true : false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookMarkProcessed')) {
        function Wo_LiveKitWebhookMarkProcessed($event_id)
        {
            global $sqlConnect;
            $table = Wo_LiveKitWebhookTable();
            $now = time();
            return mysqli_query($sqlConnect, "UPDATE `{$table}` SET `processed_at` = '{$now}' WHERE `event_id` = '" . Wo_Secure($event_id) . "'");
        }
    }

    if (!function_exists('Wo_LiveKitWebhookResolveLivePost')) {
        function Wo_LiveKitWebhookResolveLivePost($room_name)
        {
            global $db;
            if ($room_name === '' || strpos($room_name, 'wowonder_live_') !== 0) {
                return false;
            }
            $stream_name = substr($room_name, strlen('wowonder_live_'));
            $post = $db->where('stream_name', $stream_name)->where('postType', 'live')->orderBy('id', 'DESC')->getOne(T_POSTS);
            if (!empty($post)) {
                return is_object($post) ? (array) $post : $post;
            }
            $posts = $db->where('stream_name', '', '!=')->where('postType', 'live')->orderBy('id', 'DESC')->get(T_POSTS, 150);
            foreach ($posts as $candidate) {
                $candidate = is_object($candidate) ? (array) $candidate : $candidate;
                if (!empty($candidate['stream_name']) && Wo_GetLiveKitLivestreamRoomName($candidate['stream_name']) === $room_name) {
                    return $candidate;
                }
            }
            return false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookResolveOneToOneCall')) {
        function Wo_LiveKitWebhookResolveOneToOneCall($room_name)
        {
            global $sqlConnect;
            if ($room_name === '' || strpos($room_name, 'wowonder') !== 0 || strpos($room_name, 'wowonder_live_') === 0 || strpos($room_name, 'wowonder_groupcall_') === 0) {
                return false;
            }
            $tables = array(
                array('table' => T_AUDIO_CALLES, 'call_type' => 'audio'),
                array('table' => T_VIDEOS_CALLES, 'call_type' => 'video')
            );
            $min_time = time() - 86400;
            foreach ($tables as $table_data) {
                $query = mysqli_query($sqlConnect, "SELECT * FROM " . $table_data['table'] . " WHERE `time` >= '{$min_time}' ORDER BY `id` DESC LIMIT 300");
                if (empty($query)) {
                    continue;
                }
                while ($row = mysqli_fetch_assoc($query)) {
                    $source_room = !empty($row['room_name']) ? $row['room_name'] : $row['id'];
                    if ('wowonder' . md5($source_room) === $room_name) {
                        $row['call_type'] = $table_data['call_type'];
                        $row['table'] = $table_data['table'];
                        return $row;
                    }
                }
            }
            return false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookResolveGroupCall')) {
        function Wo_LiveKitWebhookResolveGroupCall($room_name)
        {
            global $sqlConnect;
            if ($room_name === '' || !defined('T_GROUP_CALLS') || !Wo_EnsureGroupCallTables()) {
                return false;
            }
            $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_GROUP_CALLS . " WHERE `room_name` = '" . Wo_Secure($room_name) . "' ORDER BY `id` DESC LIMIT 1");
            if (empty($query) || mysqli_num_rows($query) === 0) {
                return false;
            }
            return mysqli_fetch_assoc($query);
        }
    }

    if (!function_exists('Wo_LiveKitWebhookFinishOneToOneCall')) {
        function Wo_LiveKitWebhookFinishOneToOneCall($call, $event_type)
        {
            global $sqlConnect;
            if (empty($call) || empty($call['id']) || empty($call['table'])) {
                return false;
            }
            $status = !empty($call['status']) ? $call['status'] : 'calling';
            if (in_array($status, array('declined', 'cancelled', 'no_answer', 'missed', 'ended'))) {
                return false;
            }
            $final_status = ($status === 'answered' || intval(!empty($call['active']) ? $call['active'] : 0) === 1) ? 'ended' : 'no_answer';
            $id = intval($call['id']);
            $now = time();
            $query = mysqli_query($sqlConnect, "UPDATE " . $call['table'] . " SET `active` = '0', `status` = '" . Wo_Secure($final_status) . "' WHERE `id` = '{$id}' AND `status` NOT IN ('declined', 'cancelled', 'no_answer', 'missed', 'ended')");
            if ($query && mysqli_affected_rows($sqlConnect) > 0) {
                Wo_UpdateCallLog($id, $call['call_type'], $final_status, array(
                    'provider' => 'livekit',
                    'ended_at' => $now,
                    'status_by' => 0
                ));
                return true;
            }
            return false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookSyncGroupCall')) {
        function Wo_LiveKitWebhookSyncGroupCall($group_call, $payload, $event_type)
        {
            global $sqlConnect;
            if (empty($group_call) || empty($group_call['id'])) {
                return false;
            }
            $call_id = intval($group_call['id']);
            $participant = Wo_LiveKitWebhookParticipantMeta($payload);
            $user_id = intval($participant['user_id']);
            if ($event_type === 'participant_joined' && $user_id > 0) {
                Wo_SetGroupCallParticipantState($call_id, $user_id, 'joined', array(
                    'joined_at' => time(),
                    'left_at' => 0
                ));
                Wo_TouchGroupCall($call_id, 'active');
                return true;
            }
            if (in_array($event_type, array('participant_left', 'participant_connection_aborted')) && $user_id > 0) {
                Wo_SetGroupCallParticipantState($call_id, $user_id, 'left', array(
                    'left_at' => time()
                ));
                Wo_EndGroupCallIfEmpty($call_id);
                return true;
            }
            if ($event_type === 'room_finished') {
                $ended_at = time();
                mysqli_query($sqlConnect, "UPDATE " . T_GROUP_CALLS . " SET `status` = 'ended', `ended_at` = '{$ended_at}', `last_activity` = '{$ended_at}' WHERE `id` = '{$call_id}' AND `status` != 'ended'");
                return mysqli_affected_rows($sqlConnect) > 0;
            }
            if ($event_type === 'room_started') {
                Wo_TouchGroupCall($call_id, 'active');
                return true;
            }
            return false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookCleanupLivePost')) {
        function Wo_LiveKitWebhookCleanupLivePost($post)
        {
            global $db;
            if (empty($post) || empty($post['post_id'])) {
                return false;
            }
            $post_id = intval($post['post_id']);
            $db->where('post_id', $post_id)->update(T_POSTS, array(
                'live_ended' => 1,
                'live_time' => 0
            ));
            return Wo_DeletePost($post_id);
        }
    }

    if (!function_exists('Wo_LiveKitWebhookSyncLive')) {
        function Wo_LiveKitWebhookSyncLive($post, $payload, $event_type)
        {
            global $db;
            if (empty($post) || empty($post['post_id'])) {
                return false;
            }
            $post_id = intval($post['post_id']);
            if ($event_type === 'room_started') {
                $db->where('post_id', $post_id)->update(T_POSTS, array(
                    'live_time' => time(),
                    'live_ended' => 0
                ));
                return true;
            }
            if ($event_type === 'room_finished') {
                return Wo_LiveKitWebhookCleanupLivePost($post);
            }
            $participant = Wo_LiveKitWebhookParticipantMeta($payload);
            $user_id = intval($participant['user_id']);
            if ($user_id <= 0 || $participant['role'] === 'host') {
                return false;
            }
            if ($event_type === 'participant_joined') {
                $exists = intval($db->where('user_id', $user_id)->where('post_id', $post_id)->getValue(T_LIVE_SUB, 'COUNT(*)'));
                if ($exists > 0) {
                    $db->where('user_id', $user_id)->where('post_id', $post_id)->update(T_LIVE_SUB, array(
                        'time' => time()
                    ));
                }
                else {
                    $db->insert(T_LIVE_SUB, array(
                        'user_id' => $user_id,
                        'post_id' => $post_id,
                        'time' => time(),
                        'is_watching' => 0
                    ));
                }
                return true;
            }
            if (in_array($event_type, array('participant_left', 'participant_connection_aborted'))) {
                $db->where('user_id', $user_id)->where('post_id', $post_id)->update(T_LIVE_SUB, array(
                    'time' => time() - 7,
                    'is_watching' => 1
                ));
                return true;
            }
            return false;
        }
    }

    if (!function_exists('Wo_LiveKitWebhookProcess')) {
        function Wo_LiveKitWebhookProcess($payload)
        {
            $event_type = !empty($payload['event']) ? trim((string) $payload['event']) : '';
            $room_name = Wo_LiveKitWebhookRoomName($payload);
            if ($event_type === '' || $room_name === '') {
                return array('handled' => false, 'reason' => 'missing_event_or_room');
            }

            $live_post = Wo_LiveKitWebhookResolveLivePost($room_name);
            if (!empty($live_post)) {
                return array(
                    'handled' => Wo_LiveKitWebhookSyncLive($live_post, $payload, $event_type),
                    'context' => 'live',
                    'post_id' => intval($live_post['post_id'])
                );
            }

            $group_call = Wo_LiveKitWebhookResolveGroupCall($room_name);
            if (!empty($group_call)) {
                return array(
                    'handled' => Wo_LiveKitWebhookSyncGroupCall($group_call, $payload, $event_type),
                    'context' => 'group_call',
                    'call_id' => intval($group_call['id'])
                );
            }

            $one_call = Wo_LiveKitWebhookResolveOneToOneCall($room_name);
            if (!empty($one_call)) {
                $handled = false;
                if (in_array($event_type, array('room_finished', 'participant_left', 'participant_connection_aborted'))) {
                    $handled = Wo_LiveKitWebhookFinishOneToOneCall($one_call, $event_type);
                }
                return array(
                    'handled' => $handled,
                    'context' => 'call',
                    'call_id' => intval($one_call['id']),
                    'call_type' => $one_call['call_type']
                );
            }

            return array('handled' => false, 'reason' => 'unknown_room');
        }
    }

    $raw_body = file_get_contents('php://input');
    if ($raw_body === false || trim($raw_body) === '') {
        Wo_LiveKitWebhookJson(400, array('message' => 'Missing webhook body.'));
    }
    if (!Wo_LiveKitWebhookVerify($raw_body)) {
        Wo_LiveKitWebhookJson(401, array('message' => 'Invalid LiveKit webhook signature.'));
    }

    $payload = json_decode($raw_body, true);
    if (empty($payload) || !is_array($payload)) {
        Wo_LiveKitWebhookJson(400, array('message' => 'Invalid webhook JSON.'));
    }

    $event_type = !empty($payload['event']) ? trim((string) $payload['event']) : 'unknown';
    $room_name = Wo_LiveKitWebhookRoomName($payload);
    $payload_hash = hash('sha256', $raw_body);
    $event_id = !empty($payload['id']) ? trim((string) $payload['id']) : hash('sha256', $event_type . '|' . $room_name . '|' . $payload_hash);

    $stored = Wo_LiveKitWebhookStoreEvent($event_id, $event_type, $room_name, $payload_hash);
    if ($stored === 'duplicate') {
        Wo_LiveKitWebhookJson(200, array('message' => 'Duplicate webhook ignored.', 'duplicate' => true));
    }
    if ($stored !== true) {
        Wo_LiveKitWebhookJson(500, array('message' => 'Unable to store webhook event.'));
    }

    $result = Wo_LiveKitWebhookProcess($payload);
    Wo_LiveKitWebhookMarkProcessed($event_id);
    Wo_LiveKitWebhookJson(200, array(
        'message' => 'LiveKit webhook processed.',
        'event' => $event_type,
        'room_name' => $room_name,
        'result' => $result
    ));
}
