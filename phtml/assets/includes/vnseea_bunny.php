<?php
// English description: Reads the admin-managed Bunny CDN and Bunny Stream settings and reports whether each feature is usable.

if (!function_exists('VNSEEA_BunnyConfig')) {
    function VNSEEA_BunnyConfig($name, $default = '')
    {
        $config = isset($GLOBALS['wo']['config']) && is_array($GLOBALS['wo']['config'])
            ? $GLOBALS['wo']['config']
            : array();
        if (!array_key_exists($name, $config) || $config[$name] === null) {
            return $default;
        }
        $value = trim((string) $config[$name]);
        // A secret saved by the admin panel stays encrypted until an entry
        // point decrypts the config; never treat that cipher text as a key.
        return strpos($value, '$Ap1_') === 0 ? $default : $value;
    }
}

if (!function_exists('VNSEEA_BunnyNormalizeHostname')) {
    /**
     * Accepts "cdn.vnseea.vn", "https://cdn.vnseea.vn/" or a full URL and
     * returns the bare lowercase hostname, or '' when it is not a hostname.
     */
    function VNSEEA_BunnyNormalizeHostname($value)
    {
        $value = strtolower(trim((string) $value));
        if ($value === '') {
            return '';
        }
        if (strpos($value, '://') === false) {
            $value = 'https://' . $value;
        }
        $host = parse_url($value, PHP_URL_HOST);
        if (!is_string($host) || strlen($host) > 253) {
            return '';
        }
        $label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
        return preg_match('/^(?:' . $label . '\.)+[a-z]{2,63}$/', $host) ? $host : '';
    }
}

if (!function_exists('VNSEEA_BunnyCdnBaseUrl')) {
    /** Returns "https://<cdn host>" when the admin enabled a valid CDN host, '' otherwise. */
    function VNSEEA_BunnyCdnBaseUrl()
    {
        if (VNSEEA_BunnyConfig('vnseea_bunny_cdn_enabled', '0') !== '1') {
            return '';
        }
        $host = VNSEEA_BunnyNormalizeHostname(VNSEEA_BunnyConfig('vnseea_bunny_cdn_hostname'));
        return $host !== '' ? 'https://' . $host : '';
    }
}

if (!function_exists('VNSEEA_BunnyStreamLibraryFields')) {
    /**
     * Admin fields of one Bunny Stream video library. "public" serves posts,
     * reels and stories; "private" serves chat videos behind signed URLs.
     */
    function VNSEEA_BunnyStreamLibraryFields($kind)
    {
        $kind = $kind === 'private' ? 'private' : 'public';
        $prefix = 'vnseea_bunny_stream_' . $kind . '_';
        $fields = array(
            'library_id' => array('key' => $prefix . 'library_id', 'label' => 'Library ID', 'secret' => false),
            'api_key' => array('key' => $prefix . 'api_key', 'label' => 'API Key', 'secret' => true),
            'readonly_key' => array('key' => $prefix . 'readonly_key', 'label' => 'Read-Only API Key', 'secret' => true),
            'cdn_hostname' => array('key' => $prefix . 'cdn_hostname', 'label' => 'CDN Hostname', 'secret' => false),
        );
        if ($kind === 'private') {
            $fields['token_key'] = array('key' => $prefix . 'token_key', 'label' => 'Token Authentication Key', 'secret' => true);
        }
        return $fields;
    }
}

if (!function_exists('VNSEEA_BunnyStreamMissingFields')) {
    /** Lists the labels of the library fields that are still empty or invalid. */
    function VNSEEA_BunnyStreamMissingFields($kind)
    {
        $missing = array();
        foreach (VNSEEA_BunnyStreamLibraryFields($kind) as $name => $field) {
            $value = VNSEEA_BunnyConfig($field['key']);
            $valid = $value !== '';
            if ($name === 'library_id') {
                $valid = ctype_digit($value);
            } elseif ($name === 'cdn_hostname') {
                $valid = VNSEEA_BunnyNormalizeHostname($value) !== '';
            }
            if (!$valid) {
                $missing[] = $field['label'];
            }
        }
        return $missing;
    }
}

if (!function_exists('VNSEEA_BunnyStreamLibraryConfigured')) {
    /** True when every field of the library is filled in, regardless of the toggle. */
    function VNSEEA_BunnyStreamLibraryConfigured($kind)
    {
        return count(VNSEEA_BunnyStreamMissingFields($kind)) === 0;
    }
}

