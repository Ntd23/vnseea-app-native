<?php

if (!function_exists('VNSEEA_NormalizePostFileName')) {
    /**
     * Keep postFileName within the legacy VARCHAR(200) contract.
     * Upload providers may use a complete percent-encoded caption as the
     * filename, so the backend must not trust multipart names from clients.
     */
    function VNSEEA_NormalizePostFileName($file_name, $max_bytes = 200)
    {
        $max_bytes = max(32, (int) $max_bytes);
        $file_name = trim(str_replace(array("\0", "\r", "\n", "\t"), '', (string) $file_name));
        $file_name = basename(str_replace('\\', '/', $file_name));
        $file_name = str_replace(array('<', '>', '"', "'", '&', ':', '|', '?', '*'), '_', $file_name);

        if ($file_name === '' || strlen($file_name) <= $max_bytes) {
            return $file_name;
        }

        $extension = strtolower((string) pathinfo($file_name, PATHINFO_EXTENSION));
        $extension = substr((string) preg_replace('/[^a-z0-9]/', '', $extension), 0, 10);
        $stem = $extension !== ''
            ? substr($file_name, 0, -(strlen($extension) + 1))
            : $file_name;
        $suffix = '-' . substr(hash('sha256', $file_name), 0, 12);
        if ($extension !== '') {
            $suffix .= '.' . $extension;
        }

        $stem_limit = max(1, $max_bytes - strlen($suffix));
        $short_stem = function_exists('mb_strcut')
            ? mb_strcut($stem, 0, $stem_limit, 'UTF-8')
            : substr($stem, 0, $stem_limit);
        $short_stem = rtrim((string) $short_stem, " ._-%");
        if ($short_stem === '') {
            $short_stem = 'media';
        }

        $normalized = $short_stem . $suffix;
        return strlen($normalized) <= $max_bytes
            ? $normalized
            : substr($normalized, 0, $max_bytes);
    }
}

if (!function_exists('VNSEEA_NormalizeMediaGeometry')) {
    function VNSEEA_NormalizeMediaGeometry($width, $height)
    {
        if (!is_numeric($width) || !is_numeric($height)) {
            return null;
        }

        $width = (int) round((float) $width);
        $height = (int) round((float) $height);
        if ($width < 1 || $height < 1 || $width > 32768 || $height > 32768) {
            return null;
        }

        return array(
            'width' => $width,
            'height' => $height,
            'aspect_ratio' => round($width / $height, 6),
        );
    }
}

if (!function_exists('VNSEEA_NormalizeMediaGeometryList')) {
    function VNSEEA_NormalizeMediaGeometryList($raw)
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : array();
        }
        if (!is_array($raw)) {
            return array();
        }

        $result = array();
        foreach ($raw as $index => $item) {
            $geometry = is_array($item)
                ? VNSEEA_NormalizeMediaGeometry(
                    isset($item['width']) ? $item['width'] : 0,
                    isset($item['height']) ? $item['height'] : 0
                )
                : null;
            $result[(int) $index] = $geometry;
        }
        return $result;
    }
}

if (!function_exists('VNSEEA_ReadImageMediaGeometry')) {
    function VNSEEA_ReadImageMediaGeometry($file_path)
    {
        if (empty($file_path) || !is_file($file_path) || !is_readable($file_path)) {
            return null;
        }
        $size = @getimagesize($file_path);
        return is_array($size)
            ? VNSEEA_NormalizeMediaGeometry(
                isset($size[0]) ? $size[0] : 0,
                isset($size[1]) ? $size[1] : 0
            )
            : null;
    }
}

if (!function_exists('VNSEEA_ProbeVideoMediaGeometry')) {
    function VNSEEA_ProbeVideoMediaGeometry($file_path, $ffmpeg_binary = '')
    {
        if (
            empty($file_path)
            || !is_file($file_path)
            || !is_readable($file_path)
            || !function_exists('shell_exec')
        ) {
            return null;
        }

        $ffmpeg_binary = trim((string) $ffmpeg_binary);
        if ($ffmpeg_binary === '') {
            $ffmpeg_binary = 'ffmpeg';
        }
        $ffprobe_binary = dirname($ffmpeg_binary) . '/ffprobe';
        if ($ffmpeg_binary === 'ffmpeg' || !is_executable($ffprobe_binary)) {
            $ffprobe_binary = 'ffprobe';
        }

        $probe_command = escapeshellarg($ffprobe_binary)
            . ' -v error -select_streams v:0 -show_entries stream=width,height'
            . ' -of csv=s=x:p=0 ' . escapeshellarg($file_path) . ' 2>/dev/null';
        $probe_output = trim((string) @shell_exec($probe_command));
        if (preg_match('/^(\d{1,5})x(\d{1,5})$/', $probe_output, $matches)) {
            return VNSEEA_NormalizeMediaGeometry($matches[1], $matches[2]);
        }

        $ffmpeg_command = escapeshellarg($ffmpeg_binary)
            . ' -i ' . escapeshellarg($file_path) . ' 2>&1';
        $ffmpeg_output = (string) @shell_exec($ffmpeg_command);
        if (preg_match('/(?:^|\s)(\d{2,5})x(\d{2,5})(?:[\s,]|$)/m', $ffmpeg_output, $matches)) {
            return VNSEEA_NormalizeMediaGeometry($matches[1], $matches[2]);
        }
        return null;
    }
}

if (!function_exists('VNSEEA_MediaGeometryColumnsAvailable')) {
    function VNSEEA_MediaGeometryColumnsAvailable($table_name)
    {
        global $sqlConnect;

        static $cache = array();
        $table_name = preg_replace('/[^A-Za-z0-9_]/', '', (string) $table_name);
        if ($table_name === '') {
            return false;
        }
        if (array_key_exists($table_name, $cache)) {
            return $cache[$table_name];
        }

        $columns = array();
        $query = mysqli_query(
            $sqlConnect,
            "SHOW COLUMNS FROM `{$table_name}` WHERE `Field` IN ('media_width','media_height')"
        );
        if ($query) {
            while ($row = mysqli_fetch_assoc($query)) {
                $columns[(string) $row['Field']] = true;
            }
        }
        $cache[$table_name] = isset($columns['media_width'], $columns['media_height']);
        return $cache[$table_name];
    }
}

if (!function_exists('VNSEEA_PostMediaGeometryColumnsAvailable')) {
    function VNSEEA_PostMediaGeometryColumnsAvailable()
    {
        return defined('T_POSTS') && VNSEEA_MediaGeometryColumnsAvailable(T_POSTS);
    }
}

if (!function_exists('VNSEEA_AlbumMediaGeometryColumnsAvailable')) {
    function VNSEEA_AlbumMediaGeometryColumnsAvailable()
    {
        return defined('T_ALBUMS_MEDIA') && VNSEEA_MediaGeometryColumnsAvailable(T_ALBUMS_MEDIA);
    }
}

if (!function_exists('VNSEEA_MediaGeometryPayload')) {
    function VNSEEA_MediaGeometryPayload($row)
    {
        if (!is_array($row)) {
            return null;
        }
        if (!empty($row['media_geometry']) && is_array($row['media_geometry'])) {
            return VNSEEA_NormalizeMediaGeometry(
                isset($row['media_geometry']['width']) ? $row['media_geometry']['width'] : 0,
                isset($row['media_geometry']['height']) ? $row['media_geometry']['height'] : 0
            );
        }
        return VNSEEA_NormalizeMediaGeometry(
            isset($row['media_width']) ? $row['media_width'] : 0,
            isset($row['media_height']) ? $row['media_height'] : 0
        );
    }
}
