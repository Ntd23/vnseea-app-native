<?php
// English description: Bridges authenticated mobile map discovery, Google Places, and directions requests.

$response_data = array(
    'api_status' => 400
);

$action = !empty($_POST['type']) ? Wo_Secure($_POST['type']) : '';
$valid_actions = array('page_suggestions', 'place_autocomplete', 'address_autocomplete', 'address_geocode', 'address_details', 'place_details', 'reverse_geocode', 'route');
define('WO_API_MAP_DISCOVERY_RADIUS_METERS', 3000);
define('WO_API_MAP_DISCOVERY_MAX_RADIUS_METERS', 50000);

function Wo_ApiMapDiscoveryError($error_id, $error_text, $api_status = 400) {
    return array(
        'api_status' => $api_status,
        'errors' => array(
            'error_id' => $error_id,
            'error_text' => $error_text
        )
    );
}

function Wo_ApiMapDiscoveryNumber($key) {
    if (!isset($_POST[$key]) || !is_numeric($_POST[$key])) {
        return null;
    }
    return (float) $_POST[$key];
}

function Wo_ApiMapDiscoveryLanguage() {
    $language = !empty($_POST['language']) ? strtolower(trim(Wo_Secure($_POST['language']))) : 'vi';
    return in_array($language, array('vi', 'en')) ? $language : 'vi';
}

function Wo_ApiMapDiscoveryCountry() {
    $country = !empty($_POST['country']) ? strtolower(trim(Wo_Secure($_POST['country']))) : 'vn';
    return preg_match('/^[a-z]{2}$/', $country) ? $country : 'vn';
}

function Wo_ApiMapDiscoveryFastRequest() {
    return !empty($_POST['fast']) && (string) $_POST['fast'] !== '0';
}

function Wo_ApiMapDiscoveryIsAddressQuery($input) {
    $normalized = Wo_ApiMapDiscoveryNormalizeSearchInput($input);
    if ($normalized === '') {
        return false;
    }

    if (preg_match('/\d/', $normalized)) {
        return true;
    }

    return (bool) preg_match('/\b(duong|pho|street|road|so|ngo|hem|quan|huyen|tp|city|ward|phuong|thi xa|ap|hamlet|district)\b/', $normalized);
}

function Wo_ApiMapDiscoveryRouteMode() {
    $mode = !empty($_POST['mode']) ? strtolower(Wo_Secure($_POST['mode'])) : 'walking';
    $allowed_modes = array('walking', 'driving', 'motorcycle', 'bicycling', 'transit');
    return in_array($mode, $allowed_modes) ? $mode : 'walking';
}

function Wo_ApiMapDiscoveryGoogleRouteMode($mode) {
    return $mode === 'motorcycle' ? 'driving' : $mode;
}

function Wo_ApiMapDiscoveryTrafficInfo($mode, $duration_seconds, $duration_in_traffic_seconds) {
    if ($mode !== 'driving' && $mode !== 'motorcycle') {
        return array();
    }

    $traffic_available = $duration_in_traffic_seconds !== null && $duration_in_traffic_seconds > 0;
    $effective_duration_seconds = $traffic_available ? $duration_in_traffic_seconds : $duration_seconds;
    $traffic_delay_seconds = max(0, $effective_duration_seconds - $duration_seconds);
    $ratio = $duration_seconds > 0 ? ($effective_duration_seconds / $duration_seconds) : 1;
    $level = 'normal';
    $label = 'Bình thường';

    if ($traffic_available && ($traffic_delay_seconds >= 240 || $ratio >= 1.22)) {
        $level = 'heavy';
        $label = 'Tắc đường';
    }
    else if ($traffic_available && ($traffic_delay_seconds <= 60 || $ratio <= 1.06)) {
        $level = 'clear';
        $label = 'Vắng vẻ';
    }

    return array(
        'durationSeconds' => $effective_duration_seconds,
        'durationWithoutTrafficSeconds' => $duration_seconds,
        'durationInTrafficSeconds' => $effective_duration_seconds,
        'trafficDelaySeconds' => $traffic_delay_seconds,
        'trafficLevel' => $level,
        'trafficLabel' => $label,
        'trafficAvailable' => $traffic_available ? 1 : 0
    );
}

function Wo_ApiMapDiscoveryRadiusMeters() {
    if (!isset($_POST['radius']) || !is_numeric($_POST['radius'])) {
        return WO_API_MAP_DISCOVERY_RADIUS_METERS;
    }

    $radius = (int) $_POST['radius'];
    if ($radius <= 0) {
        return WO_API_MAP_DISCOVERY_RADIUS_METERS;
    }

    return min($radius, WO_API_MAP_DISCOVERY_MAX_RADIUS_METERS);
}

function Wo_ApiMapDiscoveryNormalizeSearchInput($input) {
    static $transliterator_initialized = false;
    static $transliterator = null;

    $clean = trim((string) $input);
    if ($clean === '') {
        return '';
    }

    if (function_exists('mb_strtolower')) {
        $clean = mb_strtolower($clean, 'UTF-8');
    } else {
        $clean = strtolower($clean);
    }

    if (class_exists('Transliterator')) {
        if (!$transliterator_initialized) {
            $transliterator = Transliterator::create('NFD; [:Nonspacing Mark:] Remove; NFC; Latin-ASCII');
            $transliterator_initialized = true;
        }
        if ($transliterator) {
            $clean = $transliterator->transliterate($clean);
        }
    } else if (function_exists('iconv')) {
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $clean);
        if ($transliterated !== false && $transliterated !== '') {
            $clean = $transliterated;
        }
    }

    $clean = str_replace(array('đ', 'Đ'), 'd', $clean);
    $clean = strtolower($clean);
    $clean = preg_replace('/[^a-z0-9]+/', ' ', $clean);
    return trim(preg_replace('/\s+/', ' ', $clean));
}

function Wo_ApiMapDiscoveryEscapeLike($input) {
    global $sqlConnect;

    $escaped = str_replace(array('=', '%', '_'), array('==', '=%', '=_'), (string) $input);
    return mysqli_real_escape_string($sqlConnect, $escaped);
}

function Wo_ApiMapDiscoveryPageFulltextQuery($input) {
    $normalized = Wo_ApiMapDiscoveryNormalizeSearchInput($input);
    if ($normalized === '') {
        return '';
    }

    $tokens = array_values(array_filter(explode(' ', $normalized), function ($token) {
        return strlen($token) >= 2;
    }));
    if (empty($tokens)) {
        return '';
    }

    $tokens = array_slice($tokens, 0, 8);
    return '+' . implode('* +', $tokens) . '*';
}

function Wo_ApiMapDiscoveryPageFulltextAvailable() {
    global $sqlConnect;
    static $available = null;

    if ($available !== null) {
        return $available;
    }

    $cache_key = 'vnseea:map-page-fulltext:' . md5(T_PAGES);
    if (function_exists('apcu_fetch')) {
        $cache_hit = false;
        $cached = apcu_fetch($cache_key, $cache_hit);
        if ($cache_hit) {
            $available = (bool) $cached;
            return $available;
        }
    }

    $index_name = 'idx_pages_map_search_fulltext';
    $index_result = mysqli_query(
        $sqlConnect,
        "SHOW INDEX FROM " . T_PAGES . " WHERE `Key_name` = '" . $index_name . "' AND `Index_type` = 'FULLTEXT'"
    );
    $available = $index_result && mysqli_num_rows($index_result) >= 3;
    if ($index_result) {
        mysqli_free_result($index_result);
    }

    if (function_exists('apcu_store')) {
        apcu_store($cache_key, $available ? 1 : 0, 300);
    }
    return $available;
}

function Wo_ApiMapDiscoveryFastPageCacheKey($query, $limit, $origin_lat, $origin_lng, $distance, $global_search = false) {
    if (!function_exists('apcu_fetch') || !function_exists('apcu_store')) {
        return '';
    }

    return 'vnseea:map-page-suggestions:' . md5(json_encode(array(
        Wo_ApiMapDiscoveryNormalizeSearchInput($query),
        (int) $limit,
        // About 11 metres at the equator: stable across ordinary GPS jitter,
        // while still keeping cached Page results local to the user.
        is_numeric($origin_lat) ? number_format((float) $origin_lat, 4, '.', '') : '',
        is_numeric($origin_lng) ? number_format((float) $origin_lng, 4, '.', '') : '',
        is_numeric($distance) ? number_format((float) $distance, 1, '.', '') : '',
        $global_search ? 'global' : 'nearby'
    )));
}

