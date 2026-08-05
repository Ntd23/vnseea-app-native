<?php

require_once dirname(__DIR__) . '/assets/includes/vnseea_job_applications.php';

function assert_job_application($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$personal_job = array('user_id' => 7, 'page_id' => 0, 'page' => '');
assert_job_application(VNSEEA_CanManageJobApplications($personal_job, 7), 'Personal job creator must manage applicants.');
assert_job_application(!VNSEEA_CanManageJobApplications($personal_job, 8), 'Other users must not manage personal job applicants.');
assert_job_application(VNSEEA_GetJobOwnerId($personal_job) === 7, 'Personal job notifications must target the creator.');

$page_job = array(
    'user_id' => 12,
    'page_id' => 91,
    'page' => array('user_id' => 12, 'is_page_onwer' => true),
);
assert_job_application(VNSEEA_CanManageJobApplications($page_job, 33), 'Page managers accepted by backend policy must manage applicants.');
assert_job_application(VNSEEA_GetJobOwnerId($page_job) === 12, 'Page job notifications must target the page owner.');

assert_job_application(VNSEEA_ValidateJobQuestionAnswer('yes_no_question', array(), 'yes') === 'yes', 'Yes/no answers must be accepted.');
assert_job_application(VNSEEA_ValidateJobQuestionAnswer('multiple_choice_question', array('Ca sáng', 'Ca tối'), '0') === '0', 'The first multiple-choice option must be accepted.');
assert_job_application(VNSEEA_ValidateJobQuestionAnswer('free_text_question', array(), '  Kinh nghiệm  ') === 'Kinh nghiệm', 'Free-text answers must be trimmed.');
assert_job_application(VNSEEA_ValidateJobQuestionAnswer('multiple_choice_question', array('Ca sáng'), '9') === false, 'Unknown options must be rejected.');
assert_job_application(VNSEEA_IsValidJobApplicationContact(array(
    'user_name' => 'Nguyễn Văn A',
    'phone_number' => '+84 901-234-567',
    'email' => 'a@example.com',
    'location' => 'Hà Nội',
)), 'Valid applicant contact data must be accepted.');
assert_job_application(!VNSEEA_IsValidJobApplicationContact(array(
    'user_name' => 'Nguyễn Văn A',
    'phone_number' => '123',
    'email' => 'invalid',
    'location' => 'Hà Nội',
)), 'Invalid applicant contact data must be rejected.');

$endpoint = file_get_contents(dirname(__DIR__) . '/api/v2/endpoints/job.php');
assert_job_application(strpos($endpoint, 'VNSEEA_CanManageJobApplications') !== false, 'Job endpoint must enforce application ownership.');
assert_job_application(strpos($endpoint, "'job_applicants_forbidden'") !== false, 'Applicant endpoint must return a stable forbidden error.');
assert_job_application(strpos($endpoint, '$application_id = $db->insert') !== false, 'Application endpoint must check the insert result.');

echo "job-applications-contract: ok\n";
