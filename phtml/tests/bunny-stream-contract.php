<?php
// English description: Verifies Bunny Stream signing, playback links, status mapping, webhook checks, how endpoints attach uploaded chat videos, and how posts, reels and stories wait for their encoded video.

$root = dirname(__DIR__);
putenv('MEDIA_BASE_URL');
require_once $root . '/assets/includes/vnseea_media_url.php';

function stream_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function stream_equals($actual, $expected, $message)
{
    stream_assert($actual === $expected, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true));
}

$guid = '657bb740-a71b-4529-a012-528021c31a92';
$GLOBALS['wo']['config'] = array(
    'media_base_url' => 'https://media.vnseea.vn',
    'vnseea_bunny_stream_enabled' => '1',
    'vnseea_bunny_stream_private_library_id' => '456',
    'vnseea_bunny_stream_private_api_key' => 'private-api-key',
    'vnseea_bunny_stream_private_readonly_key' => 'readonly-key',
    'vnseea_bunny_stream_private_cdn_hostname' => 'vz-chat.b-cdn.net',
    'vnseea_bunny_stream_private_token_key' => 'test-token-key',
    'vnseea_bunny_stream_private_url_ttl' => '21600',
    'vnseea_bunny_stream_public_library_id' => '123',
    'vnseea_bunny_stream_public_api_key' => 'public-api-key',
    'vnseea_bunny_stream_public_readonly_key' => 'public-readonly-key',
    'vnseea_bunny_stream_public_cdn_hostname' => 'vz-public.b-cdn.net',
);

// Reference values computed independently with Python hmac/hashlib.
stream_equals(
    VNSEEA_BunnySignDirectoryUrl('https://vz-chat.b-cdn.net', '/' . $guid . '/playlist.m3u8', '/' . $guid . '/', 'test-token-key', 1790000000),
    'https://vz-chat.b-cdn.net/bcdn_token=HS256-U51I-el0f4e1Sk311kVpUNMzboSezeP4Y14BXVDQkyc&token_path=%2F657bb740-a71b-4529-a012-528021c31a92%2F&expires=1790000000/657bb740-a71b-4529-a012-528021c31a92/playlist.m3u8',
    'path-based HS256 directory tokens must match the Bunny reference algorithm'
);
stream_equals(
    VNSEEA_BunnyTusSignature('123', 'api-key', 1790000000, $guid),
    'ad28d3fb1e88a590913b6af2e05d8d51f7cd721ebfc4376415be997de1302a32',
    'TUS signatures are SHA256(library_id + api_key + expires + video_id)'
);

// Stored references.
$reference = VNSEEA_BunnyMediaRef('private', strtoupper($guid));
stream_equals($reference, 'bunny-stream://private/' . $guid, 'references are normalized to lowercase');
stream_equals(VNSEEA_BunnyParseMediaRef($reference), array('kind' => 'private', 'guid' => $guid), 'references round-trip');
stream_assert(VNSEEA_BunnyParseMediaRef('upload/videos/a.mp4') === null, 'local paths are not Bunny references');
stream_assert(VNSEEA_BunnyParseMediaRef('bunny-stream://private/../../etc') === null, 'malformed references are rejected');

// Playback links.
stream_equals(
    VNSEEA_BunnyPlaybackUrl(VNSEEA_BunnyMediaRef('public', $guid)),
    'https://vz-public.b-cdn.net/' . $guid . '/playlist.m3u8',
    'public videos play from the library CDN without a token'
);
$now = 1790001234;
$signed = VNSEEA_BunnyPlaybackUrl($reference, $now);
$hour_start = (int) (floor($now / 3600) * 3600);
stream_equals(
    $signed,
    VNSEEA_BunnySignDirectoryUrl('https://vz-chat.b-cdn.net', '/' . $guid . '/playlist.m3u8', '/' . $guid . '/', 'test-token-key', $hour_start + 21600 + 3600),
    'chat videos get a signed link valid for the configured lifetime'
);
stream_equals(VNSEEA_BunnyPlaybackUrl($reference, $now + 1000), $signed, 'links stay identical within the hour so players do not reload');
stream_assert(VNSEEA_BunnyPlaybackUrl($reference, $hour_start + 3600) !== $signed, 'links rotate on the next hour');
$GLOBALS['wo']['config']['vnseea_bunny_stream_enabled'] = '0';
stream_assert(VNSEEA_BunnyPlaybackUrl($reference, $now) === $signed, 'existing videos keep playing when new uploads are switched off');
$GLOBALS['wo']['config']['vnseea_bunny_stream_enabled'] = '1';