function Wo_ApiMapDiscoveryGoogleKey() {
    global $wo;
    if (!empty($wo['config']['google_server_map_api'])) {
        return trim($wo['config']['google_server_map_api']);
    }
    return !empty($wo['config']['google_map_api']) ? trim($wo['config']['google_map_api']) : '';
}

function Wo_ApiMapDiscoveryGoogleGet($path, array $query, $timeout_ms = 20000, $connect_timeout_ms = 10000) {
    if (!empty($GLOBALS['wo_api_map_discovery_google_get_mock']) && is_callable($GLOBALS['wo_api_map_discovery_google_get_mock'])) {
        return call_user_func($GLOBALS['wo_api_map_discovery_google_get_mock'], $path, $query);
    }

    $google_key = Wo_ApiMapDiscoveryGoogleKey();
    if ($google_key === '') {
        return Wo_ApiMapDiscoveryError('google_not_configured', 'Google Maps API key is not configured.', 500);
    }

    $timeout_ms = max(250, (int) $timeout_ms);
    $connect_timeout_ms = max(250, min((int) $connect_timeout_ms, $timeout_ms));
    $query['key'] = $google_key;
    $url = 'https://maps.googleapis.com/maps/api/' . $path . '?' . http_build_query($query);
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT_MS, $connect_timeout_ms);
    curl_setopt($curl, CURLOPT_TIMEOUT_MS, $timeout_ms);
    curl_setopt($curl, CURLOPT_NOSIGNAL, true);
    curl_setopt($curl, CURLOPT_ENCODING, '');
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Accept: application/json'));

    $body = curl_exec($curl);
    $curl_error = curl_error($curl);
    $http_status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($body === false || $curl_error !== '') {
        return Wo_ApiMapDiscoveryError('google_unreachable', 'Unable to reach Google Maps.', 502);
    }
    if ($http_status >= 400) {
        return Wo_ApiMapDiscoveryError('google_http_error', 'Google Maps returned HTTP ' . $http_status . '.', 502);
    }

    $decoded = json_decode($body, true);
    if (empty($decoded) || !is_array($decoded)) {
        return Wo_ApiMapDiscoveryError('google_invalid_response', 'Google Maps response is invalid.', 502);
    }

    return $decoded;
}

function Wo_ApiMapDiscoveryDistanceMeters($origin_lat, $origin_lng, $lat, $lng) {
    if (!is_numeric($origin_lat) || !is_numeric($origin_lng) || !is_numeric($lat) || !is_numeric($lng)) {
        return null;
    }

    $earth_radius = 6371000;
    $lat_from = deg2rad((float) $origin_lat);
    $lng_from = deg2rad((float) $origin_lng);
    $lat_to = deg2rad((float) $lat);
    $lng_to = deg2rad((float) $lng);
    $lat_delta = $lat_to - $lat_from;
    $lng_delta = $lng_to - $lng_from;
    $angle = 2 * asin(sqrt(pow(sin($lat_delta / 2), 2) + cos($lat_from) * cos($lat_to) * pow(sin($lng_delta / 2), 2)));

    return (int) round($earth_radius * $angle);
}

function Wo_ApiMapDiscoveryNormalizeUrl($url) {
    if (empty($url)) {
        return '';
    }
    if (filter_var($url, FILTER_VALIDATE_URL)) {
        return $url;
    }
    return Wo_GetMedia(ltrim((string) $url, '/'));
}

