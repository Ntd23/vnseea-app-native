<?php

if (!function_exists('VNSEEA_GetJobOwnerId')) {
    function VNSEEA_GetJobOwnerId($job)
    {
        if (!is_array($job)) {
            return 0;
        }
        if (!empty($job['user_id'])) {
            return (int) $job['user_id'];
        }
        if (!empty($job['page']) && is_array($job['page']) && !empty($job['page']['user_id'])) {
            return (int) $job['page']['user_id'];
        }
        return 0;
    }
}

if (!function_exists('VNSEEA_CanManageJobApplications')) {
    function VNSEEA_CanManageJobApplications($job, $viewer_id)
    {
        $viewer_id = (int) $viewer_id;
        if ($viewer_id < 1 || !is_array($job)) {
            return false;
        }
        if (VNSEEA_GetJobOwnerId($job) === $viewer_id) {
            return true;
        }
        return !empty($job['page'])
            && is_array($job['page'])
            && (!empty($job['page']['is_page_onwer']) || !empty($job['page']['is_page_owner']));
    }
}

if (!function_exists('VNSEEA_ValidateJobQuestionAnswer')) {
    function VNSEEA_ValidateJobQuestionAnswer($type, $answers, $answer)
    {
        $type = trim((string) $type);
        $answer = trim((string) $answer);
        if ($type === 'yes_no_question') {
            return in_array($answer, array('yes', 'no'), true) ? $answer : false;
        }
        if ($type === 'multiple_choice_question') {
            $answers = is_array($answers) ? $answers : array();
            return array_key_exists($answer, $answers) ? $answer : false;
        }
        if ($type === 'free_text_question') {
            return $answer !== '' ? $answer : false;
        }
        return false;
    }
}

if (!function_exists('VNSEEA_IsValidJobApplicationContact')) {
    function VNSEEA_IsValidJobApplicationContact($input)
    {
        if (!is_array($input)) {
            return false;
        }
        foreach (array('user_name', 'phone_number', 'email', 'location') as $field) {
            if (trim((string) (isset($input[$field]) ? $input[$field] : '')) === '') {
                return false;
            }
        }
        $phone = trim((string) $input['phone_number']);
        if (!preg_match('/^\+?[\d\s().-]+$/', $phone)) {
            return false;
        }
        $digits = preg_replace('/\D+/', '', $phone);
        return strlen($digits) >= 8
            && strlen($digits) <= 15
            && filter_var(trim((string) $input['email']), FILTER_VALIDATE_EMAIL) !== false;
    }
}