// Rows read with GetMessageById keep the stored value until presented.
$presented = VNSEEA_BunnyPresentMessageMedia(array('id' => 9, 'media' => $reference));
stream_assert(strpos($presented['media'], 'https://vz-chat.b-cdn.net/bcdn_token=HS256-') === 0, 'shared media lists get a signed playback link');
stream_assert(substr($presented['media'], -strlen('/' . $guid . '/playlist.m3u8')) === '/' . $guid . '/playlist.m3u8', 'the signed link points at the playlist');
stream_equals(
    VNSEEA_BunnyPresentMessageMedia(array('media' => 'upload/videos/a.mp4')),
    array('media' => 'upload/videos/a.mp4'),
    'local media is left for the existing URL handling'
);
stream_equals(VNSEEA_BunnyPresentMessageMedia(array()), array(), 'missing messages pass through');

// Status mapping differs between the API and the webhook.
stream_equals(VNSEEA_BunnyStatusFromApi(array('status' => 4)), 'ready', 'API 4 Finished is ready');
stream_equals(VNSEEA_BunnyStatusFromApi(array('status' => 3, 'availableResolutions' => '360p')), 'ready', 'one encoded resolution can play');
stream_equals(VNSEEA_BunnyStatusFromApi(array('status' => 3, 'availableResolutions' => '')), 'uploaded', 'transcoding without output still processes');
stream_equals(VNSEEA_BunnyStatusFromApi(array('status' => 6)), 'failed', 'API 6 UploadFailed is failed');
stream_equals(VNSEEA_BunnyStatusFromWebhook(3), 'ready', 'webhook 3 Finished is ready');
stream_equals(VNSEEA_BunnyStatusFromWebhook(4), 'ready', 'webhook 4 Resolution finished can play');
stream_equals(VNSEEA_BunnyStatusFromWebhook(5), 'failed', 'webhook 5 Failed is failed');
stream_equals(VNSEEA_BunnyStatusFromWebhook(2), '', 'intermediate webhook states change nothing');

// Webhooks must come from the configured library and carry its signature.
$body = '{"VideoLibraryId":456,"VideoGuid":"' . $guid . '","Status":3}';
stream_equals(VNSEEA_BunnyHandleWebhook('not json', ''), 400, 'malformed webhooks are rejected');
stream_equals(
    VNSEEA_BunnyHandleWebhook('{"VideoLibraryId":999,"VideoGuid":"' . $guid . '","Status":3}', ''),
    404,
    'webhooks for unknown libraries are rejected'
);
stream_equals(VNSEEA_BunnyHandleWebhook($body, str_repeat('0', 64)), 401, 'forged signatures are rejected');
stream_equals(
    VNSEEA_BunnyHandleWebhook($body, '9e14a71772b8889e6ced0eb0d140d8233dd99c780a2847003195e7f886b4d199'),
    200,
    'a webhook signed with the Read-Only key is accepted'
);

// Without a database no ticket is issued, so clients fall back to local uploads.
stream_assert(VNSEEA_BunnyCreateUploadTicket(1, 'chat', 'a.mp4', 1000) === null, 'tickets need the uploads table');
stream_assert(VNSEEA_BunnyMediaStatus($reference) === '', 'status lookups need the uploads table');

// The admin self-test talks to Bunny through the replaceable HTTP client.
$requests = array();
$GLOBALS['vnseea_bunny_http'] = function ($method, $url, $headers, $body) use (&$requests, $guid) {
    $requests[] = $method . ' ' . $url;
    if (strpos($url, 'video.bunnycdn.com/library/456/videos') !== false) {
        return array('status' => 200, 'body' => json_encode(array('items' => array(array('guid' => $guid, 'status' => 4)))));
    }
    if (strpos($url, 'video.bunnycdn.com/library/123/videos') !== false) {
        return array('status' => 401, 'body' => '{}');
    }
    if (strpos($url, '/bcdn_token=') !== false) {
        return array('status' => 200, 'body' => '#EXTM3U');
    }
    return array('status' => 403, 'body' => '');
};
$results = VNSEEA_BunnyStreamSelfTest();
stream_equals(count($results), 3, 'the self-test reports both libraries');
stream_assert(!$results[0]['ok'] && strpos($results[0]['message'], 'HTTP 401') !== false, 'a rejected API key is reported');
stream_assert($results[1]['ok'] && $results[2]['ok'], 'a working private library passes both checks');
stream_assert(in_array('GET https://vz-chat.b-cdn.net/' . $guid . '/playlist.m3u8', $requests, true), 'the unsigned playlist is probed');
unset($GLOBALS['vnseea_bunny_http']);

