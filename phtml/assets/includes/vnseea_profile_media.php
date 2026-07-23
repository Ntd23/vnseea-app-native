<?php

if (!defined('VNSEEA_PROFILE_MEDIA_CONTRACT')) {
    define('VNSEEA_PROFILE_MEDIA_CONTRACT', 'canonical_crop_v1');
}

function VNSEEA_ProfileMediaError($error_code, $http_status = 500, $message = '')
{
    $messages = array(
        'profile_media_invalid_request' => 'Choose exactly one profile image.',
        'profile_media_invalid_file' => 'The selected image is invalid.',
        'profile_media_invalid_geometry' => 'The selected image does not match the required crop.',
        'profile_media_storage_failed' => 'The image could not be stored.',
        'profile_media_update_failed' => 'The profile image could not be updated.',
        'profile_media_post_failed' => 'The profile update post could not be created.',
    );

    return array(
        'api_status' => (int) $http_status,
        'http_status' => (int) $http_status,
        'error_code' => $error_code,
        'message' => $message !== '' ? $message : ($messages[$error_code] ?? 'The profile image could not be updated.'),
        'errors' => array(
            'error_id' => $error_code,
            'error_text' => $message !== '' ? $message : ($messages[$error_code] ?? 'The profile image could not be updated.'),
        ),
    );
}

function VNSEEA_ProfileMediaStorageEnabled()
{
    global $wo;

    return !empty($wo['config']['amazone_s3'])
        || !empty($wo['config']['ftp_upload'])
        || !empty($wo['config']['spaces'])
        || !empty($wo['config']['cloud_upload'])
        || !empty($wo['config']['wasabi_storage'])
        || !empty($wo['config']['backblaze_storage']);
}

function VNSEEA_CleanupProfileMediaFiles($paths)
{
    foreach (array_unique(array_filter($paths)) as $path) {
        Wo_DeleteFromToS3($path);
        if (file_exists($path)) {
            @unlink($path);
        }
    }
}

function VNSEEA_ProfileMediaKindFromFiles($files)
{
    $has_avatar = !empty($files['avatar']['tmp_name']);
    $has_cover = !empty($files['cover']['tmp_name']);

    if ($has_avatar === $has_cover) {
        return '';
    }

    return $has_avatar ? 'avatar' : 'cover';
}

function VNSEEA_ProfileMediaImageMatchesContract($kind, $image_size)
{
    if (empty($image_size[0]) || empty($image_size[1])) {
        return false;
    }

    $expected_ratio = $kind === 'avatar' ? 1.0 : (16.0 / 9.0);
    $actual_ratio = (float) $image_size[0] / (float) $image_size[1];

    return abs($actual_ratio - $expected_ratio) <= 0.02;
}

