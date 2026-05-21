<?php
// English description: Returns withdrawal balance, method configuration, and payment request history for the Nuxt bridge.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['user']) || empty($wo['user']['id'])) {
    $error_code = 1;
    $error_message = 'User is not authenticated';
}
else {
    $currency = !empty($wo['config']['ads_currency']) ? $wo['config']['ads_currency'] : $wo['config']['currency'];
    $methods = array();
    $configured_methods = array('paypal' => 1);

    if (!empty($wo['config']['withdrawal_payment_method'])) {
        if (is_array($wo['config']['withdrawal_payment_method'])) {
            $configured_methods = $wo['config']['withdrawal_payment_method'];
        }
        else {
            $decoded_methods = json_decode($wo['config']['withdrawal_payment_method'], true);
            if (is_array($decoded_methods)) {
                $configured_methods = $decoded_methods;
            }
        }
    }

    foreach ($configured_methods as $key => $enabled) {
        if ($enabled != 1) {
            continue;
        }

        if (!in_array((string) $key, array('paypal', 'p_paypal'), true)) {
            continue;
        }

        $methods[] = array(
            'value' => 'paypal',
            'label' => !empty($wo['lang']['paypal']) ? $wo['lang']['paypal'] : 'PayPal',
        );
    }

    if (!empty($wo['config']['sepay']) && in_array((string) $wo['config']['sepay'], array('1', 'yes', 'true', 'on'), true)) {
        $has_sepay_method = false;
        foreach ($methods as $method) {
            if (!empty($method['value']) && $method['value'] == 'sepay') {
                $has_sepay_method = true;
                break;
            }
        }
        if (!$has_sepay_method) {
            $methods[] = array(
                'value' => 'sepay',
                'label' => 'SePay',
            );
        }
    }

    if (empty($methods)) {
        $methods[] = array(
            'value' => 'paypal',
            'label' => !empty($wo['lang']['paypal']) ? $wo['lang']['paypal'] : 'PayPal',
        );
    }

    $history = array();
    $raw_history = Wo_GetPaymentsHistory($wo['user']['user_id']);
    if (!empty($raw_history) && is_array($raw_history)) {
        foreach ($raw_history as $item) {
            if (empty($item) || !is_array($item)) {
                continue;
            }

            $history[] = array(
                'id' => (int) $item['id'],
                'amount' => isset($item['amount']) ? (float) $item['amount'] : 0,
                'method' => !empty($item['type']) ? (string) $item['type'] : '',
                'requested' => !empty($item['time_text']) ? (string) $item['time_text'] : '',
                'requested_at' => !empty($item['time']) ? (int) $item['time'] : 0,
                'status' => isset($item['status']) ? (int) $item['status'] : 0,
                'transfer_info' => !empty($item['transfer_info']) ? (string) $item['transfer_info'] : '',
            );
        }
    }

    $response_data = array(
        'api_status' => 200,
        'balance' => isset($wo['user']['balance']) ? (float) $wo['user']['balance'] : 0,
        'wallet_balance' => isset($wo['user']['wallet']) ? (float) $wo['user']['wallet'] : 0,
        'minimum_amount' => isset($wo['config']['m_withdrawal']) ? (float) $wo['config']['m_withdrawal'] : 0,
        'currency' => $currency,
        'currency_symbol' => Wo_GetCurrency($currency),
        'currency_rule' => Wo_GetCurrencyRule($currency),
        'methods' => $methods,
        'bank_enabled' => false,
        'paypal_email' => !empty($wo['user']['email']) ? $wo['user']['email'] : '',
        'has_pending_request' => Wo_IsUserPaymentRequested($wo['user']['user_id']) ? true : false,
        'history' => $history,
    );
}
