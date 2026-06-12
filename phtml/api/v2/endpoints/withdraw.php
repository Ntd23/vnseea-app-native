<?php
// English description: Handles payout withdrawal requests for PayPal, bank, and SePay methods.
// +------------------------------------------------------------------------+
// | @author Deen Doughouz (DoughouzForest)
// | @author_url 1: http://www.hisotechgroup.com
// | @author_url 2: http://codecanyon.net/user/doughouzforest
// | @author_email: wowondersocial@gmail.com   
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// | Copyright (c) 2018 WoWonder. All rights reserved.
// +------------------------------------------------------------------------+
$response_data = array(
    'api_status' => 400
);

function Wo_WithdrawDebugLog($message, $context = array()) {
    $safe_context = array();
    foreach ($context as $key => $value) {
        if (is_array($value)) {
            $safe_context[$key] = array_values($value);
        } elseif (is_bool($value)) {
            $safe_context[$key] = $value ? 'true' : 'false';
        } else {
            $safe_context[$key] = (string)$value;
        }
    }
    error_log('[withdraw-api] ' . $message . ' ' . json_encode($safe_context));
}

$raw_post_body = file_get_contents('php://input');
if (empty($_POST) && !empty($raw_post_body)) {
    $parsed_post_body = array();
    parse_str($raw_post_body, $parsed_post_body);
    if (!empty($parsed_post_body) && is_array($parsed_post_body)) {
        $_POST = array_merge($parsed_post_body, $_POST);
        Wo_WithdrawDebugLog('parsed_raw_body', array(
            'parsed_keys' => array_keys($parsed_post_body),
            'content_type' => !empty($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '',
            'raw_length' => strlen($raw_post_body)
        ));
    }
}
$required_fields =  array(
                        'paypal',
                        'bank',
                        'sepay'
                    );
if (
    (empty($_POST['type']) || !in_array($_POST['type'], $required_fields)) &&
    !empty($_POST['withdraw_method']) &&
    in_array($_POST['withdraw_method'], $required_fields)
) {
    $_POST['type'] = $_POST['withdraw_method'];
}
if (!empty($_POST['type']) && in_array($_POST['type'], $required_fields)) {
    if ($_POST['type'] == 'paypal') {
        if (empty($_POST['paypal_email'])) {
            $error_code    = 5;
            $error_message = 'paypal_email can not be empty';
        }
        elseif (!filter_var($_POST['paypal_email'], FILTER_VALIDATE_EMAIL)) {
            $error_code    = 6;
            $error_message = 'invalid email';
        }
        elseif (empty($_POST['amount']) || !is_numeric($_POST['amount'])) {
            $error_code    = 7;
            $error_message = 'amount can not be empty';
        }
        elseif (Wo_IsUserPaymentRequested($wo['user']['user_id']) === true) {
            $error_code    = 8;
            $error_message = 'you have pending request';
        } 
        elseif (($wo['user']['balance'] < $_POST['amount'])) {
            $error_code    = 9;
            $error_message = $wo['lang']['invalid_amount_value_your'] . ''.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['user']['balance'];
        } 
        elseif ($wo['config']['m_withdrawal'] > $_POST['amount']) {
            $error_code    = 10;
            $error_message = $wo['lang']['invalid_amount_value_withdrawal'] . ' '.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['config']['m_withdrawal'];
        }
        else{
            $insert_array = array(
                'type' => 'paypal',
                'transfer_info' => Wo_Secure($_POST['paypal_email'])
            );
            $userU  = Wo_UpdateUserData($wo['user']['user_id'], array(
                        'paypal_email' => $_POST['paypal_email']
                    ));
            $insert_payment = Wo_RequestNewPayment($wo['user']['user_id'], $_POST['amount'],$insert_array);
            if ($insert_payment) {
                $update_balance = Wo_UpdateBalance($wo['user']['user_id'], $_POST['amount'], '-');
                $response_data['message'] = $wo['lang']['you_request_sent'];
                $response_data['api_status'] = 200;
            }
            else{
                $error_code    = 11;
                $error_message = 'something went wrong';
            }
        }
    }
    if ($_POST['type'] == 'bank') {
        if (empty($_POST['iban']) || empty($_POST['country']) || empty($_POST['full_name']) || empty($_POST['swift_code']) || empty($_POST['address'])) {
            $error_code    = 5;
            $error_message = 'please check details';
        }
        elseif (empty($_POST['amount']) || !is_numeric($_POST['amount'])) {
            $error_code    = 7;
            $error_message = 'amount can not be empty';
        }
        elseif (Wo_IsUserPaymentRequested($wo['user']['user_id']) === true) {
            $error_code    = 8;
            $error_message = 'you have pending request';
        } 
        elseif (($wo['user']['balance'] < $_POST['amount'])) {
            $error_code    = 9;
            $error_message = $wo['lang']['invalid_amount_value_your'] . ''.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['user']['balance'];
        } 
        elseif ($wo['config']['m_withdrawal'] > $_POST['amount']) {
            $error_code    = 10;
            $error_message = $wo['lang']['invalid_amount_value_withdrawal'] . ' '.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['config']['m_withdrawal'];
        }
        else{
            $insert_array = array(
                'type' => 'bank'
            );
            if ($wo['config']['bank_withdrawal_system'] == 1 && !empty($_POST['iban']) && !empty($_POST['country']) && !empty($_POST['full_name']) && !empty($_POST['swift_code']) && !empty($_POST['address'])) {
                $insert_array['iban'] = Wo_Secure($_POST['iban']);
                $insert_array['country'] = Wo_Secure($_POST['country']);
                $insert_array['full_name'] = Wo_Secure($_POST['full_name']);
                $insert_array['swift_code'] = Wo_Secure($_POST['swift_code']);
                $insert_array['address'] = Wo_Secure($_POST['address']);
                $userU          = Wo_UpdateUserData($wo['user']['user_id'], array(
                                        'paypal_email' => ''
                                    ));
            }
            $insert_payment = Wo_RequestNewPayment($wo['user']['user_id'], $_POST['amount'],$insert_array);
            if ($insert_payment) {
                $update_balance = Wo_UpdateBalance($wo['user']['user_id'], $_POST['amount'], '-');
                $response_data['message'] = $wo['lang']['you_request_sent'];
                $response_data['api_status'] = 200;
            }
        }
    }
    if ($_POST['type'] == 'sepay') {
        $transfer_to = '';
        if (!empty($_POST['transfer_to'])) {
            $transfer_to = $_POST['transfer_to'];
        }
        else if (!empty($_POST['sepay_account'])) {
            $transfer_to = $_POST['sepay_account'];
        }

        if (empty($transfer_to)) {
            $error_code    = 5;
            $error_message = 'transfer_to can not be empty';
        }
        elseif (empty($_POST['amount']) || !is_numeric($_POST['amount'])) {
            $error_code    = 7;
            $error_message = 'amount can not be empty';
        }
        elseif (Wo_IsUserPaymentRequested($wo['user']['user_id']) === true) {
            $error_code    = 8;
            $error_message = 'you have pending request';
        }
        elseif (($wo['user']['balance'] < $_POST['amount'])) {
            $error_code    = 9;
            $error_message = $wo['lang']['invalid_amount_value_your'] . ''.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['user']['balance'];
        }
        elseif ($wo['config']['m_withdrawal'] > $_POST['amount']) {
            $error_code    = 10;
            $error_message = $wo['lang']['invalid_amount_value_withdrawal'] . ' '.Wo_GetCurrency($wo['config']['ads_currency']) . $wo['config']['m_withdrawal'];
        }
        else{
            $insert_array = array(
                'type' => 'sepay',
                'transfer_info' => Wo_Secure($transfer_to)
            );
            $userU  = Wo_UpdateUserData($wo['user']['user_id'], array(
                        'paypal_email' => ''
                    ));
            $insert_payment = Wo_RequestNewPayment($wo['user']['user_id'], $_POST['amount'],$insert_array);
            if ($insert_payment) {
                $update_balance = Wo_UpdateBalance($wo['user']['user_id'], $_POST['amount'], '-');
                $response_data['message'] = $wo['lang']['you_request_sent'];
                $response_data['api_status'] = 200;
            }
            else{
                $error_code    = 11;
                $error_message = 'something went wrong';
            }
        }
    }
}
else{
    Wo_WithdrawDebugLog('missing_type', array(
        'request_method' => !empty($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '',
        'route_type' => !empty($_GET['type']) ? $_GET['type'] : '',
        'post_type' => !empty($_POST['type']) ? $_POST['type'] : '',
        'post_withdraw_method' => !empty($_POST['withdraw_method']) ? $_POST['withdraw_method'] : '',
        'post_keys' => array_keys($_POST),
        'request_keys' => array_keys($_REQUEST),
        'content_type' => !empty($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '',
        'content_length' => !empty($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 0,
        'raw_length' => strlen($raw_post_body),
        'raw_has_type' => strpos($raw_post_body, 'type=') !== false,
        'raw_has_withdraw_method' => strpos($raw_post_body, 'withdraw_method=') !== false
    ));
    $error_code    = 4;
    $error_message = 'type can not be empty';
}