function Wo_ApiMapDiscoveryPageSuggestions() {
    global $sqlConnect;

    $fast = Wo_ApiMapDiscoveryFastRequest();
    if (!$fast && function_exists('Wo_EnsurePageMapPinColumns')) {
        Wo_EnsurePageMapPinColumns();
    }

    $query = !empty($_POST['query']) ? trim($_POST['query']) : '';
    if (function_exists('mb_substr')) {
        $query = mb_substr($query, 0, 120, 'UTF-8');
    } else {
        $query = substr($query, 0, 120);
    }
    $keyword = mysqli_real_escape_string($sqlConnect, $query);
    $like_keyword = Wo_ApiMapDiscoveryEscapeLike($query);
    $limit = !empty($_POST['limit']) && is_numeric($_POST['limit']) ? (int) $_POST['limit'] : 20;
    $limit = max(1, min($limit, 80));
    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    $global_search = !empty($_POST['global_search']) && (string) $_POST['global_search'] !== '0';
    $has_origin = ($origin_lat !== null && $origin_lng !== null && !($origin_lat == 0 && $origin_lng == 0));
    $candidate_limit = $fast
        ? min(max($limit * 2, $limit), 60)
        : min(max($limit * 6, $limit), 160);
    $normalized_query = Wo_ApiMapDiscoveryNormalizeSearchInput($query);
    $max_distance_meters = 0;
    if ($fast && $has_origin && !$global_search) {
        $distance_km = !empty($_POST['distance']) && is_numeric($_POST['distance'])
            ? (float) $_POST['distance']
            : 3;
        $max_distance_meters = max(250, min($distance_km * 1000, 50000));
    }

    $cache_key = $fast
        ? Wo_ApiMapDiscoveryFastPageCacheKey($query, $limit, $origin_lat, $origin_lng, $max_distance_meters, $global_search)
        : '';
    if ($cache_key !== '') {
        $cache_hit = false;
        $cached_response = apcu_fetch($cache_key, $cache_hit);
        if ($cache_hit && is_array($cached_response)) {
            return $cached_response;
        }
    }

    $base_where = " WHERE `active` = '1' AND `address` <> '' AND `lat` <> '' AND `lng` <> '' AND `lat` <> '0' AND `lng` <> '0'";
    if ($max_distance_meters > 0) {
        $lat_delta = $max_distance_meters / 111320;
        $lng_delta = $max_distance_meters / max(111320 * cos(deg2rad($origin_lat)), 1);
        $lat_min = number_format($origin_lat - $lat_delta, 7, '.', '');
        $lat_max = number_format($origin_lat + $lat_delta, 7, '.', '');
        $lng_min = number_format($origin_lng - $lng_delta, 7, '.', '');
        $lng_max = number_format($origin_lng + $lng_delta, 7, '.', '');
        $base_where .= " AND CAST(`lat` AS DECIMAL(10,7)) BETWEEN {$lat_min} AND {$lat_max} AND CAST(`lng` AS DECIMAL(10,7)) BETWEEN {$lng_min} AND {$lng_max}";
    }

    $distance_order = $has_origin
        ? "(POW((`lat` - " . number_format($origin_lat, 7, '.', '') . "), 2) + POW((`lng` - " . number_format($origin_lng, 7, '.', '') . "), 2)) ASC,"
        : '';
    $order = $keyword !== ''
        ? "(`page_title` = '{$keyword}') DESC, (`page_name` = '{$keyword}') DESC, (`page_title` LIKE '{$like_keyword}%' ESCAPE '=') DESC, (`page_name` LIKE '{$like_keyword}%' ESCAPE '=') DESC, (`address` LIKE '{$like_keyword}%' ESCAPE '=') DESC,{$distance_order}"
        : $distance_order;
    $select_fields = $fast
        ? '`page_id`, `page_name`, `page_title`, `page_description`, `address`, `avatar`, `cover`, `place_id`, `lat`, `lng`'
        : '`page_id`';
    $legacy_search_where = $keyword !== ''
        ? " AND (`page_name` LIKE '%{$like_keyword}%' ESCAPE '=' OR `page_title` LIKE '%{$like_keyword}%' ESCAPE '=' OR `address` LIKE '%{$like_keyword}%' ESCAPE '=')"
        : '';
    $fulltext_query = $keyword !== '' ? Wo_ApiMapDiscoveryPageFulltextQuery($query) : '';
    $query_result = false;

    if ($fulltext_query !== '' && Wo_ApiMapDiscoveryPageFulltextAvailable()) {
        $fulltext_keyword = mysqli_real_escape_string($sqlConnect, $fulltext_query);
        $fulltext_match = "MATCH(`page_name`, `page_title`, `address`) AGAINST ('{$fulltext_keyword}' IN BOOLEAN MODE)";
        $fulltext_sql = "SELECT {$select_fields} FROM " . T_PAGES . $base_where . " AND {$fulltext_match} ORDER BY {$order} {$fulltext_match} DESC, `page_id` DESC LIMIT {$candidate_limit}";
        $query_result = mysqli_query($sqlConnect, $fulltext_sql);

        // FULLTEXT token-size and stop-word settings differ between hosts.
        // Preserve complete legacy behavior when the optional index cannot
        // serve a short query or is temporarily unavailable.
        if ($query_result && mysqli_num_rows($query_result) === 0) {
            mysqli_free_result($query_result);
            $query_result = false;
        }
    }

    if (!$query_result) {
        $legacy_sql = "SELECT {$select_fields} FROM " . T_PAGES . $base_where . $legacy_search_where . " ORDER BY {$order} `page_id` DESC LIMIT {$candidate_limit}";
        $query_result = mysqli_query($sqlConnect, $legacy_sql);
    }
    $items = array();

    if ($query_result && mysqli_num_rows($query_result) > 0) {
        while ($row = mysqli_fetch_assoc($query_result)) {
            if ($fast) {
                // The full Wo_PageData() helper performs several extra queries
                // (rating, permissions, reports, verification) per page. The
                // interactive map only needs these lightweight display fields.
                $page = $row;
                $page['id'] = $page['page_id'];
                $page['name'] = !empty($page['page_title']) ? $page['page_title'] : '';
                $page['username'] = !empty($page['page_name']) ? $page['page_name'] : '';
                $page['about'] = !empty($page['page_description']) ? $page['page_description'] : '';
                $page['avatar'] = !empty($page['avatar']) ? Wo_GetMedia($page['avatar']) : '';
                $page['cover'] = !empty($page['cover']) ? Wo_GetMedia($page['cover']) : '';
                $page['url'] = !empty($page['page_name'])
                    ? Wo_SeoLink('index.php?link1=timeline&u=' . $page['page_name'])
                    : '';
            }
            else {
                $page = Wo_PageData($row['page_id']);
            }
            if (empty($page) || empty($page['lat']) || empty($page['lng'])) {
                continue;
            }

            $distance_meters = $has_origin ? Wo_ApiMapDiscoveryDistanceMeters($origin_lat, $origin_lng, $page['lat'], $page['lng']) : null;
            if ($max_distance_meters > 0 && ($distance_meters === null || $distance_meters > $max_distance_meters)) {
                continue;
            }
            $normalized_title = Wo_ApiMapDiscoveryNormalizeSearchInput(!empty($page['page_title']) ? $page['page_title'] : (!empty($page['name']) ? $page['name'] : ''));
            $normalized_name = Wo_ApiMapDiscoveryNormalizeSearchInput(!empty($page['page_name']) ? $page['page_name'] : '');
            $normalized_address = Wo_ApiMapDiscoveryNormalizeSearchInput(!empty($page['address']) ? $page['address'] : '');
            $match_priority = 4;
            if ($normalized_query !== '') {
                if ($normalized_title === $normalized_query || $normalized_name === $normalized_query) {
                    $match_priority = 0;
                }
                else if (strpos($normalized_title, $normalized_query) === 0 || strpos($normalized_name, $normalized_query) === 0) {
                    $match_priority = 1;
                }
                else if (strpos($normalized_title, $normalized_query) !== false || strpos($normalized_name, $normalized_query) !== false) {
                    $match_priority = 2;
                }
                else if (strpos($normalized_address, $normalized_query) !== false) {
                    $match_priority = 3;
                }
            }
            $items[] = array(
                'source' => 'page',
                'type' => 'page',
                'id' => (string) $page['page_id'],
                'page_id' => (string) $page['page_id'],
                'title' => !empty($page['page_title']) ? $page['page_title'] : (!empty($page['name']) ? $page['name'] : ''),
                'subtitle' => !empty($page['page_name']) ? '@' . $page['page_name'] : '',
                'description' => !empty($page['page_description']) ? trim($page['page_description']) : '',
                'address' => !empty($page['address']) ? $page['address'] : '',
                'location' => !empty($page['address']) ? $page['address'] : '',
                'avatar' => Wo_ApiMapDiscoveryNormalizeUrl(!empty($page['avatar']) ? $page['avatar'] : ''),
                'cover' => Wo_ApiMapDiscoveryNormalizeUrl(!empty($page['cover']) ? $page['cover'] : ''),
                'url' => !empty($page['url']) ? $page['url'] : '',
                'place_id' => !empty($page['place_id']) ? $page['place_id'] : '',
                'lat' => (float) $page['lat'],
                'lng' => (float) $page['lng'],
                'distance_meters' => $distance_meters,
                'within_1km' => ($distance_meters !== null && $distance_meters <= 1000) ? 1 : 0,
                'match_priority' => $match_priority
            );
        }
    }

    usort($items, function($a, $b) {
        $a_match_priority = isset($a['match_priority']) ? (int) $a['match_priority'] : 4;
        $b_match_priority = isset($b['match_priority']) ? (int) $b['match_priority'] : 4;
        if ($a_match_priority !== $b_match_priority) {
            return $a_match_priority - $b_match_priority;
        }

        $a_near = !empty($a['within_1km']) ? 1 : 0;
        $b_near = !empty($b['within_1km']) ? 1 : 0;
        if ($a_near !== $b_near) {
            return $b_near - $a_near;
        }

        $a_distance = isset($a['distance_meters']) && is_numeric($a['distance_meters']) ? (float) $a['distance_meters'] : null;
        $b_distance = isset($b['distance_meters']) && is_numeric($b['distance_meters']) ? (float) $b['distance_meters'] : null;
        if ($a_distance !== null && $b_distance !== null && $a_distance != $b_distance) {
            return ($a_distance < $b_distance) ? -1 : 1;
        }
        if ($a_distance !== null) {
            return -1;
        }
        if ($b_distance !== null) {
            return 1;
        }

        return strnatcasecmp((string) $a['title'], (string) $b['title']);
    });

    $result_items = array_slice($items, 0, $limit);
    foreach ($result_items as &$result_item) {
        unset($result_item['match_priority']);
    }
    unset($result_item);

    $response = array(
        'api_status' => 200,
        'items' => $result_items
    );
    if ($cache_key !== '') {
        apcu_store($cache_key, $response, 15);
    }
    return $response;
}

function Wo_ApiMapDiscoveryAddPrediction(&$predictions, &$seen_place_ids, $place_id, $description, $main_text, $secondary_text, $types = array(), $lat = null, $lng = null, $icon = null, $icon_background_color = null, $rating = null, $ratings_total = null, $open_now = null, $photo_references = array()) {
    $place_id = trim((string) $place_id);
    $description = trim((string) $description);
    $main_text = trim((string) $main_text);
    $secondary_text = trim((string) $secondary_text);

    if ($place_id === '' || $description === '') {
        return;
    }
    if (isset($seen_place_ids[$place_id])) {
        return;
    }

    $seen_place_ids[$place_id] = true;
    $prediction = array(
        'source' => 'google',
        'place_id' => $place_id,
        'description' => $description,
        'main_text' => $main_text !== '' ? $main_text : $description,
        'secondary_text' => $secondary_text,
        'types' => $types,
        'lat' => $lat,
        'lng' => $lng,
        'icon' => $icon,
        'icon_background_color' => $icon_background_color
    );
    if ($rating !== null && is_numeric($rating)) {
        $prediction['rating'] = (float) $rating;
    }
    if ($ratings_total !== null && is_numeric($ratings_total)) {
        $prediction['user_ratings_total'] = (int) $ratings_total;
    }
    if (is_bool($open_now)) {
        $prediction['open_now'] = $open_now;
    }
    if (!empty($photo_references) && is_array($photo_references)) {
        $prediction['photo_references'] = array_slice(array_values(array_filter($photo_references)), 0, 3);
    }
    $predictions[] = $prediction;
}

function Wo_ApiMapDiscoveryMergeGooglePlaceResults(&$places_results, $next_results) {
    if (empty($next_results) || !is_array($next_results)) {
        return;
    }

    $seen_place_ids = array();
    foreach ($places_results as $result) {
        if (!empty($result['place_id'])) {
            $seen_place_ids[$result['place_id']] = true;
        }
    }

    foreach ($next_results as $result) {
        if (empty($result['place_id']) || isset($seen_place_ids[$result['place_id']])) {
            continue;
        }

        $seen_place_ids[$result['place_id']] = true;
        $places_results[] = $result;
    }
}

