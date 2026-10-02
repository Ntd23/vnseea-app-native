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
     * New uploads go to Bunny Stream only when the admin switched it on for
     * that library and the library is fully configured: one switch for chat
     * videos (private), one for posts, reels and stories (public). Videos
     * already stored on Bunny keep playing whenever the library is configured.
     */
    function VNSEEA_BunnyStreamUploadsEnabled($kind)
    {
        $switch = $kind === 'public' ? 'vnseea_bunny_stream_public_enabled' : 'vnseea_bunny_stream_enabled';
        return VNSEEA_BunnyConfig($switch, '0') === '1'
            && VNSEEA_BunnyStreamLibraryConfigured($kind);
    }
}

if (!function_exists('VNSEEA_BunnyPurposeKind')) {
    /** Library that stores a video uploaded for this purpose, or '' for an unknown purpose. */
    function VNSEEA_BunnyPurposeKind($purpose)
    {
        $purpose = strtolower(trim((string) $purpose));
        if ($purpose === 'chat') {
            return 'private';
        }
        return in_array($purpose, array('post', 'reel', 'story'), true) ? 'public' : '';
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

if (!function_exists('VNSEEA_BunnyPosterUrl')) {
    /**
     * Poster frame Bunny renders for a stored reference, next to the playlist
     * (signed the same way for chat videos), or '' when it is not a Bunny video.
     */
    function VNSEEA_BunnyPosterUrl($media, $now = null)
    {
        $playlist = VNSEEA_BunnyPlaybackUrl($media, $now);
        return $playlist === '' ? '' : substr($playlist, 0, -strlen('playlist.m3u8')) . 'thumbnail.jpg';
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

if (!function_exists('VNSEEA_BunnyPublishColumnsAvailable')) {
    /** True once the uploads table can also hold posts, reels and stories (migration 20261003). */
    function VNSEEA_BunnyPublishColumnsAvailable()
    {
        global $sqlConnect;

        static $available = null;
        if ($available !== null) {
            return $available;
        }
        $available = false;
        if (VNSEEA_BunnyUploadsTableAvailable()) {
            $query = @mysqli_query($sqlConnect, "SHOW COLUMNS FROM " . T_VNSEEA_MEDIA_UPLOADS . " LIKE 'publish_state'");
            $available = $query && mysqli_num_rows($query) > 0;
        }
        return $available;
    }
}

if (!function_exists('VNSEEA_BunnyUnattachedUploadSql')) {
    /** SQL condition for an upload that no message, post or story uses yet. */
    function VNSEEA_BunnyUnattachedUploadSql()
    {
        return " AND `message_id` IS NULL" . (VNSEEA_BunnyPublishColumnsAvailable()
            ? " AND `post_id` IS NULL AND `story_id` IS NULL AND `publish_state`=''"
            : '');
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
        $purpose = strtolower(trim((string) $purpose));
        $kind = VNSEEA_BunnyPurposeKind($purpose);
        $max_bytes = max(1, (int) VNSEEA_BunnyConfig('vnseea_bunny_stream_max_upload_mb', '10240')) * 1024 * 1024;
        if ($user_id < 1 || $kind === '' || (int) $file_size < 1 || (int) $file_size > $max_bytes ||
            !VNSEEA_BunnyStreamUploadsEnabled($kind) || !VNSEEA_BunnyUploadsTableAvailable() ||
            ($kind === 'public' && !VNSEEA_BunnyPublishColumnsAvailable())
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
            VNSEEA_BunnyUnattachedUploadSql() .
            " AND `status` IN ('created','uploaded','ready') AND `expires_at`>" . time() . " LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        return !empty($row) ? $row : null;
    }
}

if (!function_exists('VNSEEA_BunnyReservePublishUpload')) {
    /**
     * Takes the caller's unused post, reel or story upload for the request
     * that is creating it, so one video can never back two posts. Returns the
     * row, or null. Release it with VNSEEA_BunnyReleaseReservation on failure.
     */
    function VNSEEA_BunnyReservePublishUpload($user_id, $upload_id, $purpose)
    {
        global $sqlConnect;

        if (VNSEEA_BunnyPurposeKind($purpose) !== 'public' || !VNSEEA_BunnyPublishColumnsAvailable()) {
            return null;
        }
        $row = VNSEEA_BunnyClaimUpload($user_id, $upload_id, $purpose);
        if (empty($row)) {
            return null;
        }
        $reserved = mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `publish_state`='reserved',`updated_at`=" . time() .
            " WHERE `id`=" . (int) $row['id'] . VNSEEA_BunnyUnattachedUploadSql()
        );
        if (!$reserved || mysqli_affected_rows($sqlConnect) !== 1) {
            return null;
        }
        $row['publish_state'] = 'reserved';
        return $row;
    }
}

if (!function_exists('VNSEEA_BunnyReleaseReservation')) {
    /** Gives a reserved upload back when creating its post or story failed, so the client can retry. */
    function VNSEEA_BunnyReleaseReservation($upload_id)
    {
        global $sqlConnect;

        return (bool) mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `publish_state`='',`updated_at`=" . time() .
            " WHERE `id`=" . (int) $upload_id . " AND `publish_state`='reserved'"
        );
    }
}

if (!function_exists('VNSEEA_BunnyAttachPendingPublish')) {
    /**
     * Stores, on a reserved upload, everything needed to create its post, reel
     * or story once Bunny finishes encoding. Nothing is created before that,
     * so viewers never meet a video that cannot play.
     */
    function VNSEEA_BunnyAttachPendingPublish($upload_id, $payload)
    {
        global $sqlConnect;

        $json = json_encode(is_array($payload) ? $payload : array(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if (!is_string($json)) {
            return false;
        }
        $attached = mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
            " SET `publish_state`='pending',`publish_payload`='" . mysqli_real_escape_string($sqlConnect, $json) . "'" .
            ",`status`=IF(`status`='created','uploaded',`status`),`updated_at`=" . time() .
            " WHERE `id`=" . (int) $upload_id . " AND `publish_state`='reserved'"
        );
        return $attached && mysqli_affected_rows($sqlConnect) === 1;
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
            "SELECT `id`,`library_kind`,`video_guid`,`status`,`last_checked_at` FROM " . T_VNSEEA_MEDIA_UPLOADS .
            " WHERE `video_guid`='" . mysqli_real_escape_string($sqlConnect, $guid) . "' LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        $status = !empty($row) ? VNSEEA_BunnyRefreshUploadStatus($row, 30) : 'ready';
        $cache[$guid] = $status === 'ready' ? '' : (in_array($status, array('failed', 'deleted'), true) ? 'failed' : 'processing');
        return $cache[$guid];
    }
}

if (!function_exists('VNSEEA_BunnyRefreshUploadStatus')) {
    /**
     * Asks the Bunny API about an upload that has not finished encoding, at
     * most once per $min_interval seconds, and stores the answer. Covers missed
     * webhooks. Returns the upload status.
     */
    function VNSEEA_BunnyRefreshUploadStatus($row, $min_interval = 30)
    {
        global $sqlConnect;

        $status = !empty($row['status']) ? (string) $row['status'] : 'ready';
        if (!in_array($status, array('created', 'uploaded'), true) ||
            time() - (int) $row['last_checked_at'] < (int) $min_interval
        ) {
            return $status;
        }
        $video = VNSEEA_BunnyApiRequest((string) $row['library_kind'], 'GET', '/videos/' . rawurlencode((string) $row['video_guid']), null, 3);
        if ($video['status'] === 200 && is_array($video['data'])) {
            $status = VNSEEA_BunnyStatusFromApi($video['data']);
        } elseif ($video['status'] === 404) {
            // The video is gone from the library, so it will never play.
            $status = 'failed';
        }
        mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
            " SET `status`=IF(`status` IN ('created','uploaded'),'" . mysqli_real_escape_string($sqlConnect, $status) . "',`status`)" .
            ",`last_checked_at`=" . time() . ",`updated_at`=" . time() .
            " WHERE `id`=" . (int) $row['id']
        );
        return $status;
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
            "SELECT * FROM " . T_VNSEEA_MEDIA_UPLOADS . " WHERE `video_guid`='{$guid_sql}' LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        if (!empty($row['message_id']) && function_exists('VNSEEA_PublishRealtimeMessageChange')) {
            try {
                VNSEEA_PublishRealtimeMessageChange((int) $row['message_id']);
            } catch (Throwable $exception) {
                error_log('[vnseea-bunny] realtime_publish_failed ' . $exception->getMessage());
            }
        }
        if (!empty($row) && isset($row['publish_state']) && $row['publish_state'] === 'pending') {
            VNSEEA_BunnyFinalizePublish((int) $row['id']);
        }
        return 200;
    }
}

if (!function_exists('VNSEEA_BunnyLoadUpload')) {
    function VNSEEA_BunnyLoadUpload($upload_id)
    {
        global $sqlConnect;

        if ((int) $upload_id < 1 || !VNSEEA_BunnyUploadsTableAvailable()) {
            return null;
        }
        $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_VNSEEA_MEDIA_UPLOADS . " WHERE `id`=" . (int) $upload_id . " LIMIT 1");
        $row = $query ? mysqli_fetch_assoc($query) : null;
        return !empty($row) ? $row : null;
    }
}

if (!function_exists('VNSEEA_BunnyClientUploadStatus')) {
    /** Status shown to the uploader: "processing", "ready" or "failed". */
    function VNSEEA_BunnyClientUploadStatus($status)
    {
        if ($status === 'ready') {
            return 'ready';
        }
        return in_array($status, array('failed', 'deleted'), true) ? 'failed' : 'processing';
    }
}

if (!function_exists('VNSEEA_BunnyOwnerNoticeText')) {
    /** Notification text for the uploader once their post, reel or story is published or dropped. */
    function VNSEEA_BunnyOwnerNoticeText($purpose, $outcome, $language = 'vi')
    {
        $vi = function_exists('VNSEEA_PushLanguageIsVietnamese')
            ? VNSEEA_PushLanguageIsVietnamese($language)
            : strpos(strtolower((string) $language), 'vi') === 0;
        $item = $purpose === 'story' ? 'story' : ($purpose === 'reel' ? 'reel' : 'post');
        $texts = array(
            'published' => array(
                'post' => array('Video của bạn đã xử lý xong và bài viết đã được đăng.', 'Your video is ready and your post is now published.'),
                'reel' => array('Video của bạn đã xử lý xong và reel đã được đăng.', 'Your video is ready and your reel is now published.'),
                'story' => array('Video của bạn đã xử lý xong và tin đã được đăng.', 'Your video is ready and your story is now published.'),
            ),
            'review' => array(
                'post' => array('Video của bạn đã xử lý xong, bài viết đang chờ duyệt.', 'Your video is ready and your post is waiting for review.'),
                'reel' => array('Video của bạn đã xử lý xong, reel đang chờ duyệt.', 'Your video is ready and your reel is waiting for review.'),
                'story' => array('Video của bạn đã xử lý xong và tin đã được đăng.', 'Your video is ready and your story is now published.'),
            ),
            'failed' => array(
                'post' => array('Không xử lý được video của bạn nên bài viết chưa được đăng. Vui lòng đăng lại.', 'We could not process your video, so your post was not published. Please try again.'),
                'reel' => array('Không xử lý được video của bạn nên reel chưa được đăng. Vui lòng đăng lại.', 'We could not process your video, so your reel was not published. Please try again.'),
                'story' => array('Không xử lý được video của bạn nên tin chưa được đăng. Vui lòng đăng lại.', 'We could not process your video, so your story was not published. Please try again.'),
            ),
        );
        $outcome = isset($texts[$outcome]) ? $outcome : 'published';
        return $texts[$outcome][$item][$vi ? 0 : 1];
    }
}

if (!function_exists('VNSEEA_BunnyRunAsUser')) {
    /**
     * Runs $callback with $wo['user'] set to the uploader, because WoWonder
     * notification and story helpers read the acting user from there. The
     * webhook and the worker have no logged-in user of their own.
     */
    function VNSEEA_BunnyRunAsUser($user_id, $callback)
    {
        global $wo;

        $user = Wo_UserData((int) $user_id);
        if (empty($user['user_id'])) {
            throw new RuntimeException('upload owner is unavailable');
        }
        $previous_user = isset($wo['user']) ? $wo['user'] : null;
        $previous_logged_in = isset($wo['loggedin']) ? $wo['loggedin'] : false;
        $wo['user'] = $user;
        $wo['loggedin'] = true;
        try {
            return call_user_func($callback, $user);
        } finally {
            $wo['user'] = $previous_user;
            $wo['loggedin'] = $previous_logged_in;
        }
    }
}

if (!function_exists('VNSEEA_BunnyNotifyUploadOwner')) {
    /** In-app notification plus push for the uploader, like WoWonder's own "video is ready" notice. */
    function VNSEEA_BunnyNotifyUploadOwner($user, $text, $url, $target = array())
    {
        global $db;

        $data = array_merge(array(
            'recipient_id' => (int) $user['user_id'],
            'type' => 'admin_notification',
            'type2' => 'ffmpeg',
            'text' => $text,
            'url' => $url,
            'time' => time(),
        ), $target);
        $notification_id = $db->insert(T_NOTIFICATION, $data);
        if (empty($notification_id)) {
            return false;
        }
        if (function_exists('Wo_PublishRealtimeNotification')) {
            Wo_PublishRealtimeNotification((int) $user['user_id'], $notification_id, 'notification');
        }
        if (function_exists('VNSEEA_EnqueueNotificationPush')) {
            VNSEEA_EnqueueNotificationPush($notification_id);
        }
        return true;
    }
}

if (!function_exists('VNSEEA_BunnySafely')) {
    /** Runs a follow-up step (notifications) without letting its failure undo a publish. */
    function VNSEEA_BunnySafely($step, $callback)
    {
        try {
            call_user_func($callback);
        } catch (Throwable $caught) {
            error_log('[vnseea-bunny] ' . $step . '_failed ' . $caught->getMessage());
        }
    }
}

if (!function_exists('VNSEEA_BunnyVideoGeometry')) {
    /**
     * Upright display size of an encoded video, or null. The playlist lists
     * the renditions Bunny produced after applying the rotation flag, so a
     * portrait phone recording reads 1080x1920 there even though the file and
     * the iOS picker report 1920x1080.
     */
    function VNSEEA_BunnyVideoGeometry($row)
    {
        if (!function_exists('VNSEEA_NormalizeMediaGeometry')) {
            return null;
        }
        $reference = VNSEEA_BunnyMediaRef((string) $row['library_kind'], (string) $row['video_guid']);
        $playlist = VNSEEA_BunnyHttpRequest('GET', VNSEEA_BunnyPlaybackUrl($reference), array(), null, 5);
        if ((int) $playlist['status'] === 200 &&
            preg_match_all('/RESOLUTION=([0-9]+)x([0-9]+)/', (string) $playlist['body'], $renditions, PREG_SET_ORDER)
        ) {
            $largest = null;
            foreach ($renditions as $rendition) {
                if ($largest === null || (int) $rendition[1] * (int) $rendition[2] > (int) $largest[1] * (int) $largest[2]) {
                    $largest = $rendition;
                }
            }
            return VNSEEA_NormalizeMediaGeometry($largest[1], $largest[2]);
        }
        $video = VNSEEA_BunnyApiRequest((string) $row['library_kind'], 'GET', '/videos/' . rawurlencode((string) $row['video_guid']), null, 5);
        if ($video['status'] !== 200 || !is_array($video['data'])) {
            return null;
        }
        return VNSEEA_NormalizeMediaGeometry(
            isset($video['data']['width']) ? $video['data']['width'] : 0,
            isset($video['data']['height']) ? $video['data']['height'] : 0
        );
    }
}

if (!function_exists('VNSEEA_BunnyHttpGetMany')) {
    /**
     * GET requests sent side by side, keyed like $urls. The test stub in
     * $GLOBALS['vnseea_bunny_http'] sees them one at a time.
     */
    function VNSEEA_BunnyHttpGetMany($urls, $headers = array(), $timeout = 4)
    {
        $results = array();
        if ((isset($GLOBALS['vnseea_bunny_http']) && is_callable($GLOBALS['vnseea_bunny_http'])) || !function_exists('curl_multi_init')) {
            foreach ($urls as $key => $url) {
                $results[$key] = VNSEEA_BunnyHttpRequest('GET', $url, $headers, null, $timeout);
            }
            return $results;
        }
        $multi = curl_multi_init();
        $handles = array();
        foreach ($urls as $key => $url) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, min(5, (int) $timeout));
            curl_setopt($ch, CURLOPT_TIMEOUT, (int) $timeout);
            curl_multi_add_handle($multi, $ch);
            $handles[$key] = $ch;
        }
        do {
            $state = curl_multi_exec($multi, $running);
            if ($running) {
                curl_multi_select($multi, 1.0);
            }
        } while ($running && $state === CURLM_OK);
        foreach ($handles as $key => $ch) {
            $results[$key] = array(
                'status' => (int) curl_getinfo($ch, CURLINFO_HTTP_CODE),
                'body' => (string) curl_multi_getcontent($ch),
            );
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }
        curl_multi_close($multi);
        return $results;
    }
}

