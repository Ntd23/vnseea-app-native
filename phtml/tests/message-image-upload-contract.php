<?php
// English description: Verifies chat image uploads skip server re-encoding when already optimized and are normalized once otherwise.

$root = dirname(__DIR__);

function message_image_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function message_image_exif_segment($entries, $gps_entries = array())
{
    // Little-endian TIFF with IFD0 at offset 8 and an optional GPS IFD after it.
    $ifd0_count = count($entries) + (empty($gps_entries) ? 0 : 1);
    $ifd0_size = 2 + $ifd0_count * 12 + 4;
    $gps_offset = 8 + $ifd0_size;
    $ifd0 = pack('v', $ifd0_count);
    foreach ($entries as $entry) {
        $ifd0 .= $entry;
    }
    if (!empty($gps_entries)) {
        $ifd0 .= pack('vvVV', 0x8825, 4, 1, $gps_offset);
    }
    $ifd0 .= pack('V', 0);
    $gps = '';
    if (!empty($gps_entries)) {
        $gps = pack('v', count($gps_entries)) . implode('', $gps_entries) . pack('V', 0);
    }
    $payload = "Exif\0\0" . 'II' . pack('v', 42) . pack('V', 8) . $ifd0 . $gps;
    return "\xFF\xE1" . pack('n', strlen($payload) + 2) . $payload;
}

function message_image_write_jpeg($path, $width, $height, $exif_segment = '')
{
    $image = imagecreatetruecolor($width, $height);
    imagefilledrectangle($image, 0, 0, (int) ($width / 2) - 1, $height - 1, imagecolorallocate($image, 255, 0, 0));
    imagefilledrectangle($image, (int) ($width / 2), 0, $width - 1, $height - 1, imagecolorallocate($image, 0, 0, 255));
    ob_start();
    imagejpeg($image, null, 90);
    $jpeg = ob_get_clean();
    imagedestroy($image);
    if ($exif_segment !== '') {
        $jpeg = substr($jpeg, 0, 2) . $exif_segment . substr($jpeg, 2);
    }
    file_put_contents($path, $jpeg);
}

function message_image_rgb($image, $x, $y)
{
    $color = imagecolorat($image, $x, $y);
    return array(($color >> 16) & 0xFF, ($color >> 8) & 0xFF, $color & 0xFF);
}

function message_image_info($path, $type = 'image/jpeg')
{
    return array(
        'file' => $path,
        'name' => basename($path),
        'size' => filesize($path),
        'type' => $type,
    );
}

$helper_path = $root . '/assets/includes/vnseea_message_media.php';
message_image_assert(file_exists($helper_path), 'message media helper must exist');
require_once $helper_path;

$directory = sys_get_temp_dir() . '/vnseea-message-image-' . bin2hex(random_bytes(6));
mkdir($directory);

