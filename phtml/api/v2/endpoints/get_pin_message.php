<?php
if (!empty($_POST['chat_id']) && is_numeric($_POST['chat_id']) && $_POST['chat_id'] > 0 && !empty($_POST['type']) && in_array($_POST['type'], array('user','page','group'))) {
    $chat_id = (int)$_POST['chat_id'];
    $chat_type = (string)$_POST['type'];
    $is_shared_pin = $chat_type === 'user' || $chat_type === 'group';
    $chats = array();
    if ($chat_type === 'page') {
        $chats = $db->where('user_id',$wo['user']['id'])->where('chat_id',$chat_id)->where('type','page')->where('pin','yes')->where('message_id',0,'>')->orderBy('time', 'DESC')->get(T_MUTE);
    } elseif ($chat_type === 'user') {
        $owned_chat = VNSEEA_GetOwnedUserChat($chat_id);
        if (!empty($owned_chat) && !empty($owned_chat->conversation_user_id)) {
            $current_user_id = (int)$wo['user']['user_id'];
            $participant_id = (int)$owned_chat->conversation_user_id;
            $query = mysqli_query($sqlConnect, "SELECT pin.* FROM " . T_MESSAGE_PINS . " pin INNER JOIN " . T_MESSAGES . " message ON message.id = pin.message_id WHERE message.group_id = 0 AND message.page_id = 0 AND ((message.from_id = {$current_user_id} AND message.to_id = {$participant_id}) OR (message.from_id = {$participant_id} AND message.to_id = {$current_user_id})) ORDER BY pin.pinned_at DESC");
            while ($query && $row = mysqli_fetch_object($query)) $chats[] = $row;
        }
    } else {
        $group = $db->where('group_id', $chat_id)->getOne(T_GROUP_CHAT);
        $active_membership = $db->where('group_id', $chat_id)
            ->where('user_id', $wo['user']['user_id'])
            ->where('active', 1)
            ->getValue(T_GROUP_CHAT_USERS, 'COUNT(*)');
        $is_member = !empty($group) &&
            ((int)$group->user_id === (int)$wo['user']['user_id'] || $active_membership > 0);
        if ($is_member) {
            $cleared_message_id = VNSEEA_GetGroupHistoryClearMessageId($chat_id, $wo['user']['user_id']);
            $clear_sql = $cleared_message_id > 0 ? " AND message.id > {$cleared_message_id}" : '';
            $query = mysqli_query($sqlConnect, "SELECT pin.* FROM " . T_MESSAGE_PINS . " pin INNER JOIN " . T_MESSAGES . " message ON message.id = pin.message_id WHERE message.group_id = {$chat_id}{$clear_sql} ORDER BY pin.pinned_at DESC");
            while ($query && $row = mysqli_fetch_object($query)) $chats[] = $row;
        }
    }
    $array = array();
    if (!empty($chats)) {
        foreach ($chats as $key => $value) {
            if (!VNSEEA_IsMessageInAuthorizedChat($chat_type, $chat_id, $value->message_id)) {
                continue;
            }
            $message = GetMessageById($value->message_id);
            if (!empty($message)) {
                $pinned_by_user_id = $is_shared_pin ? (int)$value->pinned_by : (int)$value->user_id;
                $pinned_by_user = Wo_UserData($pinned_by_user_id);
                $message['pinned_at'] = $is_shared_pin ? (int)$value->pinned_at : (int)$value->time;
                $message['pinned_by_user_id'] = (string)$pinned_by_user_id;
                $message['pinned_by_name'] = !empty($pinned_by_user['name']) ? $pinned_by_user['name'] : (!empty($pinned_by_user['username']) ? $pinned_by_user['username'] : 'Người dùng');
                $message['can_unpin'] = $is_shared_pin ? VNSEEA_CanUnpinSharedMessage($value, $chat_type, $chat_id) : true;
                foreach ($non_allowed as $key5 => $value5) {
                    if (!empty($message['messageUser'])) {
                        unset($message['messageUser'][$value5]);
                    }
                }
                if ($not_include_status == true) {
                    foreach ($not_include_array as $value) {
                        if (!empty($value)) {
                            $value = Wo_Secure($value);
                            unset($message[$value]);
                        }
                    }
                }
                if (empty($message['stickers'])) {
                    $message['stickers'] = '';
                }
                $message['time_text'] = Wo_Time_Elapsed_String($message['time']);
                $message_po  = 'left';
                if ($message['from_id'] == $user_id) {
                    $message_po  = 'right';
                }
                
                $message['position']  = $message_po;
                $message['type']      = Wo_GetFilePosition($message['media']);
                if (!empty($message['stickers']) && strpos($message['stickers'], '.gif') !== false) {
                    $message['type'] = 'gif';
                }
                if ($message['type_two'] == 'contact') {
                    $message['type']   = 'contact';
                }
                $message['type']     = $message_po . '_' . $message['type'];
                $message['product']     = null;
                if (!empty($message['product_id'])) {
                    $message['type']     = $message_po . '_product';
                    $message['product'] = Wo_GetProduct($message['product_id']);
                }
                $message['file_size'] = 0;
                if (!empty($message['media'])) {
                    $message['file_size'] = '0MB';
                    if (file_exists($message['file_size'])) {
                        $message['file_size'] = Wo_SizeFormat(filesize($message['media']));
                    }
                    $message['media']     = Wo_GetMedia($message['media']);
                }
                if (!empty($message['time'])) {
                    $time_today  = time() - 86400;
                    if ($message['time'] < $time_today) {
                        $message['time_text'] = date('m.d.y', $message['time']);
                    } else {
                        $time = new DateTime('now', $timezone);
                        $time->setTimestamp($message['time']);
                        $message['time_text'] = $time->format('H:i');
                    }
                }

                if (!empty($message['reply'])) {
                    if (empty($message['reply']['stickers'])) {
                        $message['reply']['stickers'] = '';
                    }
                    $message['reply']['time_text'] = Wo_Time_Elapsed_String($message['reply']['time']);
                    $message_po  = 'left';
                    if ($message['reply']['from_id'] == $user_id) {
                        $message_po  = 'right';
                    }
                    
                    $message['reply']['position']  = $message_po;
                    $message['reply']['type']      = Wo_GetFilePosition($message['reply']['media']);
                    if (!empty($message['reply']['stickers']) && strpos($message['reply']['stickers'], '.gif') !== false) {
                        $message['reply']['type'] = 'gif';
                    }
                    if ($message['reply']['type_two'] == 'contact') {
                        $message['reply']['type']   = 'contact';
                    }
                    $message['reply']['type']     = $message_po . '_' . $message['reply']['type'];
                    $message['reply']['product']     = null;
                    if (!empty($message['reply']['product_id'])) {
                        $message['reply']['type']     = $message_po . '_product';
                        $message['reply']['product'] = Wo_GetProduct($message['reply']['product_id']);
                    }
                    $message['reply']['file_size'] = 0;
                    if (!empty($message['reply']['media'])) {
                        $message['reply']['file_size'] = '0MB';
                        if (file_exists($message['reply']['file_size'])) {
                            $message['reply']['file_size'] = Wo_SizeFormat(filesize($message['reply']['media']));
                        }
                        $message['reply']['media']     = Wo_GetMedia($message['reply']['media']);
                    }
                    if (!empty($message['reply']['time'])) {
                        $time_today  = time() - 86400;
                        if ($message['reply']['time'] < $time_today) {
                            $message['reply']['time_text'] = date('m.d.y', $message['reply']['time']);
                        } else {
                            $time = new DateTime('now', $timezone);
                            $time->setTimestamp($message['reply']['time']);
                            $message['reply']['time_text'] = $time->format('H:i');
                        }
                    }
                }
                if (!empty($message['story'])) {
                    foreach ($non_allowed as $key => $value) {
                       unset($message['story']['user_data'][$value]);
                    }
                    if (!empty($message['story']['thumb']['filename'])) {
                        $message['story']['thumbnail'] = $message['story']['thumb']['filename'];
                        unset($message['story']['thumb']);
                    } else {
                        $message['story']['thumbnail'] = $message['story']['user_data']['avatar'];
                    }
                    $message['story']['time_text'] = Wo_Time_Elapsed_String($message['story']['posted']);
                    $message['story']['view_count'] = $db->where('story_id',$message['story']['id'])->where('user_id',$message['story']['user_id'],'!=')->getValue(T_STORY_SEEN,'COUNT(*)');
                }
                $array[] = $message;
            }
        }
    }
    $response_data = array(
                        'api_status' => 200,
                        'data' => $array
                    );
}
else{
    $error_code    = 5;
    $error_message = 'chat_id and type can not be empty';
}
