<?php
// Group post authorization must happen before link previews or uploads are
// processed. Without this guard Wo_RegisterPost persists the row, then
// Wo_PostData hides it from the non-member author, making the client report a
// false failure while active group members can still see the post.
if (!empty($_POST['group_id'])) {
    $requested_group_id = Wo_Secure($_POST['group_id']);
    $requested_group = Wo_GroupData($requested_group_id);

    if (empty($requested_group['id'])) {
        $error_code = 15;
        $error_message = 'Group not found';
        return;
    }

    $can_post_to_group = Wo_IsGroupOnwer($requested_group_id) === true ||
                         Wo_IsGroupJoined($requested_group_id) === true;
    if (!$can_post_to_group) {
        $error_code = 16;
        $error_message = 'You must join this group before posting.';
        return;
    }
}

if (!empty($_POST['postText'])) {


    if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $_POST["postText"], $match)) {
        $youtube_video = Wo_Secure($match[1]);
        $api_request   = file_get_contents('https://www.googleapis.com/youtube/v3/videos?id=' . $youtube_video . '&key=AIzaSyDoOC41IwRzX5XvP7bNiCJXJfcK14HalM0&part=snippet,contentDetails,statistics,status');
        $thumbnail     = '';
        if (!empty($api_request)) {
            $json_decode = json_decode($api_request);
            if (!empty($json_decode->items[0]->snippet)) {
                if (!empty($json_decode->items[0]->snippet->thumbnails->maxres->url)) {
                    $thumbnail = $json_decode->items[0]->snippet->thumbnails->maxres->url;
                }
                if (!empty($json_decode->items[0]->snippet->thumbnails->medium->url)) {
                    $thumbnail = $json_decode->items[0]->snippet->thumbnails->medium->url;
                }
                $info        = $json_decode->items[0]->snippet;
                $title       = $info->title;
                $description = $info->description;
                if (!empty($json_decode->items[0]->snippet->tags)) {
                    if (is_array($json_decode->items[0]->snippet->tags)) {
                        foreach ($json_decode->items[0]->snippet->tags as $key => $tag) {
                            $tags_array[] = $tag;
                        }
                        $tags = implode(',', $tags_array);
                    }
                }
            }
            // $output = array(
            //     'title' => $title,
            //     'images' => array(
            //         $thumbnail
            //     ),
            //     'content' => $description,
            //     'url' => $_POST["postText"]
            // );

            $_POST['url_title'] = $title;
            $_POST['url_content'] = $description;
            $_POST['url_image'] = $thumbnail;
            $_POST['url_link'] = $_POST["postText"];
        }
    } else if (isset($_POST["postText"])) {
        $link_regex = '/(http\:\/\/|https\:\/\/|www\.)([^\ ]+)/i';
        $i          = 0;
        preg_match_all($link_regex, $_POST['postText'], $matches);
        if (!empty($matches) && !empty($matches[0]) && !empty($matches[0][0])) {
            //include_once("assets/libraries/simple_html_dom.inc.php");
            $page_title = '';
            $image_urls = array();
            $page_body  = '';
            $get_url    = strip_tags($matches[0][0]);
            $save = IsSaveUrl($get_url);
            if ($save['status'] == 200) {
                if ($save['type'] == 'image') {
                    $get_image = getimagesize($get_url);
                    $image_urls[] = $get_url;
                    $page_title   = 'Image';
                }
                else {
                    include_once("assets/libraries/simple_html_dom.inc.php");
                    $get_content = file_get_html($get_url);
                    foreach ($get_content->find('title') as $element) {
                        @$page_title = $element->plaintext;
                    }
                    if (empty($page_title)) {
                        $page_title = '';
                    }
                    @$page_body = $get_content->find("meta[name='description']", 0)->content;
                    $page_body = mb_substr($page_body, 0, 250, "utf-8");
                    if ($page_body === false) {
                        $page_body = '';
                    }
                    if (empty($page_body)) {
                        @$page_body = $get_content->find("meta[property='og:description']", 0)->content;
                        $page_body = mb_substr($page_body, 0, 250, "utf-8");
                        if ($page_body === false) {
                            $page_body = '';
                        }
                    }
                    $image_urls = array();
                    @$page_image = $get_content->find("meta[property='og:image']", 0)->content;
                    if (!empty($page_image)) {
                        if (preg_match('/[\w\-]+\.(jpg|png|gif|jpeg)/', $page_image)) {
                            $image_urls[] = $page_image;
                        }
                    } else {
                        foreach ($get_content->find('img') as $element) {
                            if (!preg_match('/blank.(.*)/i', $element->src)) {
                                if (preg_match('/[\w\-]+\.(jpg|png|gif|jpeg)/', $element->src)) {
                                    $image_urls[] = $element->src;
                                }
                            }
                        }
                    }
                }
                $_POST['url_title'] = $page_title;
                $_POST['url_content'] = $page_body;
                $_POST['url_image'] = $image_urls[0];
                $_POST['url_link'] = $_POST["postText"];
            }
        }
    }

}



