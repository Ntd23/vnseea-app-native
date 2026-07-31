<?php
// English description: Returns message contacts with follow relationship metadata and latest chat activity.
$video_call = false;
$video_call_user = array();

$audio_call = false;
$audio_call_user = array();
$messages = array();
$groups = array();
$pages = array();

$user_offset = (!empty($_POST['user_offset']) && is_numeric($_POST['user_offset']) && $_POST['user_offset'] > 0 ? Wo_Secure($_POST['user_offset']) : 0);
$user_limit = (!empty($_POST['user_limit']) && is_numeric($_POST['user_limit']) && $_POST['user_limit'] > 0 && $_POST['user_limit'] <= 50 ? Wo_Secure($_POST['user_limit']) : 20);
$user_type = (!empty($_POST['user_type']) && in_array($_POST['user_type'], array('online','offline')) ? Wo_Secure($_POST['user_type']) : '');

//$data_type = (!empty($_POST['data_type']) && in_array($_POST['data_type'], array('all','users','pages','groups')) ? Wo_Secure($_POST['data_type']) : 'all');

$group_offset = (!empty($_POST['group_offset']) && is_numeric($_POST['group_offset']) && $_POST['group_offset'] > 0 ? Wo_Secure($_POST['group_offset']) : 0);
$group_limit = (!empty($_POST['group_limit']) && is_numeric($_POST['group_limit']) && $_POST['group_limit'] > 0 && $_POST['group_limit'] <= 50 ? Wo_Secure($_POST['group_limit']) : 20);

$page_offset = (!empty($_POST['page_offset']) && is_numeric($_POST['page_offset']) && $_POST['page_offset'] > 0 ? Wo_Secure($_POST['page_offset']) : 0);
$page_limit = (!empty($_POST['page_limit']) && is_numeric($_POST['page_limit']) && $_POST['page_limit'] > 0 && $_POST['page_limit'] <= 50 ? Wo_Secure($_POST['page_limit']) : 20);
$data_type = array('all');
if (!empty($_POST['data_type']) && $_POST['data_type'] != 'all') {
    $get_types = explode(',', $_POST['data_type']);
    if (!empty($get_types)) {
        $data_type = array();
        foreach ($get_types as $key => $value) {
            if ($value == 'users' || $value == 'pages' || $value == 'groups') {
                $data_type[] = Wo_Secure($value);
            }
        }
    }
}
$fetch_array = array(
    'user_id' => $wo['user']['id'],
    'limit' => $user_limit,
    'offset' => $user_offset,
    'type' => $user_type
);
if (in_array('all',$data_type) || in_array('users',$data_type)) {
    $messages = Wo_GetMessagesUsersAPP2($fetch_array);
}

if (in_array('all',$data_type) || in_array('groups',$data_type)) {
    $groups = Wo_GetGroupsListAPP(array('offset' => $group_offset , 'limit' => $group_limit));
}

$fetch_page_array = array(
    'user_id' => $wo['user']['id'], 
    'limit' => $page_limit,
    'offset' => $page_offset
);

if (in_array('all',$data_type) || in_array('pages',$data_type)) {
    $pages = Wo_GetMessagesPagesAPP($fetch_page_array);
}


if (empty($wo['user']['timezone'])) {
    $wo['user']['timezone'] = 'UTC';
}
$timezone = new DateTimeZone($wo['user']['timezone']);