if (!function_exists('VNSEEA_BunnyPlaylistEntries')) {
    /** Absolute URLs of the entries (renditions or segments) an HLS playlist lists. */
    function VNSEEA_BunnyPlaylistEntries($playlist_url, $body)
    {
        $path = strtok((string) $playlist_url, '?');
        $base = substr($path, 0, strrpos($path, '/') + 1);
        $entries = array();
        foreach (preg_split('/\r?\n/', (string) $body) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            $entries[] = preg_match('~^https?://~i', $line) ? $line : $base . ltrim($line, '/');
        }
        return $entries;
    }
}

if (!function_exists('VNSEEA_BunnyH264Renditions')) {
    /**
     * Renditions of a master playlist that every player decodes: the H.264
     * ones, which are also the ones just-in-time encoding serves first.
     * Premium encoding lists VP9, HEVC and AV1 renditions once they are fully
     * encoded, and players pick those only when they support them. A playlist
     * that names no H.264 codec counts in full.
     */
    function VNSEEA_BunnyH264Renditions($playlist_url, $body)
    {
        $all = array();
        $h264 = array();
        $codecs = '';
        foreach (preg_split('/\r?\n/', (string) $body) as $line) {
            $line = trim($line);
            if (stripos($line, '#EXT-X-STREAM-INF:') === 0) {
                $codecs = preg_match('/CODECS="([^"]*)"/i', $line, $matches) ? strtolower($matches[1]) : '';
                continue;
            }
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            $entries = VNSEEA_BunnyPlaylistEntries($playlist_url, $line);
            $all[] = $entries[0];
            if (strpos($codecs, 'avc1') !== false) {
                $h264[] = $entries[0];
            }
            $codecs = '';
        }
        return !empty($h264) ? $h264 : $all;
    }
}

