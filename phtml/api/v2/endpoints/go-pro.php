<?php
// English description: Exposes active Pro packages as JSON for the Nuxt go-pro bridge using backend package configuration.

$response_data = array(
    'api_status' => 400
);

$packages = array();
foreach ($wo['pro_packages'] as $key => $package) {
    if (empty($package['status'])) {
        continue;
    }

    $package['type'] = $key;
    $packages[] = $package;
}

$response_data = array(
    'api_status' => 200,
    'membership_system' => !empty($wo['config']['membership_system']),
    'currency' => $wo['config']['currency'],
    'currency_symbol' => $wo['config']['currency_symbol_array'][$wo['config']['currency']],
    'current_pro_type' => !empty($wo['user']['pro_type']) ? $wo['user']['pro_type'] : '',
    'current_is_pro' => !empty($wo['user']['is_pro']),
    'packages' => $packages
);
