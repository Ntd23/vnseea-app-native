<?php
/**
 * One-time backfill for old video posts that do not have postFileThumb.
 *
 * Safe default:
 *   php tools/backfill_video_thumbnails.php
 * runs in dry-run mode and does not update the database.
 *
 * Execute:
 *   php tools/backfill_video_thumbnails.php --execute --limit=500
 *
 * Useful options:
 *   --batch=100          Number of posts fetched per DB page.
 *   --limit=500          Max posts to scan in this run. 0 = no max.
 *   --post-id=123        Process only one post.
 *   --seek=1             Second to capture from each video.
 *   --force              Regenerate even when postFileThumb is already set.
 *   --allow-remote       If local postFile is missing, try Wo_GetMedia(postFile).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

function vnseea_backfill_usage()
{
    echo "Usage: php tools/backfill_video_thumbnails.php [--execute] [--limit=500] [--batch=100] [--post-id=123] [--seek=1] [--force] [--allow-remote]\n";
}

if (in_array('--help', $argv, true)) {
    vnseea_backfill_usage();
    exit(0);
}

$root = dirname(__DIR__);
chdir($root);
require_once $root . '/assets/init.php';

function vnseea_backfill_option_value($argv, $name, $default = null)
{
    $prefix = '--' . $name . '=';
    foreach ($argv as $arg) {
        if (strpos($arg, $prefix) === 0) {
            return substr($arg, strlen($prefix));
        }
    }
    return $default;
}

function vnseea_backfill_has_option($argv, $name)
{
    return in_array('--' . $name, $argv, true);
}

function vnseea_backfill_is_remote_url($value)
{
    return is_string($value) && preg_match('/^https?:\/\//i', $value);
}

function vnseea_backfill_resolve_local_path($root, $path)
{
    if (empty($path) || vnseea_backfill_is_remote_url($path)) {
        return '';
    }
    if (file_exists($path)) {
        return $path;
    }
    $candidate = $root . '/' . ltrim($path, '/\\');
    return file_exists($candidate) ? $candidate : '';
}

function vnseea_backfill_resolve_ffmpeg($root, $configured)
{
    if (empty($configured)) {
        return '';
    }
    if (file_exists($configured)) {
        return $configured;
    }
    $candidate = $root . '/' . ltrim($configured, '/\\');
    return file_exists($candidate) ? $candidate : $configured;
}

function vnseea_backfill_make_thumb($post_id, $video_input, $seek_second, $ffmpeg_binary)
{
    global $wo;

    $dir = 'upload/photos/' . date('Y') . '/' . date('m');
    if (!file_exists($dir)) {
        @mkdir($dir, 0777, true);
    }

    $thumb = $dir . '/' . Wo_GenerateKey() . '_' . (int) $post_id . '_video_thumb.jpeg';
    $cmd = escapeshellarg($ffmpeg_binary)
        . ' -y -ss ' . escapeshellarg((string) $seek_second)
        . ' -i ' . escapeshellarg($video_input)
        . ' -vframes 1 -f mjpeg '
        . escapeshellarg($thumb)
        . ' 2>&1';

    shell_exec($cmd);

    if (!file_exists($thumb) || empty(@getimagesize($thumb))) {
        @unlink($thumb);
        return '';
    }

    Wo_Resize_Crop_Image(525, 295, $thumb, $thumb, $wo['config']['images_quality']);
    if (!file_exists($thumb) || empty(@getimagesize($thumb))) {
        @unlink($thumb);
        return '';
    }

    if (
        $wo['config']['amazone_s3'] == 1 ||
        $wo['config']['wasabi_storage'] == 1 ||
        $wo['config']['backblaze_storage'] == 1 ||
        $wo['config']['ftp_upload'] == 1 ||
        $wo['config']['spaces'] == 1 ||
        $wo['config']['cloud_upload'] == 1
    ) {
        Wo_UploadToS3($thumb);
    }

    return $thumb;
}

$execute = vnseea_backfill_has_option($argv, 'execute');
$force = vnseea_backfill_has_option($argv, 'force');
$allow_remote = vnseea_backfill_has_option($argv, 'allow-remote');
$limit = max(0, (int) vnseea_backfill_option_value($argv, 'limit', 0));
$batch = max(1, min(500, (int) vnseea_backfill_option_value($argv, 'batch', 100)));
$post_id = max(0, (int) vnseea_backfill_option_value($argv, 'post-id', 0));
$seek = (float) vnseea_backfill_option_value($argv, 'seek', 1);
if ($seek < 0) {
    $seek = 1;
}

$ffmpeg = vnseea_backfill_resolve_ffmpeg($root, $wo['config']['ffmpeg_binary_file'] ?? '');
if (empty($ffmpeg)) {
    fwrite(STDERR, "Missing ffmpeg_binary_file in config.\n");
    exit(1);
}

if (!$execute) {
    echo "DRY RUN: add --execute to write postFileThumb values.\n";
}

$video_where = "(`postFile` LIKE '%_video%' OR LOWER(`postFile`) LIKE '%.mp4%' OR LOWER(`postFile`) LIKE '%.m4v%' OR LOWER(`postFile`) LIKE '%.webm%' OR LOWER(`postFile`) LIKE '%.flv%' OR LOWER(`postFile`) LIKE '%.mov%' OR LOWER(`postFile`) LIKE '%.mpeg%' OR LOWER(`postFile`) LIKE '%.mpg%' OR LOWER(`postFile`) LIKE '%.mkv%' OR LOWER(`postFile`) LIKE '%.avi%')";
$thumb_where = $force ? '1=1' : "(`postFileThumb` IS NULL OR `postFileThumb` = '')";
$last_id = 0;
$scanned = 0;
$created = 0;
$updated = 0;
$skipped = 0;
$failed = 0;

while (true) {
    $remaining = $limit > 0 ? $limit - $scanned : $batch;
    if ($limit > 0 && $remaining <= 0) {
        break;
    }
    $page_size = $limit > 0 ? min($batch, $remaining) : $batch;
    $id_where = $post_id > 0 ? "`id` = {$post_id}" : "`id` > {$last_id}";
    $sql = "SELECT `id`, `postFile`, `postFileThumb` FROM " . T_POSTS . " WHERE {$id_where} AND `postFile` <> '' AND {$video_where} AND {$thumb_where} ORDER BY `id` ASC LIMIT {$page_size}";
    $query = mysqli_query($sqlConnect, $sql);
    if (!$query) {
        fwrite(STDERR, "DB query failed: " . mysqli_error($sqlConnect) . "\n");
        exit(1);
    }
    if (mysqli_num_rows($query) === 0) {
        break;
    }

    while ($post = mysqli_fetch_assoc($query)) {
        $scanned++;
        $last_id = (int) $post['id'];
        $video_file = (string) $post['postFile'];
        $video_input = vnseea_backfill_resolve_local_path($root, $video_file);

        if (empty($video_input) && $allow_remote) {
            $video_input = Wo_GetMedia($video_file);
        }

        if (empty($video_input)) {
            $skipped++;
            echo "[skip] #{$post['id']} local video missing: {$video_file}\n";
            continue;
        }

        echo ($execute ? '[make]' : '[dry]') . " #{$post['id']} {$video_file}\n";
        if (!$execute) {
            continue;
        }

        $thumb = vnseea_backfill_make_thumb($post['id'], $video_input, $seek, $ffmpeg);
        if (empty($thumb)) {
            $failed++;
            echo "[fail] #{$post['id']} could not create thumbnail\n";
            continue;
        }

        $created++;
        $safe_thumb = Wo_Secure($thumb, 0);
        $post_id_safe = (int) $post['id'];
        $update = mysqli_query($sqlConnect, "UPDATE " . T_POSTS . " SET `postFileThumb` = '{$safe_thumb}' WHERE `id` = {$post_id_safe} LIMIT 1");
        if ($update) {
            $updated++;
            echo "[ok] #{$post['id']} {$thumb}\n";
        } else {
            $failed++;
            echo "[fail] #{$post['id']} DB update failed: " . mysqli_error($sqlConnect) . "\n";
        }
    }

    if ($post_id > 0) {
        break;
    }
}

echo "Done. scanned={$scanned} created={$created} updated={$updated} skipped={$skipped} failed={$failed}\n";