try {
    // An already optimized upload is stored byte-for-byte.
    $small = $directory . '/small.jpg';
    message_image_write_jpeg($small, 1200, 900);
    $small_hash = sha1_file($small);
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($small));
    message_image_assert($result['compress'] === false, 'optimized images must skip Wo_CompressImage');
    message_image_assert(sha1_file($small) === $small_hash, 'optimized images must not be re-encoded');

    // Legacy full-resolution uploads are scaled down once.
    $large = $directory . '/large.jpg';
    message_image_write_jpeg($large, 4000, 3000);
    $large_size = filesize($large);
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($large));
    $size = getimagesize($large);
    message_image_assert($result['compress'] === false, 'scaled images must skip a second encode');
    message_image_assert($size[0] === 2048 && $size[1] === 1536, 'large images must fit within 2048px');
    message_image_assert($result['size'] === filesize($large), 'file size must describe the replaced upload');
    message_image_assert($result['size'] < $large_size, 'scaled image must be smaller');
    message_image_assert(!file_exists($large . '.vnseea-message-image'), 'temporary output must be removed');

    // EXIF orientation 6 is baked into the pixels and the tag disappears.
    $rotated = $directory . '/rotated.jpg';
    message_image_write_jpeg($rotated, 1000, 500, message_image_exif_segment(array(
        pack('vvVvv', 0x0112, 3, 1, 6, 0),
    )));
    message_image_assert((int) exif_read_data($rotated)['Orientation'] === 6, 'fixture must carry orientation 6');
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($rotated));
    $size = getimagesize($rotated);
    message_image_assert($result['compress'] === false, 'rotated images must skip a second encode');
    message_image_assert($size[0] === 500 && $size[1] === 1000, 'orientation 6 must produce an upright portrait image');
    $exif = @exif_read_data($rotated);
    message_image_assert(empty($exif['Orientation']) || (int) $exif['Orientation'] === 1, 'rotated output must not keep the orientation tag');
    $image = imagecreatefromjpeg($rotated);
    $top = message_image_rgb($image, 250, 20);
    $bottom = message_image_rgb($image, 250, 980);
    imagedestroy($image);
    message_image_assert($top[0] > 200 && $top[2] < 60, 'the original left edge must be on top after rotation');
    message_image_assert($bottom[2] > 200 && $bottom[0] < 60, 'the original right edge must be at the bottom after rotation');

    // Location metadata is always stripped, even from small images.
    $located = $directory . '/located.jpg';
    message_image_write_jpeg($located, 800, 600, message_image_exif_segment(array(), array(
        pack('vvVC4', 0x0000, 1, 4, 2, 2, 0, 0),
        pack('vvVa4', 0x0001, 2, 2, "N\0"),
    )));
    message_image_assert(VNSEEA_MessageImageHasGps(exif_read_data($located)), 'fixture must carry GPS metadata');
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($located));
    message_image_assert($result['compress'] === false, 'stripped images must skip a second encode');
    message_image_assert(!VNSEEA_MessageImageHasGps(@exif_read_data($located)), 'GPS metadata must be removed');

    // Transparent PNGs keep their format and alpha channel when scaled.
    $png = $directory . '/sticker.png';
    $image = imagecreatetruecolor(3000, 1000);
    imagealphablending($image, false);
    imagesavealpha($image, true);
    imagefilledrectangle($image, 0, 0, 2999, 999, imagecolorallocatealpha($image, 0, 0, 0, 127));
    imagefilledrectangle($image, 1000, 0, 1999, 999, imagecolorallocatealpha($image, 0, 128, 0, 0));
    imagepng($image, $png);
    imagedestroy($image);
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($png, 'image/png'));
    $size = getimagesize($png);
    message_image_assert($size['mime'] === 'image/png', 'PNG uploads must stay PNG');
    message_image_assert($size[0] === 2048 && $size[1] === 683, 'wide PNG must fit within 2048px');
    $image = imagecreatefrompng($png);
    message_image_assert(((imagecolorat($image, 10, 10) >> 24) & 0x7F) === 127, 'PNG transparency must survive scaling');
    imagedestroy($image);

    // Formats and orientations the helper does not own keep the legacy path.
    $gif = $directory . '/party.gif';
    $image = imagecreatetruecolor(3000, 3000);
    imagegif($image, $gif);
    imagedestroy($image);
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($gif, 'image/gif'));
    message_image_assert(!array_key_exists('compress', $result), 'GIFs must keep the legacy path');

    $mirrored = $directory . '/mirrored.jpg';
    message_image_write_jpeg($mirrored, 3000, 2000, message_image_exif_segment(array(
        pack('vvVvv', 0x0112, 3, 1, 2, 0),
    )));
    $mirrored_hash = sha1_file($mirrored);
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($mirrored));
    message_image_assert(!array_key_exists('compress', $result), 'mirrored orientations must keep the legacy path');
    message_image_assert(sha1_file($mirrored) === $mirrored_hash, 'legacy-path files must stay untouched');

    $text = $directory . '/notes.jpg';
    file_put_contents($text, 'not an image');
    $result = VNSEEA_PrepareMessageImageUpload(message_image_info($text));
    message_image_assert(!array_key_exists('compress', $result), 'non-images must keep the legacy path');
} finally {
    foreach (glob($directory . '/*') ?: array() as $file) {
        @unlink($file);
    }
    @rmdir($directory);
}

// Only the two mobile message endpoints use the helper; web keeps its path.
$require = "require_once 'assets/includes/vnseea_message_media.php';";
foreach (array('send-message.php', 'group_chat.php') as $endpoint_name) {
    $endpoint = file_get_contents($root . '/api/v2/endpoints/' . $endpoint_name);
    message_image_assert(strpos($endpoint, $require) !== false, "{$endpoint_name} must load the message media helper");
    message_image_assert(
        strpos($endpoint, '$fileInfo = VNSEEA_PrepareMessageImageUpload($fileInfo);') !== false,
        "{$endpoint_name} must prepare message images before storing them"
    );
    message_image_assert(
        strpos($endpoint, 'Wo_ShareFile(VNSEEA_PrepareMessageImageUpload(array(') !== false,
        "{$endpoint_name} must prepare video posters before storing them"
    );
}
message_image_assert(
    strpos(file_get_contents($root . '/assets/init.php'), 'vnseea_message_media.php') === false,
    'the helper must stay out of the shared web bootstrap'
);

fwrite(STDOUT, "message image upload contract: ok\n");