$array = array();
$chat_refs = array();
$message_peer_ids = array();
$message_user_data = array();
foreach ($messages as $message_user) {
    $peer_id = !empty($message_user['user_id']) ? (int)$message_user['user_id'] : 0;
    $chat_id = !empty($message_user['chat_id']) ? (int)$message_user['chat_id'] : 0;
    if ($peer_id > 0) {
        $message_peer_ids[$peer_id] = $peer_id;
        $message_user_data[$peer_id] = $message_user;
    }
    if ($chat_id > 0) {
        $chat_refs[] = array('type' => 'user', 'chat_id' => $chat_id);
    }
}
foreach ($groups as $group_chat) {
    $chat_id = !empty($group_chat['chat_id']) ? (int)$group_chat['chat_id'] : 0;
    if ($chat_id > 0) {
        $chat_refs[] = array('type' => 'group', 'chat_id' => $chat_id);
    }
}
foreach ($pages as $page_chat) {
    $chat_id = !empty($page_chat['chat_id']) ? (int)$page_chat['chat_id'] : 0;
    if ($chat_id > 0) {
        $chat_refs[] = array('type' => 'page', 'chat_id' => $chat_id);
    }
}
$message_user_data[(int)$wo['user']['id']] = $wo['user'];
$conversation_mutes = VNSEEA_GetConversationMutesBatch($chat_refs, $wo['user']['id']);
$latest_user_messages = VNSEEA_GetMessagesHeaderBatch($message_peer_ids, $message_user_data);
$unread_user_counts = VNSEEA_GetUnreadMessageCountsBatch($message_peer_ids);
$chat_colors = VNSEEA_GetChatColorsBatch($message_peer_ids, $wo['user']['id']);
$latest_page_messages = VNSEEA_GetPageMessageHeadersBatch($pages);
$page_ids = array();
$page_user_ids = array();
foreach ($pages as $page_chat) {
    $page_message = !empty($page_chat['message']) && is_array($page_chat['message'])
        ? $page_chat['message']
        : array();
    if (!empty($page_message['page_id'])) {
        $page_ids[(int)$page_message['page_id']] = (int)$page_message['page_id'];
    }
    foreach (array('user_id', 'conversation_user_id', 'from_id', 'to_id') as $field) {
        if (!empty($page_message[$field])) {
            $page_user_ids[(int)$page_message[$field]] = (int)$page_message[$field];
        }
    }
}
foreach ($latest_page_messages as $page_message) {
    foreach (array('from_id', 'to_id') as $field) {
        if (!empty($page_message[$field])) {
            $page_user_ids[(int)$page_message[$field]] = (int)$page_message[$field];
        }
    }
}
$page_data_cache = function_exists('VNSEEA_GetChatPagesBatch')
    ? VNSEEA_GetChatPagesBatch($page_ids)
    : array();
$page_user_cache = function_exists('VNSEEA_GetChatUsersBatch')
    ? VNSEEA_GetChatUsersBatch($page_user_ids)
    : array();
