<?php
// Canonical, idempotent transfer service for VNSEEA stored in Wo_Users.points.

if (!function_exists('Wo_PointsTransferParsePositiveInteger')) {
    function Wo_PointsTransferParsePositiveInteger($value) {
        if (is_int($value)) {
            return $value > 0 && $value <= 2147483647 ? $value : null;
        }

        if (!is_string($value) || !preg_match('/^[1-9][0-9]*$/', $value)) {
            return null;
        }

        $normalized = (int) $value;
        return $normalized > 0 && $normalized <= 2147483647 ? $normalized : null;
    }
}

if (!function_exists('Wo_PointsTransferNormalizeRequestId')) {
    function Wo_PointsTransferNormalizeRequestId($value) {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        return preg_match('/^[A-Za-z0-9_-]{20,80}$/', $value) ? $value : null;
    }
}

if (!function_exists('Wo_PointsTransferNormalizeNote')) {
    function Wo_PointsTransferNormalizeNote($value) {
        $note = trim(strip_tags(is_scalar($value) ? (string) $value : ''));
        return function_exists('mb_substr') ? mb_substr($note, 0, 255) : substr($note, 0, 255);
    }
}

if (!function_exists('Wo_PointsTransferGenerateRequestId')) {
    function Wo_PointsTransferGenerateRequestId($prefix = 'legacy') {
        try {
            return $prefix . '_' . bin2hex(random_bytes(20));
        }
        catch (Exception $exception) {
            return $prefix . '_' . str_replace('.', '', uniqid('', true)) . '_' . mt_rand(100000, 999999);
        }
    }
}

if (!function_exists('Wo_PointsTransferUserName')) {
    function Wo_PointsTransferUserName($user) {
        $full_name = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
        if ($full_name !== '') {
            return $full_name;
        }
        if (!empty($user['name'])) {
            return (string) $user['name'];
        }
        return (string) ($user['username'] ?? '');
    }
}

if (!function_exists('Wo_PointsTransferError')) {
    function Wo_PointsTransferError($http_status, $code, $message, $request_id = '') {
        return array(
            'ok' => false,
            'http_status' => (int) $http_status,
            'error_code' => (string) $code,
            'message' => (string) $message,
            'request_id' => (string) $request_id,
        );
    }
}

if (!function_exists('Wo_PointsTransferSuccess')) {
    function Wo_PointsTransferSuccess($row, $recipient_name, $idempotent_replay) {
        return array(
            'ok' => true,
            'http_status' => 200,
            'message' => 'Đã gửi ' . (int) $row['points'] . ' VNSEEA cho ' . $recipient_name,
            'request_id' => (string) $row['request_id'],
            'idempotent_replay' => (bool) $idempotent_replay,
            'recipient_id' => (int) $row['recipient_id'],
            'recipient_name' => (string) $recipient_name,
            'points' => (int) $row['points'],
            'sender_points' => (int) $row['sender_points_after'],
            'recipient_points' => (int) $row['recipient_points_after'],
            'sender_transaction_id' => (int) $row['sender_transaction_id'],
            'recipient_transaction_id' => (int) $row['recipient_transaction_id'],
        );
    }
}

if (!function_exists('Wo_PointsTransferInsertHistory')) {
    function Wo_PointsTransferInsertHistory($user_id, $kind, $notes, $extra) {
        global $sqlConnect;

        $safe_user_id = (int) $user_id;
        $safe_kind = mysqli_real_escape_string($sqlConnect, (string) $kind);
        $safe_notes = mysqli_real_escape_string($sqlConnect, (string) $notes);
        $encoded_extra = json_encode($extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded_extra)) {
            return 0;
        }
        $safe_extra = mysqli_real_escape_string($sqlConnect, $encoded_extra);
        $query = mysqli_query(
            $sqlConnect,
            "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`, `extra`) VALUES ({$safe_user_id}, '{$safe_kind}', 0, '{$safe_notes}', '{$safe_extra}')"
        );

        return $query ? (int) mysqli_insert_id($sqlConnect) : 0;
    }
}

if (!function_exists('Wo_PointsTransferFindCompletedRequest')) {
    function Wo_PointsTransferFindCompletedRequest($sender_id, $request_id) {
        global $sqlConnect;

        $table = defined('T_POINTS_TRANSFER_REQUESTS') ? T_POINTS_TRANSFER_REQUESTS : 'Wo_Points_Transfer_Requests';
        $safe_sender_id = (int) $sender_id;
        $safe_request_id = mysqli_real_escape_string($sqlConnect, (string) $request_id);
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM `{$table}` WHERE `sender_id` = {$safe_sender_id} AND `request_id` = '{$safe_request_id}' LIMIT 1"
        );

        return $query && mysqli_num_rows($query) > 0 ? mysqli_fetch_assoc($query) : null;
    }
}

