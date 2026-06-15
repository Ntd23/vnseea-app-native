<?php
// English description: Returns referral rewards data for the Nuxt settings affiliates tab.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['user_id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $current_user = $wo['user'];
    $referrals = array();
    $raw_referrals = array();
    $referral_ids = array();
    $current_user_id = (int) $current_user['user_id'];
    $referrals_query = mysqli_query($sqlConnect, "
        SELECT `user_id`
        FROM " . T_USERS . "
        WHERE `referrer` = {$current_user_id}
           OR `ref_user_id` = {$current_user_id}
        ORDER BY `user_id` DESC
    ");

    if ($referrals_query) {
        while ($referral_row = mysqli_fetch_assoc($referrals_query)) {
            $referral_user_id = isset($referral_row['user_id']) ? (int) $referral_row['user_id'] : 0;

            if ($referral_user_id > 0 && empty($referral_ids[$referral_user_id])) {
                $referral_ids[$referral_user_id] = true;
                $referral_user = Wo_UserData($referral_user_id);

                if (!empty($referral_user)) {
                    $raw_referrals[] = $referral_user;
                }
            }
        }
    }
    $reward_amount = !empty($wo['config']['amount_ref']) ? (float) $wo['config']['amount_ref'] : 0;
    $required_referrals = !empty($wo['config']['affiliate_minimum_referrals'])
        ? (int) $wo['config']['affiliate_minimum_referrals']
        : 1;
    $required_referrals = max(1, $required_referrals);
    $qualified_referrals = 0;
    $currency = 'USD';
    $currency_symbol = Wo_GetCurrency($currency);
    $wallet_currency = !empty($wo['config']['ads_currency']) ? (string) $wo['config']['ads_currency'] : (!empty($wo['config']['currency']) ? (string) $wo['config']['currency'] : 'USD');
    $wallet_currency_symbol = Wo_GetCurrency($wallet_currency);
    $exchange_rates = array();
    $usd_to_wallet_rate = 1;
    $paid_referral_rewards = array();

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

    if ($wallet_currency === 'VND') {
        if (!empty($exchange_rates['VND']) && is_numeric($exchange_rates['VND']) && (float) $exchange_rates['VND'] > 1000) {
            $usd_to_wallet_rate = (float) $exchange_rates['VND'];
        } elseif (!empty($exchange_rates['USD']) && is_numeric($exchange_rates['USD']) && (float) $exchange_rates['USD'] > 0 && (float) $exchange_rates['USD'] < 1) {
            $usd_to_wallet_rate = 1 / (float) $exchange_rates['USD'];
        } elseif (!empty($wo['config']['usd_to_vnd_rate']) && is_numeric($wo['config']['usd_to_vnd_rate'])) {
            $usd_to_wallet_rate = (float) $wo['config']['usd_to_vnd_rate'];
        } else {
            $usd_to_wallet_rate = 25000;
        }
    } elseif ($wallet_currency !== 'USD' && !empty($exchange_rates[$wallet_currency]) && is_numeric($exchange_rates[$wallet_currency])) {
        $usd_to_wallet_rate = (float) $exchange_rates[$wallet_currency];
    }

    $is_profile_complete = function ($user) {
        return !empty($user['first_name'])
            && !empty($user['last_name'])
            && !empty($user['email'])
            && !empty($user['phone_number'])
            && !empty($user['address']);
    };

    $settle_referral_reward = function ($referral) use (
        &$paid_referral_rewards,
        $current_user,
        $current_user_id,
        $reward_amount,
        $wallet_currency,
        $wallet_currency_symbol,
        $usd_to_wallet_rate,
        $sqlConnect
    ) {
        if ($reward_amount <= 0 || empty($referral['user_id'])) {
            return false;
        }

        $referral_user_id = (int) $referral['user_id'];
        $referral_name = !empty($referral['name']) ? $referral['name'] : $referral['username'];
        $wallet_amount = $reward_amount * $usd_to_wallet_rate;
        $existing_extra = mysqli_real_escape_string($sqlConnect, '%"referral_user_id":' . $referral_user_id . '%');
        $existing_reward = mysqli_query($sqlConnect, "
            SELECT `id`, `amount`
            FROM " . T_PAYMENT_TRANSACTIONS . "
            WHERE `userid` = {$current_user_id}
              AND `kind` = 'AFFILIATE_REWARD'
              AND `extra` LIKE '{$existing_extra}'
            LIMIT 1
        ");

        if ($existing_reward && mysqli_num_rows($existing_reward) > 0) {
            $existing_row = mysqli_fetch_assoc($existing_reward);
            $existing_amount = isset($existing_row['amount']) ? (float) $existing_row['amount'] : 0;
            $missing_amount = $wallet_amount - $existing_amount;

            if ($missing_amount > 0.000001) {
                $safe_missing_amount = (float) $missing_amount;
                $adjust_notes = mysqli_real_escape_string($sqlConnect, 'Administrator');
                mysqli_begin_transaction($sqlConnect);

                $adjust_balance = mysqli_query($sqlConnect, "
                    UPDATE " . T_USERS . "
                    SET `balance` = `balance` + {$safe_missing_amount}
                    WHERE `user_id` = {$current_user_id}
                    LIMIT 1
                ");
                $adjust_log = false;

                if ($adjust_balance) {
                    $adjust_log = mysqli_query($sqlConnect, "
                        UPDATE " . T_PAYMENT_TRANSACTIONS . "
                        SET `amount` = {$wallet_amount}, `notes` = '{$adjust_notes}'
                        WHERE `id` = " . (int) $existing_row['id'] . "
                        LIMIT 1
                    ");
                }

                if ($adjust_balance && $adjust_log) {
                    mysqli_commit($sqlConnect);
                    cache($current_user_id, 'users', 'delete');
                    $formatted_amount = $wallet_currency === 'VND'
                        ? number_format($wallet_amount, 0, ',', '.') . $wallet_currency_symbol
                        : number_format($wallet_amount, 2, '.', ',') . $wallet_currency_symbol;
                    $notification_data_array = array(
                        'recipient_id' => $current_user_id,
                        'notifier_id' => $referral_user_id,
                        'type' => 'affiliate_reward',
                        'text' => 'Tiền thưởng giới thiệu đã được cập nhật thành ' . $formatted_amount . ' từ ' . $referral_name . '.',
                        'url' => 'index.php?link1=setting&page=affiliates'
                    );
                    Wo_RegisterNotification($notification_data_array);
                } else {
                    mysqli_rollback($sqlConnect);
                    return false;
                }
            }

            $paid_referral_rewards[$referral_user_id] = true;
            return true;
        }

        $safe_amount = (float) $wallet_amount;
        $notes = mysqli_real_escape_string($sqlConnect, 'Administrator');
        $extra = mysqli_real_escape_string($sqlConnect, json_encode(array(
            'type' => 'affiliate_reward',
            'referral_user_id' => $referral_user_id,
            'referral_name' => $referral_name,
            'base_amount' => $reward_amount,
            'base_currency' => 'USD',
            'wallet_amount' => $wallet_amount,
            'wallet_currency' => $wallet_currency,
            'wallet_exchange_rate' => $usd_to_wallet_rate
        )));

        mysqli_begin_transaction($sqlConnect);

        $update_balance = mysqli_query($sqlConnect, "
            UPDATE " . T_USERS . "
            SET `balance` = `balance` + {$safe_amount}
            WHERE `user_id` = {$current_user_id}
            LIMIT 1
        ");

        $insert_log = false;
        if ($update_balance) {
            $insert_log = mysqli_query($sqlConnect, "
                INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`, `extra`)
                VALUES ({$current_user_id}, 'AFFILIATE_REWARD', {$safe_amount}, '{$notes}', '{$extra}')
            ");
        }

        if ($update_balance && $insert_log) {
            mysqli_commit($sqlConnect);
            cache($current_user_id, 'users', 'delete');
            $paid_referral_rewards[$referral_user_id] = true;

            $formatted_amount = $wallet_currency === 'VND'
                ? number_format($safe_amount, 0, ',', '.') . $wallet_currency_symbol
                : number_format($safe_amount, 2, '.', ',') . $wallet_currency_symbol;
            $notification_text = 'Bạn đã nhận được tiền thưởng giới thiệu ' . $formatted_amount . ' từ ' . $referral_name . '.';
            $notification_data_array = array(
                'recipient_id' => $current_user_id,
                'notifier_id' => $referral_user_id,
                'type' => 'affiliate_reward',
                'text' => $notification_text,
                'url' => 'index.php?link1=setting&page=affiliates'
            );
            Wo_RegisterNotification($notification_data_array);

            return true;
        }

        mysqli_rollback($sqlConnect);
        return false;
    };

    if (!empty($raw_referrals) && is_array($raw_referrals)) {
        foreach ($raw_referrals as $referral) {
            $profile_complete = $is_profile_complete($referral);
            $verified = !empty($referral['verified']) && (string) $referral['verified'] === '1';
            $reward_eligible = $profile_complete && $verified;
            $progress_percent = 0;

            if ($profile_complete) {
                $progress_percent += 50;
            }

            if ($verified) {
                $progress_percent += 50;
            }

            if ($reward_eligible) {
                $settle_referral_reward($referral);
                $qualified_referrals++;
            }

            $reward_paid = !empty($paid_referral_rewards[(int) $referral['user_id']]);

            $referrals[] = array(
                'id' => (int) $referral['user_id'],
                'name' => !empty($referral['name']) ? $referral['name'] : $referral['username'],
                'username' => !empty($referral['username']) ? $referral['username'] : '',
                'avatar' => !empty($referral['avatar']) ? $referral['avatar'] : '',
                'joined' => !empty($referral['registered']) ? $referral['registered'] : '',
                'verified' => $verified,
                'profile_complete' => $profile_complete,
                'reward_eligible' => $reward_eligible,
                'reward_amount' => $reward_amount,
                'progress_percent' => $progress_percent,
                'reward_paid' => $reward_paid,
                'status' => $reward_paid ? 'paid' : ($reward_eligible ? 'qualified' : 'pending')
            );
        }
    }

    $profile_complete = $is_profile_complete($current_user);
    $verified = !empty($current_user['verified']) && (string) $current_user['verified'] === '1';
    $progress_percent = min(100, (int) round(($qualified_referrals / $required_referrals) * 100));

    $response_data = array(
        'api_status' => 200,
        'referral_link' => rtrim($wo['config']['site_url'], '/') . '/register?ref=' . urlencode($current_user['username']),
        'reward_amount' => $reward_amount,
        'currency' => $currency,
        'currency_symbol' => $currency_symbol,
        'required_qualified_referrals' => $required_referrals,
        'qualified_referrals' => $qualified_referrals,
        'progress_percent' => $progress_percent,
        'profile_complete' => $profile_complete,
        'verified' => $verified,
        'eligible_for_payout' => $profile_complete && $verified && $qualified_referrals >= $required_referrals,
        'referrals' => $referrals
    );
}
