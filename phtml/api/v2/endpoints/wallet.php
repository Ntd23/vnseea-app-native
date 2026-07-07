<?php
// English description: Handles mobile wallet transfers, wallet top-up callbacks, and wallet-backed payments.
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

    $required_fields =  array(
                            'send',
                            'top_up',
                            'pay',
                        );

    function Wo_ApiWalletHasTransactionExtraColumn() {
        global $sqlConnect;
        static $has_extra = null;

        if ($has_extra !== null) {
            return $has_extra;
        }

        $query = mysqli_query($sqlConnect, "SHOW COLUMNS FROM " . T_PAYMENT_TRANSACTIONS . " LIKE 'extra'");
        $has_extra = ($query && mysqli_num_rows($query) > 0);
        return $has_extra;
    }

    function Wo_ApiWalletInsertTransferTransaction($user_id, $kind, $amount, $notes, $extra) {
        global $sqlConnect;

        $safe_user_id = (int) $user_id;
        $safe_kind = mysqli_real_escape_string($sqlConnect, (string) $kind);
        $safe_amount = (float) $amount;
        $safe_notes = mysqli_real_escape_string($sqlConnect, (string) $notes);

        if (Wo_ApiWalletHasTransactionExtraColumn()) {
            $safe_extra = mysqli_real_escape_string($sqlConnect, json_encode($extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`, `extra`) VALUES ({$safe_user_id}, '{$safe_kind}', {$safe_amount}, '{$safe_notes}', '{$safe_extra}')");
        }

        return mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$safe_user_id}, '{$safe_kind}', {$safe_amount}, '{$safe_notes}')");
    }



    if (!empty($_POST['type']) && in_array($_POST['type'], $required_fields)) {

            if ($_POST['type'] == 'send') {

        $user_id  = (!empty($_POST['user_id']) && is_numeric($_POST['user_id'])) ? (int) $_POST['user_id'] : 0;
        $amount   = (!empty($_POST['amount']) && is_numeric($_POST['amount'])) ? (float) $_POST['amount'] : 0;
        $sender_id = (int) $wo['user']['user_id'];
        $userdata = Wo_UserData($user_id);
        $sender = Wo_UserData($sender_id);
        $points = isset($sender['points']) ? (float) $sender['points'] : 0;

        if (empty($user_id) || empty($amount) || empty($userdata) || empty($sender) || $amount <= 0) {
            $error_code    = 5;
            $error_message = 'Please check your details.';
        } else if ($user_id === $sender_id) {
            $error_code    = 5;
            $error_message = 'Please check your details.';
        } else if (!empty($userdata['banned']) || empty($userdata['active'])) {
            $error_code    = 5;
            $error_message = 'Please check your details.';
        } else if ($points < $amount) {
            $error_code    = 6;
            $error_message = 'The amount exceded your current VNSEEA balance!';
        } else {
            $amount = (float) (($amount <= $points) ? $amount : $points);
            $recipient_full_name = trim((string)($userdata['first_name'] ?? '') . ' ' . (string)($userdata['last_name'] ?? ''));
            $sender_full_name = trim((string)($sender['first_name'] ?? '') . ' ' . (string)($sender['last_name'] ?? ''));
            $recipient_name = $recipient_full_name !== ''
                ? $recipient_full_name
                : (!empty($userdata['name']) ? $userdata['name'] : $userdata['username']);
            $sender_name = $sender_full_name !== ''
                ? $sender_full_name
                : (!empty($sender['name']) ? $sender['name'] : $sender['username']);
            $transfer_note = !empty($_POST['note']) ? trim((string)$_POST['note']) : '';
            $sender_note = $transfer_note !== ''
                ? $transfer_note
                : 'VNSEEA của bạn đã được gửi thành công đến ' . $recipient_name;
            $recipient_note = $transfer_note !== ''
                ? $transfer_note
                : 'Nhận VNSEEA từ ' . $sender_name;
            $extra = array(
                'note' => $transfer_note,
                'sender_id' => $sender_id,
                'sender_name' => $sender_name,
                'recipient_id' => $user_id,
                'recipient_name' => $recipient_name,
                'points' => $amount,
                'action' => 'transfer',
                'type' => 'vnseea_transfer'
            );

            mysqli_begin_transaction($sqlConnect);
            $update_sender = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `points` = `points` - {$amount} WHERE `user_id` = {$sender_id} AND `points` >= {$amount}");
            if (!$update_sender || mysqli_affected_rows($sqlConnect) !== 1) {
                mysqli_rollback($sqlConnect);
                $response_data = array(
                    'api_status' => 400,
                    'errors' => array(
                        'error_id' => '6',
                        'error_text' => 'Transaction failed. Please check your balance.'
                    )
                );
            } else {
                $update_recipient = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `points` = `points` + {$amount} WHERE `user_id` = {$user_id}");
                if (!$update_recipient || mysqli_affected_rows($sqlConnect) !== 1) {
                    mysqli_rollback($sqlConnect);
                    $response_data = array(
                        'api_status' => 400,
                        'errors' => array(
                            'error_id' => '5',
                            'error_text' => 'Please check your details.'
                        )
                    );
                } else {
                    $insert_received = Wo_ApiWalletInsertTransferTransaction($user_id, 'POINTS_EARNED', $amount, $recipient_note, $extra);
                    $insert_sent = Wo_ApiWalletInsertTransferTransaction($sender_id, 'POINTS_DEDUCT', $amount, $sender_note, $extra);
                    if (!$insert_received || !$insert_sent) {
                        $insert_error = mysqli_error($sqlConnect);
                        mysqli_rollback($sqlConnect);
                        $response_data = array(
                            'api_status' => 400,
                            'errors' => array(
                                'error_id' => '7',
                                'error_text' => 'Transaction history failed.'
                            )
                        );
                        error_log('[wallet-api] transaction_insert_failed ' . $insert_error);
                        return;
                    }
                    mysqli_commit($sqlConnect);

                    cache($user_id, 'users', 'delete');
                    cache($sender_id, 'users', 'delete');
                    $sender_points_row = mysqli_fetch_assoc(mysqli_query($sqlConnect, "SELECT `points` FROM " . T_USERS . " WHERE `user_id` = {$sender_id} LIMIT 1"));
                    $recipient_points_row = mysqli_fetch_assoc(mysqli_query($sqlConnect, "SELECT `points` FROM " . T_USERS . " WHERE `user_id` = {$user_id} LIMIT 1"));

                    $notif_msg = $wo['lang']['sent_you'];
                    $notification_data_array = array(
                        'recipient_id' => $user_id,
                        'type' => 'sent_u_money',
                        'user_id' => $sender_id,
                        'text' => "$notif_msg $amount VNSEEA!",
                        'url' => 'index.php?link1=wallet'
                    );
                    Wo_RegisterNotification($notification_data_array);

                    $response_data = array(
                        'api_status' => 200,
                        'status' => 200,
                        'message' => 'VNSEEA của bạn đã được gửi thành công đến ' . $recipient_name,
                        'recipient_id' => (int) $userdata['user_id'],
                        'recipient_name' => (string) $recipient_name,
                        'sender_balance' => isset($sender_points_row['points']) ? (float) $sender_points_row['points'] : 0,
                        'recipient_balance' => isset($recipient_points_row['points']) ? (float) $recipient_points_row['points'] : 0,
                        'sender_points' => isset($sender_points_row['points']) ? (float) $sender_points_row['points'] : 0,
                        'recipient_points' => isset($recipient_points_row['points']) ? (float) $recipient_points_row['points'] : 0,
                        'currency' => 'VNSEEA',
                        'tx' => array(
                            'kind' => 'POINTS_DEDUCT',
                            'amount' => (float) $amount,
                            'notes' => $recipient_name,
                            'transaction_dt' => date('Y-m-d H:i:s')
                        ),
                        'should_close_qr' => true
                    );
                }
            }
        }
    }        
        if ($_POST['type'] == 'top_up') {
            if (!empty($_POST['user_id']) && is_numeric($_POST['user_id']) && $_POST['user_id'] > 0 && !empty($_POST['amount']) && is_numeric($_POST['amount']) && $_POST['amount'] > 0) {
                $user   = Wo_UserData(Wo_Secure($_POST['user_id']));
                $amount = Wo_Secure($_POST['amount']);
                if (!empty($user)) {
                    //encrease wallet value with posted amount
                    $result = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `wallet` = `wallet` + " . $amount . " WHERE `user_id` = '" . $user['id'] . "'");
                    if ($result) {
                        cache($user['id'], 'users', 'delete');
                        $create_payment_log = mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ('" . $user['id'] . "', 'WALLET', '" . $amount . "', 'paypal')");
                    }
                    $user = Wo_UserData(Wo_Secure($_POST['user_id']));
                    $response_data = array(
                                        'api_status' => 200,
                                        'message' => "The money successfully added to your wallet.",
                                        'wallet' => $user['wallet'],
                                        'balance' => $user['balance'],
                                    );
                }
                else{
                    $error_code    = 7;
                    $error_message = 'user not found';
                }
            }
            else{
                $error_code    = 5;
                $error_message = 'Please check your details.';
            }

        }
        if ($_POST['type'] == 'pay') {
            try {
                payValidation();

                if ($_POST['pay_type'] == 'pro') {
                    $img = $wo["pro_packages"][$_POST['pro_type']]['name'];
                    $price = $wo["pro_packages"][$_POST['pro_type']]['price'];
                    $pro_type        = $_POST['pro_type'];
                    
                    $update_array = array(
                        'is_pro' => 1,
                        'pro_time' => time(),
                        'pro_' => 1,
                        'pro_type' => $pro_type
                    );
                    if (in_array($pro_type, array_keys($wo['pro_packages'])) && $wo["pro_packages"][$pro_type]['verified_badge'] == 1) {
                        $update_array['verified'] = 1;
                    }
                    $mysqli             = Wo_UpdateUserData($wo['user']['user_id'], $update_array);

                    $notes = json_encode([
                        'pro_type' => $pro_type,
                        'method_type' => 'wallet'
                    ]);

                    $create_payment_log = mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$wo['user']['user_id']}, 'PRO', {$price}, '{$notes}')");
                    $create_payment     = Wo_CreatePayment($pro_type);

                    if ((!empty($_SESSION['ref']) || !empty($wo['user']['ref_user_id'])) && $wo['config']['affiliate_type'] == 1 && $wo['user']['referrer'] == 0) {
                        affiliateRef($price);
                    }
                    updatePoints($price);
                    
                    cache($wo['user']['id'], 'users', 'delete');

                    $response_data = array(
                        'api_status' => 200,
                        'message' => "upgraded to pro"
                    );
                }
                elseif ($_POST['pay_type'] == 'fund') {
                    $fund_id = Wo_Secure($_POST['fund_id']);
                    $price   = Wo_Secure($_POST['price']);
                    $amount             = $price;
                    $notes              = mb_substr($wo['fund']->title, 0, 100, "UTF-8");
                    $create_payment_log = mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$wo['user']['user_id']}, 'DONATE', {$amount}, '{$notes}')");
                    $wallet_amount      = ($wo["user"]['wallet'] - $price);
                    $query_one          = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `wallet` = '{$wallet_amount}' WHERE `user_id` = {$wo['user']['user_id']} ");
                    cache($wo['user']['id'], 'users', 'delete');
                    $admin_com          = 0;
                    if (!empty($wo['config']['donate_percentage']) && is_numeric($wo['config']['donate_percentage']) && $wo['config']['donate_percentage'] > 0) {
                        $admin_com = ($wo['config']['donate_percentage'] * $amount) / 100;
                        $amount    = $amount - $admin_com;
                    }
                    $user_data = Wo_UserData($wo['fund']->user_id);
                    $db->where('user_id', $wo['fund']->user_id)->update(T_USERS, array(
                        'balance' => $user_data['balance'] + $amount
                    ));
                    cache($wo['fund']->user_id, 'users', 'delete');
                    $fund_raise_id           = $db->insert(T_FUNDING_RAISE, array(
                        'user_id' => $wo['user']['user_id'],
                        'funding_id' => $fund_id,
                        'amount' => $amount,
                        'time' => time()
                    ));
                    $post_data               = array(
                        'user_id' => Wo_Secure($wo['user']['user_id']),
                        'fund_raise_id' => $fund_raise_id,
                        'time' => time(),
                        'multi_image_post' => 0
                    );
                    $id                      = Wo_RegisterPost($post_data);
                    $notification_data_array = array(
                        'recipient_id' => $wo['fund']->user_id,
                        'type' => 'fund_donate',
                        'url' => 'index.php?link1=show_fund&id=' . $wo['fund']->hashed_id
                    );
                    Wo_RegisterNotification($notification_data_array);
                    $response_data = array(
                        'api_status' => 200,
                        'message' => "Payment successfully done"
                    );
                }
                
            } catch (Exception $e) {
                $error_code    = 5;
                $error_message = $e->getMessage();
            }
        }

    }
    else{
        $error_code    = 4;
        $error_message = 'type can not be empty';
    }
