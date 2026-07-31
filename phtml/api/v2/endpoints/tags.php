<?php
// English description: Handles mobile message label management through the v2 API.

function Wo_ApiTagsCurrentUserId() {
    global $wo;
    if (!empty($wo['user']['user_id'])) {
        return (int) $wo['user']['user_id'];
    }
    if (!empty($wo['user']['id'])) {
        return (int) $wo['user']['id'];
    }
    return 0;
}

function Wo_ApiTagsResponse($payload) {
    global $response_data;
    $response_data = $payload;
}

function Wo_ApiTagsError($message, $status = 400) {
    Wo_ApiTagsResponse(array(
        'status' => $status,
        'message' => $message
    ));
}

function Wo_ApiTagsPostString($key, $default = '') {
    return isset($_POST[$key]) ? trim($_POST[$key]) : $default;
}

function Wo_ApiTagsPostInt($key, $fallback_key = '') {
    if (isset($_POST[$key]) && is_numeric($_POST[$key])) {
        return (int) $_POST[$key];
    }
    if (!empty($fallback_key) && isset($_POST[$fallback_key]) && is_numeric($_POST[$fallback_key])) {
        return (int) $_POST[$fallback_key];
    }
    return 0;
}

$owner_id = Wo_ApiTagsCurrentUserId();
$action = Wo_ApiTagsPostString('s');

if (empty($owner_id)) {
    Wo_ApiTagsError('Not authorized', 401);
    return;
}

if (empty($action)) {
    Wo_ApiTagsError('Action is missing');
    return;
}

if ($action == 'list_labels') {
    Wo_ApiTagsResponse(array(
        'status' => 200,
        'labels' => Wo_ListUserTagLabels($owner_id)
    ));
    return;
}

if ($action == 'create_label') {
    $name = Wo_ApiTagsPostString('label_name');
    $color = Wo_ApiTagsPostString('label_color', '#999999');

    if ($name === '') {
        Wo_ApiTagsError('Name can not be empty');
        return;
    }

    $result = Wo_CreateTagLabel(array(
        'owner_id' => $owner_id,
        'name' => $name,
        'color' => $color
    ));

    if (!is_array($result) || (int)($result['status'] ?? 0) !== 200 || empty($result['id'])) {
        Wo_ApiTagsResponse(is_array($result) ? $result : array(
            'status' => 500,
            'message' => 'Could not create label'
        ));
        return;
    }

    $label_id = (int)$result['id'];
    Wo_ApiTagsResponse(array(
        'status' => 200,
        'id' => $label_id,
        'label' => array(
            'id' => $label_id,
            'name' => $name,
            'color' => $color
        )
    ));
    return;
}

if ($action == 'update_label') {
    $label_id = Wo_ApiTagsPostInt('label_id');
    $name = Wo_ApiTagsPostString('label_name');
    $color = Wo_ApiTagsPostString('label_color', '#999999');

    if (empty($label_id)) {
        Wo_ApiTagsError('Id can not be empty');
        return;
    }
    if ($name === '') {
        Wo_ApiTagsError('Name can not be empty');
        return;
    }

    Wo_ApiTagsResponse(Wo_UpdateTagLabel($label_id, array(
        'name' => $name,
        'color' => $color
    )));
    return;
}

if ($action == 'delete_label') {
    $label_id = Wo_ApiTagsPostInt('label_id');
    if (empty($label_id)) {
        Wo_ApiTagsError('Id can not be empty');
        return;
    }

    Wo_ApiTagsResponse(Wo_DeleteTag($owner_id, $label_id));
    return;
}

if ($action == 'attach_label') {
    $target_id = Wo_ApiTagsPostInt('target_user_id', 'target_id');
    $label_id = Wo_ApiTagsPostInt('label_id');

    if (empty($target_id)) {
        Wo_ApiTagsError('Target user id can not be empty');
        return;
    }
    if (empty($label_id)) {
        Wo_ApiTagsError('Tag id can not be empty');
        return;
    }

    Wo_ApiTagsResponse(Wo_AttachUserTag(array(
        'owner_id' => $owner_id,
        'target_user_id' => $target_id,
        'tag_id' => $label_id
    )));
    return;
}

if ($action == 'detach') {
    $target_id = Wo_ApiTagsPostInt('target_user_id', 'target_id');
    $label_id = Wo_ApiTagsPostInt('label_id');

    if (empty($target_id)) {
        Wo_ApiTagsError('Target id can not be empty');
        return;
    }
    if (empty($label_id)) {
        Wo_ApiTagsError('label_id can not be empty');
        return;
    }

    Wo_ApiTagsResponse(Wo_DeleteTagUser($owner_id, $target_id, $label_id));
    return;
}

if ($action == 'list_target_tags') {
    $target_id = Wo_ApiTagsPostInt('target_user_id', 'target_id');
    if (empty($target_id)) {
        Wo_ApiTagsError('Target id can not be empty');
        return;
    }

    Wo_ApiTagsResponse(array(
        'status' => 200,
        'tags' => Wo_GetTagForUser($owner_id, $target_id)
    ));
    return;
}

if ($action == 'selected_tags') {
    $label_id = Wo_ApiTagsPostInt('tag_id', 'label_id');
    if (empty($label_id)) {
        Wo_ApiTagsError('Tag id can not be empty');
        return;
    }

    $users = array();
    $id_map = array();
    $data = Wo_GetUserIdsByTag($label_id);
    if (!empty($data) && is_array($data)) {
        foreach ($data as $row) {
            $uid = (int) (!empty($row['target_user_id']) ? $row['target_user_id'] : 0);
            if ($uid > 0 && empty($id_map[$uid])) {
                $id_map[$uid] = true;
                $users[] = $row;
            }
        }
    }

    $user_ids = array_values(array_unique(array_filter(array_map(function ($user) {
        return (int) (!empty($user['user_id']) ? $user['user_id'] : (!empty($user['target_user_id']) ? $user['target_user_id'] : 0));
    }, $users))));

    Wo_ApiTagsResponse(array(
        'status' => 200,
        'data' => $users,
        'user_ids' => $user_ids
    ));
    return;
}

if ($action == 'all_tags') {
    $users = array();
    $id_map = array();
    $data = Wo_GetAllAssignedTagsByOwner($owner_id);
    if (!empty($data) && is_array($data)) {
        foreach ($data as $row) {
            $uid = (int) (!empty($row['target_user_id']) ? $row['target_user_id'] : 0);
            if ($uid > 0 && empty($id_map[$uid])) {
                $id_map[$uid] = true;
                $users[] = $row;
            }
        }
    }

    $user_ids = array_values(array_unique(array_filter(array_map(function ($user) {
        return (int) (!empty($user['user_id']) ? $user['user_id'] : (!empty($user['target_user_id']) ? $user['target_user_id'] : 0));
    }, $users))));

    Wo_ApiTagsResponse(array(
        'status' => 200,
        'data' => $users,
        'user_ids' => $user_ids
    ));
    return;
}

if ($action == 'get_tag_user') {
    Wo_ApiTagsResponse(array(
        'status' => 200,
        'data' => Wo_GetAllTagsForUser($owner_id)
    ));
    return;
}

Wo_ApiTagsError('Action not found', 404);
?>