function VNSEEA_HandleCanonicalProfileMediaRequest($files, $user_id)
{
    global $wo, $db;

    $kind = VNSEEA_ProfileMediaKindFromFiles($files);
    if ($kind === '' || empty($user_id) || !is_numeric($user_id)) {
        return VNSEEA_ProfileMediaError('profile_media_invalid_request', 400);
    }

    $file = $files[$kind];
    if (
        !isset($file['error'])
        || (int) $file['error'] !== UPLOAD_ERR_OK
        || empty($file['tmp_name'])
        || !is_uploaded_file($file['tmp_name'])
    ) {
        return VNSEEA_ProfileMediaError('profile_media_invalid_file', 400);
    }

    $image_size = @getimagesize($file['tmp_name']);
    $allowed_mimes = array('image/jpeg', 'image/png', 'image/gif', 'image/webp');
    if (empty($image_size['mime']) || !in_array($image_size['mime'], $allowed_mimes, true)) {
        return VNSEEA_ProfileMediaError('profile_media_invalid_file', 400);
    }
    if (!VNSEEA_ProfileMediaImageMatchesContract($kind, $image_size)) {
        return VNSEEA_ProfileMediaError('profile_media_invalid_geometry', 422);
    }

    $directory = 'upload/photos/' . date('Y') . '/' . date('m');
    if (!is_dir($directory) && !@mkdir($directory, 0777, true) && !is_dir($directory)) {
        return VNSEEA_ProfileMediaError('profile_media_storage_failed', 500);
    }

    $base_name = Wo_GenerateKey() . '_' . date('d') . '_' . md5(uniqid((string) $user_id, true)) . '_' . $kind;
    $profile_path = $directory . '/' . $base_name . '.jpg';
    $full_path = $directory . '/' . $base_name . '_full.jpg';
    $created_paths = array($profile_path, $full_path);

    if (!@move_uploaded_file($file['tmp_name'], $profile_path)) {
        return VNSEEA_ProfileMediaError('profile_media_storage_failed', 500);
    }

    $target_width = $kind === 'avatar' ? 1080 : 1600;
    $target_height = $kind === 'avatar' ? 1080 : 900;
    $quality = !empty($wo['config']['images_quality']) ? (int) $wo['config']['images_quality'] : 80;
    if (
        !Wo_Resize_Crop_Image($target_width, $target_height, $profile_path, $profile_path, $quality)
        || !@copy($profile_path, $full_path)
    ) {
        VNSEEA_CleanupProfileMediaFiles($created_paths);
        return VNSEEA_ProfileMediaError('profile_media_storage_failed', 500);
    }

    $blur = 0;
    if (!empty($wo['config']['adult_images']) && detect_safe_search(Wo_GetMedia($profile_path)) === false) {
        if (!empty($wo['config']['adult_images_action'])) {
            $blur = 1;
        } else {
            VNSEEA_CleanupProfileMediaFiles($created_paths);
            return VNSEEA_ProfileMediaError('profile_media_invalid_file', 422);
        }
    }

    if (VNSEEA_ProfileMediaStorageEnabled()) {
        $full_uploaded = Wo_UploadToS3($full_path);
        $profile_uploaded = Wo_UploadToS3($profile_path);
        if (!$full_uploaded || !$profile_uploaded) {
            VNSEEA_CleanupProfileMediaFiles($created_paths);
            return VNSEEA_ProfileMediaError('profile_media_storage_failed', 500);
        }
    }

    $user_id = (int) $user_id;
    $now = time();
    $post_type = $kind === 'avatar' ? 'profile_picture' : 'profile_cover_picture';
    $last_modified_column = $kind === 'avatar' ? 'last_avatar_mod' : 'last_cover_mod';
    $user_update = array(
        $kind => $profile_path,
        $last_modified_column => $now,
    );
    if ($kind === 'avatar') {
        $user_update['startup_image'] = 1;
    }

    $db->startTransaction();
    try {
        $locked_user = $db->rawQueryOne(
            'SELECT `user_id` FROM ' . T_USERS . ' WHERE `user_id` = ? FOR UPDATE',
            array($user_id)
        );
        if (empty($locked_user)) {
            throw new RuntimeException('profile_media_update_failed');
        }

        $updated = $db->where('user_id', $user_id)->update(T_USERS, $user_update);
        if (!$updated) {
            throw new RuntimeException('profile_media_update_failed');
        }

        $post_id = $db->insert(T_POSTS, array(
            'user_id' => $user_id,
            'postFile' => $full_path,
            'postText' => '',
            'time' => $now,
            'postType' => $post_type,
            'postPrivacy' => '0',
            'blur' => $blur,
            'ai_post' => 0,
        ));
        if (empty($post_id)) {
            throw new RuntimeException('profile_media_post_failed');
        }

        $post_finalized = $db->where('id', $post_id)->update(T_POSTS, array(
            'post_id' => (string) $post_id,
        ));
        if (!$post_finalized) {
            throw new RuntimeException('profile_media_post_failed');
        }

        if (!$db->commit()) {
            throw new RuntimeException('profile_media_update_failed');
        }
    } catch (Throwable $exception) {
        $db->rollback();
        VNSEEA_CleanupProfileMediaFiles($created_paths);
        $error_code = in_array($exception->getMessage(), array(
            'profile_media_update_failed',
            'profile_media_post_failed',
        ), true)
            ? $exception->getMessage()
            : 'profile_media_update_failed';
        error_log('[profile-media] ' . $error_code . ' user_id=' . $user_id . ' kind=' . $kind);
        return VNSEEA_ProfileMediaError($error_code, 500);
    }

    cache($user_id, 'users', 'delete');
    $cache_suffix = '?cache=' . $now;

    return array(
        'api_status' => 200,
        'http_status' => 200,
        'message' => 'Your profile image was updated',
        'profile_media' => array(
            'kind' => $kind,
            'url' => Wo_GetMedia($profile_path) . $cache_suffix,
            'full_url' => Wo_GetMedia($full_path) . $cache_suffix,
            'post_id' => (string) $post_id,
            'post_type' => $post_type,
        ),
    );
}
