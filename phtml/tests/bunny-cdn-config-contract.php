<?php
// English description: Verifies the admin-managed Bunny CDN switch, Stream readiness rules and that Bunny secrets never reach clients.

$root = dirname(__DIR__);
putenv('MEDIA_BASE_URL');
unset($_SERVER['MEDIA_BASE_URL']);
require_once $root . '/assets/includes/vnseea_media_url.php';

function bunny_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function bunny_equals($actual, $expected, $message)
{
    bunny_assert($actual === $expected, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true));
}

function bunny_config($values)
{
    $GLOBALS['wo']['config'] = array_merge(array(
        'site_url' => 'https://vnseea.vn',
        'media_base_url' => 'https://media.vnseea.vn',
        'vnseea_bunny_cdn_enabled' => '0',
        'vnseea_bunny_cdn_hostname' => '',
        'vnseea_bunny_stream_enabled' => '0',
    ), $values);
}

// Hostnames are accepted with or without a scheme and nothing else gets through.
bunny_equals(VNSEEA_BunnyNormalizeHostname('cdn.vnseea.vn'), 'cdn.vnseea.vn', 'bare hostnames');
bunny_equals(VNSEEA_BunnyNormalizeHostname(' https://VNSEEA-Media.b-cdn.net/upload '), 'vnseea-media.b-cdn.net', 'URLs reduce to their hostname');
bunny_equals(VNSEEA_BunnyNormalizeHostname('localhost'), '', 'single-label hosts are rejected');
bunny_equals(VNSEEA_BunnyNormalizeHostname('cdn vnseea.vn'), '', 'spaces are rejected');
bunny_equals(VNSEEA_BunnyNormalizeHostname('javascript:alert(1)'), '', 'non-host values are rejected');

// The CDN only applies when switched on with a valid hostname.
bunny_config(array());
bunny_equals(VNSEEA_BunnyCdnBaseUrl(), '', 'CDN is off by default');
bunny_equals(VNSEEA_GetMediaBaseUrl(), 'https://media.vnseea.vn', 'media keeps the shared origin while the CDN is off');
bunny_equals(
    VNSEEA_RewriteMediaUrlForCdn('https://media.vnseea.vn/upload/photos/a.jpg'),
    'https://media.vnseea.vn/upload/photos/a.jpg',
    'stored URLs stay untouched while the CDN is off'
);

bunny_config(array('vnseea_bunny_cdn_enabled' => '1', 'vnseea_bunny_cdn_hostname' => 'not a host'));
bunny_equals(VNSEEA_GetMediaBaseUrl(), 'https://media.vnseea.vn', 'an invalid CDN hostname falls back to the origin');

bunny_config(array('vnseea_bunny_cdn_enabled' => '1', 'vnseea_bunny_cdn_hostname' => 'https://cdn.vnseea.vn/'));
bunny_equals(VNSEEA_BunnyCdnBaseUrl(), 'https://cdn.vnseea.vn', 'the enabled CDN has an https base URL');
bunny_equals(VNSEEA_GetMediaBaseUrl(), 'https://cdn.vnseea.vn', 'media goes through the CDN when enabled');
bunny_equals(
    VNSEEA_GetSharedUploadUrl('upload/photos/2026/10/a.jpg'),
    'https://cdn.vnseea.vn/upload/photos/2026/10/a.jpg',
    'relative uploads resolve on the CDN'
);
bunny_equals(
    VNSEEA_RewriteMediaUrlForCdn('https://media.vnseea.vn/upload/videos/a.mp4?cache=12'),
    'https://cdn.vnseea.vn/upload/videos/a.mp4?cache=12',
    'stored origin URLs move to the CDN and keep their cache buster'
);
bunny_equals(
    VNSEEA_RewriteMediaUrlForCdn('https://vnseea.vn/upload/photos/a.jpg'),
    'https://vnseea.vn/upload/photos/a.jpg',
    'only the shared media origin is fronted by the pull zone'
);
bunny_equals(
    VNSEEA_RewriteMediaUrlForCdn('https://media.vnseea.vn/themes/logo.png'),
    'https://media.vnseea.vn/themes/logo.png',
    'only upload paths are rewritten'
);
bunny_equals(
    VNSEEA_RewriteMediaUrlForCdn('https://example.com/upload/a.jpg'),
    'https://example.com/upload/a.jpg',
    'foreign URLs are never rewritten'
);

bunny_config(array('media_base_url' => '', 'vnseea_bunny_cdn_enabled' => '1', 'vnseea_bunny_cdn_hostname' => 'cdn.vnseea.vn'));
bunny_equals(VNSEEA_GetMediaBaseUrl(), '', 'an environment without a shared origin keeps serving its own uploads');

