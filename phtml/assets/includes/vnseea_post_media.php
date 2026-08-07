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
