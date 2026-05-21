<?php

$response_data = array(
    'api_status' => 400
);

$required_fields =  array(
                        'delete',
                        'mark_seen',
                    );
if (!empty($_POST['type']) && in_array($_POST['type'], $required_fields)) {
    if ($_POST['type'] == 'delete') {
    	if (empty($_POST['id']) || !is_numeric($_POST['id']) || $_POST['id'] < 1) {
            $error_code    = 7;
            $error_message = 'id must be numeric and greater than 0';
        }

        if (empty($error_code)) {
        	$db->where('id',Wo_Secure($_POST['id']))->delete(T_NOTIFICATION);
        	$response_data = array(
                'api_status' => 200,
                'message_data' => 'notification delete successfully'
            );
        }
    }
    if ($_POST['type'] == 'mark_seen') {
        if (empty($_POST['id']) || !is_numeric($_POST['id']) || $_POST['id'] < 1) {
            $error_code    = 7;
            $error_message = 'id must be numeric and greater than 0';
        }

        if (empty($error_code)) {
            $notification_id = Wo_Secure($_POST['id']);
            $notification = $db->where('id', $notification_id)->where('recipient_id', $wo['user']['user_id'])->getOne(T_NOTIFICATION);

            if (empty($notification)) {
                $error_code    = 8;
                $error_message = 'notification not found';
            }
            else {
                $db->where('id', $notification_id)->where('recipient_id', $wo['user']['user_id'])->update(T_NOTIFICATION, array(
                    'seen' => time()
                ));
                $response_data = array(
                    'api_status' => 200,
                    'message_data' => 'notification marked as seen successfully'
                );
            }
        }
    }
}
else{
    $error_code    = 4;
    $error_message = 'type can not be empty';
}