$follow_relationships = array();
if (!empty($messages)) {
    $message_user_ids = array();
    foreach ($messages as $message_user) {
        $message_user_id = !empty($message_user['user_id']) ? (int) $message_user['user_id'] : 0;
        if ($message_user_id > 0 && $message_user_id !== (int) $wo['user']['id']) {
            $message_user_ids[$message_user_id] = $message_user_id;
        }
    }

    if (!empty($message_user_ids)) {
        $current_user_id = (int) $wo['user']['id'];
        $message_user_ids_sql = implode(',', $message_user_ids);
        $follow_query = mysqli_query(
            $sqlConnect,
            "SELECT
                f.`follower_id`,
                f.`following_id`,
                GREATEST(
                    COALESCE(MAX(a.`time`), 0),
                    COALESCE(MAX(n.`time`), 0)
                ) AS `relationship_activity_at`
             FROM " . T_FOLLOWERS . " f
             LEFT JOIN " . T_ACTIVITIES . " a
                ON a.`activity_type` IN ('following', 'friend')
                AND (
                    (a.`user_id` = f.`follower_id` AND a.`follow_id` = f.`following_id`)
                    OR
                    (a.`user_id` = f.`following_id` AND a.`follow_id` = f.`follower_id`)
                )
             LEFT JOIN " . T_NOTIFICATION . " n
                ON n.`type` IN ('following', 'accepted_request')
                AND (
                    (n.`notifier_id` = f.`follower_id` AND n.`recipient_id` = f.`following_id`)
                    OR
                    (n.`notifier_id` = f.`following_id` AND n.`recipient_id` = f.`follower_id`)
                )
             WHERE f.`active` = '1'
             AND (
                (f.`follower_id` = {$current_user_id} AND f.`following_id` IN ({$message_user_ids_sql}))
                OR
                (f.`following_id` = {$current_user_id} AND f.`follower_id` IN ({$message_user_ids_sql}))
             )"
             . " GROUP BY f.`follower_id`, f.`following_id`"
        );

        if ($follow_query) {
            while ($follow_row = mysqli_fetch_assoc($follow_query)) {
                $follower_id = (int) $follow_row['follower_id'];
                $following_id = (int) $follow_row['following_id'];
                $related_user_id = $follower_id === $current_user_id ? $following_id : $follower_id;

                if (empty($follow_relationships[$related_user_id])) {
                    $follow_relationships[$related_user_id] = array(
                        'is_following' => 0,
                        'is_following_me' => 0,
                        'relationship_activity_at' => 0
                    );
                }
                if ($follower_id === $current_user_id) {
                    $follow_relationships[$related_user_id]['is_following'] = 1;
                }
                if ($following_id === $current_user_id) {
                    $follow_relationships[$related_user_id]['is_following_me'] = 1;
                }
                $follow_relationships[$related_user_id]['relationship_activity_at'] = max(
                    $follow_relationships[$related_user_id]['relationship_activity_at'],
                    (int) $follow_row['relationship_activity_at']
                );
            }
        }
    }
}
if (!empty($messages)) {
    foreach ($messages as $value) {
        $relationship = !empty($follow_relationships[(int) $value['user_id']])
            ? $follow_relationships[(int) $value['user_id']]
            : array('is_following' => 0, 'is_following_me' => 0, 'relationship_activity_at' => 0);
        $value['is_following'] = $relationship['is_following'];
        $value['is_following_me'] = $relationship['is_following_me'];
        $value['relationship_activity_at'] = $relationship['relationship_activity_at'];
        $value['has_follow_relationship'] = (
            !empty($relationship['is_following']) || !empty($relationship['is_following_me'])
        ) ? 1 : 0;
        $value['chat_type'] = 'user';
        $value['mute'] = array('notify' => 'yes',
                               'call_chat' => 'yes',
                               'archive' => 'no',
                               'fav' => 'no',
                               'pin' => 'no');
        $mute_key = 'user:' . (int)$value['chat_id'];
        $mute = isset($conversation_mutes[$mute_key]) ? $conversation_mutes[$mute_key] : array();
        if (!empty($mute)) {
            $value['mute']['notify'] = $mute['notify'];
            $value['mute']['call_chat'] = $mute['call_chat'];
            $value['mute']['archive'] = $mute['archive'];
            $value['mute']['fav'] = $mute['fav'];
            $value['mute']['pin'] = $mute['pin'];
        }
        $peer_id = (int)$value['user_id'];
        $value['last_message'] = isset($latest_user_messages[$peer_id])
            ? $latest_user_messages[$peer_id]
            : false;
        if (empty($value['last_message'])) {
            $value['message_count'] = isset($unread_user_counts[$peer_id]) ? $unread_user_counts[$peer_id] : 0;
            $array[] = $value;
            continue;
        }
        foreach ($non_allowed as $key5 => $value5) {
            if (!empty($value['last_message']['messageUser'])) {
                unset($value['last_message']['messageUser'][$value5]);
            }
          
        }
        $message = VNSEEA_AttachCanonicalMessageContext($value['last_message']);
        $message['text'] = openssl_encrypt($message['text'], "AES-128-ECB", $message['time']);
        if (empty($message['stickers'])) {
            $message['stickers'] = '';
        }
        $message['time_text'] = Wo_Time_Elapsed_String($message['time']);
        $message_po  = 'left';
        if ($message['from_id'] == $wo['user']['id']) {
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
        if (!empty($message['lng']) && !empty($message['lat'])) {
            $message['type']   = 'map';
        }
        $message['type']     = $message_po . '_' . $message['type'];
        $message['product'] = !empty($message['product']) ? $message['product'] : null;
        if (!empty($message['product_id'])) {
            $message['type']     = $message_po . '_product';
            if (empty($message['product']) && function_exists('VNSEEA_GetMessageContextProduct')) {
                $message['product'] = VNSEEA_GetMessageContextProduct((int)$message['product_id']);
            }
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
        $message['chat_color'] = isset($chat_colors[$peer_id]) ? $chat_colors[$peer_id] : false;
        $value['last_message'] = $message;
        $value['message_count'] = isset($unread_user_counts[$peer_id]) ? $unread_user_counts[$peer_id] : 0;
        $array[] = $value;
    }
}
if (!empty($groups)) {
    foreach ($groups as $key => $value) {
        $value['mute'] = array('notify' => 'yes',
                               'call_chat' => 'yes',
                               'archive' => 'no',
                               'fav' => 'no',
                               'pin' => 'no');
        $mute_key = 'group:' . (int)$value['chat_id'];
        $mute = isset($conversation_mutes[$mute_key]) ? $conversation_mutes[$mute_key] : array();
        if (!empty($mute)) {
            $value['mute']['notify'] = $mute['notify'];
            $value['mute']['call_chat'] = $mute['call_chat'];
            $value['mute']['archive'] = $mute['archive'];
            $value['mute']['fav'] = $mute['fav'];
            $value['mute']['pin'] = $mute['pin'];
        }
    	if (!empty($value['user_data'])) {
            foreach ($non_allowed as $key4 => $value4) {
              unset($value['user_data'][$value4]);
            }
        }
        if (!empty($value['parts'])) {
            foreach ($value['parts'] as $key3 => $g_user) {
                if (!empty($g_user)) {
                    foreach ($non_allowed as $key5 => $value5) {
                      unset($value['parts'][$key3][$value5]);
                    }
                }
            }
        }

        if (!empty($value['last_message'])) {
            foreach ($value['last_message'] as $key3 => $g_user) {
                foreach ($non_allowed as $key5 => $value5) {
                    if (!empty($value['last_message']['user_data'])) {
                        unset($value['last_message']['user_data'][$value5]);
                    }
                  
                }
            }

            $message = VNSEEA_AttachCanonicalMessageContext($value['last_message']);
            $message['text'] = openssl_encrypt($message['text'], "AES-128-ECB", $message['time']);
            if (empty($message['stickers'])) {
                $message['stickers'] = '';
            }
            $message['time_text'] = Wo_Time_Elapsed_String($message['time']);
            $message_po  = 'left';
            if ($message['from_id'] == $wo['user']['id']) {
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
            if (!empty($message['lng']) && !empty($message['lat'])) {
                $message['type']   = 'map';
            }
            $message['type']     = $message_po . '_' . $message['type'];
            $message['product'] = !empty($message['product']) ? $message['product'] : null;
            if (!empty($message['product_id'])) {
                $message['type']     = $message_po . '_product';
                if (empty($message['product']) && function_exists('VNSEEA_GetMessageContextProduct')) {
                    $message['product'] = VNSEEA_GetMessageContextProduct((int)$message['product_id']);
                }
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
            $value['last_message'] = $message;


        }


    	$value['chat_type'] = 'group';
        $array[] = $value;
    }
}
if (!empty($pages)) {
    foreach ($pages as $key => $value) {
        $page_id = !empty($value['message']['page_id']) ? (int)$value['message']['page_id'] : 0;
        if ($page_id < 1) {
            continue;
        }
        $page = !empty($page_data_cache[$page_id]) ? $page_data_cache[$page_id] : array();
        if (empty($page)) {
            continue;
        }
        $page['chat_id'] = $value['chat_id'];
        $page['mute'] = array('notify' => 'yes',
                               'call_chat' => 'yes',
                               'archive' => 'no',
                               'fav' => 'no',
                               'pin' => 'no');
        $mute_key = 'page:' . (int)$value['chat_id'];
        $mute = isset($conversation_mutes[$mute_key]) ? $conversation_mutes[$mute_key] : array();
        if (!empty($mute)) {
            $page['mute']['notify'] = $mute['notify'];
            $page['mute']['call_chat'] = $mute['call_chat'];
            $page['mute']['archive'] = $mute['archive'];
            $page['mute']['fav'] = $mute['fav'];
            $page['mute']['pin'] = $mute['pin'];
        }
        if (!empty($page) && !empty($value['message']) && !empty($value['message']['page_id']) && !empty($value['message']['user_id']) && !empty($value['message']['conversation_user_id'])) {
            $user_id = $wo['user']['id'];
            $timezone = new DateTimeZone($wo['user']['timezone']);
            $page_message_key = VNSEEA_PageConversationKey(
                $value['message']['page_id'],
                $value['message']['user_id'],
                $value['message']['conversation_user_id']
            );
            $message = isset($latest_page_messages[$page_message_key])
                ? $latest_page_messages[$page_message_key]
                : array();
            if (!empty($message) && !empty($message['time'])) {
                $page['last_message'] = $message;

                $message = VNSEEA_AttachCanonicalMessageContext($page['last_message']);
                $message['text'] = openssl_encrypt($message['text'], "AES-128-ECB", $message['time']);
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
                if (!empty($message['lng']) && !empty($message['lat'])) {
                    $message['type']   = 'map';
                }
                $message['type']     = $message_po . '_' . $message['type'];
                $message['product'] = !empty($message['product']) ? $message['product'] : null;
                if (!empty($message['product_id'])) {
                    $message['type']     = $message_po . '_product';
                    if (empty($message['product']) && function_exists('VNSEEA_GetMessageContextProduct')) {
                        $message['product'] = VNSEEA_GetMessageContextProduct((int)$message['product_id']);
                    }
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
                $info_id = (int)$message['from_id'] === (int)$user_id
                    ? (int)$message['to_id']
                    : (int)$message['from_id'];
                $info_id = (int)$info_id;
                $message['to_data'] = !empty($page_user_cache[$info_id])
                    ? $page_user_cache[$info_id]
                    : array();

                $page['last_message'] = $message;
                $page['chat_type'] = 'page';
                $page['chat_time'] = $value['chat_time'];
                foreach ($non_allowed as $key5 => $value5) {
                    if (!empty($page['last_message']['user_data'])) {
                        unset($page['last_message']['user_data'][$value5]);
                    }
                    if (!empty($page['last_message']['to_data'])) {
                        unset($page['last_message']['to_data'][$value5]);
                    }
                  
                }

                $array[] = $page;
            }
        }
    }
}
array_multisort(array_column($array, "chat_time"), SORT_DESC, $array);


$check_calles     = Wo_CheckFroInCalls();
$check_audio_calles = Wo_CheckFroInCalls('audio');
$check_agora_calls = Wo_CheckFroInCallsAgora();
$call_user_ids = array();
foreach (array($check_calles, $check_audio_calles, $check_agora_calls) as $call_state) {
    if ($call_state !== false && is_array($call_state) && !empty($call_state['from_id'])) {
        $call_user_ids[(int)$call_state['from_id']] = (int)$call_state['from_id'];
    }
}
$call_users = function_exists('VNSEEA_GetChatUsersBatch')
    ? VNSEEA_GetChatUsersBatch($call_user_ids)
    : array();
if ($check_calles !== false && is_array($check_calles)) {
    $video_call = true;
    $wo['video_call_user'] = !empty($call_users[(int)$check_calles['from_id']])
        ? $call_users[(int)$check_calles['from_id']]
        : array();
    $video_call_user['data'] = $check_calles;
    $video_call_user['user_id'] = !empty($wo['video_call_user']['user_id']) ? $wo['video_call_user']['user_id'] : 0;
    $video_call_user['avatar'] = !empty($wo['video_call_user']['avatar']) ? $wo['video_call_user']['avatar'] : '';
    $video_call_user['name'] = !empty($wo['video_call_user']['name']) ? $wo['video_call_user']['name'] : '';
}

if ($check_audio_calles !== false && is_array($check_audio_calles)) {
    $audio_call = true;
    $wo['audio_call_user'] = !empty($call_users[(int)$check_audio_calles['from_id']])
        ? $call_users[(int)$check_audio_calles['from_id']]
        : array();
    $audio_call_user['data'] = $check_audio_calles;
    $audio_call_user['user_id'] = !empty($wo['audio_call_user']['user_id']) ? $wo['audio_call_user']['user_id'] : 0;
    $audio_call_user['avatar'] = !empty($wo['audio_call_user']['avatar']) ? $wo['audio_call_user']['avatar'] : '';
    $audio_call_user['name'] = !empty($wo['audio_call_user']['name']) ? $wo['audio_call_user']['name'] : '';
}
$agora_call = false;
$agora_call_data = array();
if ($check_agora_calls !== false && is_array($check_agora_calls)) {
    $agora_call = true;
    $wo['agora_call_data'] = !empty($call_users[(int)$check_agora_calls['from_id']])
        ? $call_users[(int)$check_agora_calls['from_id']]
        : array();
    $agora_call_data['data'] = $check_agora_calls;
    $agora_call_data['user_id'] = !empty($wo['agora_call_data']['user_id']) ? $wo['agora_call_data']['user_id'] : 0;
    $agora_call_data['avatar'] = !empty($wo['agora_call_data']['avatar']) ? $wo['agora_call_data']['avatar'] : '';
    $agora_call_data['name'] = !empty($wo['agora_call_data']['name']) ? $wo['agora_call_data']['name'] : '';
}

if (!empty($_POST['SetOnline']) && $_POST['SetOnline'] == 1) {
    Wo_UpdateUserData($wo['user']['user_id'], array('lastseen' => time()));
}


$response_data = array(
                    'api_status' => 200,
                    'data' => $array,
                    'video_call' => $video_call,
                    'video_call_user' => $video_call_user,
                    'audio_call' => $audio_call,
                    'audio_call_user' => $audio_call_user,
                    'agora_call' => $agora_call,
                    'agora_call_data' => $agora_call_data,
                );