if (!function_exists('VNSEEA_BunnyPlaybackReady')) {
    /**
     * True once viewers can start the video: the first segment of every H.264
     * rendition loads from the CDN. With Premium (just-in-time) encoding Bunny
     * calls a video ready as soon as its playlists exist, yet its segments can
     * still answer 404 for half a minute.
     */
    function VNSEEA_BunnyPlaybackReady($media, $timeout = 4)
    {
        $started = microtime(true);
        $remaining = function () use ($started, $timeout) {
            return max(1, (int) ceil($timeout - (microtime(true) - $started)));
        };
        $playlist_url = VNSEEA_BunnyPlaybackUrl($media);
        if ($playlist_url === '') {
            return false;
        }
        $master = VNSEEA_BunnyHttpRequest('GET', $playlist_url, array(), null, $timeout);
        $renditions = (int) $master['status'] === 200 ? VNSEEA_BunnyH264Renditions($playlist_url, $master['body']) : array();
        if (empty($renditions)) {
            return false;
        }
        $first_segments = array();
        foreach (VNSEEA_BunnyHttpGetMany($renditions, array(), $remaining()) as $key => $rendition) {
            $segments = (int) $rendition['status'] === 200 ? VNSEEA_BunnyPlaylistEntries($renditions[$key], $rendition['body']) : array();
            if (empty($segments)) {
                return false;
            }
            $first_segments[$key] = $segments[0];
        }
        if (microtime(true) - $started >= $timeout) {
            return false;
        }
        // The first kilobyte is enough to know the CDN serves the segment.
        foreach (VNSEEA_BunnyHttpGetMany($first_segments, array('Range: bytes=0-1023'), $remaining()) as $segment) {
            if (!in_array((int) $segment['status'], array(200, 206), true)) {
                return false;
            }
        }
        return true;
    }
}

