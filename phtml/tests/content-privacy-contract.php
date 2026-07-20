<?php

$root = dirname(__DIR__);
$failures = array();
$checks = 0;

function privacy_assert($condition, $message)
{
    global $failures, $checks;
    $checks++;
    if (!$condition) {
        $failures[] = $message;
    }
}

function privacy_source_contains($root, $path, $needle)
{
    $contents = @file_get_contents($root . '/' . $path);
    return is_string($contents) && strpos($contents, $needle) !== false;
}

function privacy_source_count($root, $path, $needle)
{
    $contents = @file_get_contents($root . '/' . $path);
    return is_string($contents) ? substr_count($contents, $needle) : 0;
}

$helper = $root . '/assets/includes/vnseea_privacy.php';
privacy_assert(file_exists($helper), 'central privacy helper is missing');

if (file_exists($helper)) {
    require_once $helper;

    if (!function_exists('Wo_PageData')) {
        function Wo_PageData($page_id)
        {
            return array('page_id' => (int) $page_id, 'user_id' => 99);
        }
    }
    if (!function_exists('Wo_IsPageLiked')) {
        function Wo_IsPageLiked($page_id, $viewer_id)
        {
            return (int) $page_id > 0 && (int) $viewer_id > 0;
        }
    }

    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('postPrivacy' => 4));
    privacy_assert($normalized['postPrivacy'] === 0, 'legacy privacy 4 must become public');
    privacy_assert($normalized['is_anonymous'] === 1, 'legacy privacy 4 must become anonymous');

    $normalized = VNSEEA_NormalizePostPrivacyRequest(array(
        'privacy_contract' => 'audience_v2',
        'postPrivacy' => 2,
        'postType' => 'reel'
    ));
    privacy_assert($normalized['postPrivacy'] === 2, 'audience_v2 reel privacy 2 must remain followers');
    privacy_assert($normalized['privacy_contract'] === 'audience_v2', 'new requests must expose audience_v2');

    $normalized = VNSEEA_NormalizePostPrivacyRequest(array(
        'postPrivacy' => 2,
        'postType' => 'reel'
    ));
    privacy_assert($normalized['postPrivacy'] === 3, 'legacy reel privacy 2 must become only owner');

    foreach (array(5, 6) as $privacy) {
        $normalized = VNSEEA_NormalizePostPrivacyRequest(array('postPrivacy' => $privacy));
        privacy_assert($normalized['postPrivacy'] === $privacy, 'privacy ' . $privacy . ' must be preserved');
    }

    $normalized = VNSEEA_NormalizePostPrivacyRequest(array(
        'privacy_contract' => 'audience_v2',
        'postPrivacy' => 3,
        'is_anonymous' => 1,
        'postFile' => 'upload/photos/image.jpg'
    ));
    privacy_assert($normalized['postPrivacy'] === 0 && $normalized['is_anonymous'] === 1, 'personal anonymous regular media must force public audience');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('page_id' => 9, 'postPrivacy' => 2, 'is_anonymous' => 1, 'privacy_contract' => 'audience_v2'));
    privacy_assert($normalized['postPrivacy'] === 2 && $normalized['is_anonymous'] === 0, 'page followers audience must be allowed without anonymity');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('page_id' => 9, 'postPrivacy' => 1));
    privacy_assert($normalized['postPrivacy'] === 0 && $normalized['is_anonymous'] === 0, 'invalid page personal audience must normalize to public');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('page_id' => 9, 'postPrivacy' => 5));
    privacy_assert($normalized['postPrivacy'] === 5 && $normalized['is_anonymous'] === 0, 'page special code 5 must retain specialized handling');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('group_id' => 9, 'postPrivacy' => 3, 'is_anonymous' => 1, 'privacy_contract' => 'audience_v2'));
    privacy_assert($normalized['postPrivacy'] === 0 && $normalized['is_anonymous'] === 0, 'group posts must inherit group access and reject personal anonymity');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('event_id' => 9, 'postPrivacy' => 2));
    privacy_assert($normalized['postPrivacy'] === 0 && $normalized['is_anonymous'] === 0, 'event posts must inherit event access');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('postType' => 'reel', 'postPrivacy' => 1, 'is_anonymous' => 1, 'privacy_contract' => 'audience_v2'));
    privacy_assert($normalized['postPrivacy'] === 1 && $normalized['is_anonymous'] === 0, 'reels must reject anonymity without changing audience_v2');
    $normalized = VNSEEA_NormalizePostPrivacyRequest(array('postType' => 'live', 'postPrivacy' => 2, 'is_anonymous' => 1, 'privacy_contract' => 'audience_v2'));
    privacy_assert($normalized['postPrivacy'] === 2 && $normalized['is_anonymous'] === 0, 'live posts must reject anonymity');

    $story = VNSEEA_NormalizeStoryPrivacyRequest(array());
    privacy_assert($story['privacy'] === 2, 'story privacy must default to followers');
    foreach (array(0, 1, 2, 3) as $privacy) {
        $story = VNSEEA_NormalizeStoryPrivacyRequest(array('privacy' => $privacy));
        privacy_assert($story['privacy'] === $privacy, 'story privacy ' . $privacy . ' must be accepted');
    }
    $story = VNSEEA_NormalizeStoryPrivacyRequest(array('story_privacy' => 1));
    privacy_assert($story['privacy'] === 1, 'story_privacy alias must be accepted');
    $story = VNSEEA_NormalizeStoryPrivacyRequest(array('postPrivacy' => 3));
    privacy_assert($story['privacy'] === 3, 'App postPrivacy story alias must be accepted');

    $follows = array(
        '20:10' => true,
        '10:20' => true,
        '10:30' => true
    );
    $following = function ($author_id, $viewer_id) use ($follows) {
        return !empty($follows[$author_id . ':' . $viewer_id]);
    };
    privacy_assert(VNSEEA_CanViewPersonalAudience(0, 10, 0, $following), 'public post must allow guests');
    privacy_assert(VNSEEA_CanViewPersonalAudience(1, 10, 20, $following), 'mutual active friend must be allowed');
    privacy_assert(!VNSEEA_CanViewPersonalAudience(1, 10, 30, $following), 'one-way follower must not satisfy mutual privacy');
    privacy_assert(VNSEEA_CanViewPersonalAudience(2, 10, 30, $following), 'follower of author must be allowed');
    privacy_assert(!VNSEEA_CanViewPersonalAudience(2, 10, 40, $following), 'non-follower must be denied');
    privacy_assert(VNSEEA_CanViewPersonalAudience(3, 10, 10, $following), 'owner must see only-owner post');
    privacy_assert(!VNSEEA_CanViewPersonalAudience(3, 10, 20, $following), 'non-owner must not see only-owner post');

    $anonymous_notification = VNSEEA_ProtectAnonymousNotification(array(
        'post_id' => 77,
        'notifier_id' => 10,
        'type2' => ''
    ), function ($post_id) {
        return array('id' => $post_id, 'user_id' => 10, 'postPrivacy' => 0, 'is_anonymous' => 1);
    });
    privacy_assert($anonymous_notification['type2'] === 'anonymous', 'anonymous post owner notifications must hide notifier identity centrally');
    $other_notification = VNSEEA_ProtectAnonymousNotification(array(
        'post_id' => 77,
        'notifier_id' => 20,
        'type2' => ''
    ), function ($post_id) {
        return array('id' => $post_id, 'user_id' => 10, 'postPrivacy' => 0, 'is_anonymous' => 1);
    });
    privacy_assert(empty($other_notification['type2']), 'other users interacting with an anonymous post must retain their identity');

    privacy_assert(VNSEEA_CanViewPost(array('page_id' => 7, 'postPrivacy' => 0), 20), 'public page post must be visible');
    privacy_assert(VNSEEA_CanViewPost(array('page_id' => 7, 'postPrivacy' => 2), 20), 'page follower post must be visible to a page follower');
    foreach (array(1, 3) as $invalid_page_privacy) {
        privacy_assert(!VNSEEA_CanViewPost(array('page_id' => 7, 'postPrivacy' => $invalid_page_privacy), 20), 'page privacy ' . $invalid_page_privacy . ' must not render to followers');
    }
    foreach (array(5, 6) as $special_page_privacy) {
        privacy_assert(VNSEEA_CanViewPost(array('page_id' => 7, 'postPrivacy' => $special_page_privacy), 0), 'page special code ' . $special_page_privacy . ' must reach specialized rendering');
    }

    $public = array('postPrivacy' => 0, 'is_anonymous' => 0);
    $anonymous = array('postPrivacy' => 0, 'is_anonymous' => 1);
    $legacy_anonymous = array('postPrivacy' => 4);
    privacy_assert(VNSEEA_IsShareableSource($public), 'public non-anonymous source must be shareable');
    privacy_assert(!VNSEEA_IsShareableSource($anonymous), 'anonymous source must not be shareable');
    privacy_assert(!VNSEEA_IsShareableSource($legacy_anonymous), 'legacy anonymous source must not be shareable');

    $anonymous_post = array(
        'user_id' => 10,
        'is_anonymous' => 1,
        'publisher' => array('user_id' => 10, 'id' => 10, 'username' => 'secret', 'name' => 'Secret'),
        'user_data' => array('user_id' => 10, 'username' => 'secret'),
        'can_delete' => false
    );
    $owner_view = VNSEEA_RedactAnonymousPost($anonymous_post, 10, 'Anonymous', 'avatar.png');
    privacy_assert($owner_view['user_id'] === 10, 'anonymous owner must retain ownership identity');
    $viewer_view = VNSEEA_RedactAnonymousPost($anonymous_post, 20, 'Anonymous', 'avatar.png');
    privacy_assert($viewer_view['user_id'] === 0, 'anonymous viewer payload must redact user_id');
    privacy_assert($viewer_view['publisher']['username'] === 'anonymous', 'anonymous viewer payload must redact publisher');
    privacy_assert($viewer_view['user_data']['user_id'] === 0, 'anonymous viewer payload must redact user_data');

    $anonymous_comment = array(
        'user_id' => 10,
        'publisher' => array('user_id' => 10, 'id' => 10, 'username' => 'secret', 'name' => 'Secret')
    );
    $redacted_comment = VNSEEA_RedactAnonymousComment($anonymous_comment, $anonymous_post, 20, 'Anonymous', 'avatar.png');
    privacy_assert($redacted_comment['user_id'] === 0, 'anonymous owner comment payload must redact user_id');
    privacy_assert($redacted_comment['publisher']['username'] === 'anonymous', 'anonymous owner comment payload must redact publisher');
    privacy_assert(!empty($redacted_comment['is_anonymous_owner']), 'anonymous owner comment payload must retain compatibility marker');

    $share_rows = array(
        11 => array('id' => 11, 'parent_id' => 12, 'postPrivacy' => 0, 'is_anonymous' => 0, 'user_id' => 10),
        12 => array('id' => 12, 'parent_id' => 13, 'postPrivacy' => 0, 'is_anonymous' => 0, 'user_id' => 10),
        13 => array('id' => 13, 'parent_id' => 0, 'postPrivacy' => 3, 'is_anonymous' => 0, 'user_id' => 10)
    );
    $share_loader = function ($post_id) use (&$share_rows) {
        return isset($share_rows[$post_id]) ? $share_rows[$post_id] : array();
    };
    privacy_assert(!VNSEEA_CanSharePostTree($share_rows[11], 20, $share_loader), 'shared clone must reject a restricted ancestor source');
    $share_rows[13]['postPrivacy'] = 0;
    privacy_assert(VNSEEA_CanSharePostTree($share_rows[11], 20, $share_loader), 'shared clone must allow an entirely public non-anonymous source chain');
}

