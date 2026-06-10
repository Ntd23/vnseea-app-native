<?php
// English description: Handles legacy API verification submissions and exposes verification state for Nuxt.

$response_data = array(
    'api_status' => 400,
);

$allowed_image_types = array(
    IMAGETYPE_GIF,
    IMAGETYPE_JPEG,
    IMAGETYPE_PNG,
    IMAGETYPE_BMP
);
if (defined('IMAGETYPE_WEBP')) {
    $allowed_image_types[] = IMAGETYPE_WEBP;
}

$is_status_request = (
    $_SERVER['REQUEST_METHOD'] === 'GET' ||
    (!empty($_POST['type']) && $_POST['type'] === 'status')
);

if ($is_status_request) {
    if ($wo['loggedin'] == false) {
        $error_code    = 4;
        $error_message = 'Authentication is required.';
    }
    else {
        $available_features = array();

        if (!empty($wo['available_verified_features']) && is_array($wo['available_verified_features'])) {
            foreach ($wo['available_verified_features'] as $feature) {
                $available_features[] = array(
                    'key' => $feature,
                    'label' => (!empty($wo['lang'][$feature]) ? $wo['lang'][$feature] : $feature)
                );
            }
        }

        $username = (!empty($wo['user']['username']) ? $wo['user']['username'] : '');

        $response_data = array(
            'api_status' => 200,
            'data' => array(
                'is_admin' => Wo_IsAdmin(),
                'admin_redirect_url' => Wo_SeoLink('index.php?link1=admincp&page=s_requests'),
                'is_shop' => (!empty($wo['user']['is_shop']) && (int)$wo['user']['is_shop'] === 1),
                'verified' => (!empty($wo['user']['verified']) && (int)$wo['user']['verified'] === 1),
                'has_pending_request' => Wo_IsVerificationRequestExists(),
                'available_verified_features' => $available_features,
                'user' => array(
                    'id' => (!empty($wo['user']['id']) ? $wo['user']['id'] : $wo['user']['user_id']),
                    'name' => (!empty($wo['user']['name']) ? $wo['user']['name'] : $username),
                    'username' => $username,
                    'avatar' => (!empty($wo['user']['avatar']) ? $wo['user']['avatar'] : ''),
                    'url' => ($username ? Wo_SeoLink('index.php?link1=timeline&u=' . $username) : '')
                )
            )
        );
    }
}
else {
    $verification_type = (!empty($_POST['verification_type']) && $_POST['verification_type'] == 'shop') ? 'shop' : 'user';
    $is_shop_request = ($verification_type == 'shop');
    $request_name = !empty($_POST['name']) ? $_POST['name'] : (!empty($_POST['full_name']) ? $_POST['full_name'] : '');
    $request_message = $is_shop_request ? (!empty($_POST['text_shop']) ? $_POST['text_shop'] : '') : (!empty($_POST['text']) ? $_POST['text'] : 'Verification request');
    $required_files = $is_shop_request ? array('passport', 'photo', 'shop_image', 'license') : array('passport', 'photo');

    if (empty($request_name)) {
        $error_code    = 3;
        $error_message = 'name (POST) is missing';
    }
    elseif (empty($request_message)) {
        $error_code    = 4;
        $error_message = $is_shop_request ? 'text_shop (POST) is missing' : 'text (POST) is missing';
    }
    elseif (strlen($request_name) < 5 || strlen($request_name) > 50) {
        $error_code    = 7;
        $error_message = 'name must be between 5 / 50';
    }
    else {
        foreach ($required_files as $file_key) {
            if (empty($_FILES[$file_key]) || !file_exists($_FILES[$file_key]['tmp_name'])) {
                $error_code    = 8;
                $error_message = $file_key . ' (POST) is missing or empty';
                break;
            }
        }
    }

    if (empty($error_code)) {
        foreach ($required_files as $file_key) {
            $file_type = !empty($_FILES[$file_key]['type']) ? $_FILES[$file_key]['type'] : '';
            if ($file_key == 'license' && $file_type == 'application/pdf') {
                continue;
            }
            $image = getimagesize($_FILES[$file_key]["tmp_name"]);
            if (empty($image) || !in_array($image[2], $allowed_image_types)) {
                $error_code    = ($file_key == 'passport') ? 9 : 10;
                $error_message = ($file_key == 'passport') ? 'The passport/id picture must be an image' : 'The uploaded document must be an image';
                break;
            }
        }
    }

    if (empty($error_code)) {
        $registration_data = array(
            'user_id' => $wo['user']['id'],
            'message' => Wo_Secure($request_message),
            'user_name' => Wo_Secure($request_name),
            'passport' => '',
            'photo' => '',
            'type' => $is_shop_request ? 'Shop' : 'User',
            'seen' => 0
        );
        if (!$is_shop_request) {
            $registration_data['dob'] = !empty($_POST['dob']) ? Wo_Secure($_POST['dob']) : '';
            $registration_data['cccd'] = !empty($_POST['cccd']) ? Wo_Secure($_POST['cccd']) : '';
        }
        if ($is_shop_request) {
            $registration_data['shop_image'] = '';
            $registration_data['license'] = '';
        }
        $last_id = Wo_SendVerificationRequest($registration_data);
        if ($last_id && is_numeric($last_id)) {
            $update_data = array();
            foreach ($required_files as $key) {
                $fileInfo = array(
                    'file' => $_FILES[$key]["tmp_name"],
                    'name' => $_FILES[$key]['name'],
                    'size' => $_FILES[$key]["size"],
                    'type' => $_FILES[$key]["type"],
                    'types' => ($key == 'license' ? 'jpg,jpeg,png,bmp,gif,webp,pdf' : 'jpg,jpeg,png,bmp,gif,webp')
                );
                $media = Wo_ShareFile($fileInfo);
                if (!empty($media['filename'])) {
                    $update_data[$key] = $media['filename'];
                }
            }
            if (Wo_UpdateVerificationRequest($last_id, $update_data)) {
                $response_data = array(
                    'api_status' => 200,
                    'message' => "Your request was successfully sent, in the very near future we will consider it!"
                );
            }
        }
    }
}
