<?php
// English description: Resolves relative local upload paths through the configured shared media origin.

if (!function_exists('VNSEEA_GetMediaBaseUrl')) {
    function VNSEEA_GetMediaBaseUrl()
    {
        $candidates = array(
            getenv('MEDIA_BASE_URL'),
            isset($_SERVER['MEDIA_BASE_URL']) ? $_SERVER['MEDIA_BASE_URL'] : '',
            isset($GLOBALS['wo']['config']['media_base_url'])
                ? $GLOBALS['wo']['config']['media_base_url']
                : ''
        );

        foreach ($candidates as $candidate) {
            $candidate = rtrim(trim((string) $candidate), '/');
            if (
                $candidate !== '' &&
                filter_var($candidate, FILTER_VALIDATE_URL) &&
                preg_match('/^https?:\/\//i', $candidate)
            ) {
                return $candidate;
            }
        }

        return '';
    }
}

if (!function_exists('VNSEEA_IsRelativeUploadPath')) {
    function VNSEEA_IsRelativeUploadPath($media)
    {
        $media = trim((string) $media);
        if ($media === '' || preg_match('/^(?:https?:)?\/\//i', $media)) {
            return false;
        }

        $path = parse_url($media, PHP_URL_PATH);
        return is_string($path) && preg_match('/^\/?upload\//i', $path) === 1;
    }
}

if (!function_exists('VNSEEA_GetSharedUploadUrl')) {
    function VNSEEA_GetSharedUploadUrl($media)
    {
        $media_base_url = VNSEEA_GetMediaBaseUrl();
        if ($media_base_url === '' || !VNSEEA_IsRelativeUploadPath($media)) {
            return '';
        }

        return $media_base_url . '/' . ltrim(trim((string) $media), '/');
    }
}

