<?php
$reactions_types = array_map('strval', array_keys($wo['reactions_types']));
$action = !empty($_POST['action']) ? Wo_Secure($_POST['action']) : 'set';
$has_message_id = !empty($_POST['id']) && is_numeric($_POST['id']) && $_POST['id'] > 0;
$has_valid_action = in_array($action, array('set', 'remove'));
$has_valid_reaction = $action === 'remove' ||
    (!empty($_POST['reaction']) && in_array((string)$_POST['reaction'], $reactions_types));

if (!$has_message_id || !$has_valid_action || !$has_valid_reaction) {
    $error_code = 5;
    $error_message = 'id, action or reaction is invalid.';
} else {
    $message_id = Wo_Secure($_POST['id']);
    if (!VNSEEA_CanReactToMessage($message_id)) {
        $error_code = 6;
        $error_message = 'message not found.';
    } else {
        $db->startTransaction();
        $delete_succeeded = $db->where('user_id', $wo['user']['user_id'])
                               ->where('message_id', $message_id)
                               ->delete(T_REACTIONS);
        $mutation_succeeded = $delete_succeeded !== false;

        if ($mutation_succeeded && $action === 'set') {
            $mutation_succeeded = (bool)$db->insert(T_REACTIONS, array(
                'user_id' => $wo['user']['id'],
                'message_id' => $message_id,
                'reaction' => Wo_Secure($_POST['reaction'])
            ));
        }

        if ($mutation_succeeded) {
            $mutation_succeeded = $db->commit();
        }

        if (!$mutation_succeeded) {
            $db->rollback();
            $error_code = 7;
            $error_message = 'could not update message reaction.';
        } else {
            $response_data = array(
                'api_status' => 200,
                'action' => $action,
                'message' => $action === 'remove'
                    ? 'reaction removed'
                    : 'message reacted',
                'reaction' => VNSEEA_GetMessageReactionSummary($message_id)
            );
        }
    }
}
