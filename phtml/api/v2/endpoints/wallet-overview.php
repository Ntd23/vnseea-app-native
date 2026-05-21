<?php
// English description: Returns wallet balance, top-up capabilities, and transaction history for the Nuxt wallet bridge.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $currency = !empty($wo['config']['ads_currency']) ? $wo['config']['ads_currency'] : $wo['config']['currency'];
    $currency_symbol = Wo_GetCurrency($currency);
    $currency_rule = Wo_GetCurrencyRule($currency);
    $transactions = array();
    $user_id = (int) $wo['user']['user_id'];
    $raw_transactions = array();
    $transactions_query = mysqli_query($sqlConnect, "
        SELECT *
        FROM " . T_PAYMENT_TRANSACTIONS . "
        WHERE `userid` = {$user_id}
        ORDER BY `id` DESC
        LIMIT 30
    ");

    if ($transactions_query) {
        while ($transaction = mysqli_fetch_assoc($transactions_query)) {
            $raw_transactions[] = $transaction;
        }
    }

    if (!empty($raw_transactions) && is_array($raw_transactions)) {
        foreach ($raw_transactions as $transaction) {
            $extra = array();
            if (!empty($transaction['extra'])) {
                $decoded_extra = is_array($transaction['extra'])
                    ? $transaction['extra']
                    : json_decode((string) $transaction['extra'], true);
                if (is_array($decoded_extra)) {
                    $extra = $decoded_extra;
                }
            }

            $kind = !empty($transaction['kind']) ? strtoupper((string) $transaction['kind']) : '';
            $counterparty_id = 0;
            if ($kind == 'RECEIVED' && !empty($extra['sender_id'])) {
                $counterparty_id = (int) $extra['sender_id'];
            }
            elseif ($kind == 'SENT' && !empty($extra['recipient_id'])) {
                $counterparty_id = (int) $extra['recipient_id'];
            }

            if ($counterparty_id <= 0 && ($kind == 'RECEIVED' || $kind == 'SENT')) {
                $pair_id = $kind == 'RECEIVED'
                    ? ((int) $transaction['id'] + 1)
                    : ((int) $transaction['id'] - 1);
                $pair_kind = $kind == 'RECEIVED' ? 'SENT' : 'RECEIVED';
                $amount = isset($transaction['amount']) ? (float) $transaction['amount'] : 0;
                $pair_query = mysqli_query($sqlConnect, "
                    SELECT `userid`
                    FROM " . T_PAYMENT_TRANSACTIONS . "
                    WHERE `id` = {$pair_id}
                      AND `kind` = '{$pair_kind}'
                      AND `amount` = {$amount}
                    LIMIT 1
                ");

                if ($pair_query && mysqli_num_rows($pair_query) > 0) {
                    $pair = mysqli_fetch_assoc($pair_query);
                    $counterparty_id = isset($pair['userid']) ? (int) $pair['userid'] : 0;
                }
            }

            $counterparty_name = '';
            if ($counterparty_id > 0) {
                $counterparty = Wo_UserData($counterparty_id);
                if (!empty($counterparty)) {
                    $full_name = trim((string)($counterparty['first_name'] ?? '') . ' ' . (string)($counterparty['last_name'] ?? ''));
                    $counterparty_name = $full_name !== ''
                        ? $full_name
                        : (!empty($counterparty['name']) ? $counterparty['name'] : $counterparty['username']);
                }
            }
            elseif ($kind == 'RECEIVED' && !empty($extra['sender_name'])) {
                $counterparty_name = strip_tags((string) $extra['sender_name']);
            }
            elseif ($kind == 'SENT' && !empty($extra['recipient_name'])) {
                $counterparty_name = strip_tags((string) $extra['recipient_name']);
            }

            $notes = !empty($transaction['notes']) ? strip_tags((string) $transaction['notes']) : '';
            if (($kind == 'RECEIVED' || $kind == 'SENT') && array_key_exists('note', $extra)) {
                $notes = !empty($extra['note']) ? strip_tags((string) $extra['note']) : '';
            }

            $transactions[] = array(
                'id' => (int) $transaction['id'],
                'kind' => $kind,
                'notes' => $notes,
                'counterparty_id' => $counterparty_id,
                'counterparty_name' => $counterparty_name,
                'extra' => $extra,
                'amount' => isset($transaction['amount']) ? (float) $transaction['amount'] : 0,
                'transaction_dt' => !empty($transaction['transaction_dt']) ? (string) $transaction['transaction_dt'] : '',
            );
        }
    }

    $topup_methods = array();

    if (!empty($wo['config']['paypal']) && $wo['config']['paypal'] == 'yes') {
        $topup_methods[] = array(
            'value' => 'paypal',
            'label' => !empty($wo['lang']['paypal']) ? $wo['lang']['paypal'] : 'PayPal',
            'type' => 'redirect'
        );
    }

    if (!empty($wo['config']['sepay']) && in_array((string) $wo['config']['sepay'], array('1', 'yes', 'true', 'on'), true)) {
        $topup_methods[] = array(
            'value' => 'sepay',
            'label' => 'SePay',
            'type' => 'qr',
            'note' => !empty($wo['config']['sepay_bank_code']) ? (string) $wo['config']['sepay_bank_code'] : ''
        );
    }

    $can_withdraw = (
        (!empty($wo['config']['affiliate_system']) && $wo['config']['affiliate_system'] == 1)
        || (!empty($wo['config']['point_allow_withdrawal']) && $wo['config']['point_allow_withdrawal'] == 1)
        || (!empty($wo['config']['funding_system']) && $wo['config']['funding_system'] == 1)
        || (!empty($wo['config']['store_system']) && $wo['config']['store_system'] == 'on')
    );

    $response_data = array(
        'api_status' => 200,
        'balance' => isset($wo['user']['wallet']) ? (float) $wo['user']['wallet'] : 0,
        'withdrawable_balance' => isset($wo['user']['balance']) ? (float) $wo['user']['balance'] : 0,
        'currency' => $currency,
        'currency_symbol' => $currency_symbol,
        'currency_rule' => $currency_rule,
        'transactions' => $transactions,
        'topup_methods' => $topup_methods,
        'can_withdraw' => $can_withdraw ? true : false,
        'current_user' => array(
            'id' => (int) $wo['user']['user_id'],
            'name' => !empty($wo['user']['name']) ? $wo['user']['name'] : '',
            'username' => !empty($wo['user']['username']) ? $wo['user']['username'] : '',
            'avatar' => !empty($wo['user']['avatar']) ? $wo['user']['avatar'] : '',
        ),
    );
}
