<?php
// English description: Exposes forum sections and forums as JSON for the Nuxt forum bridge while reusing existing WoWonder forum functions.

$response_data = array(
    'api_status' => 400
);

$limit = (!empty($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 && $_POST['limit'] <= 50) ? Wo_Secure($_POST['limit']) : 20;
$offset = (!empty($_POST['offset']) && is_numeric($_POST['offset']) && $_POST['offset'] > 0) ? Wo_Secure($_POST['offset']) : 0;
$keyword = !empty($_POST['keyword']) ? Wo_Secure($_POST['keyword']) : '';
$action = !empty($_POST['action']) ? Wo_Secure($_POST['action']) : 'catalog';

if ($wo['config']['forum'] == 0) {
    $error_code = 5;
    $error_message = 'forum is disabled';
}

if (empty($error_code)) {
    if ($action == 'threads') {
        $forum_id = (!empty($_POST['forum_id']) && is_numeric($_POST['forum_id'])) ? Wo_Secure($_POST['forum_id']) : 0;
        $forum = $forum_id ? Wo_GetForum($forum_id) : array();

        if (empty($forum)) {
            $response_data = array(
                'api_status' => 404,
                'errors' => array('error_text' => 'forum not found')
            );
        } else {
            $threads = Wo_GetForumThreads(array(
                'forum' => $forum_id,
                'offset' => $offset,
                'limit' => $limit,
                'search' => !empty($keyword),
                'subject' => $keyword,
                'preview' => true
            ));
            foreach ($threads as $key => $thread) {
                $threads[$key]['forum_data'] = $forum;
            }

            $response_data = array(
                'api_status' => 200,
                'can_create' => !empty($wo['config']['can_use_forum']),
                'forum' => $forum,
                'threads' => $threads,
                'has_more' => count($threads) >= $limit,
                'next_offset' => !empty($threads) ? end($threads)['id'] : null
            );
        }
    } else if ($action == 'my_threads') {
        if ($wo['loggedin'] == false) {
            $response_data = array(
                'api_status' => 401,
                'errors' => array('error_text' => 'login is required')
            );
        } else {
            $threads = Wo_GetForumThreads(array(
                'user' => $wo['user']['id'],
                'offset' => $offset,
                'limit' => $limit,
                'search' => !empty($keyword),
                'subject' => $keyword,
                'preview' => true
            ));
            foreach ($threads as $key => $thread) {
                $threads[$key]['forum_data'] = Wo_GetForum($thread['forum']);
            }

            $response_data = array(
                'api_status' => 200,
                'can_create' => !empty($wo['config']['can_use_forum']),
                'threads' => $threads,
                'has_more' => count($threads) >= $limit,
                'next_offset' => !empty($threads) ? end($threads)['id'] : null
            );
        }
    } else if ($action == 'thread_detail') {
        $thread_id = (!empty($_POST['thread_id']) && is_numeric($_POST['thread_id'])) ? Wo_Secure($_POST['thread_id']) : 0;
        $thread = $thread_id ? Wo_GetForumThreads(array('id' => $thread_id, 'preview' => true)) : array();

        if (empty($thread)) {
            $response_data = array(
                'api_status' => 404,
                'errors' => array('error_text' => 'thread not found')
            );
        } else {
            Wo_AddThreadView($thread_id);
            $thread[0]['forum_data'] = Wo_GetForum($thread[0]['forum']);
            $response_data = array(
                'api_status' => 200,
                'thread' => $thread[0],
                'can_create' => !empty($wo['config']['can_use_forum'])
            );
        }
    } else if ($action == 'create_thread') {
        $forum_id = (!empty($_POST['forum_id']) && is_numeric($_POST['forum_id'])) ? Wo_Secure($_POST['forum_id']) : 0;
        $headline = !empty($_POST['headline']) ? Wo_Secure($_POST['headline']) : '';
        $topicpost = !empty($_POST['topicpost']) ? Wo_Secure($_POST['topicpost']) : '';

        if ($wo['loggedin'] == false || empty($wo['config']['can_use_forum'])) {
            $response_data = array(
                'api_status' => 401,
                'errors' => array('error_text' => 'forum posting is not allowed')
            );
        } else if (empty($forum_id) || empty(Wo_GetForum($forum_id)) || strlen($headline) < 10 || strlen($topicpost) < 32) {
            $response_data = array(
                'api_status' => 400,
                'errors' => array('error_text' => 'invalid thread payload')
            );
        } else {
            $registration_data = array(
                'user' => $wo['user']['id'],
                'views' => 0,
                'headline' => $headline,
                'post' => $topicpost,
                'posted' => time(),
                'forum' => $forum_id
            );

            if (Wo_AddTopic($registration_data)) {
                $threads = Wo_GetForumThreads(array(
                    'forum' => $forum_id,
                    'user' => $wo['user']['id'],
                    'limit' => 1,
                    'preview' => true
                ));
                if (!empty($threads[0])) {
                    $threads[0]['forum_data'] = Wo_GetForum($threads[0]['forum']);
                }

                $response_data = array(
                    'api_status' => 200,
                    'thread' => !empty($threads[0]) ? $threads[0] : null,
                    'message' => 'thread created'
                );
            } else {
                $response_data = array(
                    'api_status' => 500,
                    'errors' => array('error_text' => 'unable to create thread')
                );
            }
        }
    } else if ($action == 'reply_thread') {
        $thread_id = (!empty($_POST['thread_id']) && is_numeric($_POST['thread_id'])) ? Wo_Secure($_POST['thread_id']) : 0;
        $forum_id = (!empty($_POST['forum_id']) && is_numeric($_POST['forum_id'])) ? Wo_Secure($_POST['forum_id']) : 0;
        $subject = !empty($_POST['subject']) ? Wo_Secure($_POST['subject']) : '';
        $content = !empty($_POST['content']) ? $_POST['content'] : '';

        if ($wo['loggedin'] == false) {
            $response_data = array(
                'api_status' => 401,
                'errors' => array('error_text' => 'login is required')
            );
        } else if (empty($thread_id) || empty($forum_id) || strlen($subject) < 10 || strlen($content) < 2) {
            $response_data = array(
                'api_status' => 400,
                'errors' => array('error_text' => 'invalid reply payload')
            );
        } else {
            $registration_data = array(
                'thread_id' => $thread_id,
                'forum_id' => $forum_id,
                'poster_id' => $wo['user']['id'],
                'post_subject' => $subject,
                'post_text' => Wo_BbcodeSecure($content),
                'post_quoted' => 0,
                'posted_time' => time()
            );

            if (Wo_ThreadReply($registration_data)) {
                Wo_UpdateThreadLastPostTime($thread_id);
                $replies = Wo_GetThreadReplies(array(
                    'thread_id' => $thread_id,
                    'user' => $wo['user']['id'],
                    'order_by' => 'DESC',
                    'limit' => 1
                ));

                $thread = Wo_GetForumThreads(array('id' => $thread_id, 'preview' => true));
                if (!empty($thread[0])) {
                    $notification_data_array = array(
                        'recipient_id' => $thread[0]['user'],
                        'type' => 'thread_reply',
                        'thread_id' => $thread_id,
                        'text' => '',
                        'url' => 'index.php?link1=showthread&tid=' . $thread_id
                    );
                    Wo_RegisterNotification($notification_data_array);
                }

                $response_data = array(
                    'api_status' => 200,
                    'reply' => !empty($replies[0]) ? $replies[0] : null,
                    'message' => 'reply created'
                );
            } else {
                $response_data = array(
                    'api_status' => 500,
                    'errors' => array('error_text' => 'unable to create reply')
                );
            }
        }
    } else {
    $sections = Wo_GetForumSec(array(
        'forums' => true,
        'limit' => $limit,
        'offset' => $offset,
        'search' => !empty($keyword),
        'keyword' => $keyword
    ));

    $response_data = array(
        'api_status' => 200,
        'can_create' => !empty($wo['config']['can_use_forum']),
        'sections' => $sections,
        'has_more' => count($sections) >= $limit,
        'next_offset' => !empty($sections) ? end($sections)['id'] : null
    );
    }
}