$video_thumb   = '';
$media         = '';
$mediaFilename = '';
$mediaName     = '';
$html          = '';
$recipient_id  = 0;
$page_id       = 0;
$event_id       = 0;
$group_id      = 0;
$image_array   = array();
$single_photo_uploaded = false;
$should_register_album_photos = false;
$created_post_media_files = array();
$post_media_geometry = VNSEEA_NormalizeMediaGeometry(
    isset($_POST['media_width']) ? $_POST['media_width'] : 0,
    isset($_POST['media_height']) ? $_POST['media_height'] : 0
);
$photo_media_geometries = VNSEEA_NormalizeMediaGeometryList(
    isset($_POST['photo_media_geometry']) ? $_POST['photo_media_geometry'] : array()
);
if (!empty($_FILES['postPhotos']['tmp_name']) && is_array($_FILES['postPhotos']['tmp_name'])) {
    foreach ($_FILES['postPhotos']['tmp_name'] as $index => $tmp_name) {
        $detected_geometry = VNSEEA_ReadImageMediaGeometry($tmp_name);
        if ($detected_geometry) {
            $photo_media_geometries[(int) $index] = $detected_geometry;
        }
    }
    if (count($_FILES['postPhotos']['tmp_name']) === 1 && !empty($photo_media_geometries[0])) {
        $post_media_geometry = $photo_media_geometries[0];
    }
}
$cleanup_created_post_media = function () use (&$created_post_media_files) {
    foreach (array_unique(array_filter($created_post_media_files)) as $path) {
        Wo_DeleteFromToS3($path);
        if (file_exists($path)) {
            @unlink($path);
        }
    }
    $created_post_media_files = array();
};
if (!function_exists('Vnseea_ResolveVideoPostPath')) {
    function Vnseea_ResolveVideoPostPath($video_filename) {
        if (empty($video_filename)) {
            return '';
        }
        if (file_exists($video_filename)) {
            return $video_filename;
        }
        $root_video_path = dirname(dirname(dirname(__DIR__))) . '/' . ltrim($video_filename, '/\\');
        return file_exists($root_video_path) ? $root_video_path : '';
    }
}

if (!function_exists('Vnseea_ResolveFfmpegBinary')) {
    function Vnseea_ResolveFfmpegBinary() {
        global $wo;
        $candidates = array();
        if (!empty($wo['config']['ffmpeg_binary_file'])) {
            $candidates[] = $wo['config']['ffmpeg_binary_file'];
        }
        $candidates[] = '/usr/bin/ffmpeg';
        $candidates[] = '/usr/local/bin/ffmpeg';
        $candidates[] = '/bin/ffmpeg';

        foreach ($candidates as $candidate) {
            if (!empty($candidate) && file_exists($candidate)) {
                return $candidate;
            }
        }
        if (function_exists('shell_exec')) {
            $from_path = trim((string) shell_exec('command -v ffmpeg 2>/dev/null'));
            if (!empty($from_path)) {
                return $from_path;
            }
        }
        return '';
    }
}