function Wo_ApiMapDiscoveryGetGoogleTypeFromInput($input) {
    $normalized_input = Wo_ApiMapDiscoveryNormalizeSearchInput($input);
    if (preg_match('/\b(quan an|nha hang|do an|an uong|food|restaurant|com|pho|bun|lau|nuong|buffet)\b/', $normalized_input)) {
        return 'restaurant';
    }
    if (preg_match('/\b(caf|cafe|ca phe|coffee|tra sua|tra|nuoc|do uong|uong)\b/', $normalized_input)) {
        return 'cafe';
    }

    $clean = mb_strtolower(trim($input), 'UTF-8');
    
    // 100% bulletproof character-by-character replacement for Vietnamese accents
    $dict = array(
        'a' => array('á','à','ả','ã','ạ','ă','ắ','ằ','ẳ','ẵ','ặ','â','ấ','ầ','ẩ','ẫ','ậ','A','Á','À','Ả','Ã','Ạ','Ă','Ắ','Ằ','Ẳ','Ẵ','Ặ','Â','Ấ','Ầ','Ẩ','Ẫ','Ậ'),
        'e' => array('é','è','ẻ','ẽ','ẹ','ê','ế','ề','ể','ễ','ệ','E','É','È','Ẻ','Ẽ','Ẹ','Ê','Ế','Ề','Ể','Ễ','Ệ'),
        'i' => array('í','ì','ỉ','ĩ','ị','I','Í','À','Ỉ','Ĩ','Ị'),
        'o' => array('ó','ò','ỏ','õ','ọ','ô','ố','ồ','ổ','ỗ','ộ','ơ','ớ','ờ','ở','ỡ','ợ','O','Ó','Ò','Ỏ','Õ','Ọ','Ô','Ố','Ồ','Ổ','Ỗ','Ộ','Ơ','Ớ','Ờ','Ở','Ỡ','Ợ'),
        'u' => array('ú','ù','ủ','ũ','ụ','ư','ứ','ừ','ử','ữ','ự','U','Ú','Ù','Ủ','Ũ','Ụ','Ư','Ứ','Ừ','Ử','Ữ','Ự'),
        'y' => array('ý','ỳ','ỷ','ỹ','ỵ','Y','Ý','Ỳ','Ỷ','Ỹ','Ỵ'),
        'd' => array('đ','Đ')
    );
    foreach ($dict as $nonAccent => $accents) {
        $clean = str_replace($accents, $nonAccent, $clean);
    }

    if (strpos($clean, 'an') !== false || strpos($clean, 'hang') !== false || strpos($clean, 'food') !== false || strpos($clean, 'restaurant') !== false || strpos($clean, 'com') !== false || strpos($clean, 'pho') !== false || strpos($clean, 'bun') !== false || strpos($clean, 'lau') !== false || strpos($clean, 'nuong') !== false || strpos($clean, 'buffet') !== false) {
        return 'restaurant';
    }
    if (strpos($clean, 'caf') !== false || strpos($clean, 'phe') !== false || strpos($clean, 'coffee') !== false || strpos($clean, 'tra') !== false || strpos($clean, 'sua') !== false || strpos($clean, 'nuoc') !== false || strpos($clean, 'uong') !== false) {
        return 'cafe';
    }
    if (strpos($clean, 'toc') !== false || strpos($clean, 'salon') !== false || strpos($clean, 'barber') !== false || strpos($clean, 'spa') !== false || strpos($clean, 'lam dep') !== false) {
        return 'beauty_salon';
    }
    if (strpos($clean, 'xang') !== false || strpos($clean, 'fuel') !== false || strpos($clean, 'gas') !== false) {
        return 'gas_station';
    }
    if (strpos($clean, 'khach san') !== false || strpos($clean, 'hotel') !== false || strpos($clean, 'nha nghi') !== false || strpos($clean, 'lodging') !== false) {
        return 'lodging';
    }
    if (strpos($clean, 'truong') !== false || strpos($clean, 'school') !== false || strpos($clean, 'dai hoc') !== false || strpos($clean, 'hoc') !== false) {
        return 'school';
    }
    if (strpos($clean, 'ngan hang') !== false || strpos($clean, 'bank') !== false || strpos($clean, 'atm') !== false) {
        return 'bank';
    }
    if (strpos($clean, 'benh vien') !== false || strpos($clean, 'hospital') !== false || strpos($clean, 'thuoc') !== false || strpos($clean, 'y te') !== false) {
        return 'hospital';
    }
    if (strpos($clean, 'sieu thi') !== false || strpos($clean, 'supermarket') !== false || strpos($clean, 'store') !== false || strpos($clean, 'cua hang') !== false) {
        return 'store';
    }

    return null;
}

function Wo_ApiMapDiscoveryRequestedGoogleType() {
    if (empty($_POST['category'])) {
        return null;
    }

    $category = strtolower(trim(Wo_Secure($_POST['category'])));
    $allowed_types = array(
        'restaurant', 'cafe', 'hair_care', 'beauty_salon', 'pharmacy',
        'hospital', 'dentist', 'gas_station', 'supermarket', 'gym',
        'lodging', 'bank', 'atm', 'school'
    );
    return in_array($category, $allowed_types, true) ? $category : null;
}

function Wo_ApiMapDiscoveryAddressQuery() {
    $input = !empty($_POST['query']) ? trim($_POST['query']) : (!empty($_POST['input']) ? trim($_POST['input']) : '');
    $input_length = function_exists('mb_strlen') ? mb_strlen($input, 'UTF-8') : strlen($input);
    if ($input_length < 2 || $input_length > 160) {
        return '';
    }
    return $input;
}

function Wo_ApiMapDiscoveryAddressSessionToken() {
    if (empty($_POST['sessiontoken'])) {
        return '';
    }

    $session_token = trim(Wo_Secure($_POST['sessiontoken']));
    if ($session_token === '') {
        return '';
    }

    return function_exists('mb_substr')
        ? mb_substr($session_token, 0, 255, 'UTF-8')
        : substr($session_token, 0, 255);
}

function Wo_ApiMapDiscoveryAddressBiasQuery() {
    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    if ($origin_lat === null || $origin_lng === null) {
        return array();
    }
    if ($origin_lat < -90 || $origin_lat > 90 || $origin_lng < -180 || $origin_lng > 180) {
        return array();
    }

    $radius = Wo_ApiMapDiscoveryRadiusMeters();
    return array(
        'location' => number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', ''),
        'radius' => min((int) $radius, WO_API_MAP_DISCOVERY_MAX_RADIUS_METERS)
    );
}

function Wo_ApiMapDiscoveryAddressError($error_id, $api_status = 404) {
    if ($error_id === 'google_not_configured') {
        return Wo_ApiMapDiscoveryError('google_not_configured', 'Google Maps API key is not configured.', 500);
    }
    if ($error_id === 'google_request_denied') {
        return Wo_ApiMapDiscoveryError('google_request_denied', 'Google Maps request was denied.', 502);
    }
    return Wo_ApiMapDiscoveryError('address_not_found', 'Address not found.', $api_status);
}

function Wo_ApiMapDiscoveryAddressGoogleError($google, $allow_zero_results = false) {
    if (!empty($google['errors'])) {
        $error_id = !empty($google['errors']['error_id']) ? $google['errors']['error_id'] : '';
        return ($error_id === 'google_not_configured')
            ? Wo_ApiMapDiscoveryAddressError('google_not_configured', 500)
            : Wo_ApiMapDiscoveryAddressError('google_request_denied', 502);
    }

    $status = strtoupper((string) (!empty($google['status']) ? $google['status'] : ''));
    if ($status === 'OK') {
        return null;
    }
    if ($status === 'ZERO_RESULTS' && $allow_zero_results) {
        return null;
    }
    if ($status === 'ZERO_RESULTS' || $status === 'NOT_FOUND') {
        return Wo_ApiMapDiscoveryAddressError('address_not_found', 404);
    }
    if ($status === 'REQUEST_DENIED') {
        return Wo_ApiMapDiscoveryAddressError('google_request_denied', 502);
    }

    return Wo_ApiMapDiscoveryAddressError('google_request_denied', 502);
}

function Wo_ApiMapDiscoveryAddressComponentValue($components, $type_groups) {
    if (empty($components) || !is_array($components)) {
        return '';
    }

    foreach ($type_groups as $type_group) {
        foreach ($components as $component) {
            if (empty($component['types']) || !is_array($component['types'])) {
                continue;
            }
            foreach ($type_group as $type) {
                if (in_array($type, $component['types'], true)) {
                    return !empty($component['long_name']) ? trim($component['long_name']) : '';
                }
            }
        }
    }

    return '';
}

