<?php
// English description: Returns jobs metadata, user defaults, and owned pages needed by the Nuxt jobs bridge.

$response_data = array(
    'api_status' => 400
);

$job_type = array('full_time','part_time','internship','volunteer','contract');
$salary_date = array('per_hour','per_day','per_week','per_month','per_year');
$question_type = array('free_text_question','yes_no_question','multiple_choice_question');

if (empty($wo['user']) || empty($wo['user']['id'])) {
    $error_code    = 1;
    $error_message = 'User is not authenticated';
}
else {
    $categories = array();
    foreach ($wo['job_categories'] as $key => $label) {
        $categories[] = array(
            'value' => (string) $key,
            'label' => $label
        );
    }

    $types = array();
    foreach ($job_type as $value) {
        $types[] = array(
            'value' => $value,
            'label' => !empty($wo['lang'][$value]) ? $wo['lang'][$value] : ucwords(str_replace('_', ' ', $value))
        );
    }

    $salary_dates = array();
    foreach ($salary_date as $value) {
        $salary_dates[] = array(
            'value' => $value,
            'label' => !empty($wo['lang'][$value]) ? $wo['lang'][$value] : ucwords(str_replace('_', ' ', $value))
        );
    }

    $question_types = array();
    foreach ($question_type as $value) {
        $question_types[] = array(
            'value' => $value,
            'label' => !empty($wo['lang'][$value]) ? $wo['lang'][$value] : ucwords(str_replace('_', ' ', $value))
        );
    }

    $image_types = array(
        array(
            'value' => 'cover',
            'label' => !empty($wo['lang']['cover']) ? $wo['lang']['cover'] : 'Cover'
        ),
        array(
            'value' => 'upload',
            'label' => !empty($wo['lang']['upload']) ? $wo['lang']['upload'] : 'Upload'
        )
    );

    $currencies = array();
    if (!empty($wo['currencies']) && is_array($wo['currencies'])) {
        foreach ($wo['currencies'] as $key => $currency) {
            $currency_label = '';
            $currency_symbol = '';

            if (is_array($currency)) {
                $currency_label = !empty($currency['text']) ? (string) $currency['text'] : (string) $key;
                $currency_symbol = !empty($currency['symbol']) ? (string) $currency['symbol'] : (string) $key;
            }
            else {
                $currency_label = (string) $key;
                $currency_symbol = (string) $currency;
            }

            $currencies[] = array(
                'value' => (string) $key,
                'label' => $currency_label,
                'symbol' => $currency_symbol
            );
        }
    }

    $owned_pages = array();
    $pages = $db->where('user_id', $wo['user']['id'])->orderBy('page_id', 'DESC')->get(T_PAGES, null, array('page_id', 'page_name', 'page_title', 'cover'));
    if (!empty($pages)) {
        foreach ($pages as $page) {
            $owned_pages[] = array(
                'page_id' => (int) $page->page_id,
                'page_name' => $page->page_name,
                'page_title' => $page->page_title,
                'cover' => !empty($page->cover) ? Wo_GetMedia($page->cover) : ''
            );
        }
    }

    $can_create = !empty($wo['config']['can_use_jobs']);

    $response_data = array(
        'api_status' => 200,
        'can_create' => $can_create ? true : false,
        'create_disabled_reason' => '',
        'distance_enabled' => (!empty($wo['user']['lat']) && !empty($wo['user']['lng']) && (float)$wo['user']['lat'] != 0 && (float)$wo['user']['lng'] != 0) ? true : false,
        'current_user' => array(
            'name' => !empty($wo['user']['name']) ? $wo['user']['name'] : '',
            'email' => !empty($wo['user']['email']) ? $wo['user']['email'] : '',
            'phone_number' => !empty($wo['user']['phone_number']) ? $wo['user']['phone_number'] : '',
            'address' => !empty($wo['user']['address']) ? $wo['user']['address'] : '',
            'lat' => !empty($wo['user']['lat']) ? $wo['user']['lat'] : 0,
            'lng' => !empty($wo['user']['lng']) ? $wo['user']['lng'] : 0,
        ),
        'owned_pages' => $owned_pages,
        'categories' => $categories,
        'types' => $types,
        'currencies' => $currencies,
        'salary_dates' => $salary_dates,
        'question_types' => $question_types,
        'image_types' => $image_types,
    );
}