if (!function_exists('VNSEEA_BunnyStreamUploadsEnabled')) {
    /**
     * New uploads go to Bunny Stream only when the admin switched it on and
     * the library is fully configured. Videos already stored on Bunny keep
     * playing whenever the library is configured, even with the switch off.
     */
    function VNSEEA_BunnyStreamUploadsEnabled($kind)
    {
        return VNSEEA_BunnyConfig('vnseea_bunny_stream_enabled', '0') === '1'
            && VNSEEA_BunnyStreamLibraryConfigured($kind);
    }
}

if (!function_exists('VNSEEA_BunnyIsSecretConfigKey')) {
    /** Secrets that must never leave the server, even inside encrypted client config. */
    function VNSEEA_BunnyIsSecretConfigKey($name)
    {
        return (bool) preg_match('/^vnseea_bunny_stream_(public|private)_(api_key|readonly_key|token_key)$/', (string) $name);
    }
}

if (!function_exists('VNSEEA_BunnySecretHint')) {
    /** Admin hint for a stored secret that never prints the secret itself. */
    function VNSEEA_BunnySecretHint($name)
    {
        $value = VNSEEA_BunnyConfig($name);
        if ($value === '') {
            return 'Chưa nhập';
        }
        return 'Đã lưu (…' . substr($value, -4) . ') — nhập giá trị mới để thay';
    }
}

if (!defined('T_VNSEEA_MEDIA_UPLOADS')) {
    define('T_VNSEEA_MEDIA_UPLOADS', 'Wo_VnseeaMediaUploads');
}

if (!function_exists('VNSEEA_BunnyStreamLibrary')) {
    function VNSEEA_BunnyStreamLibrary($kind)
    {
        $kind = $kind === 'private' ? 'private' : 'public';
        $prefix = 'vnseea_bunny_stream_' . $kind . '_';
        return array(
            'kind' => $kind,
            'library_id' => VNSEEA_BunnyConfig($prefix . 'library_id'),
            'api_key' => VNSEEA_BunnyConfig($prefix . 'api_key'),
            'readonly_key' => VNSEEA_BunnyConfig($prefix . 'readonly_key'),
            'cdn_host' => VNSEEA_BunnyNormalizeHostname(VNSEEA_BunnyConfig($prefix . 'cdn_hostname')),
            'token_key' => $kind === 'private' ? VNSEEA_BunnyConfig($prefix . 'token_key') : '',
        );
    }
}

if (!function_exists('VNSEEA_BunnyHttpRequest')) {
    /**
     * Small HTTP client. Tests replace it through $GLOBALS['vnseea_bunny_http'],
     * a callable receiving ($method, $url, $headers, $body) and returning
     * array('status' => int, 'body' => string).
     */
    function VNSEEA_BunnyHttpRequest($method, $url, $headers = array(), $body = null, $timeout = 10)
    {
        if (isset($GLOBALS['vnseea_bunny_http']) && is_callable($GLOBALS['vnseea_bunny_http'])) {
            return call_user_func($GLOBALS['vnseea_bunny_http'], $method, $url, $headers, $body);
        }
        if (!function_exists('curl_init')) {
            return array('status' => 0, 'body' => '');
        }
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        if ($method === 'HEAD') {
            curl_setopt($ch, CURLOPT_NOBODY, true);
        }
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return array('status' => $status, 'body' => is_string($response) ? $response : '');
    }
}

if (!function_exists('VNSEEA_BunnyApiRequest')) {
    /** Calls the Bunny Stream API of one configured library and decodes the JSON reply. */
    function VNSEEA_BunnyApiRequest($kind, $method, $path, $payload = null, $timeout = 10)
    {
        if (!VNSEEA_BunnyStreamLibraryConfigured($kind)) {
            return array('status' => 0, 'data' => null);
        }
        $library = VNSEEA_BunnyStreamLibrary($kind);
        $headers = array('AccessKey: ' . $library['api_key'], 'Accept: application/json');
        $body = null;
        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
            $body = json_encode($payload);
        }
        $response = VNSEEA_BunnyHttpRequest(
            $method,
            'https://video.bunnycdn.com/library/' . rawurlencode($library['library_id']) . $path,
            $headers,
            $body,
            $timeout
        );
        $data = json_decode((string) $response['body'], true);
        return array('status' => (int) $response['status'], 'data' => is_array($data) ? $data : null);
    }
}

