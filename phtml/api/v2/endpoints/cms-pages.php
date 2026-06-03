<?php
// English description: Returns public CMS terms and custom page content for Nuxt clients.
// +------------------------------------------------------------------------+
// | WoWonder - The Ultimate Social Networking Platform
// +------------------------------------------------------------------------+

$response_data = array(
    'api_status' => 400,
);

$action = !empty($_POST['action']) ? Wo_Secure($_POST['action'], 0) : 'page';

function vnseea_cms_ensure_language() {
    global $wo;

    if (!empty($wo['lang']) && is_array($wo['lang'])) {
        return;
    }

    $language = 'english';
    if (!empty($wo['language'])) {
        $language = $wo['language'];
    } else if (!empty($wo['config']['defualtLang'])) {
        $language = $wo['config']['defualtLang'];
    }

    $wo['lang'] = Wo_LangsFromDB($language);

    if (empty($wo['lang'])) {
        $wo['lang'] = Wo_LangsFromDB();
    }
}

function vnseea_cms_page_title($type) {
    global $wo;

    if ($type == 'terms') {
        return !empty($wo['lang']['terms_of_use']) ? $wo['lang']['terms_of_use'] : 'Terms of use';
    }
    if ($type == 'privacy-policy') {
        return !empty($wo['lang']['privacy_policy']) ? $wo['lang']['privacy_policy'] : 'Privacy policy';
    }
    if ($type == 'about-us') {
        return !empty($wo['lang']['about']) ? $wo['lang']['about'] : 'About';
    }
    if ($type == 'refund') {
        return !empty($wo['lang']['refund']) ? $wo['lang']['refund'] : 'Refund';
    }

    return '';
}

function vnseea_cms_terms_key($type) {
    if ($type == 'terms') {
        return 'terms_of_use_page';
    }
    if ($type == 'privacy-policy') {
        return 'privacy_policy_page';
    }
    if ($type == 'about-us') {
        return 'about_page';
    }
    if ($type == 'refund') {
        return 'refund_terms_page';
    }

    return '';
}

function vnseea_cms_terms_content($type, $content_key) {
    global $wo;

    if (!empty($wo['lang'][$content_key])) {
        return $wo['lang'][$content_key];
    }

    $legacy_terms = Wo_GetTerms();
    if (!empty($legacy_terms[$type])) {
        return htmlspecialchars_decode($legacy_terms[$type]);
    }
    if (!empty($legacy_terms[$content_key])) {
        return htmlspecialchars_decode($legacy_terms[$content_key]);
    }

    return '';
}

if ($action == 'pages') {
    $pages = array();

    foreach (Wo_GetCustomPages() as $page) {
        if (empty($page['page_name']) || empty($page['page_title'])) {
            continue;
        }

        $pages[] = array(
            'id' => !empty($page['id']) ? (int) $page['id'] : 0,
            'kind' => 'custom',
            'name' => $page['page_name'],
            'title' => $page['page_title'],
            'href' => 'site-pages/' . $page['page_name'],
        );
    }

    $response_data = array(
        'api_status' => 200,
        'pages' => $pages,
    );

    return;
}

$kind = !empty($_POST['kind']) ? Wo_Secure($_POST['kind'], 0) : '';

if ($kind == 'terms') {
    vnseea_cms_ensure_language();

    $type = !empty($_POST['type']) ? Wo_Secure($_POST['type'], 0) : '';
    $allowed = array('terms', 'privacy-policy', 'about-us');

    if (!empty($wo['config']['refund_system']) && $wo['config']['refund_system'] == 'on') {
        $allowed[] = 'refund';
    }

    $content_key = vnseea_cms_terms_key($type);

    if (!in_array($type, $allowed) || empty($content_key)) {
        $error_code = 4;
        $error_message = 'CMS page not found';
        return;
    }

    $content = vnseea_cms_terms_content($type, $content_key);
    $title = vnseea_cms_page_title($type);

    if (empty($title)) {
        $error_code = 4;
        $error_message = 'CMS page not found';
        return;
    }

    $response_data = array(
        'api_status' => 200,
        'page' => array(
            'kind' => 'terms',
            'type' => $type,
            'title' => $title,
            'content' => $content,
            'page_type' => 1,
            'href' => 'terms/' . $type,
        ),
    );

    return;
}

if ($kind == 'custom') {
    $page_name = !empty($_POST['page_name']) ? Wo_Secure($_POST['page_name'], 0) : '';
    $page = Wo_GetCustomPage($page_name);

    if (empty($page) || empty($page['page_name']) || empty($page['page_title'])) {
        $error_code = 4;
        $error_message = 'CMS page not found';
        return;
    }

    $response_data = array(
        'api_status' => 200,
        'page' => array(
            'id' => !empty($page['id']) ? (int) $page['id'] : 0,
            'kind' => 'custom',
            'name' => $page['page_name'],
            'title' => $page['page_title'],
            'content' => !empty($page['page_content']) ? htmlspecialchars_decode($page['page_content']) : '',
            'page_type' => !empty($page['page_type']) ? (int) $page['page_type'] : 0,
            'href' => 'site-pages/' . $page['page_name'],
        ),
    );

    return;
}

$error_code = 3;
$error_message = 'CMS page kind is invalid';
