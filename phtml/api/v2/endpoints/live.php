<?php
// English description: Handles mobile API live stream create, heartbeat, join, and end actions.

if (empty($_POST['type'])) {
	$error_code    = 4;
    $error_message = 'type can not be empty';
}
else{
	if ($_POST['type'] == 'create') {
		$live_result = VNSEEA_CreateLiveSession($_POST, 'api_v2');
		$response_data = array_merge(array(
			'api_status' => (int) $live_result['status']
		), $live_result);
		if ((int) $live_result['status'] === 200) {
			$post_data = Wo_PostData($live_result['post_id']);
			if (!empty($post_data)) {
				unset($post_data['get_post_comments']);
				foreach ($non_allowed as $key => $value) {
					unset($post_data['publisher'][$value]);
				}
			}
			$response_data['post_data'] = $post_data;
		}
		}

	if ($_POST['type'] == 'check_comments') {
		if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0) {
    		$post_id = Wo_Secure($_POST['post_id']);
			$post_data = $db->where('id',$post_id)->getOne(T_POSTS);
			if (!empty($post_data) && !VNSEEA_CanViewPost($post_data, $wo['user']['id'])) {
				$post_data = null;
			}
			if (!empty($post_data)) {
                $is_live_host_endpoint = VNSEEA_IsLiveHostEndpoint($post_data, $wo['user']['id'], $_POST);
                if ($post_data->live_ended == 0) {
                	$response_data = array('api_status' => 200);

                    // //if ($_POST['page'] == 'story') {
                    //     $user_comment = $db->where('post_id',$post_id)->where('user_id',$wo['user']['id'])->getOne(T_COMMENTS);
                    //     if (!empty($user_comment)) {
                    //         $db->where('id',$user_comment->id,'>');
                    //     }
                    // //}
                    // if (!empty($_POST['ids'])) {
                    //     $ids = array();
                    //     foreach ($_POST['ids'] as $key => $one_id) {
                    //         $ids[] = Wo_Secure($one_id);
                    //     }
                    //     $db->where('id',$ids,'NOT IN')->where('id',end($ids),'>');
                    // }
                    //if ($_POST['page'] == 'story') {
                        //$db->where('user_id',$wo['user']['id'],'!=');
                    //}
                    $offset = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0 ? Wo_Secure($_POST['offset']) : 0);
                    $limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50 ? Wo_Secure($_POST['limit']) : 20);
                    if (!empty($offset)) {
                        $db->where('id',$offset,'>');
                    }
    				$comments = $db->where('post_id',$post_id)->where('text','','!=')->get(T_COMMENTS,$limit);
    				$comments_data = array();
    				foreach ($comments as $key => $value) {
    					if (!empty($value->text)) {
    						$comment = Wo_GetPostComment($value->id);
    						foreach ($non_allowed as $key => $value) {
				              unset($comment['publisher'][$value]);
				            }
				            $comments_data[] = $comment;
    					}
    				}


                    
                    $word = $wo['lang']['offline'];
                    $joined_data = array();
                    $left_data = array();
                    if (!empty($post_data->live_time) && $post_data->live_time >= (time() - 10)) {
                        //$db->where('post_id',$post_id)->where('time',time()-6,'<')->update(T_LIVE_SUB,array('is_watching' => 0));
                        $word = $wo['lang']['live'];
                        $count = $db->where('post_id',$post_id)->where('time',time()-6,'>=')->getValue(T_LIVE_SUB,'COUNT(*)');

                        if ($is_live_host_endpoint) {
                            $joined_users = $db->where('post_id',$post_id)->where('time',time()-6,'>=')->where('is_watching',0)->get(T_LIVE_SUB);
                            $joined_ids = array();
                            if (!empty($joined_users)) {
                                foreach ($joined_users as $key => $value) {
                                    $joined_ids[] = $value->user_id;
                                    $joined_data[] = Wo_UserData($value->user_id);
                                    
                                }
                                if (!empty($joined_ids)) {
                                    $db->where('post_id',$post_id)->where('user_id',$joined_ids,'IN')->update(T_LIVE_SUB,array('is_watching' => 1));
                                }
                            }

                            $left_users = $db->where('post_id',$post_id)->where('time',time()-6,'<')->where('is_watching',1)->get(T_LIVE_SUB);
                            $left_ids = array();
                            if (!empty($left_users)) {
                                foreach ($left_users as $key => $value) {
                                    $left_ids[] = $value->user_id;
                                    $left_data[] = Wo_UserData($value->user_id);
                                }
                                if (!empty($left_ids)) {
                                    $db->where('post_id',$post_id)->where('user_id',$left_ids,'IN')->delete(T_LIVE_SUB);
                                }
                            }
                        }
                    }
                    $still_live = 'offline';
                    if (!empty($post_data) && $post_data->live_time >= (time() - 10)){
                        $still_live = 'live';
                    }
                    $response_data = array(
                        'api_status' => 200,
                        'comments' => $comments_data,
                        'joined' => $joined_data,
                        'left' => $left_data,
                        'count' => $count,
                        'word' => $word,
                        'still_live' => $still_live
                    );
                    
                    // Wo_RunInBackground(array(
                    //     'status' => 200,
                    //     'html' => $html,
                    //     'count' => $count,
                    //     'word' => $word,
                    //     'still_live' => $still_live
                    // ));
                    
                    if ($is_live_host_endpoint) {
                        if ($_POST['page'] == 'live') {
                            $time = time();
                            $update_array = array('live_time' => $time);
                            if (!empty($_POST['resourceId']) && !empty($_POST['sid'])) {
                                $update_array['agora_resource_id'] = Wo_Secure($_POST['resourceId']);
                                $update_array['agora_sid'] = Wo_Secure($_POST['sid']);
                            }
                            if (!empty($_POST['fileList'])) {
                                $update_array['postFile'] = Wo_Secure($_POST['fileList']);
                            }
                            $db->where('id',$post_id)->update(T_POSTS,$update_array);
                            $db->where('parent_id',$post_id)->update(T_POSTS,array('live_time' => $time));
                        }
                        // if ($_POST['page'] == 'live') {
                        //     $time = time();
                        //     $db->where('id',$post_id)->update(T_POSTS,array('live_time' => $time));
                        //     $db->where('parent_id',$post_id)->update(T_POSTS,array('live_time' => $time));
                        // }
                    }
                    else{
                        if (!empty($post_data->live_time) && $post_data->live_time >= (time() - 10) && $_POST['page'] == 'story') {
                            $is_watching = $db->where('user_id',$wo['user']['id'])->where('post_id',$post_id)->getValue(T_LIVE_SUB,'COUNT(*)');
                            if ($is_watching > 0) {
                                $db->where('user_id',$wo['user']['id'])->where('post_id',$post_id)->update(T_LIVE_SUB,array('time' => time()));
                            }
                            else{
                                $db->insert(T_LIVE_SUB,array('user_id' => $wo['user']['id'],
                                                             'post_id' => $post_id,
                                                             'time' => time(),
                                                             'is_watching' => 0));
                            }
                        }
                    }
                }
                else{
                    // Report a final state while viewers remove a live post
                    // that has just been deleted by its host.
                    $response_data = array(
                        'api_status' => 200,
                        'comments' => array(),
                        'joined' => array(),
                        'left' => array(),
                        'count' => 0,
                        'word' => $wo['lang']['offline'],
                        'still_live' => 'offline',
                        'is_final' => 1
                    );
                }
            }
            else{
                // The host deletes the live post when ending the session.
                // A viewer polling during that transition needs a final state
                // so the card can leave the feed without showing an error.
                $response_data = array(
                    'api_status' => 200,
                    'comments' => array(),
                    'joined' => array(),
                    'left' => array(),
                    'count' => 0,
                    'word' => $wo['lang']['offline'],
                    'still_live' => 'offline',
                    'is_final' => 1
                );
            }
        }
        else{
            $error_code    = 5;
            $error_message = 'post_id can not be empty';
        }
	}

    if ($_POST['type'] == 'delete') {
        if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0) {
            $post_id = Wo_Secure($_POST['post_id']);
            $post = $db->where('post_id',$post_id)->where('user_id',$wo['user']['id'])->getOne(T_POSTS);
            if (!empty($post)) {
                if (!VNSEEA_IsLiveHostEndpoint($post, $wo['user']['id'], $_POST)) {
                    $response_data = array(
                        'api_status' => 409,
                        'error_code' => 'live_active_on_another_device',
                        'message' => 'Live is active on another device.'
                    );
                    return;
                }
                $db->where('post_id',$post_id)->where('user_id',$wo['user']['id'])->update(T_POSTS,array('live_ended' => 1,'live_time' => 0));
                if ($wo['config']['agora_live_video'] == 1 && !empty($wo['config']['agora_app_id']) && !empty($wo['config']['agora_customer_id']) && !empty($wo['config']['agora_customer_certificate']) && $wo['config']['live_video_save'] == 1) {
                    try {
                        $stream_parts = !empty($post->stream_name) ? explode('_', $post->stream_name) : array();
                        StopCloudRecording(array('resourceId' => $post->agora_resource_id,
                                                 'sid' => $post->agora_sid,
                                                 'cname' => $post->stream_name,
                                                 'post_id' => $post->post_id,
                                                 'token' => $post->agora_token,
                                                 'uid' => !empty($stream_parts[2]) ? $stream_parts[2] : 12));
                    } catch (Exception $e) {
                    }
                }
                $deleted = VNSEEA_DeleteLivePost((int) $post->id);
                if ($deleted) {
                    $response_data = array(
                                        'api_status' => 200,
                                        'message' => 'Live session ended and post deleted.',
                                        'post_deleted' => 1
                                    );
                }
                else{
                    $error_code    = 7;
                    $error_message = 'Unable to delete live post';
                }
            }
            else{
                // End is idempotent: an absent post already satisfies the
                // required final state.
                $response_data = array(
                                    'api_status' => 200,
                                    'message' => 'Live session already ended.',
                                    'post_deleted' => 1
                                );
            }
        }
        else{
            $error_code    = 5;
            $error_message = 'post_id can not be empty';
        }
    }

    if ($_POST['type'] == 'create_thumb') {
        if (!empty($_POST['post_id']) && is_numeric($_POST['post_id']) && $_POST['post_id'] > 0 && !empty($_FILES['thumb'])) {
            $is_post = $db->where('post_id',Wo_Secure($_POST['post_id']))->where('user_id',$wo['user']['id'])->getValue(T_POSTS,'COUNT(*)');
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
                        $db->where('post_id',Wo_Secure($_POST['post_id']))->where('user_id',$wo['user']['id'])->update(T_POSTS,array('postFileThumb' => $thumb));
                        $response_data = array(
                                            'api_status' => 200,
                                            'message' => 'created successfully'
                                        );
                    }
                    else{
                        $error_code    = 8;
                        $error_message = 'invalid file';
                    }
                }
                else{
                    $error_code    = 7;
                    $error_message = 'invalid file';
                }
            }
            else{
                $error_code    = 6;
                $error_message = 'post not found';
            }
        }
        else{
            $error_code    = 5;
            $error_message = 'post_id , thumb can not be empty';
        }
    }




}
