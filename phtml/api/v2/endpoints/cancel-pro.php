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

if ($wo['user']['is_pro'] == 0) {
    $error_code    = 5;
    $error_message = 'Tài khoản của bạn hiện tại không đăng ký bất kỳ gói PRO nào.';
}

if (empty($error_code)) {
    $user_id = $wo['user']['user_id'];
    
    // 1. Cập nhật trạng thái người dùng (hủy PRO, đặt loại PRO về rỗng, tắt huy hiệu xác minh)
    $mysql_query = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `is_pro` = '0', `pro_type` = '0', `verified` = '0' WHERE `user_id` = {$user_id}");
    
    if ($mysql_query) {
        // 2. Tắt boost quảng cáo của trang
        mysqli_query($sqlConnect, "UPDATE " . T_PAGES . " SET `boosted` = '0' WHERE `user_id` = {$user_id}");
        
        // 3. Tắt boost quảng cáo bài viết cá nhân
        mysqli_query($sqlConnect, "UPDATE " . T_POSTS . " SET `boosted` = '0' WHERE `user_id` = {$user_id}");
        
        // 4. Tắt boost quảng cáo bài viết trên các trang thuộc quyền sở hữu của user
        mysqli_query($sqlConnect, "UPDATE " . T_POSTS . " SET `boosted` = '0' WHERE `page_id` IN (SELECT `page_id` FROM " . T_PAGES . " WHERE `user_id` = {$user_id})");
        
        // 5. Xóa bộ nhớ đệm (cache) người dùng
        cache($user_id, 'users', 'delete');
        
        $response_data = array(
            'api_status' => 200,
            'message_data' => 'Hủy gói PRO thành công. Tài khoản của bạn đã được chuyển về gói thường.'
        );
    } else {
        $error_code    = 6;
        $error_message = 'Có lỗi xảy ra trong quá trình hủy gói PRO trên hệ thống.';
    }
}