$sources = array(
    'send' => file_get_contents($root . '/api/v2/endpoints/send-message.php'),
    'group' => file_get_contents($root . '/api/v2/endpoints/group_chat.php'),
    'messages' => file_get_contents($root . '/api/v2/endpoints/get_user_messages.php'),
    'ticket' => file_get_contents($root . '/api/v2/endpoints/media-upload-ticket.php'),
    'functions' => file_get_contents($root . '/assets/includes/functions_one.php'),
    'requests' => file_get_contents($root . '/requests.php'),
    'push' => file_get_contents($root . '/assets/includes/vnseea_push_delivery.php'),
    'settings' => file_get_contents($root . '/api/v2/endpoints/get-site-settings.php'),
    'migration' => file_get_contents($root . '/database/migrations/20261002_bunny_stream_uploads.sql'),
    'chat' => file_get_contents($root . '/api/v2/endpoints/chat.php'),
    'recall' => file_get_contents($root . '/api/v2/endpoints/recall_message.php'),
    'api_functions' => file_get_contents($root . '/api/v2/functions.php'),
);
foreach (array('send', 'group') as $name) {
    stream_assert(
        strpos($sources[$name], "VNSEEA_BunnyClaimUpload(\$wo['user']['user_id'], \$_POST['bunny_upload_id'], 'chat')") !== false,
        "{$name} must only attach the caller's own upload"
    );
    stream_assert(strpos($sources[$name], 'VNSEEA_BunnyAttachUpload($bunny_upload[\'id\'], $last_id);') !== false, "{$name} must link the upload to the message");
    stream_assert(strpos($sources[$name], 'if (VNSEEA_BunnyParseMediaRef($failed_upload) !== null) {') !== false, "{$name} must not unlink Bunny references");
    stream_assert(strpos($sources[$name], "\$message['media_status'] = \$media_status;") !== false, "{$name} must report processing videos");
}
stream_assert(strpos($sources['messages'], "\$message['media_status'] = \$media_status;") !== false, 'conversation reads report processing videos');
stream_assert(strpos($sources['ticket'], "array('api_status' => 200, 'provider' => 'local')") !== false, 'tickets fall back to local uploads');
stream_assert(strpos($sources['functions'], "return VNSEEA_BunnyPlaybackUrl(\$media);") !== false, 'Wo_GetMedia must sign Bunny references');
stream_assert(strpos($sources['requests'], "include 'xhr/bunny_stream_webhook.php';") !== false, 'the webhook route must exist');
stream_assert(strpos($sources['push'], "strpos(\$media, 'bunny-stream://') === 0") !== false, 'pushes must describe Bunny videos as videos');
stream_assert(strpos($sources['settings'], "'provider' => VNSEEA_BunnyStreamUploadsEnabled('private') ? 'bunny_stream' : 'local'") !== false, 'clients learn the chat upload provider');
stream_assert(strpos($sources['migration'], 'UNIQUE KEY `video_guid`') !== false, 'one upload row per Bunny video');
stream_assert(substr_count($sources['chat'], 'VNSEEA_BunnyPresentMessageMedia(GetMessageById($message->id))') === 2, 'chat search and shared media sign Bunny videos');
stream_assert(strpos($sources['chat'], "`media` LIKE 'bunny-stream://%'") !== false, 'shared videos include Bunny videos');
stream_assert(strpos($sources['group'], "OR `media` LIKE 'bunny-stream://%')") !== false, 'group shared videos include Bunny videos');
stream_assert(strpos($sources['group'], "AND `media` NOT LIKE 'bunny-stream://%'") !== false, 'Bunny videos are not listed as group files');
stream_assert(strpos($sources['api_functions'], "if (strpos(\$file, 'bunny-stream://') === 0) {") !== false, 'API message types treat Bunny references as videos');
stream_assert(strpos($sources['recall'], "getValue(T_MESSAGES, 'COUNT(*)') === 0") !== false, 'recalls keep videos that forwarded copies still show');