// Bunny Stream needs a fully filled library before it is used.
bunny_config(array(
    'vnseea_bunny_stream_enabled' => '1',
    'vnseea_bunny_stream_public_library_id' => '12345',
    'vnseea_bunny_stream_public_api_key' => 'public-api-key-abcd',
    'vnseea_bunny_stream_public_readonly_key' => 'public-readonly-key-wxyz',
    'vnseea_bunny_stream_public_cdn_hostname' => 'vz-public.b-cdn.net',
    'vnseea_bunny_stream_private_library_id' => 'abc',
    'vnseea_bunny_stream_private_api_key' => '$Ap1_cipher',
    'vnseea_bunny_stream_private_readonly_key' => '',
    'vnseea_bunny_stream_private_cdn_hostname' => 'vz-private.b-cdn.net',
    'vnseea_bunny_stream_private_token_key' => 'token-key-1234',
));
bunny_assert(VNSEEA_BunnyStreamUploadsEnabled('public'), 'a complete enabled library is used');
bunny_equals(
    VNSEEA_BunnyStreamMissingFields('private'),
    array('Library ID', 'API Key', 'Read-Only API Key'),
    'invalid ids, encrypted values and blanks count as missing'
);
bunny_assert(!VNSEEA_BunnyStreamUploadsEnabled('private'), 'an incomplete library is never used');
$GLOBALS['wo']['config']['vnseea_bunny_stream_enabled'] = '0';
bunny_assert(!VNSEEA_BunnyStreamUploadsEnabled('public'), 'the switch turns new uploads off');
bunny_assert(VNSEEA_BunnyStreamLibraryConfigured('public'), 'existing Bunny videos keep a usable library while switched off');

// Secrets stay on the server.
bunny_assert(VNSEEA_BunnyIsSecretConfigKey('vnseea_bunny_stream_private_token_key'), 'token keys are secret');
bunny_assert(!VNSEEA_BunnyIsSecretConfigKey('vnseea_bunny_stream_public_library_id'), 'library ids are not secret');
$hint = VNSEEA_BunnySecretHint('vnseea_bunny_stream_public_api_key');
bunny_assert(strpos($hint, 'abcd') !== false && strpos($hint, 'public-api') === false, 'the admin hint shows only the last characters');

$sources = array(
    'app_start' => file_get_contents($root . '/assets/includes/app_start.php'),
    'data' => file_get_contents($root . '/assets/includes/data.php'),
    'settings' => file_get_contents($root . '/api/v2/endpoints/get-site-settings.php'),
    'functions' => file_get_contents($root . '/assets/includes/functions_one.php'),
    'admin' => file_get_contents($root . '/admin-panel/pages/amazon-settings/content.phtml'),
    'nuxt' => file_get_contents($root . '/client/nuxt.config.ts'),
);
foreach (array('vnseea_bunny_cdn_enabled', 'vnseea_bunny_cdn_hostname', 'vnseea_bunny_stream_enabled', 'vnseea_bunny_stream_private_url_ttl') as $config_name) {
    bunny_assert(strpos($sources['app_start'], "'{$config_name}' =>") !== false, "{$config_name} must have a default");
}
foreach (array('public_api_key', 'public_readonly_key', 'private_api_key', 'private_readonly_key', 'private_token_key') as $secret) {
    bunny_assert(
        strpos($sources['data'], "'vnseea_bunny_stream_{$secret}'") !== false,
        "vnseea_bunny_stream_{$secret} must be encrypted at rest"
    );
}
bunny_assert(
    strpos($sources['settings'], "strpos(\$config_name, 'vnseea_bunny_') === 0") !== false,
    'client config must drop every Bunny key before encryption'
);
bunny_assert(
    strpos($sources['functions'], 'return VNSEEA_RewriteMediaUrlForCdn($media);') !== false,
    'stored absolute media URLs must pass through the CDN rewrite'
);
bunny_assert(
    strpos($sources['admin'], 'class="form-control bunny-secret" value=""') !== false,
    'secret inputs must render empty'
);
bunny_assert(
    strpos($sources['admin'], 'VNSEEA_BunnySecretHint($bunny_field[\'key\'])') !== false,
    'secret inputs must only show a hint'
);
bunny_assert(strpos($sources['nuxt'], 'NUXT_IMAGE_EXTRA_DOMAINS') !== false, 'the web image proxy must accept the CDN host');

fwrite(STDOUT, "bunny cdn config contract: ok\n");