$contracts = array(
    array('assets/init.php', "require_once('includes/vnseea_privacy.php')", 'privacy helper must load before application functions'),
    array('assets/includes/functions_one.php', 'VNSEEA_CanViewPost', 'Wo_PostData must use central post authorization'),
    array('assets/includes/functions_one.php', "['can_share']", 'post payload must expose can_share'),
    array('assets/includes/functions_one.php', 'VNSEEA_RedactAnonymousComment', 'post comment payloads must centrally redact the anonymous owner'),
    array('assets/includes/functions_one.php', "['type2'] === 'anonymous'", 'notification payloads must centrally redact anonymous actors'),
    array('assets/includes/functions_three.php', 'VNSEEA_CanViewStory', 'story helpers must use central story authorization'),
    array('assets/includes/functions_three.php', 'VNSEEA_CanSharePostTree', 'share creation must reject restricted, anonymous, or tainted clone sources'),
    array('assets/includes/functions_two.php', 'VNSEEA_CanMutatePost', 'comment mutations must authorize the parent post'),
    array('api/v2/endpoints/new_post.php', 'VNSEEA_NormalizePostPrivacyRequest', 'API post creation must normalize privacy'),
    array('xhr/posts.php', 'VNSEEA_NormalizePostPrivacyRequest', 'web post creation must normalize privacy'),
    array('api/v2/endpoints/create-story.php', 'VNSEEA_NormalizeStoryPrivacyRequest', 'story creation must normalize privacy'),
    array('api/phone/create_story.php', 'VNSEEA_NormalizeStoryPrivacyRequest', 'phone story creation must normalize privacy'),
    array('xhr/status.php', 'VNSEEA_NormalizeStoryPrivacyRequest', 'web story creation must normalize privacy'),
    array('api/v2/endpoints/get_story_by_id.php', 'VNSEEA_CanViewStory', 'direct story API must authorize the viewer'),
    array('xhr/view_story_by_id.php', 'VNSEEA_CanViewStory', 'story navigation must authorize every selected story'),
    array('xhr/story_view.php', 'VNSEEA_CanViewStory', 'story view mutation must authorize the viewer'),
    array('xhr/view_all_stories.php', 'VNSEEA_CanViewStory', 'requested story entry must authorize the viewer'),
    array('sources/timeline.php', 'VNSEEA_CanViewStory', 'profile story presence must only use viewable stories'),
    array('api/v2/endpoints/live.php', 'VNSEEA_CanViewPost', 'live post path must authorize viewers'),
    array('api/v2/endpoints/live.php', '$live_privacy_request[\'postType\'] = \'live\'', 'live creation must identify its context before privacy normalization'),
    array('xhr/live.php', 'VNSEEA_NormalizePostPrivacyRequest', 'web live creation must normalize privacy and reject anonymity'),
    array('xhr/live.php', 'VNSEEA_CanViewPost', 'web live polling must authorize the viewer'),
    array('api/v2/endpoints/comments.php', 'VNSEEA_RedactAnonymousComment', 'direct API comment payloads must redact the anonymous post owner'),
    array('sources/watch.php', 'Wo_PostData', 'watch route must authorize the requested video before rendering or redirecting'),
    array('themes/wowonder/layout/story/includes/header.phtml', 'VNSEEA_IsAnonymousPost', 'story header must use anonymous compatibility helper'),
    array('themes/wowonder/layout/comment/content.phtml', 'VNSEEA_IsAnonymousPost', 'anonymous comment rendering must use compatibility helper'),
    array('themes/wowonder/layout/lightbox/content.phtml', 'VNSEEA_IsAnonymousPost', 'lightbox must use anonymous compatibility helper'),
    array('themes/sunshine/layout/story/includes/header.phtml', 'VNSEEA_IsAnonymousPost', 'sunshine story header must use anonymous compatibility helper'),
    array('themes/sunshine/layout/comment/content.phtml', 'VNSEEA_IsAnonymousPost', 'sunshine comments must use anonymous compatibility helper'),
    array('themes/sunshine/layout/lightbox/content.phtml', 'VNSEEA_IsAnonymousPost', 'sunshine lightbox must use anonymous compatibility helper'),
    array('database/migrations/20260718_content_privacy_audience_v2.sql', '`is_anonymous`', 'migration must add anonymous marker'),
    array('database/migrations/20260718_content_privacy_audience_v2.sql', '`privacy`', 'migration must add story privacy'),
    array('database/migrations/20260718_content_privacy_audience_v2.sql', '`is_reel` = 1', 'migration must repair legacy reel privacy')
);