if (!function_exists('VNSEEA_BunnyTusSignature')) {
    /** Presigned TUS upload signature: SHA256(library_id + api_key + expiration + video_id). */
    function VNSEEA_BunnyTusSignature($library_id, $api_key, $expires, $video_id)
    {
        return hash('sha256', $library_id . $api_key . $expires . $video_id);
    }
}

if (!function_exists('VNSEEA_BunnySignDirectoryUrl')) {
    /**
     * Bunny CDN token authentication (HS256, path-based directory token), ported
     * from BunnyWay/BunnyCDN.TokenAuthentication php/url_signing.php. The token
     * sits in the path so every HLS segment under $token_path inherits it.
     */
    function VNSEEA_BunnySignDirectoryUrl($base_url, $path, $token_path, $security_key, $expires)
    {
        $signing_data = 'token_path=' . $token_path;
        $message = $token_path . $expires . $signing_data;
        $digest = hash_hmac('sha256', $message, $security_key, true);
        $token = 'HS256-' . rtrim(strtr(base64_encode($digest), '+/', '-_'), '=');
        return rtrim($base_url, '/') . '/bcdn_token=' . $token .
            '&token_path=' . rawurlencode($token_path) .
            '&expires=' . $expires . $path;
    }
}

if (!function_exists('VNSEEA_BunnyMediaRef')) {
    /** Value stored in message `media` columns for a Bunny Stream video. */
    function VNSEEA_BunnyMediaRef($kind, $guid)
    {
        return 'bunny-stream://' . ($kind === 'private' ? 'private' : 'public') . '/' . strtolower($guid);
    }
}

if (!function_exists('VNSEEA_BunnyParseMediaRef')) {
    function VNSEEA_BunnyParseMediaRef($media)
    {
        if (!is_string($media) ||
            !preg_match('~^bunny-stream://(public|private)/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$~i', trim($media), $matches)
        ) {
            return null;
        }
        return array('kind' => strtolower($matches[1]), 'guid' => strtolower($matches[2]));
    }
}

if (!function_exists('VNSEEA_BunnyPlaybackUrl')) {
    /**
     * HLS playlist for a stored Bunny reference. Chat videos get a signed link
     * whose expiry is rounded to the hour, so repeated API reads return the
     * same URL and clients do not reload a playing video.
     */
    function VNSEEA_BunnyPlaybackUrl($media, $now = null)
    {
        $reference = VNSEEA_BunnyParseMediaRef($media);
        if ($reference === null || !VNSEEA_BunnyStreamLibraryConfigured($reference['kind'])) {
            return '';
        }
        $library = VNSEEA_BunnyStreamLibrary($reference['kind']);
        $path = '/' . $reference['guid'] . '/playlist.m3u8';
        if ($reference['kind'] === 'public') {
            return 'https://' . $library['cdn_host'] . $path;
        }
        $now = $now === null ? time() : (int) $now;
        $ttl = max(300, (int) VNSEEA_BunnyConfig('vnseea_bunny_stream_private_url_ttl', '21600'));
        $expires = (int) (floor($now / 3600) * 3600) + $ttl + 3600;
        return VNSEEA_BunnySignDirectoryUrl(
            'https://' . $library['cdn_host'],
            $path,
            '/' . $reference['guid'] . '/',
            $library['token_key'],
            $expires
        );
    }
}

if (!function_exists('VNSEEA_BunnyUploadsTableAvailable')) {
    function VNSEEA_BunnyUploadsTableAvailable()
    {
        global $sqlConnect;

        static $available = null;
        if ($available !== null) {
            return $available;
        }
        $available = false;
        if (!empty($sqlConnect)) {
            $query = @mysqli_query($sqlConnect, "SHOW TABLES LIKE '" . T_VNSEEA_MEDIA_UPLOADS . "'");
            $available = $query && mysqli_num_rows($query) > 0;
        }
        return $available;
    }
}

