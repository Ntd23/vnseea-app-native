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
$response_data = array(
    'api_status' => 400
);

if (empty($_POST['type'])) {
    $error_code    = 3;
    $error_message = 'type (POST) is missing';
}

if (empty($error_code) && !in_array($_POST['type'], array_keys($wo['pro_packages']))) {
    $error_code    = 4;
    $error_message = 'type not found';
}

if (empty($error_code) && in_array($_POST['type'], array_keys($wo['pro_packages']))) {
    $pro_type = Wo_Secure($_POST['type']);
    $package  = $wo['pro_packages'][$pro_type];
    $price    = floatval($package['price']);
    
    // 1. Kiểm tra số dư ví
    $user_wallet = floatval($wo['user']['wallet']);
    if ($user_wallet < $price) {
        $error_code    = 5;
        $error_message = 'Số dư tài khoản trong ví không đủ để thanh toán gói này. Vui lòng nạp thêm tiền.';
    }

    if (empty($error_code)) {
        // 2. Tính toán trừ tiền và trừ điểm tích lũy (nếu có)
        $new_wallet = $user_wallet - $price;
        $points     = 0;
        
        if ($wo['config']['point_level_system'] == 1) {
            $dollar_to_point_cost = floatval($wo['config']['dollar_to_point_cost']);
            $points = $price * $dollar_to_point_cost;
        }
        
        $points_amount = ($wo['config']['point_allow_withdrawal'] == 0) ? ($wo['user']['points'] - $points) : $wo['user']['points'];
        if ($points_amount < 0) {
            $points_amount = 0;
        }

        // 3. Khấu trừ tiền ví và điểm trong CSDL T_USERS
        $query_one = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `points` = '{$points_amount}', `wallet` = '{$new_wallet}' WHERE `user_id` = {$wo['user']['user_id']} ");

        if ($query_one) {
            // 4. Tạo lịch sử giao dịch ví cho người dùng
            $notes = $wo['lang']['upgrade_to_pro'] . " " . $package['name'] . " : Wallet";
            $notes = Wo_Secure($notes);
            $create_payment_log = mysqli_query($sqlConnect, "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`) VALUES ({$wo['user']['user_id']}, 'PRO', {$price}, '{$notes}')");

            // 5. Ghi nhận doanh thu thanh toán hệ thống (cho thống kê Admin)
            Wo_CreatePayment($pro_type);

            // 6. Cập nhật quyền hạn PRO của người dùng
            $update_array = array(
                'is_pro' => 1,
                'pro_time' => time(),
                'pro_' => 1,
                'pro_type' => $pro_type
            );
            
            if (in_array($pro_type, array_keys($wo['pro_packages'])) && $wo['pro_packages'][$pro_type]['verified_badge'] == 1) {
                $update_array['verified'] = 1;
            }
            
            $mysqli = Wo_UpdateUserData($wo['user']['user_id'], $update_array);
            
            if ($mysqli) {
                // Xóa cache người dùng để cập nhật thông tin ngay lập tức
                cache($wo['user']['user_id'], 'users', 'delete');

                $response_data = array(
                    'api_status' => 200,
                    'message_data' => 'Đăng ký gói PRO thành công. Tài khoản của bạn đã được nâng cấp.'
                );
            } else {
                $error_code    = 6;
                $error_message = 'Không thể cập nhật thông tin tài khoản PRO.';
            }
        } else {
            $error_code    = 7;
            $error_message = 'Có lỗi xảy ra trong quá trình trừ tiền từ ví.';
        }
    }
}