// Posts, reels and stories use the public library behind their own switch.
stream_equals(VNSEEA_BunnyPurposeKind('chat'), 'private', 'chat videos stay in the private library');
foreach (array('post', 'REEL', ' story ') as $purpose) {
    stream_equals(VNSEEA_BunnyPurposeKind($purpose), 'public', "{$purpose} videos go to the public library");
}
stream_equals(VNSEEA_BunnyPurposeKind('avatar'), '', 'unknown purposes get no ticket');
stream_assert(!VNSEEA_BunnyStreamUploadsEnabled('public'), 'the chat switch alone does not send post videos to Bunny');
$GLOBALS['wo']['config']['vnseea_bunny_stream_public_enabled'] = '1';
$GLOBALS['wo']['config']['vnseea_bunny_stream_enabled'] = '0';
stream_assert(VNSEEA_BunnyStreamUploadsEnabled('public') && !VNSEEA_BunnyStreamUploadsEnabled('private'), 'the chat and public switches are independent');
$GLOBALS['wo']['config']['vnseea_bunny_stream_enabled'] = '1';
stream_assert(VNSEEA_BunnyCreateUploadTicket(1, 'post', 'a.mp4', 1000) === null, 'public tickets need the migrated uploads table');
stream_assert(VNSEEA_BunnyReservePublishUpload(1, 5, 'chat') === null, 'chat uploads are never reserved for posts');
stream_equals(VNSEEA_BunnyRunMaintenance(), array('finalized' => 0, 'deleted' => 0), 'upkeep does nothing before the migration');
stream_equals(VNSEEA_BunnyClientUploadStatus('uploaded'), 'processing', 'uploaded videos are still processing for the app');
stream_equals(VNSEEA_BunnyClientUploadStatus('ready'), 'ready', 'encoded videos are ready');
stream_equals(VNSEEA_BunnyClientUploadStatus('deleted'), 'failed', 'deleted videos never play');
stream_assert(strpos(VNSEEA_BunnyOwnerNoticeText('reel', 'published', 'vi'), 'reel đã được đăng') !== false, 'authors learn their reel is live');
stream_assert(strpos(VNSEEA_BunnyOwnerNoticeText('post', 'review', 'vi'), 'chờ duyệt') !== false, 'authors learn their post waits for review');
stream_assert(strpos(VNSEEA_BunnyOwnerNoticeText('story', 'failed', 'english'), 'story was not published') !== false, 'English authors read English notices');

// Bunny blocks requests without a Referer when "Block direct URL file access" is on; the apps send none.
$requests = array();
$GLOBALS['vnseea_bunny_http'] = function ($method, $url, $headers, $body) use (&$requests, $guid) {
    $requests[] = $method . ' ' . $url;
    if (strpos($url, 'video.bunnycdn.com/library/') !== false) {
        return array('status' => 200, 'body' => json_encode(array('items' => array(array('guid' => $guid, 'status' => 4)))));
    }
    foreach ($headers as $header) {
        if (stripos($header, 'Referer:') === 0) {
            return array('status' => 200, 'body' => '#EXTM3U');
        }
    }
    return array('status' => 403, 'body' => '');
};
$results = VNSEEA_BunnyStreamSelfTest();
stream_equals(count($results), 4, 'both libraries report the API and playback checks');
stream_assert(in_array('GET https://vz-public.b-cdn.net/' . $guid . '/playlist.m3u8', $requests, true), 'the public library is probed like the apps request it');
stream_assert(!$results[1]['ok'] && strpos($results[1]['message'], 'Block direct URL file access') !== false, 'public referrer blocking is named');
stream_assert(!$results[3]['ok'] && strpos($results[3]['message'], 'Block direct URL file access') !== false, 'chat referrer blocking is not blamed on the token key');
unset($GLOBALS['vnseea_bunny_http']);