if (!function_exists('VNSEEA_BunnyCreateUploadTicket')) {
    /**
     * Creates the Bunny video object and returns presigned TUS credentials for
     * the client, or null when uploads must stay on this server.
     */
    function VNSEEA_BunnyCreateUploadTicket($user_id, $purpose, $file_name, $file_size, $now = null)
    {
        global $sqlConnect;

        $user_id = (int) $user_id;
        $purpose = $purpose === 'chat' ? 'chat' : '';
        $kind = 'private';
        $max_bytes = max(1, (int) VNSEEA_BunnyConfig('vnseea_bunny_stream_max_upload_mb', '10240')) * 1024 * 1024;
        if ($user_id < 1 || $purpose === '' || (int) $file_size < 1 || (int) $file_size > $max_bytes ||
            !VNSEEA_BunnyStreamUploadsEnabled($kind) || !VNSEEA_BunnyUploadsTableAvailable()
        ) {
            return null;
        }
        $now = $now === null ? time() : (int) $now;
        $created = VNSEEA_BunnyApiRequest($kind, 'POST', '/videos', array(
            'title' => 'vnseea-' . $purpose . '-' . $user_id . '-' . $now,
        ));
        $guid = isset($created['data']['guid']) ? strtolower((string) $created['data']['guid']) : '';
        if ($created['status'] < 200 || $created['status'] >= 300 ||
            VNSEEA_BunnyParseMediaRef(VNSEEA_BunnyMediaRef($kind, $guid)) === null
        ) {
            error_log('[vnseea-bunny] create_video_failed status=' . $created['status']);
            return null;
        }
        $file_name = function_exists('mb_substr')
            ? mb_substr(basename((string) $file_name), 0, 200, 'UTF-8')
            : substr(basename((string) $file_name), 0, 200);
        $inserted = mysqli_query(
            $sqlConnect,
            "INSERT INTO " . T_VNSEEA_MEDIA_UPLOADS .
            " (`user_id`,`purpose`,`library_kind`,`video_guid`,`file_name`,`file_size`,`status`,`created_at`,`updated_at`,`expires_at`)" .
            " VALUES ({$user_id},'{$purpose}','{$kind}','" . mysqli_real_escape_string($sqlConnect, $guid) . "','" .
            mysqli_real_escape_string($sqlConnect, $file_name) . "'," . (int) $file_size . ",'created',{$now},{$now}," . ($now + 86400) . ")"
        );
        if (!$inserted) {
            VNSEEA_BunnyApiRequest($kind, 'DELETE', '/videos/' . $guid);
            return null;
        }
        $library = VNSEEA_BunnyStreamLibrary($kind);
        $expires = $now + 86400;
        return array(
            'upload_id' => (string) mysqli_insert_id($sqlConnect),
            'tus' => array(
                'endpoint' => 'https://video.bunnycdn.com/tusupload',
                'library_id' => $library['library_id'],
                'video_id' => $guid,
                'expires' => $expires,
                'signature' => VNSEEA_BunnyTusSignature($library['library_id'], $library['api_key'], $expires, $guid),
            ),
        );
    }
}

if (!function_exists('VNSEEA_BunnyClaimUpload')) {
    /** Returns the caller's unattached, unexpired upload row, or null. */
    function VNSEEA_BunnyClaimUpload($user_id, $upload_id, $purpose)
    {
        global $sqlConnect;

        if (!is_numeric($upload_id) || (int) $upload_id < 1 || (int) $user_id < 1 || !VNSEEA_BunnyUploadsTableAvailable()) {
            return null;
        }
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_VNSEEA_MEDIA_UPLOADS .
            " WHERE `id`=" . (int) $upload_id . " AND `user_id`=" . (int) $user_id .
            " AND `purpose`='" . mysqli_real_escape_string($sqlConnect, (string) $purpose) . "'" .
            " AND `message_id` IS NULL AND `status`<>'failed' AND `expires_at`>" . time() . " LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        return !empty($row) ? $row : null;
    }
}

if (!function_exists('VNSEEA_BunnyAttachUpload')) {
    function VNSEEA_BunnyAttachUpload($upload_id, $message_id)
    {
        global $sqlConnect;

        return (bool) mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
            " SET `message_id`=" . (int) $message_id . ",`status`=IF(`status`='created','uploaded',`status`),`updated_at`=" . time() .
            " WHERE `id`=" . (int) $upload_id . " AND `message_id` IS NULL"
        );
    }
}

if (!function_exists('VNSEEA_BunnyStatusFromApi')) {
    /** Maps the Get Video API status (4 Finished, 5 Error, 6 UploadFailed, 8 JIT playlists) to ours. */
    function VNSEEA_BunnyStatusFromApi($video)
    {
        $status = isset($video['status']) ? (int) $video['status'] : -1;
        if (in_array($status, array(5, 6), true)) {
            return 'failed';
        }
        if (in_array($status, array(4, 8), true) || !empty($video['availableResolutions'])) {
            return 'ready';
        }
        return 'uploaded';
    }
}