if (!function_exists('VNSEEA_BunnyPlaybackWaitStep')) {
    /**
     * Next step for an item waiting for its video to play: 'check' it now,
     * check again 'later' (at most every few seconds, however often the app
     * polls), or 'publish' anyway once it has waited $limit seconds, so a CDN
     * problem never strands a post.
     */
    function VNSEEA_BunnyPlaybackWaitStep($waiting_since, $checked_at, $now, $limit = 300, $interval = 3)
    {
        if ((int) $waiting_since > 0 && (int) $now - (int) $waiting_since >= (int) $limit) {
            return 'publish';
        }
        if ((int) $checked_at > 0 && (int) $now - (int) $checked_at < (int) $interval) {
            return 'later';
        }
        return 'check';
    }
}

if (!function_exists('VNSEEA_BunnyReadyToPublish')) {
    /**
     * Whether a held-back post or story whose video Bunny calls ready can go
     * out now. When its video does not play yet, the wait start and the last
     * check are kept in the publish payload.
     */
    function VNSEEA_BunnyReadyToPublish($row, $now = null)
    {
        global $sqlConnect;

        $now = $now === null ? time() : (int) $now;
        $payload = json_decode((string) $row['publish_payload'], true);
        $payload = is_array($payload) ? $payload : array();
        $waiting_since = isset($payload['playback_wait_since']) ? (int) $payload['playback_wait_since'] : 0;
        $checked_at = isset($payload['playback_checked_at']) ? (int) $payload['playback_checked_at'] : 0;
        $step = VNSEEA_BunnyPlaybackWaitStep($waiting_since, $checked_at, $now);
        if ($step === 'publish') {
            error_log('[vnseea-bunny] publishing_unverified upload_id=' . (int) $row['id'] . ' waited=' . ($now - $waiting_since));
            return true;
        }
        if ($step === 'later') {
            return false;
        }
        if (VNSEEA_BunnyPlaybackReady(VNSEEA_BunnyMediaRef((string) $row['library_kind'], (string) $row['video_guid']))) {
            return true;
        }
        $payload['playback_wait_since'] = $waiting_since > 0 ? $waiting_since : $now;
        $payload['playback_checked_at'] = time();
        mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS .
            " SET `publish_payload`='" . mysqli_real_escape_string($sqlConnect, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) . "'" .
            " WHERE `id`=" . (int) $row['id'] . " AND `publish_state`='pending'"
        );
        return false;
    }
}