function Wo_ApiMapDiscoveryAddressPayloadFromGeocodeResult($result, $fallback_place_id = '') {
    $formatted_address = !empty($result['formatted_address']) ? trim((string) $result['formatted_address']) : '';
    $formatted_address = trim((string) preg_replace('/\s+/', ' ', $formatted_address));
    $location = !empty($result['geometry']['location']) && is_array($result['geometry']['location']) ? $result['geometry']['location'] : array();
    $components = !empty($result['address_components']) && is_array($result['address_components']) ? $result['address_components'] : array();
    $ward = Wo_ApiMapDiscoveryAddressComponentValue($components, array(
        array('administrative_area_level_3'),
        array('sublocality_level_1'),
        array('sublocality'),
        array('locality')
    ));
    $district = Wo_ApiMapDiscoveryAddressComponentValue($components, array(
        array('administrative_area_level_2')
    ));
    $city = Wo_ApiMapDiscoveryAddressComponentValue($components, array(
        array('administrative_area_level_1'),
        array('locality')
    ));
    $country = Wo_ApiMapDiscoveryAddressComponentValue($components, array(
        array('country')
    ));

    return array(
        'source' => 'google',
        'place_id' => !empty($result['place_id']) ? $result['place_id'] : $fallback_place_id,
        'address' => $formatted_address,
        'lat' => isset($location['lat']) ? (float) $location['lat'] : null,
        'lng' => isset($location['lng']) ? (float) $location['lng'] : null,
        'city' => $city,
        'district' => $district,
        'ward' => $ward,
        'country' => $country
    );
}

function Wo_ApiMapDiscoveryAddressPredictionFromGeocodeResult($result) {
    $payload = Wo_ApiMapDiscoveryAddressPayloadFromGeocodeResult($result);
    $formatted_address = $payload['address'];
    if ($formatted_address === '') {
        return array();
    }

    $address_parts = array_values(array_filter(array_map('trim', explode(',', $formatted_address))));
    $main_text = !empty($address_parts) ? array_shift($address_parts) : $formatted_address;
    $secondary_text = !empty($address_parts) ? implode(', ', $address_parts) : '';
    return array(
        'source' => 'geocode',
        'place_id' => $payload['place_id'],
        'description' => $formatted_address,
        'main_text' => $main_text,
        'secondary_text' => $secondary_text,
        'types' => !empty($result['types']) && is_array($result['types']) ? array_values($result['types']) : array(),
        'lat' => $payload['lat'],
        'lng' => $payload['lng']
    );
}