if (!function_exists('VNSEEA_BunnyStatusFromWebhook')) {
    /** Maps the webhook status (3 Finished, 4 Resolution finished, 5 Failed, 8 Upload failed) to ours. */
    function VNSEEA_BunnyStatusFromWebhook($status)
    {
        $status = (int) $status;
        if (in_array($status, array(3, 4), true)) {
            return 'ready';
        }
        if (in_array($status, array(5, 8), true)) {
            return 'failed';
        }
        return '';
    }
}

if (!function_exists('VNSEEA_BunnyMediaStatus')) {
    /**
     * "processing" or "failed" for a Bunny video that cannot play yet, '' when
     * it plays (or the value is not a Bunny video). Missed webhooks are covered
     * by asking the Bunny API at most every 30 seconds per video.
     */
    function VNSEEA_BunnyMediaStatus($media)
    {
        global $sqlConnect;

        static $cache = array();
        $reference = VNSEEA_BunnyParseMediaRef(is_string($media) ? html_entity_decode($media, ENT_QUOTES, 'UTF-8') : $media);
        if ($reference === null || !VNSEEA_BunnyUploadsTableAvailable()) {
            return '';
        }
        $guid = $reference['guid'];
        if (array_key_exists($guid, $cache)) {
            return $cache[$guid];
        }
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `id`,`status`,`last_checked_at` FROM " . T_VNSEEA_MEDIA_UPLOADS .
            " WHERE `video_guid`='" . mysqli_real_escape_string($sqlConnect, $guid) . "' LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        $status = !empty($row['status']) ? (string) $row['status'] : 'ready';
        if (in_array($status, array('created', 'uploaded'), true) && time() - (int) $row['last_checked_at'] >= 30) {
            $video = VNSEEA_BunnyApiRequest($reference['kind'], 'GET', '/videos/' . $guid, null, 3);
            if ($video['status'] === 200 && is_array($video['data'])) {
                $status = VNSEEA_BunnyStatusFromApi($video['data']);
            }
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
                " SET `status`=IF(`status` IN ('created','uploaded'),'" . mysqli_real_escape_string($sqlConnect, $status) . "',`status`)" .
                ",`last_checked_at`=" . time() . ",`updated_at`=" . time() .
                " WHERE `id`=" . (int) $row['id']
            );
        }
        $cache[$guid] = $status === 'ready' ? '' : ($status === 'failed' ? 'failed' : 'processing');
        return $cache[$guid];
    }
}

if (!function_exists('VNSEEA_BunnyPresentMessageMedia')) {
    /**
     * For message rows that keep the stored media value (GetMessageById), turn a
     * Bunny reference into its playback URL and attach the processing status.
     */
    function VNSEEA_BunnyPresentMessageMedia($message)
    {
        if (!is_array($message) || empty($message['media']) || strpos((string) $message['media'], 'bunny-stream://') !== 0) {
            return $message;
        }
        $media_status = VNSEEA_BunnyMediaStatus($message['media']);
        if ($media_status !== '') {
            $message['media_status'] = $media_status;
        }
        $message['media'] = VNSEEA_BunnyPlaybackUrl(html_entity_decode((string) $message['media'], ENT_QUOTES, 'UTF-8'));
        return $message;
    }
}

