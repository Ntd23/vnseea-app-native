<?php
// English description: Resends a six-digit email activation code for pending API accounts.
$response_data = array('api_status' => 400);
$user_id = !empty($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
$user = $user_id > 0
    ? $db->where('user_id', $user_id)->where('active', '0')->getOne(T_USERS)
    : null;

if (empty($user) || empty($user->email)) {
    $error_code = 3;
    $error_message = 'Account is not available for activation.';
}
elseif (!empty($user->time_code_sent) && $user->time_code_sent > (time() - 60)) {
    $error_code = 4;
    $error_message = 'Please wait before requesting another code.';
}
else {
    $stored_activation_code = trim((string) ($user->sms_code ?? ''));
    $activation_code = preg_match('/^\d{6}$/', $stored_activation_code)
        ? $stored_activation_code
        : (string) random_int(100000, 999999);
    $wo['user'] = Wo_UserData($user_id);
    $wo['code'] = $activation_code;
    $body = Wo_LoadPage('emails/activate_code');
    $send = Wo_SendMessage(array(
        'from_email' => $wo['config']['siteEmail'],
        'from_name' => $wo['config']['siteName'],
        'to_email' => $user->email,
        'to_name' => $user->username,
        'subject' => $wo['lang']['account_activation'],
        'charSet' => 'utf-8',
        'message_body' => $body,
        'is_html' => true,
    ));

    if ($send) {
        $db->where('user_id', $user_id)->update(T_USERS, array(
            'email_code' => md5($activation_code),
            'sms_code' => $activation_code,
            'time_code_sent' => time(),
        ));
        cache($user_id, 'users', 'delete');
        $response_data = array(
            'api_status' => 200,
            'message' => 'A new confirmation code was sent.',
        );
    }
    else {
        $error_code = 5;
        $error_message = 'Unable to send the confirmation code.';
    }
}