if (!function_exists('VNSEEA_BunnyPublishPost')) {
    /**
     * Creates the post or reel that new_post.php held back while its video
     * encoded, the way WoWonder's own FFMPEGUpload registers converted videos:
     * Wo_RegisterPost runs now, so mentions and timeline notifications go out
     * with a post people can open. Then tags, poll answers, followers and the
     * author. Returns 'dropped' when the author may no longer post there.
     */
    function VNSEEA_BunnyPublishPost($row, $payload)
    {
        global $sqlConnect;

        $author_id = (int) $row['user_id'];
        $post_data = isset($payload['post_data']) && is_array($payload['post_data']) ? $payload['post_data'] : array();
        if (empty($post_data)) {
            return array('ok' => true, 'dropped' => true);
        }
        $tagged_user_ids = isset($payload['tagged_user_ids']) && is_array($payload['tagged_user_ids']) ? $payload['tagged_user_ids'] : array();
        return VNSEEA_BunnyRunAsUser($author_id, function ($author) use ($row, $payload, $post_data, $tagged_user_ids, $author_id, $sqlConnect) {
            $post_id = !empty($row['post_id']) ? (int) $row['post_id'] : 0;
            if ($post_id < 1) {
                // The stored values were escaped by new_post.php, as Wo_RegisterPost expects.
                $post_data['postFile'] = VNSEEA_BunnyMediaRef('public', $row['video_guid']);
                $post_data['time'] = time();
                if (function_exists('VNSEEA_PostMediaGeometryColumnsAvailable') && VNSEEA_PostMediaGeometryColumnsAvailable()) {
                    // The file never reached this server, so ffprobe cannot size it,
                    // and the size the app sent may ignore the rotation flag. Feeds
                    // lay videos out by what Bunny actually encoded.
                    $geometry = VNSEEA_BunnyVideoGeometry($row);
                    if ($geometry) {
                        $post_data['media_width'] = $geometry['width'];
                        $post_data['media_height'] = $geometry['height'];
                    }
                }
                $in_transaction = !empty($tagged_user_ids) && mysqli_begin_transaction($sqlConnect);
                if (!empty($tagged_user_ids) && !$in_transaction) {
                    return array('ok' => false);
                }
                $post_id = (int) Wo_RegisterPost($post_data);
                if ($post_id < 1) {
                    if ($in_transaction) {
                        mysqli_rollback($sqlConnect);
                    }
                    return array('ok' => true, 'dropped' => true);
                }
                if ($in_transaction) {
                    if (!VNSEEA_SavePostTaggedUsers($post_id, $author_id, $tagged_user_ids) || !mysqli_commit($sqlConnect)) {
                        mysqli_rollback($sqlConnect);
                        return array('ok' => false);
                    }
                }
                // Remember the post right away so a retry never creates it twice.
                mysqli_query($sqlConnect, "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `post_id`={$post_id} WHERE `id`=" . (int) $row['id']);
                if (!empty($payload['poll_answers']) && is_array($payload['poll_answers'])) {
                    VNSEEA_BunnySafely('poll_options', function () use ($post_id, $payload) {
                        foreach ($payload['poll_answers'] as $answer) {
                            Wo_AddOption($post_id, $answer);
                        }
                    });
                }
                if (!empty($tagged_user_ids) && function_exists('VNSEEA_NotifyPostTaggedUsers')) {
                    VNSEEA_BunnySafely('tag_notify', function () use ($post_id, $author_id, $tagged_user_ids) {
                        VNSEEA_NotifyPostTaggedUsers($post_id, $author_id, $tagged_user_ids);
                    });
                }
            }
            $needs_review = isset($post_data['active']) && (int) $post_data['active'] !== 1;
            if (!$needs_review && function_exists('VNSEEA_EnqueueFollowerContentNotification')) {
                VNSEEA_BunnySafely('follower_notify', function () use ($post_id, $author_id) {
                    VNSEEA_EnqueueFollowerContentNotification('post', $post_id, $author_id);
                });
            }
            $post_url = 'index.php?link1=post&id=' . $post_id;
            VNSEEA_BunnySafely('owner_notify', function () use ($author, $row, $post_id, $post_url, $needs_review) {
                VNSEEA_BunnyNotifyUploadOwner(
                    $author,
                    VNSEEA_BunnyOwnerNoticeText($row['purpose'], $needs_review ? 'review' : 'published', isset($author['language']) ? $author['language'] : 'vi'),
                    $post_url,
                    array('post_id' => $post_id)
                );
            });
            return array('ok' => true, 'post_id' => $post_id);
        });
    }
}

