<?php
// +------------------------------------------------------------------------+
// | VnseeaRn - Mobile Create Movie endpoint (v2 API)
// | Mirrors the field set of phtml/admin-panel/pages/edit-movie/content.phtml
// | and the validation of phtml/xhr/edit-film.php, but accepts any logged-in
// | user (not just admin) and is invoked only by the React Native client.
// | Follows docs/skills/php-bridge-safety: no web-facing behaviour is changed.
// +------------------------------------------------------------------------+

$response_data = array(
    'api_status' => 400
);

$error_code    = null;
$error_message = null;

// 1. Required POST fields (mirror edit-film.php + create-product.php).
$required_fields = array(
    'name',
    'description',
    'genre',
    'country',
    'stars',
    'producer',
    'release',
    'duration',
    'quality',
    'rating',
    'source',
);

foreach ($required_fields as $field) {
    if (!isset($_POST[$field]) || (is_string($_POST[$field]) && trim($_POST[$field]) === '')) {
        $error_code    = 3;
        $error_message = $field . ' (POST) is missing';
        break;
    }
}

// 2. Secure inputs + numeric casts.
$name        = Wo_Secure($_POST['name']);
$description = Wo_Secure($_POST['description']);
$genre       = Wo_Secure($_POST['genre']);
$country     = Wo_Secure($_POST['country']);
$stars       = Wo_Secure($_POST['stars']);
$producer    = Wo_Secure($_POST['producer']);
$source      = Wo_Secure($_POST['source']);
$release_in  = Wo_Secure($_POST['release']);
$duration_in = Wo_Secure($_POST['duration']);
$rating_in   = Wo_Secure($_POST['rating']);
$quality     = Wo_Secure($_POST['quality']);

$release_int  = (int) $release_in;
$duration_int = (int) $duration_in;
$rating_int   = (int) $rating_in;
$current_year = (int) date('Y');

// 3. Field-level validation (mirror phtml/xhr/edit-film.php + admin edit-movie).
if (empty($error_message)) {
    if (strlen($name) < 3) {
        $error_message = 'Name must be at least 3 characters';
    } elseif (strlen($description) < 32) {
        $error_message = 'Description must be at least 32 characters';
    } elseif (!array_key_exists($genre, $wo['film-genres'])) {
        $error_message = 'Invalid genre';
    } elseif (!array_key_exists($country, $wo['countries'])) {
        $error_message = 'Invalid country';
    } else {
        $quality_whitelist = array(
            'cam', 'ts', 'vsh', 'wp', 'scr', 'dvds', 'ldr', 'tv',
            'sat', 'dvb', 'dtv', 'dvd', 'hdr', 'web-dl', 'hd-tv', 'hd',
        );
        if (!in_array($quality, $quality_whitelist, true)) {
            $error_message = 'Invalid quality value';
        } elseif ($release_int < 1960 || $release_int > $current_year) {
            $error_message = 'Release year must be between 1960 and ' . $current_year;
        } elseif ($duration_int < 10 || $duration_int > 350) {
            $error_message = 'Duration must be between 10 and 350 minutes';
        } elseif ($rating_int < 1 || $rating_int > 10) {
            $error_message = 'Rating must be between 1 and 10';
        } else {
            $is_youtube = (bool) preg_match('#^(https?://)?(www\.)?(youtube\.com|youtu\.be)#i', $source);
            $is_vimeo   = (bool) preg_match('#^(https?://)?(www\.)?vimeo\.com#i', $source);
            $is_url     = (bool) filter_var($source, FILTER_VALIDATE_URL);
            if (!$is_url && !$is_youtube && !$is_vimeo) {
                $error_message = 'Source must be a valid URL (YouTube, Vimeo, or direct link)';
            }
        }
    }
}

// 4. Cover image validation (mirror phtml/xhr/edit-film.php line 41-43).
if (empty($error_message) && !empty($_FILES['cover']['tmp_name'])) {
    if (!file_exists($_FILES['cover']['tmp_name'])) {
        $error_message = 'Cover file is invalid';
    } else {
        $cover_info = @getimagesize($_FILES['cover']['tmp_name']);
        if ($cover_info === false) {
            $error_message = 'Cover must be an image';
        } elseif ($cover_info[0] > 400 || $cover_info[1] > 570) {
            $error_message = 'Cover size should not be more than 400x570';
        }
    }
}

// 5. Insert the movie (Wo_InsertFilm checks $wo['loggedin'] itself).
if (empty($error_message)) {
    $film_data = array(
        'user_id'     => $wo['user']['user_id'],
        'name'        => $name,
        'description' => $description,
        'genre'       => $genre,
        'country'     => $country,
        'stars'       => $stars,
        'producer'    => $producer,
        'release'     => $release_int,
        'duration'    => $duration_int,
        'quality'     => $quality,
        'rating'      => $rating_int,
        'source'      => $source,
        'url'         => $source,
        'time'        => time(),
        'views'       => 0,
    );

    $last_id = Wo_InsertFilm($film_data);

    if ($last_id && is_numeric($last_id)) {
        // 6. Upload cover image (if provided) and attach it to the new movie.
        if (!empty($_FILES['cover']['tmp_name'])) {
            $fileInfo = array(
                'file'     => $_FILES['cover']['tmp_name'],
                'name'     => $_FILES['cover']['name'],
                'size'     => $_FILES['cover']['size'],
                'type'     => $_FILES['cover']['type'],
                'types'    => 'jpeg,jpg,png,bmp,gif',
                'compress' => false,
            );
            $media = Wo_ShareFile($fileInfo);
            if (!empty($media['filename'])) {
                Wo_UpdateFilm($last_id, array('cover' => $media['filename']));
            }
        }

        $movie_url = function_exists('Wo_SeoLink')
            ? Wo_SeoLink('index.php?link1=watch-film&film-id=' . $last_id)
            : ('/movie/' . $last_id);

        $response_data = array(
            'api_status' => 200,
            'movie_id'   => $last_id,
            'url'        => $movie_url,
        );
    } else {
        $error_message = 'Could not create movie';
    }
}

// 7. Error envelope (mirror create-product.php error shape).
if (!empty($error_message)) {
    $response_data = array(
        'api_status' => 400,
        'errors'     => array(
            'error_id'   => $error_code !== null ? $error_code : 4,
            'error_text' => $error_message,
        ),
    );
}
