<?php
// English description: Exposes enabled directory destinations as JSON for the Nuxt directory bridge using backend feature flags and language labels.

$response_data = array(
    'api_status' => 400
);

if (empty($wo['config']['directory_system'])) {
    $error_code = 5;
    $error_message = 'directory is disabled';
}

function Wo_NuxtDirectoryItem($key, $label, $description, $href, $icon, $enabled) {
    return array(
        'key' => $key,
        'label' => $label,
        'description' => $description,
        'href' => $href,
        'icon' => $icon,
        'enabled' => !empty($enabled)
    );
}

function Wo_NuxtDirectoryLang($key, $fallback) {
    global $wo;
    return !empty($wo['lang'][$key]) ? $wo['lang'][$key] : $fallback;
}

if (empty($error_code)) {
    $site_url = rtrim($wo['config']['site_url'], '/');
    $items = array(
        Wo_NuxtDirectoryItem('posts', 'Posts', Wo_NuxtDirectoryLang('posts', 'Posts'), $site_url . '/directory', 'i-ph-article-duotone', true),
        Wo_NuxtDirectoryItem('users', Wo_NuxtDirectoryLang('users', 'Users'), Wo_NuxtDirectoryLang('users', 'Users'), $site_url . '/directory/users', 'i-ph-users-three-duotone', true),
        Wo_NuxtDirectoryItem('pages', Wo_NuxtDirectoryLang('pages', 'Pages'), Wo_NuxtDirectoryLang('pages', 'Pages'), $site_url . '/directory/pages', 'i-ph-flag-duotone', $wo['config']['pages'] == 1),
        Wo_NuxtDirectoryItem('groups', Wo_NuxtDirectoryLang('group', 'Groups'), Wo_NuxtDirectoryLang('group', 'Groups'), $site_url . '/directory/groups', 'i-ph-users-four-duotone', $wo['config']['groups'] == 1),
        Wo_NuxtDirectoryItem('blogs', Wo_NuxtDirectoryLang('blog', 'Blog'), Wo_NuxtDirectoryLang('blog', 'Blog'), $site_url . '/directory/blogs', 'i-ph-newspaper-duotone', $wo['config']['blogs'] == 1),
        Wo_NuxtDirectoryItem('market', Wo_NuxtDirectoryLang('market', 'Market'), Wo_NuxtDirectoryLang('market', 'Market'), $site_url . '/directory/market', 'i-ph-storefront-duotone', $wo['config']['classified'] == 1),
        Wo_NuxtDirectoryItem('events', Wo_NuxtDirectoryLang('events', 'Events'), Wo_NuxtDirectoryLang('events', 'Events'), $site_url . '/directory/events', 'i-ph-calendar-blank-duotone', $wo['config']['events'] == 1),
        Wo_NuxtDirectoryItem('games', Wo_NuxtDirectoryLang('games', 'Games'), Wo_NuxtDirectoryLang('games', 'Games'), $site_url . '/directory/games', 'i-ph-game-controller-duotone', $wo['config']['games'] == 1 && $wo['config']['can_use_games']),
        Wo_NuxtDirectoryItem('forum', Wo_NuxtDirectoryLang('forum', 'Forum'), Wo_NuxtDirectoryLang('forum', 'Forum'), $site_url . '/directory/forums', 'i-ph-chats-circle-duotone', $wo['config']['forum'] == 1),
        Wo_NuxtDirectoryItem('movies', Wo_NuxtDirectoryLang('movies', 'Movies'), Wo_NuxtDirectoryLang('movies', 'Movies'), $site_url . '/directory/movies', 'i-ph-film-strip-duotone', $wo['config']['movies'] == 1 && $wo['config']['can_use_movies']),
        Wo_NuxtDirectoryItem('jobs', Wo_NuxtDirectoryLang('jobs', 'Jobs'), Wo_NuxtDirectoryLang('jobs', 'Jobs'), $site_url . '/directory/jobs', 'i-ph-briefcase-duotone', $wo['config']['job_system'] == 1),
        Wo_NuxtDirectoryItem('funding', Wo_NuxtDirectoryLang('funding', 'Funding'), Wo_NuxtDirectoryLang('funding', 'Funding'), $site_url . '/directory/fundings', 'i-ph-hand-heart-duotone', $wo['config']['funding_system'] == 1)
    );

    $enabled_items = array();
    foreach ($items as $item) {
        if (!empty($item['enabled'])) {
            $enabled_items[] = $item;
        }
    }

    $response_data = array(
        'api_status' => 200,
        'title' => Wo_NuxtDirectoryLang('welcome_discover', 'Discover') . ' ' . Wo_NuxtDirectoryLang('posts', 'Posts'),
        'description' => Wo_NuxtDirectoryLang('posts', 'Posts'),
        'items' => $enabled_items
    );
}
