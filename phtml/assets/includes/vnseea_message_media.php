<?php
// English description: Prepares mobile chat image uploads in one pass so already-optimized images skip full-resolution re-encoding.

if (!function_exists('VNSEEA_MessageImageQuality')) {
    function VNSEEA_MessageImageQuality($quality = null)
    {
        if ($quality === null && isset($GLOBALS['wo']['config']['images_quality'])) {
            $quality = $GLOBALS['wo']['config']['images_quality'];
        }
        $quality = is_numeric($quality) ? (int) $quality : 85;
        return ($quality >= 1 && $quality <= 100) ? $quality : 85;
    }
}

if (!function_exists('VNSEEA_MessageImageHasGps')) {
    function VNSEEA_MessageImageHasGps($exif)
    {
        if (!is_array($exif)) {
            return false;
        }
        if (isset($exif['GPSLatitude']) || isset($exif['GPSLongitude'])) {
            return true;
        }
        return !empty($exif['SectionsFound']) && stripos((string) $exif['SectionsFound'], 'GPS') !== false;
    }
}

if (!function_exists('VNSEEA_PrepareMessageImageUpload')) {
    /**
     * Prepares an uploaded chat image before Wo_ShareFile stores it.
     *
     * Current mobile builds upload upright JPEGs of at most 2048px without
     * location metadata; those are stored as-is. Older builds still send the
     * full camera resolution, which is scaled down first and rotated second in
     * a single encode instead of being re-encoded at its original size.
     *
     * The returned file info carries 'compress' => false whenever the legacy
     * Wo_CompressImage pass is no longer needed. GIFs, mirrored EXIF
     * orientations and any processing failure return the input unchanged so
     * the legacy path still applies.
     */
    function VNSEEA_PrepareMessageImageUpload($file_info, $max_dimension = 2048, $quality = null)
    {
        if (!is_array($file_info) || empty($file_info['file']) || !is_file($file_info['file'])) {
            return $file_info;
        }

        $path = $file_info['file'];
        $image_info = @getimagesize($path);
        if (empty($image_info) || empty($image_info['mime'])) {
            return $file_info;
        }

        $width = (int) $image_info[0];
        $height = (int) $image_info[1];
        $mime = strtolower((string) $image_info['mime']);
        $supported = array('image/jpeg', 'image/png', 'image/webp');
        // Decoding more than 100MP with GD would exceed the PHP memory limit.
        if ($width < 1 || $height < 1 || $width * $height > 100000000 || !in_array($mime, $supported, true)) {
            return $file_info;
        }

        $orientation = 1;
        $has_gps = false;
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            if (!empty($exif['Orientation'])) {
                $orientation = (int) $exif['Orientation'];
            }
            $has_gps = VNSEEA_MessageImageHasGps($exif);
        }
        if (!in_array($orientation, array(1, 3, 6, 8), true)) {
            return $file_info;
        }

        $max_dimension = max(320, (int) $max_dimension);
        $needs_resize = max($width, $height) > $max_dimension;
        $needs_rotation = $orientation !== 1;
        if (!$needs_resize && !$needs_rotation && !$has_gps) {
            $file_info['compress'] = false;
            return $file_info;
        }

        $temporary_path = $path . '.vnseea-message-image';
        $image = false;
        try {
            if ($mime === 'image/jpeg') {
                $image = @imagecreatefromjpeg($path);
            } elseif ($mime === 'image/png') {
                $image = @imagecreatefrompng($path);
            } elseif (function_exists('imagecreatefromwebp')) {
                $image = @imagecreatefromwebp($path);
            }
            if (!$image) {
                return $file_info;
            }

            if ($needs_resize) {
                $scale = $max_dimension / max($width, $height);
                $target_width = max(1, (int) round($width * $scale));
                $target_height = max(1, (int) round($height * $scale));
                $scaled = imagecreatetruecolor($target_width, $target_height);
                if (!$scaled) {
                    return $file_info;
                }
                if ($mime !== 'image/jpeg') {
                    imagealphablending($scaled, false);
                    imagesavealpha($scaled, true);
                    $transparent = imagecolorallocatealpha($scaled, 0, 0, 0, 127);
                    imagefilledrectangle($scaled, 0, 0, $target_width, $target_height, $transparent);
                }
                imagecopyresampled($scaled, $image, 0, 0, 0, 0, $target_width, $target_height, $width, $height);
                imagedestroy($image);
                $image = $scaled;
            }

            // Same angles as Wo_CompressImage; rotating after scaling keeps it cheap.
            if ($needs_rotation) {
                $angle = $orientation === 3 ? 180 : ($orientation === 6 ? -90 : 90);
                $rotated = imagerotate($image, $angle, 0);
                if (!$rotated) {
                    return $file_info;
                }
                imagedestroy($image);
                $image = $rotated;
            }

            $quality = VNSEEA_MessageImageQuality($quality);
            if ($mime === 'image/png') {
                imagesavealpha($image, true);
                $written = imagepng($image, $temporary_path, 6);
            } elseif ($mime === 'image/webp') {
                imagesavealpha($image, true);
                $written = imagewebp($image, $temporary_path, $quality);
            } else {
                $written = imagejpeg($image, $temporary_path, $quality);
            }

            // Replace the upload in place: move_uploaded_file() accepts the
            // original temporary path, and Wo_ShareFile still handles storage.
            if (!$written || !is_file($temporary_path) || !@rename($temporary_path, $path)) {
                return $file_info;
            }
            clearstatcache(true, $path);
            $file_info['size'] = filesize($path);
            $file_info['compress'] = false;
            return $file_info;
        } catch (Throwable $exception) {
            error_log('[vnseea-message-image] prepare_failed ' . $exception->getMessage());
            return $file_info;
        } finally {
            if ($image) {
                imagedestroy($image);
            }
            if (is_file($temporary_path)) {
                @unlink($temporary_path);
            }
        }
    }
}
