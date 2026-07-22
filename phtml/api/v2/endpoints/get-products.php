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
$products = array();

$options['limit'] = (!empty($_POST['limit'])) ? (int) $_POST['limit'] : 35;
$options['user_id'] = (!empty($_POST['user_id'])) ? (int) $_POST['user_id'] : 0;
$options['after_id'] = (!empty($_POST['offset'])) ? (int) $_POST['offset'] : 0;
$options['c_id'] = (!empty($_POST['category_id'])) ? (int) $_POST['category_id'] : 0;
$options['sub_id'] = (!empty($_POST['sub_id'])) ? (int) $_POST['sub_id'] : 0;
$search_keyword = (!empty($_POST['keyword'])) ? trim($_POST['keyword']) : '';
$options['keyword'] = $search_keyword;
$options['product_id'] = (!empty($_POST['product_id']) && is_numeric($_POST['product_id'])) ? (int) $_POST['product_id'] : 0;
if ($options['product_id'] > 0) {
    $options['limit'] = 1;
}
$requested_distance = (!empty($_POST['distance']) && is_numeric($_POST['distance'])) ? (float) $_POST['distance'] : 0;
$request_lat = (isset($_POST['lat']) && $_POST['lat'] !== '' && is_numeric($_POST['lat'])) ? (float) $_POST['lat'] : null;
$request_lng = (isset($_POST['lng']) && $_POST['lng'] !== '' && is_numeric($_POST['lng'])) ? (float) $_POST['lng'] : null;
$has_request_origin = (
    $request_lat !== null
    && $request_lng !== null
    && $request_lat >= -90
    && $request_lat <= 90
    && $request_lng >= -180
    && $request_lng <= 180
    && !($request_lat == 0 && $request_lng == 0)
);
$profile_lat = (!empty($wo['user']['lat']) && is_numeric($wo['user']['lat'])) ? (float) $wo['user']['lat'] : null;
$profile_lng = (!empty($wo['user']['lng']) && is_numeric($wo['user']['lng'])) ? (float) $wo['user']['lng'] : null;
$filter_lat = $has_request_origin ? $request_lat : $profile_lat;
$filter_lng = $has_request_origin ? $request_lng : $profile_lng;
$can_filter_distance = (
    $requested_distance > 0
    && !empty($wo['loggedin'])
    && $filter_lat !== null
    && $filter_lng !== null
);
$options['length'] = $can_filter_distance ? $requested_distance : '';
$options['order_by'] = (!empty($_POST['order_by']) && in_array($_POST['order_by'], array('price_low', 'price_high'))) ? $_POST['order_by'] : '';

if ($can_filter_distance) {
    // Wo_GetProducts calculates product distance from the logged-in user's
    // lat/lng in the global context. Prefer the fresh device coordinates sent
    // by the app, then fall back to profile coordinates for older clients.
    $wo['user']['lat'] = $filter_lat;
    $wo['user']['lng'] = $filter_lng;
}

function Wo_ProductSearchNormalizeText($value) {
    $value = html_entity_decode((string) $value, ENT_QUOTES, 'UTF-8');
    $value = strip_tags($value);
    $value = str_replace(array('Đ', 'đ'), array('D', 'd'), $value);
    $value = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($converted !== false) {
        $value = $converted;
    }
    $value = preg_replace('/[^a-z0-9]+/i', ' ', $value);
    return trim(preg_replace('/\s+/', ' ', $value));
}

function Wo_ProductSearchScore($keyword, $product) {
    $keyword = Wo_ProductSearchNormalizeText($keyword);
    if ($keyword === '') {
        return 100;
    }

    $fields = array(
        !empty($product['name']) ? $product['name'] : '',
        !empty($product['description']) ? $product['description'] : '',
        !empty($product['category_name']) ? $product['category_name'] : '',
        !empty($product['product_sub_category']) ? $product['product_sub_category'] : '',
        !empty($product['location']) ? $product['location'] : ''
    );
    $best = 0;

    foreach ($fields as $field) {
        $normalized = Wo_ProductSearchNormalizeText($field);
        if ($normalized === '') {
            continue;
        }

        if ($normalized === $keyword) {
            $best = max($best, 100);
            continue;
        }

        if (strpos($normalized, $keyword) !== false) {
            $best = max($best, 92);
            continue;
        }

        if (strpos($keyword, $normalized) !== false) {
            $best = max($best, 84);
        }

        similar_text($keyword, $normalized, $percent);
        $best = max($best, (int) round($percent));
    }

    return $best;
}

$get_products = Wo_GetProducts($options);
if ($search_keyword !== '') {
    $fuzzy_options = $options;
    $fuzzy_options['keyword'] = '';
    $fuzzy_options['after_id'] = 0;
    $fuzzy_options['limit'] = max(250, $options['limit'] * 8);
    $fuzzy_products = Wo_GetProducts($fuzzy_options);
    $scored_products = array();

    foreach ($fuzzy_products as $product) {
        $score = Wo_ProductSearchScore($search_keyword, $product);
        if ($score >= 35) {
            $product['_search_score'] = $score;
            $scored_products[] = $product;
        }
    }

    usort($scored_products, function ($left, $right) {
        if ($left['_search_score'] == $right['_search_score']) {
            return (int) $right['id'] - (int) $left['id'];
        }
        return $right['_search_score'] - $left['_search_score'];
    });

    $get_products = array_slice($scored_products, 0, $options['limit']);
}
foreach ($get_products as $key => $product) {
    foreach ($non_allowed as $key => $value) {
       unset($product['seller'][$value]);
    }
    if (!empty($product['post_id']) && !empty($product['images'])) {
        $currency_rule = Wo_GetCurrencyRule($product['currency']);
        $product['currency_code'] = $currency_rule['code'];
        $product['currency_symbol'] = $currency_rule['symbol'];
        $product['currency_rule'] = array(
            'decimals' => $currency_rule['decimals'],
            'decimal_sep' => $currency_rule['decimal_sep'],
            'thousand_sep' => $currency_rule['thousand_sep']
        );
        $is_owner = (!empty($wo['loggedin']) && !empty($wo['user']['user_id']) && $product['user_id'] == $wo['user']['user_id']) ? 1 : 0;
        $product['is_owner'] = $is_owner;
        $product['can_contact_seller'] = (!empty($wo['loggedin']) && !$is_owner && !empty($product['user_id'])) ? 1 : 0;
        $product['can_add_to_cart'] = (!empty($wo['loggedin']) && !$is_owner && $wo['config']['store_system'] == 'on' && !empty($product['units']) && $product['units'] > 0) ? 1 : 0;
    	$products[] = $product;
    }
}

$response_data = array(
    'api_status' => 200,
    'products' => $products,
    'products_categories' => $wo['products_categories'],
    'products_sub_categories' => $wo['products_sub_categories'],
    'distance_filter_available' => $can_filter_distance ? 1 : 0,
    'distance_origin_source' => $has_request_origin ? 'device' : 'profile',
    'distance_origin' => $can_filter_distance ? array(
        'lat' => $filter_lat,
        'lng' => $filter_lng
    ) : null,
    'currencies' => !empty($wo['currencies']) ? $wo['currencies'] : null
);
