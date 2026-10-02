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

$story_type = !empty($_POST['story_type']) ? Wo_Secure($_POST['story_type']) : 'media';
$is_shared_post = $story_type === 'shared_post';
$source_post_id = 0;

if (!in_array($story_type, array('media', 'shared_post'), true)) {
    $error_code = 2;
    $error_message = 'Incorrect value for story_type, allowed: media|shared_post';
}
// A video the app already uploaded to Bunny Stream arrives as an upload id instead of a file.
$bunny_story_upload_id = !$is_shared_post && empty($_FILES["file"]["tmp_name"]) && !empty($_POST['bunny_upload_id'])
    ? (string) $_POST['bunny_upload_id']
    : '';
if (!$is_shared_post && empty($_FILES["file"]["tmp_name"]) && $bunny_story_upload_id === '') {
    $error_code    = 3;
    $error_message = 'file (STREAM FILE) is missing';
}
if (isset($_POST['story_title']) && strlen($_POST['story_title']) > 100) {
    $error_code    = 4;
    $error_message = 'Title is so long';
}
if (isset($_POST['story_description']) && strlen($_POST['story_description']) > 300) {
    $error_code    = 5;
    $error_message = 'Description is so long';
}
if (!$is_shared_post && empty($_POST['file_type'])) {
    $error_code    = 6;
    $error_message = 'file_type (POST) is missing';
} else if (!$is_shared_post && !in_array($_POST['file_type'], array(
        'video',
        'image'
    ))) {
    $error_code    = 7;
    $error_message = 'Incorrect value for (file_type), allowed: video|image';
}
if ($is_shared_post) {
    $requested_source_id = isset($_POST['source_post_id']) ? trim((string) $_POST['source_post_id']) : '';
    if (!preg_match('/^[1-9][0-9]*$/', $requested_source_id)) {
        $error_code = 8;
        $error_message = 'source_post_id (POST) is invalid';
    } else {
        $source_post_id = VNSEEA_ResolveShareableSourcePostId(
            (int) $requested_source_id,
            (int) $wo['user']['id']
        );
        if ($source_post_id < 1) {
            $error_code = 9;
            $error_message = 'The source post is unavailable or cannot be shared';
        }
    }
}

