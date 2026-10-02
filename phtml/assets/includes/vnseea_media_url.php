<?php
// English description: Resolves relative local upload paths through the configured shared media origin.

require_once __DIR__ . '/vnseea_bunny.php';

if (!function_exists('VNSEEA_GetOriginMediaBaseUrl')) {
    function VNSEEA_GetOriginMediaBaseUrl()
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

if (!function_exists('VNSEEA_GetMediaBaseUrl')) {
    /**
     * The admin-managed Bunny pull zone fronts the shared media origin. An
     * environment without a shared origin keeps serving its own uploads.
     */
    function VNSEEA_GetMediaBaseUrl()
    {
        $origin_base_url = VNSEEA_GetOriginMediaBaseUrl();
        if ($origin_base_url === '') {
            return '';
        }
        $cdn_base_url = VNSEEA_BunnyCdnBaseUrl();
        return $cdn_base_url !== '' ? $cdn_base_url : $origin_base_url;
    }
}

if (!function_exists('VNSEEA_RewriteMediaUrlForCdn')) {
    /** Moves absolute upload URLs stored against the shared media origin onto the CDN. */
    function VNSEEA_RewriteMediaUrlForCdn($url)
    {
        $cdn_base_url = VNSEEA_BunnyCdnBaseUrl();
        $origin_host = parse_url(VNSEEA_GetOriginMediaBaseUrl(), PHP_URL_HOST);
        if ($cdn_base_url === '' || !is_string($origin_host) || $origin_host === '') {
            return $url;
        }
        $parts = parse_url((string) $url);
        if (
            empty($parts['host']) ||
            strtolower($parts['host']) !== strtolower($origin_host) ||
            empty($parts['path']) ||
            !preg_match('/^\/upload\//i', $parts['path'])
        ) {
            return $url;
        }
        return $cdn_base_url . $parts['path'] . (isset($parts['query']) ? '?' . $parts['query'] : '');
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

