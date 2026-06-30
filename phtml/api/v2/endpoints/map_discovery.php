<?php
// English description: Bridges authenticated mobile map discovery, Google Places, and directions requests.

$response_data = array(
    'api_status' => 400
);

$action = !empty($_POST['type']) ? Wo_Secure($_POST['type']) : '';
$valid_actions = array('page_suggestions', 'place_autocomplete', 'place_details', 'route');

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

function Wo_ApiMapDiscoveryRouteMode() {
    $mode = !empty($_POST['mode']) ? strtolower(Wo_Secure($_POST['mode'])) : 'walking';
    $allowed_modes = array('walking', 'driving', 'bicycling', 'transit');
    return in_array($mode, $allowed_modes) ? $mode : 'walking';
}

function Wo_ApiMapDiscoveryGoogleKey() {
    global $wo;
    if (!empty($wo['config']['google_server_map_api'])) {
        return trim($wo['config']['google_server_map_api']);
    }
    return !empty($wo['config']['google_map_api']) ? trim($wo['config']['google_map_api']) : '';
}

function Wo_ApiMapDiscoveryGoogleGet($path, array $query) {
    $google_key = Wo_ApiMapDiscoveryGoogleKey();
    if ($google_key === '') {
        return Wo_ApiMapDiscoveryError('google_not_configured', 'Google Maps API key is not configured.', 500);
    }

    $query['key'] = $google_key;
    $url = 'https://maps.googleapis.com/maps/api/' . $path . '?' . http_build_query($query);
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($curl, CURLOPT_TIMEOUT, 20);
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

    if (function_exists('Wo_EnsurePageMapPinColumns')) {
        Wo_EnsurePageMapPinColumns();
    }

    $query = !empty($_POST['query']) ? trim($_POST['query']) : '';
    $keyword = Wo_Secure($query);
    $limit = !empty($_POST['limit']) && is_numeric($_POST['limit']) ? (int) $_POST['limit'] : 20;
    $limit = max(1, min($limit, 80));
    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    $has_origin = ($origin_lat !== null && $origin_lng !== null && !($origin_lat == 0 && $origin_lng == 0));
    $candidate_limit = min(max($limit * 6, $limit), 160);

    $where = " WHERE `active` = '1' AND `address` <> '' AND `lat` <> '' AND `lng` <> '' AND `lat` <> '0' AND `lng` <> '0'";
    if ($keyword !== '') {
        $where .= " AND (`page_name` LIKE '%{$keyword}%' OR `page_title` LIKE '%{$keyword}%' OR `address` LIKE '%{$keyword}%')";
    }

    $order = $keyword !== '' ? "(`page_name` LIKE '{$keyword}%') DESC, (`page_title` LIKE '{$keyword}%') DESC, (`address` LIKE '{$keyword}%') DESC," : '';
    $sql = "SELECT `page_id` FROM " . T_PAGES . $where . " ORDER BY {$order} `page_id` DESC LIMIT {$candidate_limit}";
    $query_result = mysqli_query($sqlConnect, $sql);
    $items = array();

    if ($query_result && mysqli_num_rows($query_result) > 0) {
        while ($row = mysqli_fetch_assoc($query_result)) {
            $page = Wo_PageData($row['page_id']);
            if (empty($page) || empty($page['lat']) || empty($page['lng'])) {
                continue;
            }

            $distance_meters = $has_origin ? Wo_ApiMapDiscoveryDistanceMeters($origin_lat, $origin_lng, $page['lat'], $page['lng']) : null;
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
                'url' => !empty($page['url']) ? $page['url'] : '',
                'place_id' => !empty($page['place_id']) ? $page['place_id'] : '',
                'lat' => (float) $page['lat'],
                'lng' => (float) $page['lng'],
                'distance_meters' => $distance_meters,
                'within_1km' => ($distance_meters !== null && $distance_meters <= 1000) ? 1 : 0
            );
        }
    }

    usort($items, function($a, $b) {
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

    return array(
        'api_status' => 200,
        'items' => array_slice($items, 0, $limit)
    );
}

function Wo_ApiMapDiscoveryAddPrediction(&$predictions, &$seen_place_ids, $place_id, $description, $main_text, $secondary_text) {
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
    $predictions[] = array(
        'source' => 'google',
        'place_id' => $place_id,
        'description' => $description,
        'main_text' => $main_text !== '' ? $main_text : $description,
        'secondary_text' => $secondary_text
    );
}

function Wo_ApiMapDiscoveryAutocomplete() {
    $input = !empty($_POST['query']) ? trim($_POST['query']) : (!empty($_POST['input']) ? trim($_POST['input']) : '');
    if (mb_strlen($input, 'UTF-8') < 3) {
        return array('api_status' => 200, 'predictions' => array());
    }

    $query = array(
        'input' => $input,
        'language' => 'vi',
        'components' => 'country:vn'
    );
    $origin_lat = Wo_ApiMapDiscoveryNumber('origin_lat');
    $origin_lng = Wo_ApiMapDiscoveryNumber('origin_lng');
    if ($origin_lat !== null && $origin_lng !== null) {
        $query['location'] = number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', '');
        $query['radius'] = 1000;
    }

    $google = Wo_ApiMapDiscoveryGoogleGet('place/autocomplete/json', $query);
    if (!empty($google['errors'])) {
        return $google;
    }
    if (($google['status'] ?? '') !== 'OK' && ($google['status'] ?? '') !== 'ZERO_RESULTS') {
        $provider_status = !empty($google['status']) ? trim((string) $google['status']) : 'UNKNOWN_ERROR';
        $provider_message = !empty($google['error_message']) ? trim((string) $google['error_message']) : '';
        return Wo_ApiMapDiscoveryError('google_places_error', 'Google Places ' . $provider_status . ($provider_message !== '' ? ': ' . $provider_message : '.'), 502);
    }

    $predictions = array();
    $seen_place_ids = array();
    foreach (($google['predictions'] ?? array()) as $prediction) {
        $formatting = !empty($prediction['structured_formatting']) && is_array($prediction['structured_formatting']) ? $prediction['structured_formatting'] : array();
        Wo_ApiMapDiscoveryAddPrediction(
            $predictions,
            $seen_place_ids,
            !empty($prediction['place_id']) ? $prediction['place_id'] : '',
            !empty($prediction['description']) ? $prediction['description'] : '',
            !empty($formatting['main_text']) ? $formatting['main_text'] : (!empty($prediction['description']) ? $prediction['description'] : ''),
            !empty($formatting['secondary_text']) ? $formatting['secondary_text'] : ''
        );
    }

    if (count($predictions) < 5) {
        $text_search_query = array(
            'query' => $input,
            'language' => 'vi',
            'region' => 'vn'
        );
        if ($origin_lat !== null && $origin_lng !== null) {
            $text_search_query['location'] = number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', '');
            $text_search_query['radius'] = 1000;
        }
        $text_search = Wo_ApiMapDiscoveryGoogleGet('place/textsearch/json', $text_search_query);
        if (empty($text_search['errors']) && (($text_search['status'] ?? '') === 'OK' || ($text_search['status'] ?? '') === 'ZERO_RESULTS')) {
            foreach (($text_search['results'] ?? array()) as $result) {
                Wo_ApiMapDiscoveryAddPrediction(
                    $predictions,
                    $seen_place_ids,
                    !empty($result['place_id']) ? $result['place_id'] : '',
                    !empty($result['formatted_address']) ? $result['formatted_address'] : (!empty($result['name']) ? $result['name'] : ''),
                    !empty($result['name']) ? $result['name'] : (!empty($result['formatted_address']) ? $result['formatted_address'] : ''),
                    !empty($result['formatted_address']) ? $result['formatted_address'] : ''
                );
                if (count($predictions) >= 8) {
                    break;
                }
            }
        }
    }

    return array(
        'api_status' => 200,
        'predictions' => array_slice($predictions, 0, 8)
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
        'fields' => 'place_id,name,formatted_address,geometry,url'
    ));
    if (!empty($google['errors'])) {
        return $google;
    }
    if (($google['status'] ?? '') !== 'OK' || empty($google['result'])) {
        return Wo_ApiMapDiscoveryError('place_not_found', 'Google place not found.', 404);
    }

    $result = $google['result'];
    $location = $result['geometry']['location'] ?? array();
    return array(
        'api_status' => 200,
        'place' => array(
            'source' => 'google',
            'place_id' => !empty($result['place_id']) ? $result['place_id'] : $place_id,
            'name' => !empty($result['name']) ? $result['name'] : '',
            'address' => !empty($result['formatted_address']) ? $result['formatted_address'] : '',
            'url' => !empty($result['url']) ? $result['url'] : '',
            'lat' => isset($location['lat']) ? (float) $location['lat'] : null,
            'lng' => isset($location['lng']) ? (float) $location['lng'] : null
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
    if ($origin_lat === null || $origin_lng === null || $destination_lat === null || $destination_lng === null) {
        return Wo_ApiMapDiscoveryError('coordinates_missing', 'Route coordinates are required.');
    }

    $google = Wo_ApiMapDiscoveryGoogleGet('directions/json', array(
        'origin' => number_format($origin_lat, 6, '.', '') . ',' . number_format($origin_lng, 6, '.', ''),
        'destination' => number_format($destination_lat, 6, '.', '') . ',' . number_format($destination_lng, 6, '.', ''),
        'mode' => $mode,
        'language' => 'vi',
        'region' => 'vn',
        'units' => 'metric',
        'alternatives' => 'true'
    ));
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
        $routes[] = array(
            'id' => 'route-' . ($route_index + 1),
            'summary' => !empty($candidate_route['summary']) ? $candidate_route['summary'] : '',
            'path' => Wo_ApiMapDiscoveryDecodePolyline(!empty($candidate_route['overview_polyline']['points']) ? $candidate_route['overview_polyline']['points'] : ''),
            'steps' => Wo_ApiMapDiscoveryRouteSteps($candidate_leg),
            'distanceMeters' => !empty($candidate_leg['distance']['value']) ? (float) $candidate_leg['distance']['value'] : 0,
            'durationSeconds' => !empty($candidate_leg['duration']['value']) ? (float) $candidate_leg['duration']['value'] : 0,
            'mode' => $mode,
            'provider' => 'google'
        );
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
else if ($action == 'place_details') {
    $response_data = Wo_ApiMapDiscoveryPlaceDetails();
}
else if ($action == 'route') {
    $response_data = Wo_ApiMapDiscoveryRoute();
}