if (!function_exists('VNSEEA_BunnyPublishStory')) {
    /**
     * Creates the story that create-story.php held back while its video
     * encoded, so viewers never see a story that cannot play. It lasts 24
     * hours from now. Notifies mentioned people, followers and the author.
     */
    function VNSEEA_BunnyPublishStory($row, $payload)
    {
        global $sqlConnect;

        $author_id = (int) $row['user_id'];
        return VNSEEA_BunnyRunAsUser($author_id, function ($author) use ($row, $payload, $author_id, $sqlConnect) {
            $story_id = !empty($row['story_id']) ? (int) $row['story_id'] : 0;
            if ($story_id < 1) {
                $now = time();
                $story_data = array(
                    'user_id' => $author_id,
                    'privacy' => isset($payload['privacy']) ? Wo_Secure($payload['privacy']) : '',
                    'posted' => $now,
                    'expire' => $now + 86400,
                    'title' => isset($payload['title']) ? Wo_Secure($payload['title']) : '',
                    'description' => isset($payload['description']) ? Wo_Secure($payload['description']) : '',
                    'story_type' => 'media',
                );
                if (!empty($payload['thumbnail'])) {
                    $story_data['thumbnail'] = Wo_Secure($payload['thumbnail']);
                }
                if (!empty($payload['overlay_data'])) {
                    $overlay_column = mysqli_query($sqlConnect, "SHOW COLUMNS FROM " . T_USER_STORY . " LIKE 'overlay_data'");
                    if ($overlay_column && mysqli_num_rows($overlay_column) > 0) {
                        $story_data['overlay_data'] = mysqli_real_escape_string($sqlConnect, (string) $payload['overlay_data']);
                    }
                }
                $story_id = (int) Wo_InsertUserStory($story_data);
                if ($story_id < 1) {
                    return array('ok' => false);
                }
                // Remember the story right away so a retry never creates it twice.
                mysqli_query($sqlConnect, "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `story_id`={$story_id} WHERE `id`=" . (int) $row['id']);
                Wo_InsertUserStoryMedia(array(
                    'story_id' => $story_id,
                    'type' => 'video',
                    'filename' => VNSEEA_BunnyMediaRef('public', $row['video_guid']),
                    'expire' => $now + 86400,
                ));
            }
            $query = mysqli_query($sqlConnect, "SELECT * FROM " . T_USER_STORY . " WHERE `id`={$story_id} LIMIT 1");
            $story = $query ? mysqli_fetch_assoc($query) : null;
            $story_url = 'index.php?link1=timeline&u=' . $author['username'] . '&story=true&story_id=' . $story_id;
            if (!empty($story) && !empty($payload['mention_user_ids']) && is_array($payload['mention_user_ids'])) {
                VNSEEA_BunnySafely('story_mention_notify', function () use ($story, $story_id, $story_url, $payload, $author_id) {
                    foreach ($payload['mention_user_ids'] as $mentioned_user_id) {
                        $mentioned_user_id = (int) $mentioned_user_id;
                        if ($mentioned_user_id < 1 || $mentioned_user_id === $author_id) {
                            continue;
                        }
                        if (function_exists('VNSEEA_CanViewStory') && !VNSEEA_CanViewStory($story, $mentioned_user_id)) {
                            continue;
                        }
                        Wo_RegisterNotification(array(
                            'recipient_id' => $mentioned_user_id,
                            'type' => 'story_mention',
                            'story_id' => $story_id,
                            'text' => '',
                            'url' => $story_url,
                        ));
                    }
                });
            }
            if (function_exists('VNSEEA_EnqueueFollowerContentNotification')) {
                VNSEEA_BunnySafely('story_follower_notify', function () use ($story_id, $author_id) {
                    VNSEEA_EnqueueFollowerContentNotification('story', $story_id, $author_id);
                });
            }
            VNSEEA_BunnySafely('story_owner_notify', function () use ($author, $story_id, $story_url) {
                VNSEEA_BunnyNotifyUploadOwner(
                    $author,
                    VNSEEA_BunnyOwnerNoticeText('story', 'published', isset($author['language']) ? $author['language'] : 'vi'),
                    $story_url,
                    array('story_id' => $story_id)
                );
            });
            return array('ok' => true, 'story_id' => $story_id);
        });
    }
}

if (!function_exists('VNSEEA_BunnyDiscardPending')) {
    /** Drops the held-back post, reel or story whose video cannot be shown, and tells the author. */
    function VNSEEA_BunnyDiscardPending($row)
    {
        $author_id = (int) $row['user_id'];
        return VNSEEA_BunnyRunAsUser($author_id, function ($author) use ($row) {
            VNSEEA_BunnyDeleteVideo($row);
            $payload = json_decode((string) $row['publish_payload'], true);
            $thumbnail = '';
            if (is_array($payload)) {
                $thumbnail = !empty($payload['post_data']['postFileThumb'])
                    ? (string) $payload['post_data']['postFileThumb']
                    : (!empty($payload['thumbnail']) ? (string) $payload['thumbnail'] : '');
            }
            if ($thumbnail !== '' && !filter_var($thumbnail, FILTER_VALIDATE_URL)) {
                // The poster uploaded with the post or story is never shown now.
                Wo_DeleteFromToS3($thumbnail);
                if (file_exists($thumbnail)) {
                    @unlink($thumbnail);
                }
            }
            VNSEEA_BunnySafely('discard_owner_notify', function () use ($author, $row) {
                VNSEEA_BunnyNotifyUploadOwner(
                    $author,
                    VNSEEA_BunnyOwnerNoticeText($row['purpose'], 'failed', isset($author['language']) ? $author['language'] : 'vi'),
                    'index.php?link1=home'
                );
            });
            return array('ok' => true);
        });
    }
}

if (!function_exists('VNSEEA_BunnyFinalizePublish')) {
    /**
     * Publishes the post, reel or story waiting on this upload once Bunny has
     * encoded the video, or drops it when encoding failed. The webhook, the
     * status endpoint and the worker may call it at the same time: only the
     * caller that moves the row out of "pending" does the work. Returns the
     * fresh upload row.
     */
    function VNSEEA_BunnyFinalizePublish($upload_id)
    {
        global $sqlConnect;

        $row = VNSEEA_BunnyLoadUpload($upload_id);
        if (empty($row) || !isset($row['publish_state']) || $row['publish_state'] !== 'pending') {
            return $row;
        }
        $status = (string) $row['status'];
        if (!in_array($status, array('ready', 'failed', 'deleted'), true)) {
            return $row;
        }
        // Bunny calls a just-in-time encoded video ready before its segments
        // load; hold the item back until people can actually play it.
        if ($status === 'ready' && !VNSEEA_BunnyReadyToPublish($row)) {
            return $row;
        }
        $working_state = $status === 'ready' ? 'publishing' : 'discarding';
        $claimed = mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `publish_state`='{$working_state}',`updated_at`=" . time() .
            " WHERE `id`=" . (int) $row['id'] . " AND `publish_state`='pending'"
        );
        if (!$claimed || mysqli_affected_rows($sqlConnect) !== 1) {
            return VNSEEA_BunnyLoadUpload($upload_id);
        }
        $payload = json_decode((string) $row['publish_payload'], true);
        $payload = is_array($payload) ? $payload : array();
        $result = array('ok' => false);
        try {
            if ($status !== 'ready') {
                $result = VNSEEA_BunnyDiscardPending($row);
            } elseif ($row['purpose'] === 'story') {
                $result = VNSEEA_BunnyPublishStory($row, $payload);
            } else {
                $result = VNSEEA_BunnyPublishPost($row, $payload);
            }
            if (!empty($result['dropped'])) {
                // The author may no longer post there (left the group, lost the page).
                $result = array_merge(VNSEEA_BunnyDiscardPending($row), array('dropped' => true));
            }
        } catch (Throwable $caught) {
            error_log('[vnseea-bunny] publish_failed upload_id=' . (int) $row['id'] . ' ' . $caught->getMessage());
        }
        $published = $status === 'ready' && empty($result['dropped']);
        $final_state = empty($result['ok']) ? 'pending' : ($published ? 'published' : 'discarded');
        mysqli_query(
            $sqlConnect,
            "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `publish_state`='{$final_state}'" .
            ($final_state === 'pending' ? '' : ",`published_at`=" . time()) .
            ",`updated_at`=" . time() .
            " WHERE `id`=" . (int) $row['id'] . " AND `publish_state`='{$working_state}'"
        );
        return VNSEEA_BunnyLoadUpload($upload_id);
    }
}

