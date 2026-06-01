<?php
// English description: Converts user points into wallet balance for the Nuxt settings my points screen.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $user_id = (int) $wo['user']['user_id'];
    $points = 0;
    $dollar_to_point_cost = !empty($wo['config']['dollar_to_point_cost']) ? (float) $wo['config']['dollar_to_point_cost'] : 0;
    $point_exchange_rate = (int) $dollar_to_point_cost;
    $ads_currency = !empty($wo['config']['ads_currency']) ? (string) $wo['config']['ads_currency'] : (!empty($wo['config']['currency']) ? (string) $wo['config']['currency'] : 'USD');
    $exchange_rates = array();

    if (!empty($wo['config']['exchange'])) {
        if (is_array($wo['config']['exchange'])) {
            $exchange_rates = $wo['config']['exchange'];
        } else {
            $decoded_exchange_rates = json_decode(html_entity_decode($wo['config']['exchange']), true);
            if (is_array($decoded_exchange_rates)) {
                $exchange_rates = $decoded_exchange_rates;
            }
        }
    }

    $exchange_needs_refresh = empty($exchange_rates)
        || empty($exchange_rates['VND'])
        || (!empty($wo['config']['exchange_update']) && (int) $wo['config']['exchange_update'] < time());

    if ($exchange_needs_refresh && !empty($wo['config']['exchangerate_key']) && function_exists('fetchDataFromURL')) {
        $exchange_base_currency = !empty($wo['config']['currency']) ? (string) $wo['config']['currency'] : $ads_currency;
        $request = fetchDataFromURL("https://v6.exchangerate-api.com/v6/" . $wo['config']['exchangerate_key'] . "/latest/" . $exchange_base_currency);
        $exchange = json_decode($request, true);

        if (!empty($exchange) && !empty($exchange['result']) && $exchange['result'] === 'success' && !empty($exchange['conversion_rates']) && is_array($exchange['conversion_rates'])) {
            $exchange_rates = $exchange['conversion_rates'];
            if (function_exists('Wo_SaveConfig')) {
                Wo_SaveConfig('exchange', json_encode($exchange_rates));
                Wo_SaveConfig('exchange_update', (time() + (60 * 60 * 12)));
            }
        }
    }

    $usd_to_wallet_rate = 1;
    if ($ads_currency === 'VND') {
        if (!empty($exchange_rates['VND']) && is_numeric($exchange_rates['VND']) && (float) $exchange_rates['VND'] > 1000) {
            $usd_to_wallet_rate = (float) $exchange_rates['VND'];
        } elseif (!empty($exchange_rates['USD']) && is_numeric($exchange_rates['USD']) && (float) $exchange_rates['USD'] > 0 && (float) $exchange_rates['USD'] < 1) {
            $usd_to_wallet_rate = 1 / (float) $exchange_rates['USD'];
        } elseif (!empty($wo['config']['usd_to_vnd_rate']) && is_numeric($wo['config']['usd_to_vnd_rate'])) {
            $usd_to_wallet_rate = (float) $wo['config']['usd_to_vnd_rate'];
        } else {
            $usd_to_wallet_rate = 25000;
        }
    } elseif ($ads_currency !== 'USD' && !empty($exchange_rates[$ads_currency]) && is_numeric($exchange_rates[$ads_currency])) {
        $usd_to_wallet_rate = (float) $exchange_rates[$ads_currency];
    }

    if (isset($_POST['points'])) {
        $points = (int) $_POST['points'];
    }

    if ($point_exchange_rate <= 0) {
        $error_code = 2;
        $error_message = 'Point exchange rate is not configured.';
    }
    else if ($points < $point_exchange_rate || $points % $point_exchange_rate !== 0) {
        $error_code = 2;
        $error_message = 'Points must match the configured exchange rate.';
    }
    else {
        $user_data = Wo_UserData($user_id);
        $current_points = isset($user_data['points']) ? (int) $user_data['points'] : 0;
        $current_wallet = isset($user_data['wallet']) ? (float) $user_data['wallet'] : 0;
        $usd_amount = $points / $point_exchange_rate;
        $wallet_amount = $usd_amount * $usd_to_wallet_rate;

        if ($current_points < $points) {
            $error_code = 3;
            $error_message = 'Not enough points to exchange.';
        }
        else {
            $new_points = $current_points - $points;
            $new_wallet = $current_wallet + $wallet_amount;
            $safe_points = (int) $points;
            $safe_amount = (float) $wallet_amount;
            $notes = mysqli_real_escape_string($sqlConnect, 'Exchange ' . $safe_points . ' points to wallet');
            $extra = mysqli_real_escape_string($sqlConnect, json_encode(array(
                'points' => $safe_points,
                'rate_points' => $point_exchange_rate,
                'rate_amount' => 1,
                'base_currency' => 'USD',
                'wallet_currency' => $ads_currency,
                'wallet_exchange_rate' => $usd_to_wallet_rate,
                'base_amount' => $usd_amount
            )));

            mysqli_begin_transaction($sqlConnect);

            $update_user = mysqli_query($sqlConnect, "
                UPDATE " . T_USERS . "
                SET `points` = `points` - {$safe_points}, `wallet` = `wallet` + {$safe_amount}
                WHERE `user_id` = {$user_id}
                  AND `points` >= {$safe_points}
                LIMIT 1
            ");

            if ($update_user && mysqli_affected_rows($sqlConnect) > 0) {
                $insert_log = mysqli_query($sqlConnect, "
                    INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`, `extra`)
                    VALUES ({$user_id}, 'POINTS_EXCHANGE', {$safe_amount}, '{$notes}', '{$extra}')
                ");

                if ($insert_log) {
                    mysqli_commit($sqlConnect);
                    cache($user_id, 'users', 'delete');

                    $response_data = array(
                        'api_status' => 200,
                        'success' => true,
                        'message' => 'Points exchanged successfully.',
                        'exchanged_points' => $safe_points,
                        'amount' => $safe_amount,
                        'points' => $new_points,
                        'wallet' => $new_wallet
                    );
                }
                else {
                    mysqli_rollback($sqlConnect);
                    $error_code = 4;
                    $error_message = 'Unable to record point exchange.';
                }
            }
            else {
                mysqli_rollback($sqlConnect);
                $error_code = 5;
                $error_message = 'Unable to exchange points.';
            }
        }
    }
}