function Wo_ApiMapDiscoveryAutocomplete() {
    $input = !empty($_POST['query']) ? trim($_POST['query']) : (!empty($_POST['input']) ? trim($_POST['input']) : '');
    $input_length = function_exists('mb_strlen') ? mb_strlen($input, 'UTF-8') : strlen($input);
    if ($input_length < 2) {
        return array('api_status' => 200, 'predictions' => array());
    }

    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    $radius = Wo_ApiMapDiscoveryRadiusMeters();
    $language = Wo_ApiMapDiscoveryLanguage();
    $country = Wo_ApiMapDiscoveryCountry();
    // Only force address mode for address-shaped queries. The map search
    // client may omit a category for generic words such as "tiệm"; treating
    // those as addresses suppresses Nearby/Text Search and leaves no place
    // suggestions even though Google can autocomplete them.
    $prefer_address =
        !empty($_POST['prefer_address']) &&
        (string) $_POST['prefer_address'] !== '0' &&
        Wo_ApiMapDiscoveryIsAddressQuery($input);
    $fast = Wo_ApiMapDiscoveryFastRequest();
    $global_search = !empty($_POST['global_search']) && (string) $_POST['global_search'] !== '0';
    $google_timeout_ms = $fast ? 1500 : 20000;
    $google_connect_timeout_ms = $fast ? 700 : 10000;

    $predictions = array();
    $seen_place_ids = array();
    $places_results = array();
    $nearby_search = array();
    $text_search = array();
    $geocode_search = array();
    $detected_type = null;
    if (!$prefer_address) {
        $detected_type = Wo_ApiMapDiscoveryRequestedGoogleType();
        if ($detected_type === null) {
            $detected_type = Wo_ApiMapDiscoveryGetGoogleTypeFromInput($input);
        }
    }

    // Address forms should show Google's textual address matches first. This
    // avoids a nearby business/category result outranking the exact street
    // address the user typed.
    $google = array('status' => 'NOT_CALLED');
    if ($prefer_address && !$global_search) {
        $autocomplete_query = array(
            'input' => $input,
            'language' => $language,
            'components' => 'country:' . $country
        );
        if (Wo_ApiMapDiscoveryIsAddressQuery($input)) {
            $autocomplete_query['types'] = 'address';
        }
        if ($origin_lat !== null && $origin_lng !== null) {
            $autocomplete_query['location'] = number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', '');
            $autocomplete_query['radius'] = $radius;
        }
        $google = Wo_ApiMapDiscoveryGoogleGet('place/autocomplete/json', $autocomplete_query, $google_timeout_ms, $google_connect_timeout_ms);
        if (empty($google['errors']) && (($google['status'] ?? '') === 'OK' || ($google['status'] ?? '') === 'ZERO_RESULTS')) {
            foreach (($google['predictions'] ?? array()) as $prediction) {
                $formatting = !empty($prediction['structured_formatting']) && is_array($prediction['structured_formatting']) ? $prediction['structured_formatting'] : array();
                Wo_ApiMapDiscoveryAddPrediction(
                    $predictions,
                    $seen_place_ids,
                    !empty($prediction['place_id']) ? $prediction['place_id'] : '',
                    !empty($prediction['description']) ? $prediction['description'] : '',
                    !empty($formatting['main_text']) ? $formatting['main_text'] : (!empty($prediction['description']) ? $prediction['description'] : ''),
                    !empty($formatting['secondary_text']) ? $formatting['secondary_text'] : '',
                    !empty($prediction['types']) && is_array($prediction['types']) ? $prediction['types'] : array()
                );
            }
        }
    }

    // If Places Autocomplete cannot resolve an address, use Geocoding rather
    // than Places Text Search. Text Search may return popular restaurants or
    // shops that have nothing to do with the street address the user typed.
    if (!$global_search && $prefer_address && count($predictions) === 0) {
        $geocode_search = Wo_ApiMapDiscoveryGoogleGet('geocode/json', array(
            'address' => $input,
            'components' => 'country:' . strtoupper($country),
            'language' => $language,
            'region' => $country
        ), $google_timeout_ms, $google_connect_timeout_ms);

        if (empty($geocode_search['errors']) && (($geocode_search['status'] ?? '') === 'OK' || ($geocode_search['status'] ?? '') === 'ZERO_RESULTS')) {
            foreach (($geocode_search['results'] ?? array()) as $result) {
                $formatted_address = !empty($result['formatted_address']) ? trim($result['formatted_address']) : '';
                $address_parts = array_values(array_filter(array_map('trim', explode(',', $formatted_address))));
                $main_text = !empty($address_parts) ? array_shift($address_parts) : $formatted_address;
                $secondary_text = !empty($address_parts) ? implode(', ', $address_parts) : '';
                $loc = !empty($result['geometry']['location']) ? $result['geometry']['location'] : array();

                Wo_ApiMapDiscoveryAddPrediction(
                    $predictions,
                    $seen_place_ids,
                    !empty($result['place_id']) ? $result['place_id'] : '',
                    $formatted_address,
                    $main_text,
                    $secondary_text,
                    !empty($result['types']) && is_array($result['types']) ? $result['types'] : array(),
                    isset($loc['lat']) ? (float)$loc['lat'] : null,
                    isset($loc['lng']) ? (float)$loc['lng'] : null
                );
            }
        }
    }

    // 1. Fetch from Nearby Search (strict radius + category type bias)
    if (
        !$global_search &&
        !$prefer_address &&
        $origin_lat !== null &&
        $origin_lng !== null &&
        (!$fast || $detected_type !== null)
    ) {
        $nearby_query = array(
            'location' => number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', ''),
            'radius' => $radius,
            'language' => $language
        );
        if ($detected_type !== null) {
            $nearby_query['type'] = $detected_type;
        } else {
            $nearby_query['keyword'] = $input;
        }
        $nearby_search = Wo_ApiMapDiscoveryGoogleGet('place/nearbysearch/json', $nearby_query, $google_timeout_ms, $google_connect_timeout_ms);
        if (empty($nearby_search['errors']) && (($nearby_search['status'] ?? '') === 'OK' || ($nearby_search['status'] ?? '') === 'ZERO_RESULTS')) {
            $places_results = !empty($nearby_search['results']) ? $nearby_search['results'] : array();
            $next_page_token = !empty($nearby_search['next_page_token']) ? $nearby_search['next_page_token'] : '';
            $page_fetch_count = 0;
            while (!$fast && $next_page_token !== '' && $page_fetch_count < 2) {
                $page_fetch_count++;
                usleep(1700000);
                $nearby_page = Wo_ApiMapDiscoveryGoogleGet('place/nearbysearch/json', array(
                    'pagetoken' => $next_page_token,
                    'language' => $language
                ), $google_timeout_ms, $google_connect_timeout_ms);
                if (!empty($nearby_page['errors']) || (($nearby_page['status'] ?? '') !== 'OK' && ($nearby_page['status'] ?? '') !== 'ZERO_RESULTS')) {
                    break;
                }
                Wo_ApiMapDiscoveryMergeGooglePlaceResults($places_results, !empty($nearby_page['results']) ? $nearby_page['results'] : array());
                $next_page_token = !empty($nearby_page['next_page_token']) ? $nearby_page['next_page_token'] : '';
            }
        }
    }

    // 2. Fallback / Merge with Text Search for wider coverage (gets places like "quán ăn" matching textually)
    $should_run_text_search =
        $global_search ||
        ($fast && !$prefer_address && $detected_type !== null && count($places_results) === 0) ||
        (!$fast && !$prefer_address && ($detected_type === null || count($places_results) < 8));
    if ($should_run_text_search) {
        $text_search_query = array(
            'query' => $global_search ? $input : ((!$prefer_address && $detected_type !== null) ? $detected_type : $input),
            'language' => $language,
            'region' => $country
        );
        if ($origin_lat !== null && $origin_lng !== null) {
            $text_search_query['location'] = number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', '');
            $text_search_query['radius'] = $radius;
        }
        $text_search = Wo_ApiMapDiscoveryGoogleGet('place/textsearch/json', $text_search_query, $google_timeout_ms, $google_connect_timeout_ms);
        if (empty($text_search['errors']) && (($text_search['status'] ?? '') === 'OK' || ($text_search['status'] ?? '') === 'ZERO_RESULTS')) {
            Wo_ApiMapDiscoveryMergeGooglePlaceResults($places_results, !empty($text_search['results']) ? $text_search['results'] : array());
        }
    }

    foreach ($places_results as $result) {
        $loc = !empty($result['geometry']['location']) ? $result['geometry']['location'] : array();
        $vicinity = !empty($result['vicinity']) ? $result['vicinity'] : (!empty($result['formatted_address']) ? $result['formatted_address'] : '');
        $photo_references = array();
        if (!empty($result['photos']) && is_array($result['photos'])) {
            foreach (array_slice($result['photos'], 0, 3) as $photo) {
                if (!empty($photo['photo_reference'])) {
                    $photo_references[] = $photo['photo_reference'];
                }
            }
        }
        Wo_ApiMapDiscoveryAddPrediction(
            $predictions,
            $seen_place_ids,
            !empty($result['place_id']) ? $result['place_id'] : '',
            $vicinity !== '' ? $vicinity : (!empty($result['name']) ? $result['name'] : ''),
            !empty($result['name']) ? $result['name'] : $vicinity,
            $vicinity,
            !empty($result['types']) && is_array($result['types']) ? $result['types'] : array(),
            isset($loc['lat']) ? (float)$loc['lat'] : null,
            isset($loc['lng']) ? (float)$loc['lng'] : null,
            !empty($result['icon']) ? $result['icon'] : null,
            !empty($result['icon_background_color']) ? $result['icon_background_color'] : null,
            isset($result['rating']) ? $result['rating'] : null,
            isset($result['user_ratings_total']) ? $result['user_ratings_total'] : null,
            !empty($result['opening_hours']) && is_array($result['opening_hours']) && isset($result['opening_hours']['open_now'])
                ? (bool) $result['opening_hours']['open_now']
                : null,
            $photo_references
        );
    }

    // 3. Autocomplete is useful for named places, but generic categories should stay type-based.
    if (
        (!$prefer_address || $global_search) &&
        (
            ($global_search && count($places_results) === 0 && count($predictions) === 0) ||
            (!$global_search && !$fast && $detected_type === null) ||
            (!$global_search && $fast && ($detected_type === null || $origin_lat === null || $origin_lng === null))
        )
    ) {
        $query = array(
            'input' => $input,
            'language' => $language,
            'components' => 'country:' . $country
        );
        if ($global_search && Wo_ApiMapDiscoveryIsAddressQuery($input)) {
            $query['types'] = 'address';
        }
        if ($origin_lat !== null && $origin_lng !== null) {
            $query['location'] = number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', '');
            $query['radius'] = $radius;
        }
        $google = Wo_ApiMapDiscoveryGoogleGet('place/autocomplete/json', $query, $google_timeout_ms, $google_connect_timeout_ms);
        if (empty($google['errors']) && (($google['status'] ?? '') === 'OK' || ($google['status'] ?? '') === 'ZERO_RESULTS')) {
            foreach (($google['predictions'] ?? array()) as $prediction) {
                $formatting = !empty($prediction['structured_formatting']) && is_array($prediction['structured_formatting']) ? $prediction['structured_formatting'] : array();
                Wo_ApiMapDiscoveryAddPrediction(
                    $predictions,
                    $seen_place_ids,
                    !empty($prediction['place_id']) ? $prediction['place_id'] : '',
                    !empty($prediction['description']) ? $prediction['description'] : '',
                    !empty($formatting['main_text']) ? $formatting['main_text'] : (!empty($prediction['description']) ? $prediction['description'] : ''),
                    !empty($formatting['secondary_text']) ? $formatting['secondary_text'] : '',
                    !empty($prediction['types']) && is_array($prediction['types']) ? $prediction['types'] : array()
                );
            }
        }
    }

    if ($origin_lat !== null && $origin_lng !== null) {
        foreach ($predictions as $prediction_index => $prediction) {
            if (isset($prediction['lat']) && isset($prediction['lng']) && is_numeric($prediction['lat']) && is_numeric($prediction['lng'])) {
                $predictions[$prediction_index]['distance_meters'] = Wo_ApiMapDiscoveryDistanceMeters($origin_lat, $origin_lng, $prediction['lat'], $prediction['lng']);
            }
        }

        if (!$global_search) {
            usort($predictions, function($left, $right) {
                $left_distance = isset($left['distance_meters']) && is_numeric($left['distance_meters']) ? (float) $left['distance_meters'] : PHP_FLOAT_MAX;
                $right_distance = isset($right['distance_meters']) && is_numeric($right['distance_meters']) ? (float) $right['distance_meters'] : PHP_FLOAT_MAX;
                if ($left_distance == $right_distance) {
                    return strnatcasecmp((string) ($left['main_text'] ?? ''), (string) ($right['main_text'] ?? ''));
                }
                return ($left_distance < $right_distance) ? -1 : 1;
            });
        }
    }

    return array(
        'api_status' => 200,
        'predictions' => array_slice($predictions, 0, 35),
        'debug_nearby_status' => $nearby_search['status'] ?? 'NOT_CALLED',
        'debug_nearby_error' => $nearby_search['error_message'] ?? '',
        'debug_detected_type' => $detected_type,
        'debug_nearby_count' => count($places_results),
        'debug_autocomplete_status' => $google['status'] ?? 'NOT_CALLED',
        'debug_autocomplete_error' => $google['error_message'] ?? '',
        'debug_geocode_status' => $geocode_search['status'] ?? 'NOT_CALLED',
        'debug_geocode_error' => $geocode_search['error_message'] ?? '',
        'debug_global_search' => $global_search ? 1 : 0
    );
}