if (!function_exists('VNSEEA_BunnyDeleteVideo')) {
    /** Deletes an upload's video from its Bunny library and marks the row deleted. */
    function VNSEEA_BunnyDeleteVideo($row)
    {
        global $sqlConnect;

        if (empty($row['video_guid']) || empty($row['library_kind'])) {
            return false;
        }
        $deleted = VNSEEA_BunnyApiRequest((string) $row['library_kind'], 'DELETE', '/videos/' . rawurlencode((string) $row['video_guid']), null, 5);
        $gone = ($deleted['status'] >= 200 && $deleted['status'] < 300) || $deleted['status'] === 404;
        if ($gone && VNSEEA_BunnyPublishColumnsAvailable()) {
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_VNSEEA_MEDIA_UPLOADS . " SET `status`='deleted',`updated_at`=" . time() .
                " WHERE `id`=" . (int) $row['id']
            );
        }
        return $gone;
    }
}

if (!function_exists('VNSEEA_BunnyReleaseVideo')) {
    /**
     * Called when a post, story or message showing a Bunny video is deleted:
     * removes the video from Bunny unless another post, story or message still
     * shows it. $exclude names the rows being deleted, for example
     * array('post_id' => 12).
     */
    function VNSEEA_BunnyReleaseVideo($media, $exclude = array())
    {
        global $sqlConnect;

        $media = html_entity_decode(trim((string) $media), ENT_QUOTES, 'UTF-8');
        $reference = VNSEEA_BunnyParseMediaRef($media);
        if ($reference === null || !VNSEEA_BunnyUploadsTableAvailable()) {
            return false;
        }
        $media_sql = mysqli_real_escape_string($sqlConnect, VNSEEA_BunnyMediaRef($reference['kind'], $reference['guid']));
        $counts = array(
            "SELECT COUNT(*) AS `total` FROM " . T_POSTS . " WHERE `postFile`='{$media_sql}'" .
                (!empty($exclude['post_id']) ? " AND `id`<>" . (int) $exclude['post_id'] : ''),
            "SELECT COUNT(*) AS `total` FROM " . T_MESSAGES . " WHERE `media`='{$media_sql}'" .
                (!empty($exclude['message_id']) ? " AND `id`<>" . (int) $exclude['message_id'] : ''),
            "SELECT COUNT(*) AS `total` FROM " . T_USER_STORY_MEDIA . " WHERE `filename`='{$media_sql}'" .
                (!empty($exclude['story_id']) ? " AND `story_id`<>" . (int) $exclude['story_id'] : ''),
        );
        foreach ($counts as $sql) {
            $query = mysqli_query($sqlConnect, $sql);
            $count = $query ? mysqli_fetch_assoc($query) : null;
            if (!$query || (int) $count['total'] > 0) {
                return false;
            }
        }
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_VNSEEA_MEDIA_UPLOADS . " WHERE `video_guid`='" . mysqli_real_escape_string($sqlConnect, $reference['guid']) . "' LIMIT 1"
        );
        $row = $query ? mysqli_fetch_assoc($query) : null;
        if (empty($row)) {
            $row = array('id' => 0, 'library_kind' => $reference['kind'], 'video_guid' => $reference['guid']);
        }
        return VNSEEA_BunnyDeleteVideo($row);
    }
}

if (!function_exists('VNSEEA_BunnyReloadConfig')) {
    /**
     * Long-running workers loaded the config once at start and never decrypt
     * secrets (only web entry points call decryptConfigData). Re-reads the
     * Bunny settings so admin changes apply without restarting the worker.
     */
    function VNSEEA_BunnyReloadConfig()
    {
        global $wo, $sqlConnect, $siteEncryptKey;

        $query = mysqli_query($sqlConnect, "SELECT `name`,`value` FROM " . T_CONFIG . " WHERE `name` LIKE 'vnseea\\_bunny\\_%'");
        while ($query && ($row = mysqli_fetch_assoc($query))) {
            $value = (string) $row['value'];
            if (strpos($value, '$Ap1_') === 0) {
                $decrypted = !empty($siteEncryptKey) ? openssl_decrypt(substr($value, 5), 'AES-128-ECB', $siteEncryptKey) : false;
                $value = $decrypted === false ? '' : $decrypted;
            }
            $wo['config'][$row['name']] = $value;
        }
    }
}