if (!function_exists('Vnseea_CreateVideoPostThumb')) {
    function Vnseea_CreateVideoPostThumb($video_filename) {
        global $wo;
        if (empty($video_filename)) {
            error_log('[vnseea-thumb] Missing video filename');
            return '';
        }
        if (!function_exists('shell_exec')) {
            error_log('[vnseea-thumb] shell_exec is disabled');
            return '';
        }
        $ffmpeg_b = Vnseea_ResolveFfmpegBinary();
        if (empty($ffmpeg_b)) {
            error_log('[vnseea-thumb] ffmpeg binary not found');
            return '';
        }
        $video_path = Vnseea_ResolveVideoPostPath($video_filename);
        if (empty($video_path)) {
            error_log('[vnseea-thumb] Video file not found: ' . $video_filename);
            return '';
        }
        $dir = 'upload/photos/' . date('Y') . '/' . date('m');
        if (!file_exists($dir)) {
            @mkdir($dir, 0777, true);
        }
        $image_thumb = $dir . '/' . Wo_GenerateKey() . '_' . date('d') . '_' . md5($video_filename . microtime(true)) . '_video_thumb.jpeg';
        $output = shell_exec(escapeshellarg($ffmpeg_b) . ' -y -ss 1 -i ' . escapeshellarg($video_path) . ' -vframes 1 -f mjpeg ' . escapeshellarg($image_thumb) . ' 2>&1');
        if (file_exists($image_thumb) && !empty(@getimagesize($image_thumb))) {
            Wo_Resize_Crop_Image(525, 295, $image_thumb, $image_thumb, $wo['config']['images_quality']);
            if ($wo['config']['amazone_s3'] == 1 || $wo['config']['wasabi_storage'] == 1 || $wo['config']['backblaze_storage'] == 1 || $wo['config']['ftp_upload'] == 1 || $wo['config']['spaces'] == 1 || $wo['config']['cloud_upload'] == 1) {
                Wo_UploadToS3($image_thumb);
            }
            return $image_thumb;
        }
        @unlink($image_thumb);
        error_log('[vnseea-thumb] ffmpeg did not create a valid thumbnail for ' . $video_filename . ': ' . substr((string) $output, 0, 500));
        return '';
    }
}
if (isset($_POST['recipient_id']) && !empty($_POST['recipient_id'])) {
    $recipient_id = Wo_Secure($_POST['recipient_id']);
} else if (isset($_POST['page_id']) && !empty($_POST['page_id'])) {
    $page_id = Wo_Secure($_POST['page_id']);
} else if (isset($_POST['event_id']) && !empty($_POST['event_id'])) {
    $event_id = Wo_Secure($_POST['event_id']);
} else if (isset($_POST['group_id']) && !empty($_POST['group_id'])) {
    $group_id = Wo_Secure($_POST['group_id']);
    $group    = Wo_GroupData($group_id);
    if (!empty($group['id'])) {
        if ($group['privacy'] == 1) {
            $_POST['postPrivacy'] = 0;
        } else if ($group['privacy'] == 2) {
            $_POST['postPrivacy'] = 2;
        }
    }
}
if (isset($_FILES['postFile']['name'])) {
    $generic_image_geometry = VNSEEA_ReadImageMediaGeometry($_FILES['postFile']['tmp_name']);
    if ($generic_image_geometry) {
        $post_media_geometry = $generic_image_geometry;
    }
    $fileInfo = array(
        'file' => $_FILES["postFile"]["tmp_name"],
        'name' => $_FILES['postFile']['name'],
        'size' => $_FILES["postFile"]["size"],
        'type' => $_FILES["postFile"]["type"]
    );
    $media    = Wo_ShareFile($fileInfo);
    if (!empty($media)) {
        $mediaFilename = $media['filename'];
        $mediaName     = $media['name'];
    }
    if (empty($mediaFilename)) {
    	$error_code    = 7;
		$error_message = 'invalid file';
    }
}
$not_video = true;
$ffmpeg_convert_video = '';
if (isset($_FILES['postVideo']['name']) && empty($mediaFilename)) {
    if (!$post_media_geometry) {
        $post_media_geometry = VNSEEA_ProbeVideoMediaGeometry(
            $_FILES['postVideo']['tmp_name'],
            isset($wo['config']['ffmpeg_binary_file']) ? $wo['config']['ffmpeg_binary_file'] : ''
        );
    }
    $mimeType = mime_content_type($_FILES['postVideo']['tmp_name']);
    $fileType = explode('/', $mimeType)[0]; // video|image
    if ($fileType === 'video' && Wo_IsFfmpegFileAllowed($_FILES['postVideo']['name']) && !Wo_IsVideoNotAllowedMime($_FILES["postVideo"]["type"])) {
        $not_video = false;
    }
    if ($wo['config']['ffmpeg_system'] == 'on' && $not_video) {
        $error_code    = 8;
        $error_message = 'invalid file';
        $response_data = array(
            'api_status' => '404',
            'errors' => array(
                'error_id' => $error_code,
                'error_text' => $error_message
            )
        );
        echo json_encode($response_data, JSON_PRETTY_PRINT);
        exit();
    }
    $fileInfo = array(
        'file' => $_FILES["postVideo"]["tmp_name"],
        'name' => $_FILES['postVideo']['name'],
        'size' => $_FILES["postVideo"]["size"],
        'type' => $_FILES["postVideo"]["type"]
    );
    if ($wo['config']['ffmpeg_system'] != 'on') {
        $fileInfo['types'] = 'mp4,m4v,webm,flv,mov,mpeg,mkv';
    }
    $preserve_video_for_thumb = empty($_FILES['video_thumb']) &&
        $wo['config']['ffmpeg_system'] != 'on' &&
        (
            $wo['config']['amazone_s3'] == 1 ||
            $wo['config']['wasabi_storage'] == 1 ||
            $wo['config']['backblaze_storage'] == 1 ||
            $wo['config']['ftp_upload'] == 1 ||
            $wo['config']['spaces'] == 1 ||
            $wo['config']['cloud_upload'] == 1
        );
    if ($preserve_video_for_thumb) {
        // Wo_UploadToS3() removes the local video after remote upload.
        // Keep it until ffmpeg extracts a poster frame, then upload it below.
        $fileInfo['local_upload'] = 1;
    }
    if ($wo['config']['ffmpeg_system'] == 'on') {
        if ($not_video == false) {
            $fileInfo['is_video'] = 1;
        }
        $amazone_s3                   = $wo['config']['amazone_s3'];
        $wasabi_storage               = $wo['config']['wasabi_storage'];
        $backblaze_storage               = $wo['config']['backblaze_storage'];
        $ftp_upload                   = $wo['config']['ftp_upload'];
        $spaces                       = $wo['config']['spaces'];
        $cloud_upload                 = $wo['config']['cloud_upload'];
        $wo['config']['amazone_s3']   = 0;
        $wo['config']['wasabi_storage']   = 0;
        $wo['config']['backblaze_storage']   = 0;
        $wo['config']['ftp_upload']   = 0;
        $wo['config']['spaces']       = 0;
        $wo['config']['cloud_upload'] = 0;
    }
    $media    = Wo_ShareFile($fileInfo);
    if ($wo['config']['ffmpeg_system'] == 'on') {
        $wo['config']['amazone_s3']   = $amazone_s3;
        $wo['config']['wasabi_storage']   = $wasabi_storage;
        $wo['config']['backblaze_storage']   = $backblaze_storage;
        $wo['config']['ftp_upload']   = $ftp_upload;
        $wo['config']['spaces']       = $spaces;
        $wo['config']['cloud_upload'] = $cloud_upload;
    }
    if (!empty($media)) {
        $mediaFilename = $media['filename'];
        $mediaName     = $media['name'];
        if (!empty($mediaFilename) && $wo['config']['ffmpeg_system'] == 'on') {
            $ffmpeg_convert_video = $mediaFilename;
        }
        $img_types = array(
                        'image/png',
                        'image/jpeg',
                        'image/jpg',
                        'image/gif'
                    );
        if (!empty($_FILES['video_thumb']) && in_array($_FILES["video_thumb"]["type"], $img_types)) {
            $fileInfo = array(
                'file' => $_FILES["video_thumb"]["tmp_name"],
                'name' => $_FILES['video_thumb']['name'],
                'size' => $_FILES["video_thumb"]["size"],
                'type' => $_FILES["video_thumb"]["type"],
                'types' => 'jpeg,png,jpg,gif',
                'crop' => array(
                    'width' => 525,
                    'height' => 295
                )
            );
            $media    = Wo_ShareFile($fileInfo);
            if (!empty($media)) {
                $video_thumb = $media['filename'];
            }
        }
        // Always create a lightweight poster when the client did not send one.
        // This keeps Feed/Reels from decoding video frames while scrolling.
        if (empty($video_thumb)) {
            $video_thumb = Vnseea_CreateVideoPostThumb($mediaFilename);
        }
        if ($preserve_video_for_thumb && !empty($mediaFilename) && file_exists($mediaFilename)) {
            Wo_UploadToS3($mediaFilename);
        }
    }
    if (empty($mediaFilename)) {
    	$error_code    = 8;
		$error_message = 'invalid file';
    }
}
if (isset($_FILES['postMusic']['name']) && empty($mediaFilename)) {
    $fileInfo = array(
        'file' => $_FILES["postMusic"]["tmp_name"],
        'name' => $_FILES['postMusic']['name'],
        'size' => $_FILES["postMusic"]["size"],
        'type' => $_FILES["postMusic"]["type"],
        'types' => 'mp3,wav'
    );
    $media    = Wo_ShareFile($fileInfo);
    if (!empty($media)) {
        $mediaFilename = $media['filename'];
        $mediaName     = $media['name'];
    }
    if (empty($mediaFilename)) {
    	$error_code    = 9;
		$error_message = 'invalid file';
    }
}
$multi = 0;
if (isset($_FILES['postPhotos']['name']) && empty($mediaFilename) && empty($_POST['album_name'])) {
    
    if (count($_FILES['postPhotos']['name']) == 1) {
        if ($_FILES['postPhotos']['size'][0] > $wo['config']['maxUpload']) {
            $invalid_file = 1;
        } else if (Wo_IsFileAllowed($_FILES['postPhotos']['name'][0]) == false) {
            $invalid_file = 2;
        } else {
            $fileInfo = array(
                'file' => $_FILES["postPhotos"]["tmp_name"][0],
                'name' => $_FILES['postPhotos']['name'][0],
                'size' => $_FILES["postPhotos"]["size"][0],
                'type' => $_FILES["postPhotos"]["type"][0]
            );
            $media    = Wo_ShareFile($fileInfo);
            if (!empty($media)) {
                $mediaFilename = $media['filename'];
                $mediaName     = $media['name'];
                $single_photo_uploaded = true;
                $created_post_media_files[] = $mediaFilename;
            }
            if (empty($mediaFilename)) {
            	$error_code    = 10;
				$error_message = 'invalid file';
            }
        }
    } else {
        $multi = 1;
    }
}
if (!empty($mediaFilename)) {
    $created_post_media_files[] = $mediaFilename;
}
if (!empty($video_thumb)) {
    $created_post_media_files[] = $video_thumb;
}
$privacy = VNSEEA_NormalizePostPrivacyRequest($_POST);
$post_privacy = $privacy['postPrivacy'];
$is_anonymous = $privacy['is_anonymous'];
$tagged_users = VNSEEA_NormalizeTaggedUserIds(isset($_POST['tagged_user_ids']) ? $_POST['tagged_user_ids'] : array());
if (!$tagged_users['valid']) {
    $error_code = 16;
    $error_message = $tagged_users['error_code'];
} elseif (!empty($tagged_users['ids']) && !empty($is_anonymous)) {
    $error_code = 17;
    $error_message = 'Anonymous posts cannot tag people.';
}
$tagged_user_ids = $tagged_users['valid'] ? $tagged_users['ids'] : array();
$import_url_image = '';
$url_link         = '';
$url_content      = '';
$url_title        = '';
if (!empty($_POST['url_link']) && !empty($_POST['url_title'])) {
    $url_link  = $_POST['url_link'];
    $url_title = $_POST['url_title'];
    if (!empty($_POST['url_content'])) {
        $url_content = $_POST['url_content'];
    }
    if (!empty($_POST['url_image'])) {
        $import_url_image = @Wo_ImportImageFromUrl($_POST['url_image']);
    }
}
$post_text = '';
$post_map  = '';
if (!empty($_POST['postText']) && !ctype_space($_POST['postText'])) {
    $post_text = $_POST['postText'];
}
if (!empty($_POST['postMap'])) {
    $post_map = $_POST['postMap'];
}
if (empty($post_text) && empty($post_map) && !empty($url_link) && !empty($url_title)) {
    $post_map = $url_title;
}
$album_name = '';
if (!empty($_POST['album_name'])) {
    $album_name = $_POST['album_name'];
}
if (!isset($_FILES['postPhotos']['name'])) {
    $album_name = '';
}
$should_register_album_photos = isset($_FILES['postPhotos']['name']) && !$single_photo_uploaded;
$traveling = '';
$watching  = '';
$playing   = '';
$listening = '';
$feeling   = '';
if (!empty($_POST['feeling_type'])) {
    $array_types = array(
        'feelings',
        'traveling',
        'watching',
        'playing',
        'listening'
    );
    if (in_array($_POST['feeling_type'], $array_types)) {
        if ($_POST['feeling_type'] == 'feelings') {
            if (!empty($_POST['feeling'])) {
                if (array_key_exists($_POST['feeling'], $wo['feelingIcons'])) {
                    $feeling = $_POST['feeling'];
                }
            }
        } else if ($_POST['feeling_type'] == 'traveling') {
            if (!empty($_POST['feeling'])) {
                $traveling = $_POST['feeling'];
            }
        } else if ($_POST['feeling_type'] == 'watching') {
            if (!empty($_POST['feeling'])) {
                $watching = $_POST['feeling'];
            }
        } else if ($_POST['feeling_type'] == 'playing') {
            if (!empty($_POST['feeling'])) {
                $playing = $_POST['feeling'];
            }
        } else if ($_POST['feeling_type'] == 'listening') {
            if (!empty($_POST['feeling'])) {
                $listening = $_POST['feeling'];
            }
        }
    }
}
if (isset($_FILES['postPhotos']['name'])) {
    $allowed = array(
        'gif',
        'png',
        'jpg',
        'jpeg'
    );
    for ($i = 0; $i < count($_FILES['postPhotos']['name']); $i++) {
        if (count($_FILES['postPhotos']['name']) > 1) {
            $new_string = pathinfo($_FILES['postPhotos']['name'][$i]);
        } else {
            $new_string = pathinfo($_FILES['postPhotos']['name'][0]);
        }
        if (!in_array(strtolower($new_string['extension']), $allowed)) {
        	$error_code    = 11;
			$error_message = 'please check details';
        }
    }
}
if (!empty($_POST['answer']) && array_filter($_POST['answer'])) {
    if (!empty($_POST['postText'])) {
        foreach ($_POST['answer'] as $key => $value) {
            if (empty($value) || ctype_space($value)) {
            	$error_code    = 12;
				$error_message = 'Answer #' . ($key + 1) . ' is empty.';
            }
        }
    } else {
    	$error_code    = 13;
		$error_message = 'Please write the question.';
    }
}
if (empty($error_message)) {
    $is_option = false;
    if (!empty($_POST['answer']) && array_filter($_POST['answer'])) {
        $is_option = true;
    }
    $post_active = 1;
    if ($wo['config']['post_approval'] == 1 && !Wo_IsAdmin()) {
        $post_active = 0;
    }
    $mediaName = VNSEEA_NormalizePostFileName($mediaName);
    $post_data = array(
        'user_id' => $wo['user']['user_id'],
        'page_id' => Wo_Secure($page_id),
        'event_id' => Wo_Secure($event_id),
        'group_id' => Wo_Secure($group_id),
        'postText' => Wo_Secure($post_text),
        'recipient_id' => Wo_Secure($recipient_id),
        'postFile' => Wo_Secure($mediaFilename, 0),
        'postFileName' => Wo_Secure($mediaName),
        'postMap' => Wo_Secure($post_map),
        'postPrivacy' => Wo_Secure($post_privacy),
        'is_anonymous' => Wo_Secure($is_anonymous),
        'postLinkTitle' => Wo_Secure($url_title),
        'postLinkContent' => Wo_Secure($url_content),
        'postLink' => Wo_Secure($url_link),
        'postLinkImage' => Wo_Secure($import_url_image, 0),
        'album_name' => Wo_Secure($album_name),
        'multi_image' => Wo_Secure($multi),
        'postFeeling' => Wo_Secure($feeling),
        'postListening' => Wo_Secure($listening),
        'postPlaying' => Wo_Secure($playing),
        'postWatching' => Wo_Secure($watching),
        'postTraveling' => Wo_Secure($traveling),
        'postFileThumb' => Wo_Secure($video_thumb),
        'active' => $post_active,
        'time' => time(),
        'multi_image_post' => 0,
    );
    if ($post_media_geometry && VNSEEA_PostMediaGeometryColumnsAvailable()) {
        $post_data['media_width'] = (int) $post_media_geometry['width'];
        $post_data['media_height'] = (int) $post_media_geometry['height'];
    }
    if (isset($_POST['postSticker']) && Wo_IsUrl($_POST['postSticker']) && empty($_FILES) && empty($_POST['postRecord'])) {
        $_POST['postSticker'] = preg_replace('/on[^<>=]+=[^<>]*/m', '', $_POST['postSticker']);
        $_POST['postSticker'] = preg_replace('/\((.*?)\)/m', '', $_POST['postSticker']);
        $_POST['postSticker'] = strip_tags($_POST['postSticker']);
        $post_data['postSticker'] = $_POST['postSticker'];
    } else if (empty($_FILES['postPhotos']) && preg_match_all('/https?:\/\/(?:[^\s]+)\.(?:png|jpg|gif|jpeg)/', $post_data['postText'], $matches)) {
        if (!empty($matches[0][0]) && Wo_IsUrl($matches[0][0])) {
            $post_data['postPhoto'] = @Wo_ImportImageFromUrl($matches[0][0]);
        }
    }
    if (!empty($_POST['postType'])) {
        $post_data['postType'] = Wo_Secure($_POST['postType']);
    }
    if (!empty($is_option)) {
        $post_data['poll_id'] = 1;
    }
    if (!empty($ffmpeg_convert_video) && !empty($tagged_user_ids)) {
        $post_data['_vnseea_tagged_user_ids'] = $tagged_user_ids;
    }
    if (!empty($_POST['post_color']) && !empty($post_text) && empty($_POST['postRecord']) && empty($mediaFilename) && empty($mediaName) && empty($post_map) && empty($url_title) && empty($url_content) && empty($url_link) && empty($import_url_image) && empty($album_name) && empty($multi) && empty($video_thumb) && empty($post_data['postPhoto'])) {
        $post_data['color_id'] = Wo_Secure($_POST['post_color']);
    }
    if (!empty($ffmpeg_convert_video)) {
        $ffmpeg_b             = $wo['config']['ffmpeg_binary_file'];
        $video_file_full_path = Vnseea_ResolveVideoPostPath($ffmpeg_convert_video);
        $video_info           = !empty($video_file_full_path) ? shell_exec(escapeshellarg($ffmpeg_b) . " -i " . escapeshellarg($video_file_full_path) . " 2>&1") : '';
        $re                   = '/[0-9]{3}+x[0-9]{3}/m';
        preg_match_all($re, $video_info, $min_str);
        $resolution = 0;
        if (!empty($min_str) && !empty($min_str[0]) && !empty($min_str[0][0])) {
            $substr = substr($video_info, strpos($video_info, $min_str[0][0]) - 3, 15);
            $re     = '/[0-9]+x[0-9]+/m';
            preg_match_all($re, $substr, $resolutions);
            if (!empty($resolutions) && !empty($resolutions[0]) && !empty($resolutions[0][0])) {
                $resolution = substr($resolutions[0][0], 0, strpos($resolutions[0][0], 'x'));
            }
        }
        $ret = array(
            'status' => 300
        );
        if ($resolution >= 640 || $resolution == 0) {
            $ret = array(
                'status' => 200,
                'message' => 'Your video is in process'
            );
        }
        ob_end_clean();
        header("Content-Encoding: none");
        header("Connection: close");
        ignore_user_abort();
        ob_start();
        header('Content-Type: application/json');
        echo json_encode($ret);
        $size = ob_get_length();
        header("Content-Length: $size");
        ob_end_flush();
        flush();
        session_write_close();
        if (is_callable('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        if (is_callable('litespeed_finish_request')) {
            litespeed_finish_request();
        }
        try {
            $id = FFMPEGUpload(array(
                'filename' => $ffmpeg_convert_video,
                'id' => $id,
                'video_thumb' => $video_thumb,
                'post_data' => $post_data
            ));
        } catch (Throwable $caught) {
            error_log('[vnseea-new-post] ffmpeg_finalize_failed user_id=' . (int) $wo['user']['user_id'] . ' code=' . (int) $caught->getCode());
            $id = false;
            $error_code = 23;
            $error_message = 'Unable to create post.';
        }
    } else {
        $post_transaction_started = false;
        $requires_post_transaction = !empty($tagged_user_ids)
            || $is_option === true
            || $should_register_album_photos;
        if ($requires_post_transaction) {
            $post_transaction_started = mysqli_begin_transaction($sqlConnect);
            if (!$post_transaction_started) {
                $error_code = 18;
                $error_message = 'Unable to start post transaction.';
            }
        }
        if (!empty($error_message)) {
            $id = false;
        } else {
            try {
                $id = Wo_RegisterPost($post_data);
            } catch (Throwable $caught) {
                error_log('[vnseea-new-post] register_failed user_id=' . (int) $wo['user']['user_id'] . ' code=' . (int) $caught->getCode());
                $id = false;
                $error_code = 23;
                $error_message = 'Unable to create post.';
            }
        }
    }

    if ($id) {
        $post_dependencies_valid = true;
        $post_dependency_error = '';
        if ($is_option == true) {
            foreach ($_POST['answer'] as $key => $value) {
                $add_opition = Wo_AddOption($id, $value);
                if (!$add_opition) {
                    $post_dependencies_valid = false;
                    $post_dependency_error = 'post_options_save_failed';
                }
            }
        }
        if ($should_register_album_photos) {
            if (count($_FILES['postPhotos']['name']) > 0) {
                for ($i = 0; $i < count($_FILES['postPhotos']['name']); $i++) {
                    $fileInfo = array(
                        'file' => $_FILES["postPhotos"]["tmp_name"][$i],
                        'name' => $_FILES['postPhotos']['name'][$i],
                        'size' => $_FILES["postPhotos"]["size"][$i],
                        'type' => $_FILES["postPhotos"]["type"][$i],
                        'types' => 'jpg,png,jpeg,gif'
                    );
                    $file     = Wo_ShareFile($fileInfo, 1);
                    if (!empty($file)) {
                        $created_post_media_files[] = $file['filename'];
                        $media_album = Wo_RegisterAlbumMedia(
                            $id,
                            $file['filename'],
                            0,
                            isset($photo_media_geometries[$i]) ? $photo_media_geometries[$i] : null
                        );
                        if (!$media_album) {
                            $post_dependencies_valid = false;
                            $post_dependency_error = 'post_media_save_failed';
                        }
                    } else {
                        $post_dependencies_valid = false;
                        $post_dependency_error = 'post_media_save_failed';
                    }
                }
            }
        }
        $tags_saved = true;
        if (!empty($tagged_user_ids) && empty($ffmpeg_convert_video)) {
            $tags_saved = $post_dependencies_valid
                ? VNSEEA_SavePostTaggedUsers($id, (int) $wo['user']['user_id'], $tagged_user_ids)
                : false;
        }
        if (!$post_dependencies_valid) {
            if ($post_transaction_started) {
                mysqli_rollback($sqlConnect);
            }
            $post_transaction_started = false;
            $id = false;
            $error_code = $post_dependency_error === 'post_media_save_failed' ? 20 : 21;
            $error_message = $post_dependency_error === 'post_media_save_failed'
                ? 'Unable to save post media.'
                : 'Unable to save post content.';
        } elseif (!$tags_saved) {
            if ($post_transaction_started) {
                mysqli_rollback($sqlConnect);
            }
            $post_transaction_started = false;
            $id = false;
            $error_code = 19;
            $error_message = 'Unable to save tagged people.';
        } elseif ($post_transaction_started && !mysqli_commit($sqlConnect)) {
            mysqli_rollback($sqlConnect);
            $post_transaction_started = false;
            $id = false;
            $error_code = 22;
            $error_message = 'Unable to commit post.';
        } else {
            $post_transaction_started = false;
            if (!empty($tagged_user_ids) && empty($ffmpeg_convert_video)) {
                VNSEEA_NotifyPostTaggedUsers($id, (int) $wo['user']['user_id'], $tagged_user_ids);
            }
        }
    }

    if ($id) {
        $wo['story'] = Wo_PostData($id);
        $html .= Wo_LoadPage('story/content');
        $wo['story']['shared_info'] = null;

        if (!empty($wo['story']['postFile'])) {
            $wo['story']['postFile'] = Wo_GetMedia($wo['story']['postFile']);
        }
        if (!empty($wo['story']['postFileThumb'])) {
            $wo['story']['postFileThumb'] = Wo_GetMedia($wo['story']['postFileThumb']);
        }
        if (!empty($wo['story']['postPlaytube'])) {
            $wo['story']['postText'] = strip_tags($wo['story']['postText']);
        }



        if (!empty($wo['story']['publisher'])) {
            foreach ($non_allowed as $key4 => $value4) {
              unset($wo['story']['publisher'][$value4]);
            }
        }
        else{
            $wo['story']['publisher'] = null;
        }

        if (!empty($wo['story']['user_data'])) {
            foreach ($non_allowed as $key4 => $value4) {
              unset($wo['story']['user_data'][$value4]);
            }
        }
        else{
            $wo['story']['user_data'] = null;
        }

        if (!empty($wo['story']['parent_id'])) {
            $shared_info = Wo_PostData($wo['story']['parent_id']);
            if (!empty($shared_info)) {
                if (!empty($shared_info['publisher'])) {
                    foreach ($non_allowed as $key4 => $value4) {
                      unset($shared_info['publisher'][$value4]);
                    }
                }
                else{
                    $shared_info['publisher'] = null;
                }

                if (!empty($shared_info['user_data'])) {
                    foreach ($non_allowed as $key4 => $value4) {
                      unset($shared_info['user_data'][$value4]);
                    }
                }
                else{
                    $shared_info['user_data'] = null;
                }

                if (!empty($shared_info['get_post_comments'])) {
                    foreach ($shared_info['get_post_comments'] as $key3 => $comment) {

                        foreach ($non_allowed as $key5 => $value5) {
                          unset($shared_info['get_post_comments'][$key3]['publisher'][$value5]);
                        }
                    }
                }
            }
            $wo['story']['shared_info'] = $shared_info;
        }

        if (!empty($value['get_post_comments'])) {
            foreach ($value['get_post_comments'] as $key3 => $comment) {

                foreach ($non_allowed as $key5 => $value5) {
                  unset($wo['story']['get_post_comments'][$key3]['publisher'][$value5]);
                }
            }
        }
        if ($post_active == 1) {
            $response_data = array('api_status' => 200,
                                   'post_html' => $html,
                                   'post_data' => $wo['story']);
        }
        else{
            $response_data = array('api_status' => 200,
                                   'message' => 'Post is under review',
                                   'code' => 'review');
        }

            
    }
    else{
        if (!empty($post_transaction_started)) {
            mysqli_rollback($sqlConnect);
            $post_transaction_started = false;
        }
        $cleanup_created_post_media();
        if (empty($error_code)) {
            $error_code = 14;
        }
        if (empty($error_message)) {
            $error_message = 'something went wrong';
        }
    }
}
if (!empty($error_message) && !empty($created_post_media_files)) {
    $cleanup_created_post_media();
}
