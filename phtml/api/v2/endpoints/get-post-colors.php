<?php
// English description: Returns configured Wowonder colored post backgrounds without encrypted site settings payload.

$colors = array();
$post_colors = array();

if (!empty($wo['config']['colored_posts_system']) && $wo['config']['colored_posts_system'] == 1 && function_exists('Wo_GetAllColors')) {
    $post_colors = Wo_GetAllColors();
}

if (empty($post_colors) && !empty($wo['post_colors'])) {
    $post_colors = $wo['post_colors'];
}

if (!empty($post_colors)) {
    foreach ($post_colors as $key => $color) {
        $item = (array) $color;
        $image = '';

        if (!empty($item['image'])) {
            $image = Wo_GetMedia($item['image']);
        }

        $colors[] = array(
            'id' => !empty($item['id']) ? (int) $item['id'] : (int) $key,
            'color_1' => !empty($item['color_1']) ? $item['color_1'] : '',
            'color_2' => !empty($item['color_2']) ? $item['color_2'] : '',
            'text_color' => !empty($item['text_color']) ? $item['text_color'] : '#ffffff',
            'image' => $image,
        );
    }
}

$response_data = array(
    'api_status' => 200,
    'post_colors' => $colors,
);