function Wo_ApiMapDiscoveryAddressAutocomplete() {
    $input = Wo_ApiMapDiscoveryAddressQuery();
    if ($input === '') {
        return Wo_ApiMapDiscoveryError('query_invalid', 'query must be between 2 and 160 characters.');
    }

    $query = array(
        'input' => $input,
        'types' => 'geocode',
        'components' => 'country:vn',
        'language' => Wo_ApiMapDiscoveryLanguage()
    );
    $session_token = Wo_ApiMapDiscoveryAddressSessionToken();
    if ($session_token !== '') {
        $query['sessiontoken'] = $session_token;
    }
    $query = array_merge($query, Wo_ApiMapDiscoveryAddressBiasQuery());

    $google = Wo_ApiMapDiscoveryGoogleGet('place/autocomplete/json', $query);
    $google_error = Wo_ApiMapDiscoveryAddressGoogleError($google, true);
    if (!empty($google_error)) {
        return $google_error;
    }

    $predictions = array();
    if (($google['status'] ?? '') === 'OK' && !empty($google['predictions']) && is_array($google['predictions'])) {
        $seen_place_ids = array();
        foreach ($google['predictions'] as $prediction) {
            $formatting = !empty($prediction['structured_formatting']) && is_array($prediction['structured_formatting']) ? $prediction['structured_formatting'] : array();
            Wo_ApiMapDiscoveryAddPrediction(
                $predictions,
                $seen_place_ids,
                !empty($prediction['place_id']) ? $prediction['place_id'] : '',
                !empty($prediction['description']) ? $prediction['description'] : '',
                !empty($formatting['main_text']) ? $formatting['main_text'] : (!empty($prediction['description']) ? $prediction['description'] : ''),
                !empty($formatting['secondary_text']) ? $formatting['secondary_text'] : '',
                !empty($prediction['types']) && is_array($prediction['types']) ? array_values($prediction['types']) : array()
            );
        }
    }

    if (!empty($predictions)) {
        return array(
            'api_status' => 200,
            'predictions' => array_slice($predictions, 0, 10)
        );
    }

    $geocode = Wo_ApiMapDiscoveryGoogleGet('geocode/json', array(
        'address' => $input,
        'components' => 'country:vn',
        'language' => Wo_ApiMapDiscoveryLanguage(),
        'region' => 'vn'
    ));
    if (!empty($geocode['errors'])) {
        return Wo_ApiMapDiscoveryAddressGoogleError($geocode, true);
    }
    if (($geocode['status'] ?? '') !== 'OK' || empty($geocode['results']) || !is_array($geocode['results'])) {
        $geocode_error = Wo_ApiMapDiscoveryAddressGoogleError($geocode, true);
        if (!empty($geocode_error) && !empty($geocode_error['errors']['error_id']) && $geocode_error['errors']['error_id'] !== 'address_not_found') {
            return $geocode_error;
        }
        return array('api_status' => 200, 'predictions' => array());
    }

    foreach ($geocode['results'] as $result) {
        $prediction = Wo_ApiMapDiscoveryAddressPredictionFromGeocodeResult($result);
        if (!empty($prediction)) {
            $predictions[] = $prediction;
        }
    }

    return array(
        'api_status' => 200,
        'predictions' => array_slice($predictions, 0, 10)
    );
}

function Wo_ApiMapDiscoveryAddressGeocode() {
    $input = Wo_ApiMapDiscoveryAddressQuery();
    if ($input === '') {
        return Wo_ApiMapDiscoveryError('query_invalid', 'query must be between 2 and 160 characters.');
    }

    // Stable address errors: address_not_found, google_request_denied.
    $google = Wo_ApiMapDiscoveryGoogleGet('geocode/json', array(
        'address' => $input,
        'components' => 'country:vn',
        'language' => Wo_ApiMapDiscoveryLanguage(),
        'region' => 'vn'
    ));
    $google_error = Wo_ApiMapDiscoveryAddressGoogleError($google, false);
    if (!empty($google_error)) {
        return $google_error;
    }

    return array(
        'api_status' => 200,
        'address' => Wo_ApiMapDiscoveryAddressPayloadFromGeocodeResult($google['results'][0])
    );
}

function Wo_ApiMapDiscoveryAddressDetails() {
    $place_id = !empty($_POST['place_id']) ? trim((string) $_POST['place_id']) : '';
    if ($place_id === '') {
        return Wo_ApiMapDiscoveryError('place_id_missing', 'place_id can not be empty.');
    }

    $query = array(
        'place_id' => $place_id,
        'fields' => 'place_id,formatted_address,geometry,address_components',
        'language' => Wo_ApiMapDiscoveryLanguage(),
        'region' => 'vn'
    );
    $session_token = Wo_ApiMapDiscoveryAddressSessionToken();
    if ($session_token !== '') {
        $query['sessiontoken'] = $session_token;
    }
    $google = Wo_ApiMapDiscoveryGoogleGet('place/details/json', $query);
    $google_error = Wo_ApiMapDiscoveryAddressGoogleError($google, false);
    if (!empty($google_error)) {
        return $google_error;
    }
    if (empty($google['result']) || !is_array($google['result'])) {
        return Wo_ApiMapDiscoveryAddressError('address_not_found', 404);
    }

    return array(
        'api_status' => 200,
        'address' => Wo_ApiMapDiscoveryAddressPayloadFromGeocodeResult($google['result'], $place_id)
    );
}

function Wo_ApiMapDiscoveryPlaceDetails() {
    $place_id = !empty($_POST['place_id']) ? trim($_POST['place_id']) : '';
    if ($place_id === '') {
        return Wo_ApiMapDiscoveryError('place_id_missing', 'place_id can not be empty.');
    }

    $google = Wo_ApiMapDiscoveryGoogleGet('place/details/json', array(
        'place_id' => $place_id,
        'language' => 'vi',
        'fields' => 'place_id,name,formatted_address,geometry,url,icon,icon_background_color,types,rating,user_ratings_total,opening_hours,photos,reviews,editorial_summary,formatted_phone_number,international_phone_number,website,business_status,price_level'
    ));
    if (!empty($google['errors'])) {
        return $google;
    }
    if (($google['status'] ?? '') !== 'OK' || empty($google['result'])) {
        return Wo_ApiMapDiscoveryError('place_not_found', 'Google place not found.', 404);
    }

    $result = $google['result'];
    $location = $result['geometry']['location'] ?? array();
    $photo_references = array();
    if (!empty($result['photos']) && is_array($result['photos'])) {
        foreach (array_slice($result['photos'], 0, 6) as $photo) {
            if (!empty($photo['photo_reference'])) {
                $photo_references[] = $photo['photo_reference'];
            }
        }
    }
    $reviews = array();
    if (!empty($result['reviews']) && is_array($result['reviews'])) {
        foreach (array_slice($result['reviews'], 0, 5) as $review) {
            $reviews[] = array(
                'author_name' => !empty($review['author_name']) ? $review['author_name'] : 'Người dùng Google',
                'rating' => isset($review['rating']) ? (float) $review['rating'] : null,
                'relative_time_description' => !empty($review['relative_time_description']) ? $review['relative_time_description'] : '',
                'text' => !empty($review['text']) ? $review['text'] : '',
                'time' => isset($review['time']) ? (int) $review['time'] : null
            );
        }
    }
    return array(
        'api_status' => 200,
        'place' => array(
            'source' => 'google',
            'place_id' => !empty($result['place_id']) ? $result['place_id'] : $place_id,
            'name' => !empty($result['name']) ? $result['name'] : '',
            'address' => !empty($result['formatted_address']) ? $result['formatted_address'] : '',
            'url' => !empty($result['url']) ? $result['url'] : '',
            'lat' => isset($location['lat']) ? (float) $location['lat'] : null,
            'lng' => isset($location['lng']) ? (float) $location['lng'] : null,
            'icon' => !empty($result['icon']) ? $result['icon'] : '',
            'icon_background_color' => !empty($result['icon_background_color']) ? $result['icon_background_color'] : '',
            'types' => !empty($result['types']) && is_array($result['types']) ? array_values($result['types']) : array(),
            'rating' => isset($result['rating']) ? (float) $result['rating'] : null,
            'user_ratings_total' => isset($result['user_ratings_total']) ? (int) $result['user_ratings_total'] : null,
            'open_now' => isset($result['opening_hours']['open_now']) ? (bool) $result['opening_hours']['open_now'] : null,
            'photo_references' => $photo_references,
            'reviews' => $reviews,
            'editorial_summary' => array(
                'overview' => !empty($result['editorial_summary']['overview']) ? $result['editorial_summary']['overview'] : ''
            ),
            'formatted_phone_number' => !empty($result['formatted_phone_number']) ? $result['formatted_phone_number'] : '',
            'international_phone_number' => !empty($result['international_phone_number']) ? $result['international_phone_number'] : '',
            'website' => !empty($result['website']) ? $result['website'] : '',
            'weekday_text' => !empty($result['opening_hours']['weekday_text']) && is_array($result['opening_hours']['weekday_text']) ? array_values($result['opening_hours']['weekday_text']) : array(),
            'business_status' => !empty($result['business_status']) ? $result['business_status'] : '',
            'price_level' => isset($result['price_level']) ? (int) $result['price_level'] : null
        )
    );
}