foreach ($contracts as $contract) {
    privacy_assert(
        privacy_source_contains($root, $contract[0], $contract[1]),
        $contract[2] . ' (' . $contract[0] . ')'
    );
}

privacy_assert(
    privacy_source_count($root, 'assets/includes/functions_one.php', 'VNSEEA_CanMutatePost') >= 7,
    'all primary post mutations must use the central authorization guard'
);
privacy_assert(
    privacy_source_count($root, 'assets/includes/functions_two.php', 'VNSEEA_CanMutatePost') >= 5,
    'comment/reply mutations must use the central authorization guard'
);
privacy_assert(
    !privacy_source_contains($root, 'assets/includes/vnseea_privacy.php', 'Wo_PostData(') &&
    privacy_source_contains($root, 'assets/includes/vnseea_privacy.php', 'VNSEEA_CanViewPost($post, $viewer_id)'),
    'post mutation authorization must use a direct row lookup and never recurse through Wo_PostData'
);
privacy_assert(
    privacy_source_count($root, 'assets/includes/functions_three.php', 'VNSEEA_CanViewStory') >= 1 &&
    privacy_source_count($root, 'assets/includes/functions_three.php', 'VNSEEA_StoryAudienceSql') >= 5,
    'story list, direct helper, count and unseen queries must share the audience policy'
);
privacy_assert(
    !privacy_source_contains($root, 'assets/includes/functions_one.php', "AND `postPrivacy` <> '4' AND `is_anonymous` = 0"),
    'public anonymous posts must remain discoverable in feed/profile/search queries'
);
privacy_assert(
    privacy_source_contains($root, 'assets/includes/vnseea_privacy.php', 'VNSEEA_CanAccessEvent') &&
    privacy_source_contains($root, 'assets/includes/vnseea_privacy.php', 'if ($privacy !== 2)'),
    'event context and page privacy 0/2 must be explicitly authorized'
);
privacy_assert(
    privacy_source_count($root, 'assets/includes/functions_three.php', 'VNSEEA_CanSharePostTree') >= 2 &&
    privacy_source_contains($root, 'assets/includes/functions_one.php', 'VNSEEA_CanSharePostTree'),
    'share creation and rendering must authorize the complete clone source chain'
);
privacy_assert(
    privacy_source_count($root, 'api/v2/endpoints/posts.php', 'if (empty($post))') >= 3,
    'random groups/pages/videos API loops must skip posts rejected by Wo_PostData'
);
privacy_assert(
    privacy_source_contains($root, 'assets/includes/functions_one.php', 'VNSEEA_ProtectAnonymousNotification($data)') &&
    privacy_source_contains($root, 'assets/includes/functions_one.php', '$notification_notifier'),
    'notification registration and email rendering must use centralized anonymous identity protection'
);
privacy_assert(
    privacy_source_contains($root, 'assets/includes/functions_one.php', 'VNSEEA_NormalizePostPrivacyRequest($privacy_request)') &&
    privacy_source_contains($root, 'assets/includes/functions_one.php', '`is_anonymous` =') &&
    privacy_source_contains($root, 'assets/includes/functions_one.php', "array(0, 1, 2, 3, 4, 5, 6)"),
    'post privacy updates must normalize legacy anonymous state and update the separate anonymous column'
);
privacy_assert(
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', 'MODIFY COLUMN `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0') &&
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', 'MODIFY COLUMN `privacy` TINYINT(1) NOT NULL DEFAULT 2'),
    'migration must enforce defaults when privacy columns already exist'
);
privacy_assert(
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', "SET `postPrivacy` = '0', `is_anonymous` = 1") &&
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', "WHERE `postPrivacy` = '4'") &&
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', "SET `postPrivacy` = '3'") &&
    privacy_source_contains($root, 'database/migrations/20260718_content_privacy_audience_v2.sql', "WHERE `is_reel` = 1 AND `postPrivacy` = '2'"),
    'migration must write quoted privacy values so ENUM and numeric schemas are both supported'
);

if (!empty($failures)) {
    fwrite(STDERR, "Content privacy contract failed:\n- " . implode("\n- ", $failures) . "\n");
    exit(1);
}

echo 'Content privacy contract passed (' . $checks . " checks).\n";
