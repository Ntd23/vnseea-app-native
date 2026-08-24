<?php
if (!empty($_POST['new_password']) && !empty($_POST['email']) && !empty($_POST['code'])) {
	$code  = Wo_Secure($_POST['code']);
	$email = Wo_Secure(trim($_POST['email']));
	$token_parts = explode('_', $code, 2);
	$token_user_id = isset($token_parts[0]) && is_numeric($token_parts[0]) ? (int) $token_parts[0] : 0;
	$token_secret = isset($token_parts[1]) ? $token_parts[1] : '';
	$is_email_code_token = Wo_isValidPasswordResetToken($code);
	$is_legacy_token = !$is_email_code_token && Wo_isValidPasswordResetToken2($code);

	if ($token_user_id < 1 || empty($token_secret) || (!$is_email_code_token && !$is_legacy_token)) {
		$error_code = 9;
		$error_message = 'email , code wrong';
	} elseif (strlen($_POST['new_password']) < 6) {
		$error_code = 10;
		$error_message = 'short password';
	} else {
		$getUser = $db->where('user_id', $token_user_id)->where('email', $email)->getOne(T_USERS, array('user_id'));
		if (empty($getUser) || (int) $getUser->user_id !== $token_user_id) {
			$error_code = 9;
			$error_message = 'email , code wrong';
		} else {
			$password = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
			$db->startTransaction();
			try {
				$update_query = $db->where('user_id', $token_user_id)->where('time_code_sent', time(), '>');
				if ($is_email_code_token) {
					$update_query->where('email_code', $token_secret);
				} else {
					$update_query->where('password', $token_secret);
				}

				$updated = $update_query->update(T_USERS, array(
					'password' => $password,
					'email_code' => '',
					'time_code_sent' => 0,
				));
				if (!$updated || $db->count !== 1) {
					throw new RuntimeException('password_reset_update_failed');
				}

				if (!$db->where('user_id', $token_user_id)->delete(T_APP_SESSIONS)) {
					throw new RuntimeException('password_reset_session_cleanup_failed');
				}
				if (!$db->commit()) {
					throw new RuntimeException('password_reset_commit_failed');
				}

				cache($token_user_id, 'users', 'delete');
				$response_data['api_status'] = 200;
				$response_data['message'] = 'Your password was updated';
			} catch (Throwable $exception) {
				$db->rollback();
				$error_code = 11;
				$error_message = 'Unable to reset password';
			}
		}
	}
}
else {
	$error_code = 8;
	$error_message = 'new_password , email , code can not be empty';
}
