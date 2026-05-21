<?php
// Creates a blog article or a saved draft from Nuxt.

$response_data = array(
    'api_status' => 400
);

$blog_category_aliases = array(
    'vehicles' => 2,
    'business' => 4,
    'education' => 5,
    'movies' => 7,
    'gaming' => 8,
    'history' => 9,
    'lifestyle' => 10,
    'people' => 13,
    'pets' => 14,
    'science' => 16,
    'sports' => 17,
    'travel' => 18,
    'other' => 1
);

$normalize_blog_category = function ($value) use ($wo, $blog_category_aliases) {
    $raw_value = strtolower(trim((string) $value));
    $categories = !empty($wo['blog_categories']) && is_array($wo['blog_categories']) ? $wo['blog_categories'] : array(1 => 'Other');

    if (is_numeric($raw_value) && !empty($categories[$raw_value])) {
        return (int) $raw_value;
    }

    if (!empty($blog_category_aliases[$raw_value]) && !empty($categories[$blog_category_aliases[$raw_value]])) {
        return $blog_category_aliases[$raw_value];
    }

    return !empty($categories[1]) ? 1 : (int) array_key_first($categories);
};

$plain_text_excerpt = function ($value) {
    $value = preg_replace('/[#>*_`-]+/', ' ', (string) $value);
    $value = trim(preg_replace('/\s+/', ' ', strip_tags($value)));

    return substr($value, 0, 290);
};

$is_draft = !empty($_POST['status']) && $_POST['status'] === 'draft';
$title = trim((string) ($_POST['blog_title'] ?? ''));
$content = trim((string) ($_POST['blog_content'] ?? ''));
$description = trim((string) ($_POST['blog_description'] ?? ''));
$tags = trim((string) ($_POST['blog_tags'] ?? ''));
$category = $normalize_blog_category($_POST['blog_category'] ?? 'other');

if (Wo_CanBlog() == false) {
    $error_code = 3;
    $error_message = 'Blog creation is disabled.';
}

if (empty($error_code)) {
    if ($is_draft) {
        if ($title === '') {
            $title = 'Untitled draft ' . date('Y-m-d H:i');
        }
        if ($content === '') {
            $content = $title;
        }
        if ($description === '') {
            $description = $plain_text_excerpt($content);
        }
        if (strlen($description) < 32) {
            $description = str_pad($description, 32, ' ');
        }
        if ($tags === '') {
            $tags = 'draft';
        }
    } else {
        if ($title === '' || $content === '' || $description === '' || $tags === '' || empty($_FILES['thumbnail'])) {
            $error_code = 4;
            $error_message = 'Please check your details.';
        } else if (strlen($title) < 10) {
            $error_code = 5;
            $error_message = 'Title must be more than 10 characters.';
        } else if (strlen($description) < 32) {
            $error_code = 6;
            $error_message = 'Description must be more than 32 characters.';
        }
    }
}

if (empty($error_code)) {
    $content = preg_replace($wo['regx_attr'], '', $content);
    $tags = preg_replace('/on[^<>=]+=[^<>]*/m', '', $tags);
    $tags = strip_tags($tags);
    $active = $is_draft ? 0 : 1;

    if (!$is_draft && $wo['config']['blog_approval'] == 1 && !Wo_IsAdmin()) {
        $active = 0;
    }

    $registration_data = array(
        'user' => $wo['user']['id'],
        'title' => Wo_Secure($title),
        'content' => Wo_Secure($content, 0, false, 0, false),
        'description' => substr(Wo_Secure($description), 0, 290),
        'posted' => time(),
        'category' => Wo_Secure($category),
        'tags' => Wo_Secure($tags),
        'active' => $active
    );

    $last_id = Wo_InsertBlog($registration_data);

    if ($last_id && is_numeric($last_id)) {
        if (!empty($_FILES['thumbnail']['tmp_name'])) {
            $fileInfo = array(
                'file' => $_FILES['thumbnail']['tmp_name'],
                'name' => $_FILES['thumbnail']['name'],
                'size' => $_FILES['thumbnail']['size'],
                'type' => $_FILES['thumbnail']['type'],
                'types' => 'jpeg,jpg,png,bmp,gif,webp',
                'crop' => array(
                    'width' => 1200,
                    'height' => 600
                )
            );
            $media = Wo_ShareFile($fileInfo);

            if (!empty($media['filename'])) {
                Wo_UpdateBlog($last_id, array(
                    'thumbnail' => $media['filename']
                ));
            }
        }

        if (!$is_draft) {
            $tag_text = '';
            foreach (explode(',', $tags) as $tag) {
                $tag = trim($tag);
                if ($tag !== '') {
                    $tag_text .= "#$tag ";
                }
            }

            Wo_RegisterPost(array(
                'user_id' => Wo_Secure($wo['user']['user_id']),
                'blog_id' => Wo_Secure($last_id),
                'postText' => Wo_Secure($title) . ' | ' . $tag_text,
                'time' => time(),
                'postPrivacy' => '0',
                'active' => $active,
            ));
        }

        $response_data = array(
            'api_status' => 200,
            'blog_id' => (int) $last_id,
            'status' => $is_draft ? 'draft' : ($active == 0 ? 'pending' : 'published'),
            'url' => Wo_SeoLink('index.php?link1=read-blog&id=' . $last_id)
        );
    } else {
        $error_code = 7;
        $error_message = 'Unable to create blog.';
    }
}

if (!empty($error_code)) {
    $response_data = array(
        'api_status' => 400,
        'errors' => array(
            'error_id' => $error_code,
            'error_text' => $error_message
        )
    );
}
