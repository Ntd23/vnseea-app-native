<?php
$query = '';
if (!empty($_POST['query'])) {
    $query = $_POST['query'];
} else if (!empty($_POST['search_key'])) {
    $query = $_POST['search_key'];
}

$query = str_replace('#', '', Wo_Secure($query));
$limit = (!empty($_POST['limit']) && is_numeric($_POST['limit'])) ? (int) $_POST['limit'] : 8;
if ($limit < 1) {
    $limit = 8;
} else if ($limit > 20) {
    $limit = 20;
}

$hashtags = array();

$results = array();
if (empty($query)) {
    $results = Wa_GetTrendingHashs('popular', $limit);
} else {
    $results = Wo_GetSerachHash($query);
}

foreach (array_slice($results, 0, $limit) as $hashtag) {
    $hashtags[] = array(
        'id' => isset($hashtag['id']) ? $hashtag['id'] : $hashtag['tag'],
        'tag' => $hashtag['tag'],
        'url' => isset($hashtag['url']) ? $hashtag['url'] : '',
        'trend_use_num' => isset($hashtag['trend_use_num']) ? (int) $hashtag['trend_use_num'] : 0,
        'last_trend_time' => isset($hashtag['last_trend_time']) ? $hashtag['last_trend_time'] : '',
    );
}

if (empty($hashtags) && !empty($query)) {
    $posts = Wo_GetHashtagPosts($query, 0, 1);
    if (!empty($posts)) {
        $hashtags[] = array(
            'id' => $query,
            'tag' => $query,
            'url' => Wo_SeoLink('index.php?link1=hashtag&hash=' . $query),
            'trend_use_num' => 0,
            'last_trend_time' => '',
        );
    }
}

$response_data = array(
    'api_status' => 200,
    'hashtags' => $hashtags
);
