<?php
if ($wo['config']['watch_page'] == 0) {
    header("Location: " . $wo['config']['site_url']);
    exit();
}

if (!empty($_GET['id'])) {
    $story = Wo_PostData($_GET['id']);

    if (empty($story) || !empty($story['is_reel'])) {
        header("Location: " . $wo['config']['site_url']);
        exit();
    }
    $wo['single_story'] = (object) $story;
    if (isset($wo['single_story']->postFile) && strpos($wo['single_story']->postFile, 'videos') !== false) {
        header("Location: " . $wo['config']['site_url'] . '/post/' . $_GET['id']);
    }
}

$wo['videos_plays_in_lightbox'] = true;
$wo['description'] = $wo['config']['siteDesc'];
$wo['keywords'] = $wo['config']['siteKeywords'];
$wo['page'] = 'watch';
$wo['title'] = $wo['lang']['watch'];
$wo['content'] = Wo_LoadPage('watch/content');
