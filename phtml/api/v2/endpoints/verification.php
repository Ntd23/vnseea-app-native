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
elseif (empty($_POST['name'])) {
    $error_code    = 3;
    $error_message = 'name (POST) is missing';
}
elseif (empty($_POST['text'])) {
    $error_code    = 4;
    $error_message = 'text (POST) is missing';
}
elseif (empty($_FILES['passport'])) {
    $error_code    = 5;
    $error_message = 'passport (POST) is missing';
}
elseif (empty($_FILES['photo'])) {
    $error_code    = 6;
    $error_message = 'photo (POST) is missing';
}
elseif (strlen($_POST['name']) < 5 || strlen($_POST['name']) > 50) {
    $error_code    = 7;
    $error_message = 'name must be between 5 / 50';
}
elseif (!file_exists($_FILES['passport']['tmp_name']) || !file_exists($_FILES['photo']['tmp_name'])) {
    $error_code    = 8;
    $error_message = 'images can not be empty';
}
else {
    if (file_exists($_FILES["passport"]["tmp_name"])) {
        $image = getimagesize($_FILES["passport"]["tmp_name"]);
        if (empty($image) || !in_array($image[2], $allowed_image_types)) {
            $error_code    = 9;
            $error_message = 'The passport/id picture must be an image';
        }
    }

    if (file_exists($_FILES["photo"]["tmp_name"])) {
        $image = getimagesize($_FILES["photo"]["tmp_name"]);
        if (empty($image) || !in_array($image[2], $allowed_image_types)) {
            $error_code    = 10;
            $error_message = 'The user picture must be an image';
        }
    }

    if (empty($error_code)) {
        $registration_data = array(
            'user_id' => $wo['user']['id'],
            'message' => Wo_Secure($_POST['text']),
            'user_name' => Wo_Secure($_POST['name']),
            'passport' => '',
            'photo' => '',
            'type' => 'User',
            'seen' => 0
        );
        $last_id = Wo_SendVerificationRequest($registration_data);
        if ($last_id && is_numeric($last_id)) {
            $files = array(
                'passport' => $_FILES,
                'photo' => $_FILES
            );
            $update_data = array();
            foreach ($files as $key => $file) {
                $fileInfo = array(
                    'file' => $file[$key]["tmp_name"],
                    'name' => $file[$key]['name'],
                    'size' => $file[$key]["size"],
                    'type' => $file[$key]["type"],
                    'types' => 'jpg,jpeg,png,bmp,gif,webp'
                );
                $media = Wo_ShareFile($fileInfo);
                $update_data[$key] = $media['filename'];
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