if (!function_exists('VNSEEA_BunnyRunMaintenance')) {
    /**
     * Upkeep the push worker runs about once a minute. It publishes posts and
     * stories whose webhook was missed, retries publishes that died midway,
     * and deletes Bunny videos nobody can see any more (abandoned uploads,
     * expired stories, posts removed outside Wo_DeletePost) so they stop
     * costing storage. Stops after $time_budget seconds so pushes keep flowing.
     */
    function VNSEEA_BunnyRunMaintenance($time_budget = 10, $now = null)
    {
        global $sqlConnect;

        $done = array('finalized' => 0, 'deleted' => 0);
        if (!VNSEEA_BunnyPublishColumnsAvailable()) {
            return $done;
        }
        $started = microtime(true);
        $now = $now === null ? time() : (int) $now;
        $table = T_VNSEEA_MEDIA_UPLOADS;
        $in_budget = function () use ($started, $time_budget) {
            return microtime(true) - $started < $time_budget;
        };
        $select = function ($sql) use ($sqlConnect) {
            $query = mysqli_query($sqlConnect, $sql);
            $rows = array();
            while ($query && ($row = mysqli_fetch_assoc($query))) {
                $rows[] = $row;
            }
            return $rows;
        };
        // Rows that could not be cleaned up go to the back of the queue.
        $postpone = function ($row) use ($sqlConnect, $table, $now) {
            mysqli_query($sqlConnect, "UPDATE {$table} SET `updated_at`={$now} WHERE `id`=" . (int) $row['id']);
        };

        // A request or worker that died midway leaves its row claimed: hand it back.
        mysqli_query($sqlConnect, "UPDATE {$table} SET `publish_state`='pending',`updated_at`={$now}" .
            " WHERE `publish_state` IN ('publishing','discarding') AND `updated_at`<" . ($now - 900));
        mysqli_query($sqlConnect, "UPDATE {$table} SET `publish_state`='',`updated_at`={$now}" .
            " WHERE `publish_state`='reserved' AND `updated_at`<" . ($now - 3600));

        foreach ($select("SELECT * FROM {$table} WHERE `publish_state`='pending' ORDER BY `updated_at` ASC LIMIT 20") as $row) {
            if (!$in_budget()) {
                return $done;
            }
            VNSEEA_BunnyRefreshUploadStatus($row, 60);
            $fresh = VNSEEA_BunnyFinalizePublish((int) $row['id']);
            if (!empty($fresh) && in_array($fresh['publish_state'], array('published', 'discarded'), true)) {
                $done['finalized']++;
            }
        }

        $unused = $select(
            "SELECT * FROM {$table} WHERE `status` IN ('created','uploaded','ready','failed') AND `expires_at`<{$now}" .
            VNSEEA_BunnyUnattachedUploadSql() . " ORDER BY `updated_at` ASC LIMIT 20"
        );
        $gone_posts = $select(
            "SELECT u.* FROM {$table} u LEFT JOIN " . T_POSTS . " p ON p.`id`=u.`post_id`" .
            " WHERE u.`purpose` IN ('post','reel') AND u.`publish_state`='published' AND u.`status`<>'deleted' AND p.`id` IS NULL" .
            " ORDER BY u.`updated_at` ASC LIMIT 20"
        );
        $expired_stories = $select(
            "SELECT u.* FROM {$table} u LEFT JOIN " . T_USER_STORY . " s ON s.`id`=u.`story_id`" .
            " WHERE u.`purpose`='story' AND u.`publish_state`='published' AND u.`status`<>'deleted'" .
            " AND (s.`id` IS NULL OR s.`expire`<{$now}) ORDER BY u.`updated_at` ASC LIMIT 20"
        );
        foreach ($unused as $row) {
            if (!$in_budget()) {
                return $done;
            }
            if (VNSEEA_BunnyDeleteVideo($row)) {
                $done['deleted']++;
            } else {
                $postpone($row);
            }
        }
        foreach (array_merge($gone_posts, $expired_stories) as $row) {
            if (!$in_budget()) {
                return $done;
            }
            $exclude = $row['purpose'] === 'story'
                ? array('story_id' => (int) $row['story_id'])
                : array('post_id' => (int) $row['post_id']);
            if (VNSEEA_BunnyReleaseVideo(VNSEEA_BunnyMediaRef((string) $row['library_kind'], (string) $row['video_guid']), $exclude)) {
                $done['deleted']++;
            } else {
                $postpone($row);
            }
        }
        return $done;
    }
}

if (!function_exists('VNSEEA_BunnyStreamSelfTest')) {
    /**
     * Admin connection check: the API key of each library, then that an
     * encoded video plays the way the apps request it (no Referer header).
     * The chat library must also block unsigned links.
     */
    function VNSEEA_BunnyStreamSelfTest()
    {
        $results = array();
        $labels = array('public' => 'Thư viện công khai', 'private' => 'Thư viện riêng tư');
        $site_url = isset($GLOBALS['wo']['config']['site_url']) ? rtrim((string) $GLOBALS['wo']['config']['site_url'], '/') . '/' : 'https://vnseea.vn/';
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
                    'message' => $label . ': chưa có video đã encode để thử phát. ' .
                        ($kind === 'private' ? 'Gửi thử một video trong chat' : 'Đăng thử một video bài viết, reel hoặc tin từ app') .
                        ' rồi bấm kiểm tra lại.',
                );
                continue;
            }
            $library = VNSEEA_BunnyStreamLibrary($kind);
            $playback_url = VNSEEA_BunnyPlaybackUrl(VNSEEA_BunnyMediaRef($kind, $finished_guid));
            $playback = VNSEEA_BunnyHttpRequest('GET', $playback_url, array(), null, 8);
            if ((int) $playback['status'] !== 200) {
                $with_referer = VNSEEA_BunnyHttpRequest('GET', $playback_url, array('Referer: ' . $site_url), null, 8);
                if ((int) $with_referer['status'] === 200) {
                    $message = $label . ': Bunny chặn request không có Referer nên app iOS/Android không phát được (web vẫn phát). ' .
                        'Tắt "Block direct URL file access" trong mục Security của thư viện.';
                } elseif ($kind === 'private') {
                    $message = $label . ': link có chữ ký bị từ chối (HTTP ' . (int) $playback['status'] . '). Kiểm tra Token Authentication Key và CDN Hostname.';
                } else {
                    $message = $label . ': link phát bị từ chối (HTTP ' . (int) $playback['status'] . '). Thư viện công khai không được bật Token Authentication; kiểm tra thêm CDN Hostname.';
                }
                $results[] = array('ok' => false, 'message' => $message);
                continue;
            }
            if ($kind !== 'private') {
                $results[] = array('ok' => true, 'message' => $label . ': video phát được trên app và web.');
                continue;
            }
            $unsigned = VNSEEA_BunnyHttpRequest('GET', 'https://' . $library['cdn_host'] . '/' . $finished_guid . '/playlist.m3u8', array(), null, 8);
            if ((int) $unsigned['status'] === 200) {
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
