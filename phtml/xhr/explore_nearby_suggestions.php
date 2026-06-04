<?php
// English description: Returns nearby user and page suggestions for Nuxt map search.
if ($f == 'explore_nearby_suggestions') {
	Wo_EnsurePageMapPinColumns();
	$data = array(
		'status' => 200,
		'items' => array()
	);
	$query = '';
	$limit = 4;
	$type = 'all';
	$distance = 25;
	$origin_lat = null;
	$origin_lng = null;

	if (!empty($_GET['query'])) {
		$query = trim($_GET['query']);
	}
	if (!empty($_GET['limit']) && is_numeric($_GET['limit'])) {
		$limit = (int) $_GET['limit'];
	}
	if ($limit < 1) {
		$limit = 1;
	}
	if ($limit > 80) {
		$limit = 80;
	}
	if (!empty($_GET['type']) && in_array($_GET['type'], array('all', 'user', 'page'))) {
		$type = $_GET['type'];
	}
	if (!empty($_GET['distance']) && is_numeric($_GET['distance'])) {
		$distance = (int) $_GET['distance'];
	}
	if ($distance < 1) {
		$distance = 1;
	}
	if ($distance > 1000) {
		$distance = 1000;
	}
	if (isset($_GET['origin_lat']) && isset($_GET['origin_lng']) && is_numeric($_GET['origin_lat']) && is_numeric($_GET['origin_lng'])) {
		$origin_lat = (float) $_GET['origin_lat'];
		$origin_lng = (float) $_GET['origin_lng'];
		if ($origin_lat == 0 && $origin_lng == 0) {
			$origin_lat = null;
			$origin_lng = null;
		}
	}
	$column_exists = function($table, $column) use ($sqlConnect) {
		static $cache = array();
		$key = $table . ':' . $column;
		if (isset($cache[$key])) {
			return $cache[$key];
		}
		$table = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
		$column = Wo_Secure($column);
		$query = mysqli_query($sqlConnect, "SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
		$cache[$key] = ($query && mysqli_num_rows($query) > 0);
		return $cache[$key];
	};
	$user_has_address = $column_exists(T_USERS, 'address');
	$user_has_place_id = $column_exists(T_USERS, 'place_id');
	$page_has_place_id = $column_exists(T_PAGES, 'place_id');
	$page_has_map_pin_status = $column_exists(T_PAGES, 'map_pin_status');

	$has_origin = ($origin_lat !== null && $origin_lng !== null);
	$max_distance_meters = $distance * 1000;
	$calculate_distance_meters = function($lat, $lng) use ($origin_lat, $origin_lng, $has_origin) {
		if (!$has_origin || !is_numeric($lat) || !is_numeric($lng)) {
			return null;
		}

		$lat = (float) $lat;
		$lng = (float) $lng;
		if ($lat == 0 && $lng == 0) {
			return null;
		}

		$earth_radius = 6371000;
		$lat_from = deg2rad($origin_lat);
		$lng_from = deg2rad($origin_lng);
		$lat_to = deg2rad($lat);
		$lng_to = deg2rad($lng);
		$lat_delta = $lat_to - $lat_from;
		$lng_delta = $lng_to - $lng_from;
		$angle = 2 * asin(sqrt(pow(sin($lat_delta / 2), 2) + cos($lat_from) * cos($lat_to) * pow(sin($lng_delta / 2), 2)));

		return (int) round($earth_radius * $angle);
	};
	$sort_suggestion_items = function(array $items) {
		usort($items, function($a, $b) {
			$a_distance = isset($a['distance_meters']) && is_numeric($a['distance_meters']) ? (float) $a['distance_meters'] : null;
			$b_distance = isset($b['distance_meters']) && is_numeric($b['distance_meters']) ? (float) $b['distance_meters'] : null;
			$a_has_distance = ($a_distance !== null);
			$b_has_distance = ($b_distance !== null);

			if ($a_has_distance && $b_has_distance) {
				if ($a_distance == $b_distance) {
					return strnatcasecmp((string) (!empty($a['title']) ? $a['title'] : ''), (string) (!empty($b['title']) ? $b['title'] : ''));
				}

				return ($a_distance < $b_distance) ? -1 : 1;
			}

			if ($a_has_distance) {
				return -1;
			}

			if ($b_has_distance) {
				return 1;
			}

			return strnatcasecmp((string) (!empty($a['title']) ? $a['title'] : ''), (string) (!empty($b['title']) ? $b['title'] : ''));
		});

		return $items;
	};

	$keyword = Wo_Secure($query);
	$candidate_limit = min(max($limit * 8, $limit), 100);
	$user_limit = $candidate_limit;
	$page_limit = $candidate_limit;
	$user_items = array();
	$page_items = array();
	$user_sql_where = " WHERE `active` = '1' AND `share_my_location` = '1' AND `lat` <> '' AND `lng` <> '' AND `lat` <> '0' AND `lng` <> '0'";
	$page_sql_where = " WHERE `active` = '1' AND `address` <> '' AND `lat` <> '' AND `lng` <> '' AND `lat` <> '0' AND `lng` <> '0'";

	if ($keyword !== '') {
		$user_search = array(
			"`username` LIKE '%{$keyword}%'",
			"CONCAT(`first_name`, ' ', `last_name`) LIKE '%{$keyword}%'"
		);
		if ($user_has_address) {
			$user_search[] = "`address` LIKE '%{$keyword}%'";
		}
		if ($user_has_place_id) {
			$user_search[] = "`place_id` LIKE '%{$keyword}%'";
		}
		$page_search = array(
			"`page_name` LIKE '%{$keyword}%'",
			"`page_title` LIKE '%{$keyword}%'",
			"`address` LIKE '%{$keyword}%'"
		);
		if ($page_has_place_id) {
			$page_search[] = "`place_id` LIKE '%{$keyword}%'";
		}
		$user_sql_where .= " AND (" . implode(' OR ', $user_search) . ")";
		$page_sql_where .= " AND (" . implode(' OR ', $page_search) . ")";
	}

	if ($wo['loggedin'] == true) {
		$logged_user_id = Wo_Secure($wo['user']['user_id']);
		$user_sql_where .= " AND `user_id` <> '{$logged_user_id}'";
		if ($keyword === '' && ($type === 'all' || $type === 'user')) {
			$user_sql_where .= " AND `user_id` IN (SELECT `following_id` FROM " . T_FOLLOWERS . " WHERE `follower_id` = '{$logged_user_id}' AND `following_id` <> '{$logged_user_id}' AND `active` = '1')";
		}
		$user_sql_where .= " AND `user_id` NOT IN (SELECT `blocked` FROM " . T_BLOCKS . " WHERE `blocker` = '{$logged_user_id}')";
		$user_sql_where .= " AND `user_id` NOT IN (SELECT `blocker` FROM " . T_BLOCKS . " WHERE `blocked` = '{$logged_user_id}')";
	}

	if ($type === 'all' || $type === 'user') {
		$user_order = $keyword !== '' ? "(`username` LIKE '{$keyword}%') DESC, (CONCAT(`first_name`, ' ', `last_name`) LIKE '{$keyword}%') DESC," : "";
		$user_sql = "SELECT `user_id` FROM " . T_USERS . $user_sql_where . " ORDER BY {$user_order} `user_id` DESC LIMIT {$user_limit}";
		$user_query = mysqli_query($sqlConnect, $user_sql);
		if ($user_query && mysqli_num_rows($user_query) > 0) {
		while ($fetched_user = mysqli_fetch_assoc($user_query)) {
			$user = Wo_UserData($fetched_user['user_id']);
			if (empty($user) || !is_array($user)) {
				continue;
			}

			$user_distance_meters = (!empty($user['share_my_location']) && !empty($user['lat']) && !empty($user['lng'])) ? $calculate_distance_meters($user['lat'], $user['lng']) : null;
			if ($has_origin && ($user_distance_meters === null || $user_distance_meters > $max_distance_meters)) {
				continue;
			}
			$user_items[] = array(
				'type' => 'user',
				'type_label' => (!empty($wo['lang']['user']) ? $wo['lang']['user'] : 'User'),
				'id' => (int) $user['user_id'],
				'title' => $user['name'],
				'subtitle' => (!empty($user['username']) ? '@' . $user['username'] : ''),
				'location' => (!empty($user['address']) ? $user['address'] : ''),
				'avatar' => (!empty($user['avatar']) ? $user['avatar'] : ''),
				'url' => (!empty($user['url']) ? $user['url'] : ''),
				'ajax_url' => (!empty($user['username']) ? '?link1=timeline&u=' . $user['username'] : ''),
				'lat' => (!empty($user['share_my_location']) && !empty($user['lat']) && !empty($user['lng'])) ? (float) $user['lat'] : null,
				'lng' => (!empty($user['share_my_location']) && !empty($user['lat']) && !empty($user['lng'])) ? (float) $user['lng'] : null,
				'share_my_location' => (!empty($user['share_my_location']) ? 1 : 0),
				'distance_meters' => $user_distance_meters,
				'search_value' => (!empty($user['username']) ? $user['username'] : $user['name'])
			);
		}
	}
	}

	if ($type === 'all' || $type === 'page') {
		$page_order = '';
		if ($page_has_map_pin_status) {
			$page_order .= "(`map_pin_status` = 'approved') DESC,";
		}
		if ($keyword !== '') {
			$page_order .= "(`page_name` LIKE '{$keyword}%') DESC, (`page_title` LIKE '{$keyword}%') DESC, (`address` LIKE '{$keyword}%') DESC,";
		}
		$page_sql = "SELECT `page_id` FROM " . T_PAGES . $page_sql_where . " ORDER BY {$page_order} `page_id` DESC LIMIT {$page_limit}";
		$page_query = mysqli_query($sqlConnect, $page_sql);
		if ($page_query && mysqli_num_rows($page_query) > 0) {
		while ($fetched_page = mysqli_fetch_assoc($page_query)) {
			$page = Wo_PageData($fetched_page['page_id']);
			if (empty($page) || !is_array($page)) {
				continue;
			}

			$page_distance_meters = (!empty($page['lat']) && !empty($page['lng'])) ? $calculate_distance_meters($page['lat'], $page['lng']) : null;
			$page_is_pinned = (!empty($page['map_pin_status']) && $page['map_pin_status'] === 'approved');
			if (!$page_is_pinned && $has_origin && ($page_distance_meters === null || $page_distance_meters > $max_distance_meters)) {
				continue;
			}
			$page_items[] = array(
				'type' => 'page',
				'type_label' => (!empty($wo['lang']['page']) ? $wo['lang']['page'] : 'Page'),
				'id' => (int) $page['page_id'],
				'title' => (!empty($page['page_title']) ? $page['page_title'] : $page['name']),
				'subtitle' => (!empty($page['page_name']) ? '@' . $page['page_name'] : ''),
				'description' => (!empty($page['page_description']) ? trim($page['page_description']) : ''),
				'location' => (!empty($page['address']) ? $page['address'] : ''),
				'avatar' => (!empty($page['avatar']) ? $page['avatar'] : ''),
				'url' => (!empty($page['url']) ? $page['url'] : ''),
				'ajax_url' => (!empty($page['page_name']) ? '?link1=timeline&u=' . $page['page_name'] : ''),
				'lat' => (!empty($page['lat']) && !empty($page['lng'])) ? (float) $page['lat'] : null,
				'lng' => (!empty($page['lat']) && !empty($page['lng'])) ? (float) $page['lng'] : null,
				'distance_meters' => $page_distance_meters,
				'pinned' => $page_is_pinned ? 1 : 0,
				'map_pin_status' => (!empty($page['map_pin_status']) ? $page['map_pin_status'] : 'none'),
				'address' => (!empty($page['address']) ? $page['address'] : ''),
				'search_value' => (!empty($page['page_title']) ? $page['page_title'] : $page['page_name'])
			);
		}
	}
	}

	$user_items = $sort_suggestion_items($user_items);
	$page_items = $sort_suggestion_items($page_items);
	$data['items'] = array_slice($sort_suggestion_items(array_merge($user_items, $page_items)), 0, $limit);

	header("Content-type: application/json");
	echo json_encode($data);
	exit();
}
	