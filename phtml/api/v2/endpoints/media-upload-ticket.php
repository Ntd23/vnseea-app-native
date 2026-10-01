<?php
// English description: Issues a presigned Bunny Stream TUS upload for a chat video, or tells the client to upload to this server.

$purpose = !empty($_POST['purpose']) ? strtolower(trim((string) $_POST['purpose'])) : '';
$file_type = !empty($_POST['file_type']) ? strtolower(trim((string) $_POST['file_type'])) : '';
$file_size = !empty($_POST['file_size']) && is_numeric($_POST['file_size']) ? (int) $_POST['file_size'] : 0;
$file_name = !empty($_POST['file_name']) ? (string) $_POST['file_name'] : 'video.mp4';

if ($purpose !== 'chat') {
    $error_code = 4;
    $error_message = 'purpose is invalid.';
    return;
}
if (strpos($file_type, 'video/') !== 0 || $file_size < 1) {
    $error_code = 5;
    $error_message = 'file_type and file_size must describe a video.';
    return;
}

$ticket = VNSEEA_BunnyCreateUploadTicket((int) $wo['user']['user_id'], $purpose, $file_name, $file_size);
$response_data = $ticket === null
    // Bunny is switched off, incomplete, unreachable or the file is too large:
    // the client keeps using the regular multipart upload.
    ? array('api_status' => 200, 'provider' => 'local')
    : array_merge(array('api_status' => 200, 'provider' => 'bunny_stream'), $ticket);
