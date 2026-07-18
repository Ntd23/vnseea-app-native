<?php
// English description: Handles legacy web live stream create, heartbeat, join, and end actions.
if ($f == 'live') {
    $normalize_live_user = function ($user) {
        if (is_object($user)) {
            $user = (array) $user;
        }
        if (!is_array($user)) {
            return array();
        }

        $avatar = !empty($user['avatar']) ? $user['avatar'] : '';
        if (!empty($avatar) && filter_var($avatar, FILTER_VALIDATE_URL) === false) {
            $avatar = Wo_GetMedia(ltrim($avatar, '/'));
        }

        $name = !empty($user['name']) ? $user['name'] : (!empty($user['username']) ? $user['username'] : 'Host');

        return array(
            'id' => intval(!empty($user['user_id']) ? $user['user_id'] : 0),
            'name' => $name,
            'username' => !empty($user['username']) ? $user['username'] : '',
            'avatar' => $avatar
        );
    };
    $map_live_comment_payload = function ($comment, $kind = 'comment', $is_host = false) use ($normalize_live_user) {
        if (is_object($comment)) {
            $comment = (array) $comment;
        }
        if (!is_array($comment)) {
            return array();
        }

        $publisher = $normalize_live_user(!empty($comment['publisher']) ? $comment['publisher'] : array());
        $raw_text = '';
        if (!empty($comment['Orginaltext'])) {
            $raw_text = strip_tags(str_replace('<br>', "\n", html_entity_decode($comment['Orginaltext'])));
        } else if (!empty($comment['text'])) {
            $raw_text = strip_tags(html_entity_decode($comment['text']));
        }

        return array(
            'id' => intval(!empty($comment['id']) ? $comment['id'] : 0),
            'author' => !empty($publisher['name']) ? $publisher['name'] : 'User',
            'username' => !empty($publisher['username']) ? $publisher['username'] : '',
            'avatar' => !empty($publisher['avatar']) ? $publisher['avatar'] : '',
            'message' => trim($raw_text),
            'time_text' => !empty($comment['time']) ? Wo_Time_Elapsed_String($comment['time']) : $wo['lang']['now'],
            'kind' => $kind,
            'is_host' => $is_host === true
        );
    };

    if ($s == 'bootstrap') {
        header("Content-type: application/json");

        if ($wo['loggedin'] == false) {
            echo json_encode(array(
                'status' => 401,
                'message' => $error_icon . $wo['lang']['please_check_details']
            ));
            exit();
        }

        $enabled = ($wo['config']['live_video'] == 1);
        $can_use_live = !empty($wo['config']['can_use_live']);
        $livekit_ready = Wo_IsLiveKitAvailable();
        $blocked_reason = '';

        if ($enabled !== true) {
            $blocked_reason = 'live_video_disabled';
        } else if ($can_use_live !== true) {
            $blocked_reason = 'live_permission_disabled';
        } else if ($livekit_ready !== true) {
            $blocked_reason = 'livekit_not_ready';
        }

        $active_live = 0;
        if ($blocked_reason === '') {
            $active_live = intval(
                $db
                    ->where('user_id', $wo['user']['id'])
                    ->where('stream_name', '', '!=')
                    ->where('live_ended', 0)
                    ->where('live_time', time() - 5, '>=')
                    ->getValue(T_POSTS, 'COUNT(*)')
            );
            if ($active_live > 0) {
                $blocked_reason = 'live_already_running';
            }
        }

        $payload = array();
        $stream_name = '';
        if ($blocked_reason === '') {
            $stream_name = Wo_GenerateLiveStreamName($wo['user']['id']);
            $payload = Wo_GetLiveKitLivestreamJoinPayload($stream_name, 'host', $wo['user']['id'], $wo['user']);
            if (empty($payload)) {
                $blocked_reason = 'bootstrap_failed';
            }
        }
        Wo_VnseeaCallDebugLog('live_bootstrap', array(
            'user_id' => intval($wo['user']['id']),
            'role' => 'host',
            'status' => ($blocked_reason === '') ? 200 : 400,
            'blocked_reason' => $blocked_reason,
            'enabled' => $enabled ? 1 : 0,
            'can_use_live' => $can_use_live ? 1 : 0,
            'livekit_ready' => $livekit_ready ? 1 : 0,
            'active_live' => $active_live,
            'stream_name' => $stream_name,
            'room_name' => !empty($payload['room_name']) ? $payload['room_name'] : '',
            'ws_url' => !empty($payload['ws_url']) ? $payload['ws_url'] : ''
        ));

        echo json_encode(array(
            'status' => 200,
            'enabled' => $enabled ? 1 : 0,
            'can_use_live' => ($enabled && $can_use_live && $livekit_ready) ? 1 : 0,
            'blocked_reason' => $blocked_reason,
            'provider' => 'livekit',
            'host' => array_merge(
                $normalize_live_user($wo['user']),
                array(
                    'note' => 'Host - timeline'
                )
            ),
            'stream_name' => !empty($payload['stream_name']) ? $payload['stream_name'] : '',
            'room_name' => !empty($payload['room_name']) ? $payload['room_name'] : '',
            'ws_url' => !empty($payload['ws_url']) ? $payload['ws_url'] : '',
            'token' => !empty($payload['token']) ? $payload['token'] : '',
            'destination' => 'timeline',
            'current_privacy' => !empty($_COOKIE['post_privacy']) ? Wo_Secure($_COOKIE['post_privacy']) : '0'
        ));
        exit();
    }

    if ($s == 'create' && $wo['config']['can_use_live']) {
        if ($wo['config']['live_video'] != 1 || !Wo_IsLiveKitAvailable()) {
            $data['message'] = $error_icon . $wo['lang']['please_check_details'];
            Wo_VnseeaCallDebugLog('live_create', array(
                'user_id' => intval($wo['user']['id']),
                'role' => 'host',
                'status' => 400,
                'blocked_reason' => 'livekit_not_ready',
                'live_video' => intval($wo['config']['live_video']),
                'livekit_ready' => Wo_IsLiveKitAvailable() ? 1 : 0
            ));
        } else {
            $if_live = intval(
                $db
                    ->where('user_id', $wo['user']['id'])
                    ->where('stream_name', '', '!=')
                    ->where('live_ended', 0)
                    ->where('live_time', time() - 5, '>=')
                    ->getValue(T_POSTS, 'COUNT(*)')
            );
            if ($if_live > 0) {
                $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                Wo_VnseeaCallDebugLog('live_create', array(
                    'user_id' => intval($wo['user']['id']),
                    'role' => 'host',
                    'status' => 409,
                    'blocked_reason' => 'live_already_running',
                    'active_live' => $if_live
                ));
            } else {
            $stream_name = !empty($_POST['stream_name']) ? Wo_Secure($_POST['stream_name']) : Wo_GenerateLiveStreamName($wo['user']['id']);
            $live_title = !empty($_POST['title']) ? Wo_Secure(trim($_POST['title'])) : '';
            $live_description = !empty($_POST['description']) ? Wo_Secure(trim($_POST['description'])) : '';
            $post_text_parts = array();
            if ($live_title !== '') {
                $post_text_parts[] = $live_title;
            }
            if ($live_description !== '') {
                $post_text_parts[] = $live_description;
            }
            $post_text = implode(PHP_EOL . PHP_EOL, $post_text_parts);
            $join_payload = Wo_GetLiveKitLivestreamJoinPayload($stream_name, 'host', $wo['user']['id'], $wo['user']);
            if (empty($stream_name) || empty($join_payload)) {
                $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                Wo_VnseeaCallDebugLog('live_create', array(
                    'user_id' => intval($wo['user']['id']),
                    'role' => 'host',
                    'status' => 400,
                    'blocked_reason' => empty($stream_name) ? 'stream_name_empty' : 'join_payload_empty',
                    'stream_name' => $stream_name
                ));
            } else {
                $live_privacy_request = $_POST;
                if (!isset($live_privacy_request['postPrivacy']) && isset($_POST['post_privacy'])) {
                    $live_privacy_request['postPrivacy'] = $_POST['post_privacy'];
                } elseif (!isset($live_privacy_request['postPrivacy']) && !empty($_COOKIE['post_privacy'])) {
                    $live_privacy_request['postPrivacy'] = $_COOKIE['post_privacy'];
                }
                $live_privacy_request['postType'] = 'live';
                $live_privacy = VNSEEA_NormalizePostPrivacyRequest($live_privacy_request);
                $postPrivacy = $live_privacy['postPrivacy'];
                $post_id = $db->insert(T_POSTS, array(
                    'user_id' => $wo['user']['id'],
                    'postText' => $post_text,
                    'postType' => 'live',
                    'postPrivacy' => $postPrivacy,
                    'is_anonymous' => $live_privacy['is_anonymous'],
                    'stream_name' => $stream_name,
                    'time' => time(),
                    'live_time' => time(),
                    'live_ended' => 0
                ));
                if (!empty($post_id)) {
                    $db->where('id', $post_id)->update(T_POSTS, array(
                        'post_id' => $post_id
                    ));
                    Wo_notifyUsersLive($post_id);
                    $data['status']    = 200;
                    $data['post_id']   = $post_id;
                    $data['provider']  = 'livekit';
                    $data['stream_name'] = $stream_name;
                    $data['room_name'] = $join_payload['room_name'];
                    $data['ws_url']    = $join_payload['ws_url'];
                    $data['token']     = $join_payload['token'];
                    $data['title']     = $live_title;
                    $data['description'] = $live_description;
                    $data['post_url'] = Wo_SeoLink("index.php?link1=post&id=" . $post_id);
                    $data['started_at'] = time();
                    Wo_VnseeaCallDebugLog('live_create', array(
                        'user_id' => intval($wo['user']['id']),
                        'role' => 'host',
                        'status' => 200,
                        'post_id' => intval($post_id),
                        'stream_name' => $stream_name,
                        'room_name' => $join_payload['room_name'],
                        'ws_url' => $join_payload['ws_url'],
                        'started_at' => $data['started_at']
                    ));
                } else {
                    $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                    Wo_VnseeaCallDebugLog('live_create', array(
                        'user_id' => intval($wo['user']['id']),
                        'role' => 'host',
                        'status' => 500,
                        'blocked_reason' => 'post_insert_failed',
                        'stream_name' => $stream_name,
                        'room_name' => $join_payload['room_name']
                    ));
                }
            }
        }
        }
        header("Content-type: application/json");
        echo json_encode($data);
        exit();
    }
    if ($s == 'join') {
        if (!Wo_IsLiveKitAvailable()) {
            $data['message'] = $error_icon . $wo['lang']['please_check_details'];
            Wo_VnseeaCallDebugLog('live_join', array(
                'user_id' => intval($wo['user']['id']),
                'role' => 'viewer',
                'status' => 400,
                'blocked_reason' => 'livekit_not_ready'
            ));
        } else {
            $post_id = (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0) ? Wo_Secure($_POST['post_id']) : 0;
            $post = !empty($post_id) ? Wo_PostData($post_id) : false;
            $heartbeat_window = 10;
            $stale_window = 45;
            $live_time = !empty($post['live_time']) ? intval($post['live_time']) : 0;
            $heartbeat_age = ($live_time > 0) ? max(0, time() - $live_time) : ($stale_window + 1);
            $stream_state = 'offline';
            if ($live_time > 0 && $heartbeat_age <= $heartbeat_window) {
                $stream_state = 'live';
            } else if ($live_time > 0 && $heartbeat_age <= $stale_window) {
                $stream_state = 'stale';
            }
            if (empty($post) || empty($post['stream_name']) || $post['postType'] !== 'live') {
                $data['removed'] = 'yes';
                $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                Wo_VnseeaCallDebugLog('live_join', array(
                    'user_id' => intval($wo['user']['id']),
                    'role' => 'viewer',
                    'status' => 404,
                    'blocked_reason' => 'post_not_live',
                    'post_id' => intval($post_id)
                ));
            } else if (intval($post['live_ended']) === 1 || $stream_state === 'offline') {
                $data['removed'] = 'yes';
                $data['stream_state'] = 'offline';
                $data['message'] = $error_icon . $wo['lang']['stream_has_ended'];
                Wo_VnseeaCallDebugLog('live_join', array(
                    'user_id' => intval($wo['user']['id']),
                    'role' => 'viewer',
                    'status' => 410,
                    'blocked_reason' => 'stream_offline',
                    'post_id' => intval($post['id']),
                    'stream_name' => $post['stream_name'],
                    'stream_state' => $stream_state,
                    'heartbeat_age' => $heartbeat_age,
                    'live_ended' => intval($post['live_ended'])
                ));
            } else {
                $join_payload = Wo_GetLiveKitLivestreamJoinPayload($post['stream_name'], 'viewer', $wo['user']['id'], $wo['user']);
                if (empty($join_payload)) {
                    $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                    Wo_VnseeaCallDebugLog('live_join', array(
                        'user_id' => intval($wo['user']['id']),
                        'role' => 'viewer',
                        'status' => 400,
                        'blocked_reason' => 'join_payload_empty',
                        'post_id' => intval($post['id']),
                        'stream_name' => $post['stream_name'],
                        'stream_state' => $stream_state,
                        'heartbeat_age' => $heartbeat_age
                    ));
                } else {
                    $data['status']    = 200;
                    $data['post_id']   = intval($post['id']);
                    $data['provider']  = 'livekit';
                    $data['stream_name'] = $post['stream_name'];
                    $data['room_name'] = $join_payload['room_name'];
                    $data['ws_url']    = $join_payload['ws_url'];
                    $data['token']     = $join_payload['token'];
                    $data['stream_state'] = $stream_state;
                    $data['heartbeat_age'] = $heartbeat_age;
                    Wo_VnseeaCallDebugLog('live_join', array(
                        'user_id' => intval($wo['user']['id']),
                        'role' => 'viewer',
                        'status' => 200,
                        'post_id' => intval($post['id']),
                        'stream_name' => $post['stream_name'],
                        'room_name' => $join_payload['room_name'],
                        'ws_url' => $join_payload['ws_url'],
                        'stream_state' => $stream_state,
                        'heartbeat_age' => $heartbeat_age
                    ));
                }
            }
        }
        header("Content-type: application/json");
        echo json_encode($data);
        exit();
    }
    if ($s == 'check_comments') {
        if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0) {
            $post_id   = Wo_Secure($_POST['post_id']);
            $post_row  = $db->where('id', $post_id)->getOne(T_POSTS);
            $post_data = is_object($post_row) ? (array) $post_row : (is_array($post_row) ? $post_row : array());
            if (!empty($post_data) && !VNSEEA_CanViewPost($post_data, $wo['user']['id'])) {
                $post_data = array();
            }
            if (!empty($post_data)) {
                $heartbeat_window = 10;
                $stale_window = 45;
                $live_time = !empty($post_data['live_time']) ? intval($post_data['live_time']) : 0;
                $heartbeat_age = ($live_time > 0) ? max(0, time() - $live_time) : ($stale_window + 1);
                $stream_state = 'offline';
                if (intval(!empty($post_data['live_ended']) ? $post_data['live_ended'] : 0) === 0 && $live_time > 0) {
                    if ($heartbeat_age <= $heartbeat_window) {
                        $stream_state = 'live';
                    } else if ($heartbeat_age <= $stale_window) {
                        $stream_state = 'stale';
                    }
                }
                $word = ($stream_state === 'offline') ? $wo['lang']['offline'] : $wo['lang']['live'];
                    $reactions_count = intval($db->where('post_id', $post_id)->getValue(T_REACTIONS, 'COUNT(*)'));
                    $shares_count = intval(Wo_CountShares($post_id)) + intval(Wo_CountPostShare($post_id));
                    $clips_count = 0;
                    $structured_comments = array();
                    $structured_reactions = array();
                    $joined_payload = array();
                    $left_payload = array();
                    if (isset($post_data['clips_count'])) {
                        $clips_count = intval($post_data['clips_count']);
                    } else if (isset($post_data['clip_count'])) {
                        $clips_count = intval($post_data['clip_count']);
                    }
                    $html = '';
                    $html_count = 0;
                    $viewer_count = 0;
                    if (intval(!empty($post_data['live_ended']) ? $post_data['live_ended'] : 0) == 0) {
                        if (!empty($_POST['reaction_ids'])) {
                            $reaction_ids = array();
                            foreach ($_POST['reaction_ids'] as $key => $one_id) {
                                if (is_numeric($one_id) && intval($one_id) > 0) {
                                    $reaction_ids[] = Wo_Secure($one_id);
                                }
                            }
                            if (!empty($reaction_ids)) {
                                $db->where('id', $reaction_ids, 'NOT IN')->where('id', end($reaction_ids), '>');
                            }
                        }
                        $live_reactions = $db->where('post_id', $post_id)->orderBy('id', 'DESC')->get(T_REACTIONS, 8);
                        if (!empty($live_reactions)) {
                            $live_reactions = array_reverse($live_reactions);
                            foreach ($live_reactions as $reaction_row) {
                                $reaction_user = Wo_UserData($reaction_row->user_id);
                                if (!empty($reaction_user)) {
                                    $structured_reactions[] = array(
                                        'id' => intval($reaction_row->id),
                                        'value' => !empty($reaction_row->reaction) ? strval($reaction_row->reaction) : '',
                                        'author' => !empty($reaction_user['name']) ? $reaction_user['name'] : '',
                                        'username' => !empty($reaction_user['username']) ? $reaction_user['username'] : '',
                                        'avatar' => !empty($reaction_user['avatar']) ? $reaction_user['avatar'] : ''
                                    );
                                }
                            }
                        }
                        $user_comment_row = $db->where('post_id', $post_id)->where('user_id', $wo['user']['id'])->getOne(T_COMMENTS);
                        $user_comment = is_object($user_comment_row) ? (array) $user_comment_row : (is_array($user_comment_row) ? $user_comment_row : array());
                    if (!empty($user_comment)) {
                        $db->where('id', intval($user_comment['id']), '>');
                    }
                    if (!empty($_POST['ids'])) {
                        $ids = array();
                        foreach ($_POST['ids'] as $key => $one_id) {
                            $ids[] = Wo_Secure($one_id);
                        }
                        $db->where('id', $ids, 'NOT IN')->where('id', end($ids), '>');
                    }
                    $db->where('user_id', $wo['user']['id'], '!=');
                    $comments = $db->where('post_id', $post_id)->where('text', '', '!=')->get(T_COMMENTS);
                    foreach ($comments as $key => $value) {
                        if (!empty($value->text)) {
                            $wo['comment'] = Wo_GetPostComment($value->id);
                            if (!empty($wo['comment'])) {
                                $structured_comments[] = $map_live_comment_payload(
                                    $wo['comment'],
                                    'comment',
                                    intval(!empty($post_data['user_id']) ? $post_data['user_id'] : 0) === intval(!empty($wo['comment']['user_id']) ? $wo['comment']['user_id'] : 0)
                                );
                            }
                            $html .= Wo_LoadPage('story/includes/live_comment');
                            $html_count = $html_count + 1;
                            if ($html_count == 4) {
                                break;
                            }
                        }
                    }
                    if ($stream_state !== 'offline') {
                        $viewer_count = intval($db->where('post_id', $post_id)->where('time', time() - 6, '>=')->getValue(T_LIVE_SUB, 'COUNT(*)'));
                        if ($wo['user']['id'] == intval(!empty($post_data['user_id']) ? $post_data['user_id'] : 0)) {
                            $joined_users = $db->where('post_id', $post_id)->where('time', time() - 6, '>=')->where('is_watching', 0)->get(T_LIVE_SUB);
                            $joined_ids   = array();
                            if (!empty($joined_users)) {
                                foreach ($joined_users as $key => $value) {
                                    $joined_ids[]  = $value->user_id;
                                    $user_data     = Wo_UserData($value->user_id);
                                    if (!empty($user_data)) {
                                        $joined_payload[] = array(
                                            'id' => 0,
                                            'author' => !empty($user_data['name']) ? $user_data['name'] : '',
                                            'username' => !empty($user_data['username']) ? $user_data['username'] : '',
                                            'avatar' => !empty($user_data['avatar']) ? $user_data['avatar'] : '',
                                            'message' => 'joined live video',
                                            'time_text' => $wo['lang']['now'],
                                            'kind' => 'joined',
                                            'is_host' => false
                                        );
                                    }
                                    $wo['comment'] = array(
                                        'id' => '',
                                        'text' => 'joined live video'
                                    );
                                    if (!empty($user_data)) {
                                        $wo['comment']['publisher'] = $user_data;
                                        $html .= Wo_LoadPage('story/includes/live_comment');
                                    }
                                }
                                if (!empty($joined_ids)) {
                                    $db->where('post_id', $post_id)->where('user_id', $joined_ids, 'IN')->update(T_LIVE_SUB, array(
                                        'is_watching' => 1
                                    ));
                                }
                            }
                            $left_users = $db->where('post_id', $post_id)->where('time', time() - 6, '<')->where('is_watching', 1)->get(T_LIVE_SUB);
                            $left_ids   = array();
                            if (!empty($left_users)) {
                                foreach ($left_users as $key => $value) {
                                    $left_ids[]    = $value->user_id;
                                    $user_data     = Wo_UserData($value->user_id);
                                    if (!empty($user_data)) {
                                        $left_payload[] = array(
                                            'id' => 0,
                                            'author' => !empty($user_data['name']) ? $user_data['name'] : '',
                                            'username' => !empty($user_data['username']) ? $user_data['username'] : '',
                                            'avatar' => !empty($user_data['avatar']) ? $user_data['avatar'] : '',
                                            'message' => 'left live video',
                                            'time_text' => $wo['lang']['now'],
                                            'kind' => 'left',
                                            'is_host' => false
                                        );
                                    }
                                    $wo['comment'] = array(
                                        'id' => '',
                                        'text' => 'left live video'
                                    );
                                    if (!empty($user_data)) {
                                        $wo['comment']['publisher'] = $user_data;
                                        $html .= Wo_LoadPage('story/includes/live_comment');
                                    }
                                }
                                if (!empty($left_ids)) {
                                    $db->where('post_id', $post_id)->where('user_id', $left_ids, 'IN')->delete(T_LIVE_SUB);
                                }
                            }
                        }
                    }
                    $data = array(
                        'status' => 200,
                        'html' => $html,
                        'count' => $viewer_count,
                        'viewer_count' => $viewer_count,
                        'word' => $word,
                        'still_live' => $stream_state,
                        'is_final' => intval($stream_state === 'offline'),
                        'heartbeat_age' => $heartbeat_age,
                        'reactions_count' => $reactions_count,
                        'shares_count' => $shares_count,
                        'clips_count' => $clips_count,
                        'comments' => $structured_comments,
                        'reactions' => $structured_reactions,
                        'joined' => $joined_payload,
                        'left' => $left_payload
                    );
                    if ($wo['user']['id'] == intval(!empty($post_data['user_id']) ? $post_data['user_id'] : 0)) {
                        if ($_POST['page'] == 'live') {
                            $time = time();
                            $db->where('id', $post_id)->update(T_POSTS, array(
                                'live_time' => $time
                            ));
                            $db->where('parent_id', $post_id)->update(T_POSTS, array(
                                'live_time' => $time
                            ));
                        }
                    } else {
                        if ($stream_state !== 'offline' && $_POST['page'] == 'story') {
                            $is_watching = $db->where('user_id', $wo['user']['id'])->where('post_id', $post_id)->getValue(T_LIVE_SUB, 'COUNT(*)');
                            if ($is_watching > 0) {
                                $db->where('user_id', $wo['user']['id'])->where('post_id', $post_id)->update(T_LIVE_SUB, array(
                                    'time' => time()
                                ));
                            } else {
                                $db->insert(T_LIVE_SUB, array(
                                    'user_id' => $wo['user']['id'],
                                    'post_id' => $post_id,
                                    'time' => time(),
                                    'is_watching' => 0
                                ));
                            }
                        }
                    }
                } else {
                    $data = array(
                        'status' => 200,
                        'html' => '',
                        'count' => 0,
                        'word' => $wo['lang']['offline'],
                        'still_live' => 'offline',
                        'is_final' => 1,
                        'heartbeat_age' => $heartbeat_age,
                        'reactions_count' => $reactions_count,
                        'shares_count' => $shares_count,
                        'clips_count' => $clips_count,
                        'viewer_count' => 0,
                        'comments' => array(),
                        'reactions' => array(),
                        'joined' => array(),
                        'left' => array()
                    );
                }
            } else {
                $data['message'] = $error_icon . $wo['lang']['please_check_details'];
                $data['removed'] = 'yes';
            }
        } else {
            $data['message'] = $error_icon . $wo['lang']['please_check_details'];
        }
        header("Content-type: application/json");
        echo json_encode($data);
        exit();
    }
    if ($s == 'delete') {
        $deleted = false;
        if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0) {
            $post_id = Wo_Secure($_POST['post_id']);
            $post = $db->where('post_id', $post_id)->where('user_id', $wo['user']['id'])->getOne(T_POSTS);
            if (!empty($post)) {
                $db->where('post_id', $post_id)->where('user_id', $wo['user']['id'])->update(T_POSTS, array(
                'live_ended' => 1,
                'live_time' => 0
                ));
                if ($wo['config']['agora_live_video'] == 1 && !empty($wo['config']['agora_app_id']) && !empty($wo['config']['agora_customer_id']) && !empty($wo['config']['agora_customer_certificate']) && $wo['config']['live_video_save'] == 1) {
                    try {
                        $stream_parts = !empty($post->stream_name) ? explode('_', $post->stream_name) : array();
                        StopCloudRecording(array(
                            'resourceId' => $post->agora_resource_id,
                            'sid' => $post->agora_sid,
                            'cname' => $post->stream_name,
                            'post_id' => $post->post_id,
                            'token' => $post->agora_token,
                            'uid' => !empty($stream_parts[2]) ? $stream_parts[2] : 12
                        ));
                    }
                    catch (Exception $e) {
                    }
                }
                Wo_DeletePost($post_id);
                $deleted = true;
            }
        }
        $posts = $db->where('stream_name','','<>')->where('postFile','')->get(T_POSTS);
        if (!empty($posts)) {
            foreach ($posts as $key => $value) {
                if ((!empty($value->agora_resource_id) || !empty($value->agora_sid) || !empty($value->agora_token)) && empty($value->postFile)) {
                    Wo_DeletePost($value->id,'shared');
                }
            }
        }
        header("Content-type: application/json");
        echo json_encode(array(
            'status' => $deleted ? 200 : 400,
            'message' => $deleted ? 'Live session ended.' : $error_icon . $wo['lang']['please_check_details']
        ));
        exit();
    }
    if ($s == 'create_thumb') {
        if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0 && !empty($_FILES['thumb'])) {
            $is_post = $db->where('post_id', Wo_Secure($_POST['post_id']))->where('user_id', $wo['user']['id'])->getValue(T_POSTS, 'COUNT(*)');
            if ($is_post > 0) {
                $fileInfo = array(
                    'file' => $_FILES["thumb"]["tmp_name"],
                    'name' => $_FILES['thumb']['name'],
                    'size' => $_FILES["thumb"]["size"],
                    'type' => $_FILES["thumb"]["type"],
                    'types' => 'jpeg,png,jpg,gif',
                    'crop' => array(
                        'width' => 525,
                        'height' => 295
                    )
                );
                $media    = Wo_ShareFile($fileInfo);
                if (!empty($media)) {
                    $thumb = $media['filename'];
                    if (!empty($thumb)) {
                        $db->where('post_id', Wo_Secure($_POST['post_id']))->where('user_id', $wo['user']['id'])->update(T_POSTS, array(
                            'postFileThumb' => $thumb
                        ));
                        $data['status'] = 200;
                        $data['thumb_url'] = Wo_GetMedia($thumb);
                        header("Content-type: application/json");
                        echo json_encode($data);
                        exit();
                    }
                }
            }
        }
        header("Content-type: application/json");
        echo json_encode(array(
            'status' => 400,
            'message' => $error_icon . $wo['lang']['please_check_details']
        ));
        exit();
    }
}