// Without the file on this server, posts take their upright display size from what Bunny encoded.
require_once $root . '/assets/includes/vnseea_post_media.php';
$playlist_ok = true;
$GLOBALS['vnseea_bunny_http'] = function ($method, $url, $headers, $body) use ($guid, &$playlist_ok) {
    if ($url === 'https://vz-public.b-cdn.net/' . $guid . '/playlist.m3u8') {
        return $playlist_ok
            ? array('status' => 200, 'body' => "#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=360x640\n360p/video.m3u8\n#EXT-X-STREAM-INF:RESOLUTION=1080x1920\n1080p/video.m3u8\n")
            : array('status' => 404, 'body' => '');
    }
    return strpos($url, 'library/123/videos/' . $guid) !== false
        ? array('status' => 200, 'body' => json_encode(array('guid' => $guid, 'width' => 1920, 'height' => 1080)))
        : array('status' => 404, 'body' => '');
};
stream_equals(
    VNSEEA_BunnyVideoGeometry(array('library_kind' => 'public', 'video_guid' => $guid)),
    array('width' => 1080, 'height' => 1920, 'aspect_ratio' => 0.5625),
    'portrait recordings read upright from the largest encoded rendition'
);
$playlist_ok = false;
stream_equals(
    VNSEEA_BunnyVideoGeometry(array('library_kind' => 'public', 'video_guid' => $guid))['width'],
    1920,
    'the video API is the fallback when the playlist cannot be read'
);
unset($GLOBALS['vnseea_bunny_http']);

$publish_sources = array(
    'new_post' => file_get_contents($root . '/api/v2/endpoints/new_post.php'),
    'story' => file_get_contents($root . '/api/v2/endpoints/create-story.php'),
    'status' => file_get_contents($root . '/api/v2/endpoints/media-upload-status.php'),
    'worker' => file_get_contents($root . '/workers/push-delivery-worker.php'),
    'functions_three' => file_get_contents($root . '/assets/includes/functions_three.php'),
    'migration' => file_get_contents($root . '/database/migrations/20261003_bunny_stream_publish_uploads.sql'),
);
stream_assert(strpos($publish_sources['new_post'], 'VNSEEA_BunnyReservePublishUpload(') !== false, 'posts and reels take their Bunny upload atomically');
stream_assert(strpos($publish_sources['new_post'], "'post_data' => \$post_data,") !== false, 'posts are held back with everything Wo_RegisterPost needs');
stream_assert(strpos($publish_sources['new_post'], "VNSEEA_BunnyReleaseReservation(\$bunny_upload['id']);") !== false, 'failed posts free their upload for a retry');
stream_assert(strpos($publish_sources['new_post'], "strpos(\$mediaFilename, 'bunny-stream://') !== 0") !== false, 'failed posts never unlink a Bunny reference');
stream_assert(strpos($publish_sources['story'], "VNSEEA_BunnyReservePublishUpload(\$wo['user']['id'], \$bunny_story_upload_id, 'story')") !== false, 'stories take their Bunny upload atomically');
stream_assert(strpos($publish_sources['story'], "'mention_user_ids' => array_values(\$bunny_mentions)") !== false, 'story mentions wait for the story');
stream_assert(strpos($publish_sources['status'], "(int) \$row['user_id'] !== (int) \$wo['user']['user_id']") !== false, 'only the uploader reads an upload status');
stream_assert(strpos($publish_sources['worker'], 'VNSEEA_BunnyReloadConfig();') !== false && strpos($publish_sources['worker'], 'VNSEEA_BunnyRunMaintenance(10);') !== false, 'the push worker runs Bunny upkeep with fresh, decrypted settings');
stream_assert(strpos($sources['functions'], "VNSEEA_BunnyReleaseVideo(\$fetched_data['postFile'], array('post_id' => (int) \$fetched_data['id']));") !== false, 'deleting a post removes its Bunny video');
stream_assert(strpos($sources['functions'], "\$story['postFile'] = \$story['postFile_full'];") !== false, 'post data hands clients the playlist, never the Bunny reference');
stream_assert(strpos($publish_sources['functions_three'], "VNSEEA_BunnyReleaseVideo(\$path, array('story_id' => (int) \$id));") !== false, 'deleting a story removes its Bunny video');
stream_assert(strpos($publish_sources['migration'], 'ADD COLUMN IF NOT EXISTS `publish_state`') !== false, 'the migration adds the publish state');
stream_assert(strpos($sources['settings'], "'story' => \$bunny_public_video_upload,") !== false, 'clients learn where post, reel and story videos go');

fwrite(STDOUT, "bunny stream contract: ok\n");