if (!function_exists('VNSEEA_BunnyHandleWebhook')) {
    /**
     * Verifies a Bunny Stream webhook (HMAC-SHA256 of the raw body keyed with
     * the library Read-Only API key) and records the encoding result.
     * Returns the HTTP status to answer with.
     */
    function VNSEEA_BunnyHandleWebhook($raw_body, $signature)
    {
        global $sqlConnect;

        $payload = json_decode((string) $raw_body, true);
        if (!is_array($payload) || !isset($payload['VideoLibraryId'], $payload['VideoGuid'], $payload['Status'])) {
            return 400;
        }
        $kind = '';
        foreach (array('private', 'public') as $candidate) {
            $library = VNSEEA_BunnyStreamLibrary($candidate);
            if (VNSEEA_BunnyStreamLibraryConfigured($candidate) && (string) $library['library_id'] === (string) $payload['VideoLibraryId']) {
                $kind = $candidate;
                break;
            }
        }
        if ($kind === '') {
            return 404;
        }
        $library = VNSEEA_BunnyStreamLibrary($kind);
        $expected = hash_hmac('sha256', (string) $raw_body, $library['readonly_key']);
        if (!is_string($signature) || !hash_equals($expected, strtolower(trim($signature)))) {
            return 401;
        }
        $reference = VNSEEA_BunnyParseMediaRef(VNSEEA_BunnyMediaRef($kind, (string) $payload['VideoGuid']));
        $status = VNSEEA_BunnyStatusFromWebhook($payload['Status']);
        if ($reference === null || $status === '' || !VNSEEA_BunnyUploadsTableAvailable()) {
            return 200;
        }
        $guid_sql = mysqli_real_escape_string($sqlConnect, $reference['guid']);
        $now = time();
        mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
            " SET `status`=IF(`status`='ready' AND '{$status}'='failed',`status`,'{$status}'),`last_checked_at`={$now},`updated_at`={$now}" .
            " WHERE `video_guid`='{$guid_sql}'"
        );
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `message_id` FROM " . T_VNSEEA_MEDIA_UPLOADS . " WHERE `video_guid`='{$guid_sql}' LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        if (!empty($row['message_id']) && function_exists('VNSEEA_PublishRealtimeMessageChange')) {
            try {
                VNSEEA_PublishRealtimeMessageChange((int) $row['message_id']);
            } catch (Throwable $exception) {
                error_log('[vnseea-bunny] realtime_publish_failed ' . $exception->getMessage());
            }
        }
        return 200;
    }
}

if (!function_exists('VNSEEA_BunnyStreamSelfTest')) {
    /**
     * Admin connection check: the API key of each library, and for the chat
     * library that a signed playlist plays (200) while an unsigned one does not.
     */
    function VNSEEA_BunnyStreamSelfTest()
    {
        $results = array();
        $labels = array('public' => 'Thư viện công khai', 'private' => 'Thư viện riêng tư');
        foreach ($labels as $kind => $label) {
            if (!VNSEEA_BunnyStreamLibraryConfigured($kind)) {
                $results[] = array('ok' => false, 'message' => $label . ': chưa đủ cấu hình.');
                continue;
            }
            $list = VNSEEA_BunnyApiRequest($kind, 'GET', '/videos?page=1&itemsPerPage=20&orderBy=date', null, 8);
            if ($list['status'] !== 200) {
                $results[] = array(
                    'ok' => false,
                    'message' => $label . ': Bunny từ chối API Key hoặc Library ID (HTTP ' . $list['status'] . ').',
                );
                continue;
            }
            $results[] = array('ok' => true, 'message' => $label . ': kết nối API thành công.');
            if ($kind !== 'private') {
                continue;
            }
            $finished_guid = '';
            $items = isset($list['data']['items']) && is_array($list['data']['items']) ? $list['data']['items'] : array();
            foreach ($items as $item) {
                if (!empty($item['guid']) && VNSEEA_BunnyStatusFromApi($item) === 'ready') {
                    $finished_guid = strtolower((string) $item['guid']);
                    break;
                }
            }
            if ($finished_guid === '') {
                $results[] = array(
                    'ok' => false,
                    'message' => $label . ': chưa có video đã encode để thử link có chữ ký. Gửi thử một video trong chat rồi bấm kiểm tra lại.',
                );
                continue;
            }
            $library = VNSEEA_BunnyStreamLibrary($kind);
            $signed = VNSEEA_BunnyHttpRequest('GET', VNSEEA_BunnyPlaybackUrl(VNSEEA_BunnyMediaRef($kind, $finished_guid)), array(), null, 8);
            $unsigned = VNSEEA_BunnyHttpRequest('GET', 'https://' . $library['cdn_host'] . '/' . $finished_guid . '/playlist.m3u8', array(), null, 8);
            if ((int) $signed['status'] !== 200) {
                $results[] = array(
                    'ok' => false,
                    'message' => $label . ': link có chữ ký bị từ chối (HTTP ' . (int) $signed['status'] . '). Kiểm tra Token Authentication Key và CDN Hostname.',
                );
            } elseif ((int) $unsigned['status'] === 200) {
                $results[] = array(
                    'ok' => false,
                    'message' => $label . ': link KHÔNG chữ ký vẫn xem được. Hãy bật Token Authentication cho thư viện riêng tư.',
                );
            } else {
                $results[] = array('ok' => true, 'message' => $label . ': link có chữ ký phát được, link không chữ ký bị chặn.');
            }
        }
        return $results;
    }
}