if (!function_exists('Wo_TransferPoints')) {
    function Wo_TransferPoints($sender_id, $recipient_raw, $points_raw, $request_id_raw, $note_raw = '', $options = array()) {
        global $sqlConnect, $wo;

        $sender_id = Wo_PointsTransferParsePositiveInteger($sender_id);
        $recipient_id = Wo_PointsTransferParsePositiveInteger($recipient_raw);
        $points = Wo_PointsTransferParsePositiveInteger($points_raw);
        $note = Wo_PointsTransferNormalizeNote($note_raw);
        $allow_generated_request_id = !empty($options['allow_generated_request_id']);
        $request_id = Wo_PointsTransferNormalizeRequestId($request_id_raw);

        if (!$request_id && $allow_generated_request_id && empty($request_id_raw)) {
            $request_id = Wo_PointsTransferGenerateRequestId('legacy');
            error_log('[VNSEEA_POINTS_TRANSFER] deprecated_missing_request_id sender=' . (int) $sender_id . ' generated=' . substr($request_id, 0, 18));
        }

        if (!$sender_id) {
            return Wo_PointsTransferError(401, 'not_authenticated', 'User is not authenticated.');
        }
        if (!$recipient_id || !$points) {
            return Wo_PointsTransferError(400, 'invalid_transfer', 'Recipient and VNSEEA must be positive integers.', (string) $request_id);
        }
        if (!$request_id) {
            return Wo_PointsTransferError(400, 'invalid_request_id', 'request_id must contain 20-80 safe characters.');
        }
        if ($sender_id === $recipient_id) {
            return Wo_PointsTransferError(422, 'self_transfer', 'You cannot transfer VNSEEA to yourself.', $request_id);
        }

        $table = defined('T_POINTS_TRANSFER_REQUESTS') ? T_POINTS_TRANSFER_REQUESTS : 'Wo_Points_Transfer_Requests';
        $safe_request_id = mysqli_real_escape_string($sqlConnect, $request_id);
        $safe_note = mysqli_real_escape_string($sqlConnect, $note);
        $created_at = time();

        mysqli_begin_transaction($sqlConnect);
        $claim = mysqli_query(
            $sqlConnect,
            "INSERT INTO `{$table}` (`sender_id`, `request_id`, `recipient_id`, `points`, `note`, `status`, `created_at`) VALUES ({$sender_id}, '{$safe_request_id}', {$recipient_id}, {$points}, '{$safe_note}', 'processing', {$created_at})"
        );

        if (!$claim) {
            $claim_errno = mysqli_errno($sqlConnect);
            $claim_error = mysqli_error($sqlConnect);
            mysqli_rollback($sqlConnect);

            if ($claim_errno === 1062) {
                $existing = Wo_PointsTransferFindCompletedRequest($sender_id, $request_id);
                if (!$existing || $existing['status'] !== 'completed') {
                    return Wo_PointsTransferError(409, 'request_in_progress', 'This transfer request is still being processed.', $request_id);
                }
                if (
                    (int) $existing['recipient_id'] !== $recipient_id
                    || (int) $existing['points'] !== $points
                    || (string) $existing['note'] !== $note
                ) {
                    return Wo_PointsTransferError(409, 'idempotency_conflict', 'request_id was already used with different transfer details.', $request_id);
                }

                $recipient = Wo_UserData($recipient_id);
                return Wo_PointsTransferSuccess($existing, Wo_PointsTransferUserName($recipient ?: array()), true);
            }

            error_log('[VNSEEA_POINTS_TRANSFER] claim_failed sender=' . $sender_id . ' request=' . substr($request_id, 0, 18) . ' error=' . $claim_error);
            return Wo_PointsTransferError(500, 'idempotency_storage_failed', 'Unable to initialize the transfer.', $request_id);
        }

        $first_id = min($sender_id, $recipient_id);
        $second_id = max($sender_id, $recipient_id);
        $users_query = mysqli_query(
            $sqlConnect,
            "SELECT `user_id`, `points`, `active`, `banned`, `username`, `first_name`, `last_name` FROM " . T_USERS . " WHERE `user_id` IN ({$first_id}, {$second_id}) ORDER BY `user_id` ASC FOR UPDATE"
        );

        $users = array();
        if ($users_query) {
            while ($user = mysqli_fetch_assoc($users_query)) {
                $users[(int) $user['user_id']] = $user;
            }
        }

        if (count($users) !== 2 || empty($users[$sender_id]) || empty($users[$recipient_id])) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(422, 'user_not_found', 'Sender or recipient was not found.', $request_id);
        }

        $sender = $users[$sender_id];
        $recipient = $users[$recipient_id];
        if (!empty($recipient['banned']) || empty($recipient['active'])) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(422, 'recipient_unavailable', 'Recipient is not available.', $request_id);
        }

        $sender_points_before = (int) $sender['points'];
        $recipient_points_before = (int) $recipient['points'];
        if ($sender_points_before < $points) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(422, 'insufficient_points', 'The transfer exceeds your current VNSEEA balance.', $request_id);
        }
        if ($recipient_points_before > 2147483647 - $points) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(422, 'recipient_points_limit', 'Recipient VNSEEA balance would exceed the supported limit.', $request_id);
        }

        $sender_points_after = $sender_points_before - $points;
        $recipient_points_after = $recipient_points_before + $points;
        $update_sender = mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `points` = {$sender_points_after} WHERE `user_id` = {$sender_id}");
        $sender_updated = $update_sender && mysqli_affected_rows($sqlConnect) === 1;
        $update_recipient = $sender_updated
            ? mysqli_query($sqlConnect, "UPDATE " . T_USERS . " SET `points` = {$recipient_points_after} WHERE `user_id` = {$recipient_id}")
            : false;
        $recipient_updated = $update_recipient && mysqli_affected_rows($sqlConnect) === 1;

        if (!$sender_updated || !$recipient_updated) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(500, 'balance_update_failed', 'Unable to update VNSEEA balances.', $request_id);
        }

        $sender_name = Wo_PointsTransferUserName($sender);
        $recipient_name = Wo_PointsTransferUserName($recipient);
        $extra = array(
            'request_id' => $request_id,
            'note' => $note,
            'sender_id' => $sender_id,
            'sender_name' => $sender_name,
            'recipient_id' => $recipient_id,
            'recipient_name' => $recipient_name,
            'points' => $points,
            'action' => 'transfer',
            'type' => 'vnseea_transfer',
        );
        $sender_note = $note !== '' ? $note : 'Đã gửi VNSEEA đến ' . $recipient_name;
        $recipient_note = $note !== '' ? $note : 'Nhận VNSEEA từ ' . $sender_name;
        $recipient_transaction_id = Wo_PointsTransferInsertHistory($recipient_id, 'POINTS_RECEIVED', $recipient_note, $extra);
        $sender_transaction_id = $recipient_transaction_id
            ? Wo_PointsTransferInsertHistory($sender_id, 'POINTS_SENT', $sender_note, $extra)
            : 0;

        if (!$recipient_transaction_id || !$sender_transaction_id) {
            $insert_error = mysqli_error($sqlConnect);
            mysqli_rollback($sqlConnect);
            error_log('[VNSEEA_POINTS_TRANSFER] history_insert_failed sender=' . $sender_id . ' request=' . substr($request_id, 0, 18) . ' error=' . $insert_error);
            return Wo_PointsTransferError(500, 'history_insert_failed', 'Transaction history could not be recorded.', $request_id);
        }

        $completed_at = time();
        $complete = mysqli_query(
            $sqlConnect,
            "UPDATE `{$table}` SET `status` = 'completed', `sender_points_after` = {$sender_points_after}, `recipient_points_after` = {$recipient_points_after}, `sender_transaction_id` = {$sender_transaction_id}, `recipient_transaction_id` = {$recipient_transaction_id}, `completed_at` = {$completed_at} WHERE `sender_id` = {$sender_id} AND `request_id` = '{$safe_request_id}' AND `status` = 'processing'"
        );

        if (!$complete || mysqli_affected_rows($sqlConnect) !== 1) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(500, 'idempotency_finalize_failed', 'Unable to finalize the transfer.', $request_id);
        }

        if (!mysqli_commit($sqlConnect)) {
            mysqli_rollback($sqlConnect);
            return Wo_PointsTransferError(500, 'commit_failed', 'Unable to commit the transfer.', $request_id);
        }

        cache($sender_id, 'users', 'delete');
        cache($recipient_id, 'users', 'delete');
        if (function_exists('Wo_RegisterNotification')) {
            Wo_RegisterNotification(array(
                'recipient_id' => $recipient_id,
                'type' => 'sent_u_money',
                'notifier_id' => $sender_id,
                'user_id' => $sender_id,
                'text' => $sender_name . ' đã gửi cho bạn ' . $points . ' VNSEEA',
                'url' => 'index.php?link1=setting&page=myPoints',
            ));
        }

        return Wo_PointsTransferSuccess(array(
            'request_id' => $request_id,
            'recipient_id' => $recipient_id,
            'points' => $points,
            'sender_points_after' => $sender_points_after,
            'recipient_points_after' => $recipient_points_after,
            'sender_transaction_id' => $sender_transaction_id,
            'recipient_transaction_id' => $recipient_transaction_id,
        ), $recipient_name, false);
    }
}