function Wo_ApiMapDiscoveryReverseGeocode() {
    $latitude = Wo_ApiMapDiscoveryNumber('lat');
    $longitude = Wo_ApiMapDiscoveryNumber('lng');
    if ($latitude === null || $longitude === null || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
        return Wo_ApiMapDiscoveryError('coordinates_missing', 'Valid latitude and longitude are required.');
    }

    $language = Wo_ApiMapDiscoveryLanguage();
    $country = Wo_ApiMapDiscoveryCountry();
    $google = Wo_ApiMapDiscoveryGoogleGet('geocode/json', array(
        'latlng' => number_format($latitude, 7, '.', '') . ',' . number_format($longitude, 7, '.', ''),
        'language' => $language,
        'region' => $country
    ));
    if (!empty($google['errors'])) {
        return $google;
    }
    if (($google['status'] ?? '') !== 'OK' || empty($google['results'][0])) {
        return Wo_ApiMapDiscoveryError('address_not_found', 'Google Maps could not find an address for this location.', 404);
    }

    $result = $google['results'][0];
    $location = !empty($result['geometry']['location']) && is_array($result['geometry']['location'])
        ? $result['geometry']['location']
        : array();
    $place_id = !empty($result['place_id']) ? $result['place_id'] : '';
    $address = !empty($result['formatted_address']) ? $result['formatted_address'] : '';

    return array(
        'api_status' => 200,
        'place' => array(
            'source' => 'google',
            'place_id' => $place_id,
            'name' => $address,
            'address' => $address,
            'lat' => isset($location['lat']) ? (float) $location['lat'] : (float) $latitude,
            'lng' => isset($location['lng']) ? (float) $location['lng'] : (float) $longitude,
            'types' => !empty($result['types']) && is_array($result['types']) ? $result['types'] : array()
        )
    );
}

function Wo_ApiMapDiscoveryDecodePolyline($encoded_path) {
    $points = array();
    $index = 0;
    $lat = 0;
    $lng = 0;
    $path_length = strlen((string) $encoded_path);

    while ($index < $path_length) {
        $shift = 0;
        $result = 0;
        do {
            if ($index >= $path_length) {
                break 2;
            }
            $byte = ord($encoded_path[$index]) - 63;
            $index++;
            $result |= (($byte & 0x1f) << $shift);
            $shift += 5;
        } while ($byte >= 0x20);
        $lat += ($result & 1) ? ~(int) ($result >> 1) : (int) ($result >> 1);

        $shift = 0;
        $result = 0;
        do {
            if ($index >= $path_length) {
                break 2;
            }
            $byte = ord($encoded_path[$index]) - 63;
            $index++;
            $result |= (($byte & 0x1f) << $shift);
            $shift += 5;
        } while ($byte >= 0x20);
        $lng += ($result & 1) ? ~(int) ($result >> 1) : (int) ($result >> 1);

        $points[] = array(
            'lat' => $lat / 1e5,
            'lng' => $lng / 1e5
        );
    }

    return $points;
}

function Wo_ApiMapDiscoveryRouteSteps($leg) {
    $steps = array();
    if (empty($leg['steps']) || !is_array($leg['steps'])) {
        return $steps;
    }

    foreach ($leg['steps'] as $step) {
        $instruction = '';
        if (!empty($step['html_instructions'])) {
            $instruction = html_entity_decode(strip_tags($step['html_instructions']), ENT_QUOTES, 'UTF-8');
            $instruction = trim(preg_replace('/\s+/', ' ', $instruction));
        }

        $steps[] = array(
            'instruction' => $instruction,
            'maneuver' => !empty($step['maneuver']) ? $step['maneuver'] : '',
            'path' => Wo_ApiMapDiscoveryDecodePolyline(!empty($step['polyline']['points']) ? $step['polyline']['points'] : ''),
            'distanceMeters' => !empty($step['distance']['value']) ? (float) $step['distance']['value'] : 0,
            'durationSeconds' => !empty($step['duration']['value']) ? (float) $step['duration']['value'] : 0,
            'startLocation' => array(
                'lat' => !empty($step['start_location']['lat']) ? (float) $step['start_location']['lat'] : 0,
                'lng' => !empty($step['start_location']['lng']) ? (float) $step['start_location']['lng'] : 0
            ),
            'endLocation' => array(
                'lat' => !empty($step['end_location']['lat']) ? (float) $step['end_location']['lat'] : 0,
                'lng' => !empty($step['end_location']['lng']) ? (float) $step['end_location']['lng'] : 0
            )
        );
    }

    return $steps;
}

function Wo_ApiMapDiscoveryRoute() {
    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    $destination_lat = Wo_ApiMapDiscoveryNumber('destination_lat');
    $destination_lng = Wo_ApiMapDiscoveryNumber('destination_lng');
    $mode = Wo_ApiMapDiscoveryRouteMode();
    $google_mode = Wo_ApiMapDiscoveryGoogleRouteMode($mode);
    if ($origin_lat === null || $origin_lng === null || $destination_lat === null || $destination_lng === null) {
        return Wo_ApiMapDiscoveryError('coordinates_missing', 'Route coordinates are required.');
    }

    $route_query = array(
        'origin' => number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', ''),
        'destination' => number_format($destination_lat, 6, '.', '') . ',' . number_format($destination_lng, 6, '.', ''),
        'mode' => $google_mode,
        'language' => 'vi',
        'region' => 'vn',
        'units' => 'metric',
        'alternatives' => 'true'
    );
    if ($google_mode === 'driving') {
        $route_query['departure_time'] = 'now';
        $route_query['traffic_model'] = 'best_guess';
    }

    $google = Wo_ApiMapDiscoveryGoogleGet('directions/json', $route_query);
    if (!empty($google['errors'])) {
        return $google;
    }
    if (($google['status'] ?? '') !== 'OK' || empty($google['routes'][0]['legs'][0])) {
        return Wo_ApiMapDiscoveryError('route_not_found', 'Google route not found.', 404);
    }

    $routes = array();
    foreach ($google['routes'] as $route_index => $candidate_route) {
        if (empty($candidate_route['legs'][0])) {
            continue;
        }
        $candidate_leg = $candidate_route['legs'][0];
        $duration_seconds = !empty($candidate_leg['duration']['value']) ? (float) $candidate_leg['duration']['value'] : 0;
        $duration_in_traffic_seconds = !empty($candidate_leg['duration_in_traffic']['value']) ? (float) $candidate_leg['duration_in_traffic']['value'] : null;
        $traffic_info = Wo_ApiMapDiscoveryTrafficInfo($mode, $duration_seconds, $duration_in_traffic_seconds);
        $effective_duration_seconds = !empty($traffic_info['durationSeconds']) ? $traffic_info['durationSeconds'] : $duration_seconds;
        $route_payload = array(
            'id' => 'route-' . ($route_index + 1),
            'summary' => !empty($candidate_route['summary']) ? $candidate_route['summary'] : '',
            'path' => Wo_ApiMapDiscoveryDecodePolyline(!empty($candidate_route['overview_polyline']['points']) ? $candidate_route['overview_polyline']['points'] : ''),
            'steps' => Wo_ApiMapDiscoveryRouteSteps($candidate_leg),
            'distanceMeters' => !empty($candidate_leg['distance']['value']) ? (float) $candidate_leg['distance']['value'] : 0,
            'durationSeconds' => $effective_duration_seconds,
            'mode' => $mode,
            'provider' => 'google'
        );
        if (!empty($traffic_info)) {
            $route_payload = array_merge($route_payload, $traffic_info);
        }
        $routes[] = $route_payload;
    }

    if (empty($routes)) {
        return Wo_ApiMapDiscoveryError('route_not_found', 'Google route not found.', 404);
    }

    usort($routes, function ($left, $right) {
        return ($left['durationSeconds'] <=> $right['durationSeconds']);
    });

    return array(
        'api_status' => 200,
        'route' => $routes[0],
        'routes' => $routes
    );
}

if (empty($action) || !in_array($action, $valid_actions)) {
    $response_data = Wo_ApiMapDiscoveryError('type_missing', 'type can not be empty.');
}
else if ($action == 'page_suggestions') {
    $response_data = Wo_ApiMapDiscoveryPageSuggestions();
}
else if ($action == 'place_autocomplete') {
    $response_data = Wo_ApiMapDiscoveryAutocomplete();
}
else if ($action == 'address_autocomplete') {
    $response_data = Wo_ApiMapDiscoveryAddressAutocomplete();
}
else if ($action == 'address_geocode') {
    $response_data = Wo_ApiMapDiscoveryAddressGeocode();
}
else if ($action == 'address_details') {
    $response_data = Wo_ApiMapDiscoveryAddressDetails();
}
else if ($action == 'place_details') {
    $response_data = Wo_ApiMapDiscoveryPlaceDetails();
}
else if ($action == 'reverse_geocode') {
    $response_data = Wo_ApiMapDiscoveryReverseGeocode();
}
else if ($action == 'route') {
    $response_data = Wo_ApiMapDiscoveryRoute();
}
