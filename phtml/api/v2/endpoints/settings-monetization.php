<?php
// English description: Returns monetization overview data for the Nuxt settings monetization tab.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['user_id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $current_user = $wo['user'];
    $currency = !empty($wo['config']['ads_currency']) ? $wo['config']['ads_currency'] : $wo['config']['currency'];
    $currency_symbol = Wo_GetCurrency($currency);
    $profile_complete = !empty($current_user['first_name'])
        && !empty($current_user['last_name'])
        && !empty($current_user['email'])
        && !empty($current_user['phone_number'])
        && !empty($current_user['address']);
    $verified = !empty($current_user['verified']) && (string) $current_user['verified'] === '1';
    $plans = array();

    if (defined('T_USER_MONETIZATION')) {
        $monetization_rows = $db
            ->where('user_id', (int) $current_user['user_id'])
            ->get(T_USER_MONETIZATION);

        if (!empty($monetization_rows)) {
            foreach ($monetization_rows as $monetization) {
                $plans[] = array(
                    'id' => $monetization->id,
                    'title' => $monetization->title,
                    'description' => $monetization->description,
                    'price' => (float) $monetization->price,
                    'currency' => !empty($monetization->currency) ? $monetization->currency : $currency,
                    'status' => !empty($monetization->status) ? 'active' : 'inactive'
                );
            }
        }
    }

    $response_data = array(
        'api_status' => 200,
        'enabled' => !empty($wo['config']['monetization']) && (string) $wo['config']['monetization'] === '1',
        'eligible' => $profile_complete && $verified,
        'wallet_balance' => isset($current_user['wallet']) ? (float) $current_user['wallet'] : 0,
        'currency' => $currency,
        'currency_symbol' => $currency_symbol,
        'profile_complete' => $profile_complete,
        'verified' => $verified,
        'plans' => $plans
    );
}