if (empty($error_code)) {
    $amazone_s3                   = $wo['config']['amazone_s3'];
    $wasabi_storage                   = $wo['config']['wasabi_storage'];
    $backblaze_storage                   = $wo['config']['backblaze_storage'];
    $ftp_upload                   = $wo['config']['ftp_upload'];
    $spaces                       = $wo['config']['spaces'];
    $cloud_upload                 = $wo['config']['cloud_upload'];
    $story_title       = (!empty($_POST['story_title'])) ? Wo_Secure($_POST['story_title']) : '';
    $story_description = (!empty($_POST['story_description'])) ? Wo_Secure($_POST['story_description']) : '';
    $file_type         = $is_shared_post ? '' : Wo_Secure($_POST['file_type']);
    $story_privacy     = VNSEEA_NormalizeStoryPrivacyRequest($_POST);
    $story_data        = array(
        'user_id' => $wo['user']['id'],
        'privacy' => $story_privacy['privacy'],
        'posted' => time(),
        'expire' => time()+(60*60*24),
        'title' => $story_title,
        'description' => $story_description,
        'story_type' => $story_type
    );
    if ($is_shared_post) {
        $story_data['source_post_id'] = $source_post_id;
    }
    if ($bunny_story_upload_id !== '') {
        // The story is created only once Bunny has encoded the video
        // (VNSEEA_BunnyPublishStory), so viewers never open one that cannot play.
        $bunny_upload = $file_type === 'video'
            ? VNSEEA_BunnyReservePublishUpload($wo['user']['id'], $bunny_story_upload_id, 'story')
            : null;
        if (empty($bunny_upload)) {
            $error_code    = 3;
            $error_message = 'file (STREAM FILE) is missing';
            return;
        }
        $bunny_thumb = '';
        $img_types = array('image/png', 'image/jpeg', 'image/jpg', 'image/gif');
        if (!empty($_FILES["cover"]) && in_array($_FILES["cover"]["type"], $img_types)) {
            $media = Wo_ShareFile(array(
                'file' => $_FILES["cover"]["tmp_name"],
                'name' => $_FILES['cover']['name'],
                'size' => $_FILES["cover"]["size"],
                'type' => $_FILES["cover"]["type"]
            ));
            if (!empty($media['filename']) && in_array(strtolower(pathinfo($media['filename'], PATHINFO_EXTENSION)), array('gif', 'jpg', 'png', 'jpeg'))) {
                // Same 9:16 rail thumbnail as uploaded video stories get below.
                $cover_file = $media['filename'];
                $cover_parts = explode('.', $cover_file);
                $cover_extension = end($cover_parts);
                $bunny_thumb = $cover_parts[0] . '_small.' . $cover_extension;
                $cover_context = stream_context_create(array('ssl' => array('verify_peer' => false, 'verify_peer_name' => false)));
                $cover_content = @file_get_contents(Wo_GetMedia($cover_file), false, $cover_context);
                if (!empty($cover_content)) {
                    @file_put_contents($cover_file, $cover_content);
                }
                Wo_Resize_Crop_Image(540, 960, $cover_file, $bunny_thumb, $wo['config']['images_quality']);
                Wo_UploadToS3($bunny_thumb);
            }
        }
        $bunny_mentions = array();
        if (!empty($story_overlay['items']) && is_array($story_overlay['items'])) {
            foreach ($story_overlay['items'] as $overlay_item) {
                if (!is_array($overlay_item) || (isset($overlay_item['kind']) ? $overlay_item['kind'] : '') !== 'mention') {
                    continue;
                }
                $mentioned_user_id = isset($overlay_item['userId']) ? (int) $overlay_item['userId'] : 0;
                if ($mentioned_user_id > 0 && $mentioned_user_id != $wo['user']['id']) {
                    $bunny_mentions[$mentioned_user_id] = $mentioned_user_id;
                }
                if (count($bunny_mentions) >= 10) {
                    break;
                }
            }
        }
        $bunny_payload = array(
            'privacy' => $story_privacy['privacy'],
            'title' => isset($_POST['story_title']) ? (string) $_POST['story_title'] : '',
            'description' => isset($_POST['story_description']) ? (string) $_POST['story_description'] : '',
            'overlay_data' => is_array($story_overlay) && !empty($story_overlay) ? json_encode($story_overlay, JSON_UNESCAPED_SLASHES) : '',
            'thumbnail' => $bunny_thumb,
            'mention_user_ids' => array_values($bunny_mentions)
        );
        if (!VNSEEA_BunnyAttachPendingPublish($bunny_upload['id'], $bunny_payload)) {
            VNSEEA_BunnyReleaseReservation($bunny_upload['id']);
            $error_code    = 11;
            $error_message = 'Unable to create story.';
            return;
        }
        // Publishes at once when Bunny already finished encoding.
        $bunny_row = VNSEEA_BunnyFinalizePublish($bunny_upload['id']);
        $response_data = array(
            'api_status' => 200,
            'code' => 'processing',
            'story_id' => !empty($bunny_row['story_id']) ? (int) $bunny_row['story_id'] : 0,
            'bunny_upload' => array(
                'upload_id' => (string) $bunny_upload['id'],
                'status' => VNSEEA_BunnyClientUploadStatus(!empty($bunny_row['status']) ? (string) $bunny_row['status'] : 'uploaded'),
                'publish_state' => !empty($bunny_row['publish_state']) ? (string) $bunny_row['publish_state'] : 'pending',
                'needs_review' => false,
                'story_id' => !empty($bunny_row['story_id']) ? (string) $bunny_row['story_id'] : ''
            )
        );
        return;
    }
    $last_id           = Wo_InsertUserStory($story_data);
    if ($last_id && is_numeric($last_id) && $is_shared_post) {
        $response_data = array(
            'api_status' => 200,
            'story_id' => $last_id,
            'story_type' => 'shared_post',
            'source_post_id' => $source_post_id
        );
    } else if ($last_id && is_numeric($last_id) && !empty($_FILES["file"]["tmp_name"])) {
        $true     = false;
        $sources  = array();
        $fileInfo = array(
            'file' => $_FILES["file"]["tmp_name"],
            'name' => $_FILES['file']['name'],
            'size' => $_FILES["file"]["size"],
            'type' => $_FILES["file"]["type"],
            'types' => 'jpg,png,mp4,gif,jpeg,mov,webm'
        );
        $media    = Wo_ShareFile($fileInfo);
        if (!empty($media)) {
            $filename = $media['filename'];
        }
        if ($filename) {
            $sources[] = array(
                'story_id' => $last_id,
                'type' => Wo_Secure($file_type),
                'filename' => $filename,
                'expire' => time()+(60*60*24)
            );
            $img_types     = array(
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/gif'
            );
            $thumb     = '';
            if (empty($thumb)) {
                if (in_array(strtolower(pathinfo($media['filename'], PATHINFO_EXTENSION)), array(
                                    "m4v",
                                    "avi",
                                    "mpg",
                                    'mp4'
                                )) && !empty($_FILES["cover"]) && in_array($_FILES["cover"]["type"], $img_types)) {
                    $fileInfo = array(
                        'file' => $_FILES["cover"]["tmp_name"],
                        'name' => $_FILES['cover']['name'],
                        'size' => $_FILES["cover"]["size"],
                        'type' => $_FILES["cover"]["type"]
                    );
                    $media            = Wo_ShareFile($fileInfo);
                    $file_type        = explode('/', $fileInfo['type']);
                    if (empty($thumb)) {
                        if (in_array(strtolower(pathinfo($media['filename'], PATHINFO_EXTENSION)), array(
                            "gif",
                            "jpg",
                            "png",
                            'jpeg'
                        ))) {
                            $thumb             = $media['filename'];
                            $explode2          = @end(explode('.', $thumb));
                            $explode3          = @explode('.', $thumb);
                            $last_file         = $explode3[0] . '_small.' . $explode2;
                            $arrContextOptions = array(
                                "ssl" => array(
                                    "verify_peer" => false,
                                    "verify_peer_name" => false
                                )
                            );
                            $fileget           = file_get_contents(Wo_GetMedia($thumb), false, stream_context_create($arrContextOptions));
                            if (!empty($fileget)) {
                                $importImage = @file_put_contents($thumb, $fileget);
                            }
                            // Story thumbnails keep the 9:16 story frame at a size the home rail can show sharply;
                            // a 400x400 square crop looked blurry and cut off the top and bottom of the story.
                            $crop_image = Wo_Resize_Crop_Image(540, 960, $thumb, $last_file, $wo['config']['images_quality']);
                            $upload_s3  = Wo_UploadToS3($last_file);
                            $thumb      = $last_file;
                        }
                    }
                }
            }
        }
        if (count($sources) > 0) {
            foreach ($sources as $registration_data) {
                Wo_InsertUserStoryMedia($registration_data);
            }
            if (empty($thumb) && $wo['config']['ffmpeg_system'] == 'on' && $file_type == 'video') {
                $ffmpeg_b         = $wo['config']['ffmpeg_binary_file'];
                $total_seconds    = ffmpeg_duration($media['filename']);
                $thumb_1_duration = (int) ($total_seconds > 10) ? 11 : 1;
                $dir              = "upload/photos/" . date('Y') . '/' . date('m');
                $image_thumb      = $dir . '/' . Wo_GenerateKey() . '_' . date('d') . '_' . md5(time()) . "_image.jpeg";
                $output_thumb     = shell_exec("$ffmpeg_b -ss \"$thumb_1_duration\" -i " . $media['filename'] . " -vframes 1 -f mjpeg $image_thumb 2<&1");
                if (file_exists($image_thumb) && !empty(getimagesize($image_thumb))) {
                    // Story thumbnails keep the 9:16 story frame at a size the home rail can show sharply;
                    // a 400x400 square crop looked blurry and cut off the top and bottom of the story.
                    $crop_image                   = Wo_Resize_Crop_Image(540, 960, $image_thumb, $image_thumb, $wo['config']['images_quality']);
                    $wo['config']['amazone_s3']   = $amazone_s3;
                    $wo['config']['wasabi_storage']   = $wasabi_storage;
                    $wo['config']['backblaze_storage']   = $backblaze_storage;
                    $wo['config']['ftp_upload']   = $ftp_upload;
                    $wo['config']['spaces']       = $spaces;
                    $wo['config']['cloud_upload'] = $cloud_upload;
                    Wo_UploadToS3($image_thumb);
                    $thumb = $image_thumb;
                } else {
                    @unlink($image_thumb);
                }
                $wo['config']['amazone_s3']   = $amazone_s3;
                $wo['config']['wasabi_storage']   = $wasabi_storage;
                $wo['config']['backblaze_storage']   = $backblaze_storage;
                $wo['config']['ftp_upload']   = $ftp_upload;
                $wo['config']['spaces']       = $spaces;
                $wo['config']['cloud_upload'] = $cloud_upload;
                Wo_UploadToS3($media['filename']);
            }
            if (!empty($thumb)) {
                $thumb        = Wo_Secure($thumb);
                $mysqli_query = mysqli_query($sqlConnect, "UPDATE " . T_USER_STORY . " SET thumbnail = '$thumb' WHERE id = $last_id");
            }
            $response_data = array(
                'api_status' => 200,
                'story_id' => $last_id
            );
        }
    }
}

if (isset($response_data['api_status'])
    && $response_data['api_status'] === 200
    && !empty($response_data['story_id'])
    && function_exists('VNSEEA_EnqueueFollowerContentNotification')) {
    VNSEEA_EnqueueFollowerContentNotification('story',
        (int) $response_data['story_id'],
        (int) $wo['user']['id']
    );
}
