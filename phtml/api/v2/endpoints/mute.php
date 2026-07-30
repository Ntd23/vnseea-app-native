<?php
if (!empty($_POST['chat_id']) && is_numeric($_POST['chat_id']) && $_POST['chat_id'] > 0 && !empty($_POST['type']) && in_array($_POST['type'], array('user','page','group'))) {
	$chat_id = (int)$_POST['chat_id'];
	$chat_type = (string)$_POST['type'];
	if (!empty($_POST['notify']) || !empty($_POST['call_chat']) || !empty($_POST['archive']) || !empty($_POST['pin'])) {
		$update_data = array();
		if (!empty($_POST['notify']) && in_array($_POST['notify'], array('yes','no'))) {
			$update_data['notify'] = Wo_Secure($_POST['notify']);
		}
		if (!empty($_POST['call_chat']) && in_array($_POST['call_chat'], array('yes','no'))) {
			$update_data['call_chat'] = Wo_Secure($_POST['call_chat']);
		}
		if (!empty($_POST['archive']) && in_array($_POST['archive'], array('yes','no'))) {
			$update_data['archive'] = Wo_Secure($_POST['archive']);
		}
		if (!empty($_POST['pin']) && in_array($_POST['pin'], array('yes','no'))) {
			$update_data['pin'] = Wo_Secure($_POST['pin']);
		}
		$chat = null;
		if ($chat_type === 'group') {
			$group = $db->where('group_id', $chat_id)->getOne(T_GROUP_CHAT);
			$is_group_member = !empty($group) &&
				((int)$group->user_id === (int)$wo['user']['id'] ||
				 $db->where('group_id', $chat_id)
					->where('user_id', $wo['user']['id'])
					->where('active', 1)
					->getValue(T_GROUP_CHAT_USERS, 'COUNT(*)') > 0);
			$chat = $is_group_member ? $group : null;
		}
		else {
			$chat = $db->where('id', $chat_id)
				->where('user_id', $wo['user']['id'])
				->getOne(T_U_CHATS);
		}
		if (!empty($chat)) {
			if (!empty($update_data)) {
				$info = $db->where('type',$chat_type)->where('user_id',$wo['user']['id'])->where('chat_id',$chat_id)->where('message_id',0)->getOne(T_MUTE);
				if (!empty($info)) {
					$update_data['chat_id'] = $chat_id;
					$db->where('id',$info->id)->update(T_MUTE,$update_data);
				}
				else{
					$update_data['user_id'] = $wo['user']['id'];
					$update_data['type'] = $chat_type;
					$update_data['time'] = time();
					$update_data['chat_id'] = $chat_id;
					$update_data['message_id'] = 0;
					$db->insert(T_MUTE,$update_data);
				}
				$response_data = array(
	                    'api_status' => 200,
	                    'message' => 'chat updated'
	                );
			}
			else{
				$error_code    = 6;
			    $error_message = 'notify or call_chat or archive or pin or fav can not be empty';
			}
		}
		else{
			$error_code    = 7;
			$error_message = 'Chat not found';
		}
	}
	else{
		$error_code    = 5;
	    $error_message = 'notify or call_chat or archive or pin or fav can not be empty';
	}
}
else{
	$error_code    = 4;
    $error_message = 'chat_id and type can not be empty';
}
