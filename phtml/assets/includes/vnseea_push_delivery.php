<?php

if (!function_exists('VNSEEA_PushUuidV4')) {
    function VNSEEA_PushUuidV4()
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' .
            substr($hex, 8, 4) . '-' .
            substr($hex, 12, 4) . '-' .
            substr($hex, 16, 4) . '-' .
            substr($hex, 20);
    }
}

if (!function_exists('VNSEEA_PushDeliveryDebugLog')) {
    function VNSEEA_PushDeliveryDebugLog($event, $context = array())
    {
        if (function_exists('Wo_VnseeaPushDebugLog')) {
            Wo_VnseeaPushDebugLog($event, $context);
            return;
        }
        $line = '[vnseea_push_debug] ' . json_encode(
            array(
                'event' => (string)$event,
                'time' => date('c'),
                'context' => is_array($context) ? $context : array()
            ),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        error_log($line);
        $log_dir = dirname(dirname(__DIR__)) . '/xhr/logs';
        if (!is_dir($log_dir)) {
            @mkdir($log_dir, 0755, true);
        }
        @file_put_contents(
            $log_dir . '/vnseea_push_debug.log',
            $line . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}

if (!function_exists('VNSEEA_PushDeviceSecretHash')) {
    function VNSEEA_PushDeviceSecretHash($device_secret)
    {
        return hash('sha256', (string)$device_secret);
    }
}

if (!function_exists('VNSEEA_ValidatePushInstallationInput')) {
    function VNSEEA_ValidatePushInstallationInput($input, $requires_token = true)
    {
        $installation_id = isset($input['installation_id']) ? trim((string)$input['installation_id']) : '';
        $device_secret = isset($input['device_secret']) ? trim((string)$input['device_secret']) : '';
        if (!preg_match('/^[A-Za-z0-9_-]{20,80}$/', $installation_id)) {
            return array('ok' => false, 'error_code' => 'invalid_installation_id');
        }
        if (strlen($device_secret) < 32 || strlen($device_secret) > 160) {
            return array('ok' => false, 'error_code' => 'invalid_device_secret');
        }
        if (!$requires_token) {
            return array(
                'ok' => true,
                'installation_id' => $installation_id,
                'device_secret' => $device_secret
            );
        }

        $platform = isset($input['platform']) ? (string)$input['platform'] : '';
        $provider = isset($input['provider']) ? (string)$input['provider'] : '';
        $token = isset($input['token']) ? trim((string)$input['token']) : '';
        $environment = isset($input['apns_environment']) ? (string)$input['apns_environment'] : null;
        if (!in_array($platform, array('ios', 'android'), true)) {
            return array('ok' => false, 'error_code' => 'invalid_platform');
        }
        if (!in_array($provider, array('onesignal', 'apns_voip'), true)) {
            return array('ok' => false, 'error_code' => 'invalid_provider');
        }
        if (strlen($token) < 8 || strlen($token) > 4096) {
            return array('ok' => false, 'error_code' => 'invalid_push_token');
        }
        if ($provider === 'apns_voip') {
            if ($platform !== 'ios' || !in_array($environment, array('sandbox', 'production'), true)) {
                return array('ok' => false, 'error_code' => 'invalid_apns_environment');
            }
        } else {
            $environment = null;
        }

        return array(
            'ok' => true,
            'installation_id' => $installation_id,
            'device_secret' => $device_secret,
            'platform' => $platform,
            'provider' => $provider,
            'token' => $token,
            'apns_environment' => $environment
        );
    }
}

if (!function_exists('VNSEEA_RegisterPushInstallation')) {
    function VNSEEA_RegisterPushInstallation($user_id, $input)
    {
        global $sqlConnect;

        $user_id = (int)$user_id;
        $validated = VNSEEA_ValidatePushInstallationInput($input, true);
        if ($user_id < 1 || empty($validated['ok'])) {
            VNSEEA_PushDeliveryDebugLog('push_device_register_error', array(
                'user_id' => $user_id,
                'provider' => isset($input['provider']) ? (string)$input['provider'] : '',
                'platform' => isset($input['platform']) ? (string)$input['platform'] : '',
                'error' => $user_id < 1 ? 'not_authorized' : $validated['error_code']
            ));
            return array(
                'ok' => false,
                'error_code' => $user_id < 1 ? 'not_authorized' : $validated['error_code']
            );
        }

        $installation_key = mysqli_real_escape_string($sqlConnect, $validated['installation_id']);
        $secret_hash = VNSEEA_PushDeviceSecretHash($validated['device_secret']);
        $platform = mysqli_real_escape_string($sqlConnect, $validated['platform']);
        $provider = mysqli_real_escape_string($sqlConnect, $validated['provider']);
        $token = mysqli_real_escape_string($sqlConnect, $validated['token']);
        $token_hash = hash('sha256', $validated['token']);
        $environment_sql = empty($validated['apns_environment'])
            ? 'NULL'
            : "'" . mysqli_real_escape_string($sqlConnect, $validated['apns_environment']) . "'";
        $now = time();
        $debug_context = array(
            'user_id' => $user_id,
            'platform' => $validated['platform'],
            'provider' => $validated['provider'],
            'installation_suffix' => substr($validated['installation_id'], -8),
            'token_suffix' => substr($validated['token'], -8),
            'apns_environment' => !empty($validated['apns_environment'])
                ? $validated['apns_environment']
                : ''
        );
        VNSEEA_PushDeliveryDebugLog('push_device_register_attempt', $debug_context);

        mysqli_begin_transaction($sqlConnect);
        try {
            $installation_result = mysqli_query(
                $sqlConnect,
                "SELECT `id`, `device_secret_hash` FROM " . T_PUSH_INSTALLATIONS .
                " WHERE `installation_id` = '{$installation_key}' FOR UPDATE"
            );
            if ($installation_result === false) {
                throw new Exception('installation_lookup_failed');
            }
            $installation = mysqli_fetch_assoc($installation_result);
            if (!empty($installation) && !hash_equals((string)$installation['device_secret_hash'], $secret_hash)) {
                mysqli_rollback($sqlConnect);
                VNSEEA_PushDeliveryDebugLog(
                    'push_device_register_error',
                    array_merge($debug_context, array('error' => 'installation_secret_mismatch'))
                );
                return array('ok' => false, 'error_code' => 'installation_secret_mismatch');
            }

            if (empty($installation)) {
                $inserted = mysqli_query(
                    $sqlConnect,
                    "INSERT INTO " . T_PUSH_INSTALLATIONS .
                    " (`user_id`,`installation_id`,`device_secret_hash`,`platform`,`active`,`created_at`,`updated_at`,`released_at`)" .
                    " VALUES ({$user_id},'{$installation_key}','{$secret_hash}','{$platform}',1,{$now},{$now},NULL)"
                );
                if (!$inserted) {
                    throw new Exception('installation_insert_failed');
                }
                $installation_row_id = (int)mysqli_insert_id($sqlConnect);
            } else {
                $installation_row_id = (int)$installation['id'];
                $updated = mysqli_query(
                    $sqlConnect,
                    "UPDATE " . T_PUSH_INSTALLATIONS .
                    " SET `user_id`={$user_id},`platform`='{$platform}',`active`=1,`updated_at`={$now},`released_at`=NULL" .
                    " WHERE `id`={$installation_row_id}"
                );
                if (!$updated) {
                    throw new Exception('installation_update_failed');
                }
            }

            $token_result = mysqli_query(
                $sqlConnect,
                "SELECT `id`, `installation_id` FROM " . T_PUSH_TOKENS .
                " WHERE `provider`='{$provider}' AND `token_hash`='{$token_hash}' FOR UPDATE"
            );
            if ($token_result === false) {
                throw new Exception('token_lookup_failed');
            }
            $token_row = mysqli_fetch_assoc($token_result);

            $removed_old_provider = mysqli_query(
                $sqlConnect,
                "DELETE FROM " . T_PUSH_TOKENS .
                " WHERE `installation_id`={$installation_row_id} AND `provider`='{$provider}'" .
                (!empty($token_row) ? " AND `id`<>" . (int)$token_row['id'] : '')
            );
            if (!$removed_old_provider) {
                throw new Exception('token_replace_failed');
            }

            if (!empty($token_row)) {
                $token_row_id = (int)$token_row['id'];
                $token_updated = mysqli_query(
                    $sqlConnect,
                    "UPDATE " . T_PUSH_TOKENS .
                    " SET `installation_id`={$installation_row_id},`token`='{$token}',`apns_environment`={$environment_sql}," .
                    "`active`=1,`updated_at`={$now},`deactivated_at`=NULL WHERE `id`={$token_row_id}"
                );
                if (!$token_updated) {
                    throw new Exception('token_update_failed');
                }
            } else {
                $token_inserted = mysqli_query(
                    $sqlConnect,
                    "INSERT INTO " . T_PUSH_TOKENS .
                    " (`installation_id`,`provider`,`token`,`token_hash`,`apns_environment`,`active`,`created_at`,`updated_at`,`deactivated_at`)" .
                    " VALUES ({$installation_row_id},'{$provider}','{$token}','{$token_hash}',{$environment_sql},1,{$now},{$now},NULL)"
                );
                if (!$token_inserted) {
                    throw new Exception('token_insert_failed');
                }
                $token_row_id = (int)mysqli_insert_id($sqlConnect);
            }

            if ($provider === 'onesignal') {
                $legacy_token_cleared = mysqli_query(
                    $sqlConnect,
                    "UPDATE " . T_USERS . " SET" .
                    " `android_n_device_id`=IF(`android_n_device_id`='{$token}','',`android_n_device_id`)," .
                    " `android_m_device_id`=IF(`android_m_device_id`='{$token}','',`android_m_device_id`)," .
                    " `ios_n_device_id`=IF(`ios_n_device_id`='{$token}','',`ios_n_device_id`)," .
                    " `ios_m_device_id`=IF(`ios_m_device_id`='{$token}','',`ios_m_device_id`)" .
                    " WHERE `android_n_device_id`='{$token}' OR `android_m_device_id`='{$token}'" .
                    " OR `ios_n_device_id`='{$token}' OR `ios_m_device_id`='{$token}'"
                );
            } else {
                $legacy_token_cleared = mysqli_query(
                    $sqlConnect,
                    "UPDATE " . T_USERS . " SET `ios_voip_token`=''" .
                    " WHERE `ios_voip_token`='{$token}'"
                );
            }
            if (!$legacy_token_cleared) {
                throw new Exception('legacy_token_ownership_clear_failed');
            }
            $stale_deliveries_cancelled = mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_DELIVERIES .
                " SET `status`='cancelled',`lease_until`=NULL,`updated_at`={$now}," .
                "`last_error`='token_ownership_transferred'" .
                " WHERE `provider`='{$provider}' AND `token_hash`='{$token_hash}'" .
                " AND `recipient_user_id`<>{$user_id}" .
                " AND `status` IN ('pending','retry','processing')"
            );
            if (!$stale_deliveries_cancelled) {
                throw new Exception('legacy_delivery_cancel_failed');
            }

            mysqli_commit($sqlConnect);
            VNSEEA_PushDeliveryDebugLog(
                'push_device_register_success',
                array_merge($debug_context, array(
                    'installation_row_id' => $installation_row_id,
                    'token_row_id' => $token_row_id
                ))
            );
            return array(
                'ok' => true,
                'installation_row_id' => $installation_row_id,
                'token_row_id' => $token_row_id
            );
        } catch (Exception $exception) {
            mysqli_rollback($sqlConnect);
            error_log('[vnseea_push] register_failed code=' . $exception->getMessage());
            VNSEEA_PushDeliveryDebugLog(
                'push_device_register_error',
                array_merge($debug_context, array('error' => $exception->getMessage()))
            );
            return array('ok' => false, 'error_code' => 'push_device_register_failed');
        }
    }
}

if (!function_exists('VNSEEA_ReleasePushInstallation')) {
    function VNSEEA_ReleasePushInstallation($installation_id, $device_secret)
    {
        global $sqlConnect;

        $validated = VNSEEA_ValidatePushInstallationInput(array(
            'installation_id' => $installation_id,
            'device_secret' => $device_secret
        ), false);
        if (empty($validated['ok'])) {
            VNSEEA_PushDeliveryDebugLog('push_device_release_error', array(
                'installation_suffix' => substr((string)$installation_id, -8),
                'error' => $validated['error_code']
            ));
            return array('ok' => false, 'error_code' => $validated['error_code']);
        }

        $installation_key = mysqli_real_escape_string($sqlConnect, $validated['installation_id']);
        $provided_hash = VNSEEA_PushDeviceSecretHash($validated['device_secret']);
        $now = time();
        $debug_context = array(
            'installation_suffix' => substr($validated['installation_id'], -8)
        );
        VNSEEA_PushDeliveryDebugLog('push_device_release_attempt', $debug_context);

        mysqli_begin_transaction($sqlConnect);
        try {
            $result = mysqli_query(
                $sqlConnect,
                "SELECT `id`, `device_secret_hash`, `active` FROM " . T_PUSH_INSTALLATIONS .
                " WHERE `installation_id`='{$installation_key}' FOR UPDATE"
            );
            if ($result === false) {
                throw new Exception('installation_lookup_failed');
            }
            $installation = mysqli_fetch_assoc($result);
            if (empty($installation)) {
                mysqli_commit($sqlConnect);
                VNSEEA_PushDeliveryDebugLog(
                    'push_device_release_success',
                    array_merge($debug_context, array('idempotent_replay' => 1))
                );
                return array('ok' => true, 'idempotent_replay' => true);
            }
            if (!hash_equals((string)$installation['device_secret_hash'], $provided_hash)) {
                mysqli_rollback($sqlConnect);
                VNSEEA_PushDeliveryDebugLog(
                    'push_device_release_error',
                    array_merge($debug_context, array('error' => 'installation_secret_mismatch'))
                );
                return array('ok' => false, 'error_code' => 'installation_secret_mismatch');
            }

            $row_id = (int)$installation['id'];
            if (!mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_INSTALLATIONS .
                " SET `active`=0,`updated_at`={$now},`released_at`={$now} WHERE `id`={$row_id}"
            )) {
                throw new Exception('installation_release_failed');
            }
            if (!mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_TOKENS .
                " SET `active`=0,`updated_at`={$now},`deactivated_at`={$now}" .
                " WHERE `installation_id`={$row_id}"
            )) {
                throw new Exception('token_release_failed');
            }
            mysqli_commit($sqlConnect);
            VNSEEA_PushDeliveryDebugLog(
                'push_device_release_success',
                array_merge($debug_context, array(
                    'installation_row_id' => $row_id,
                    'idempotent_replay' => empty($installation['active']) ? 1 : 0
                ))
            );
            return array('ok' => true, 'idempotent_replay' => empty($installation['active']));
        } catch (Exception $exception) {
            mysqli_rollback($sqlConnect);
            error_log('[vnseea_push] release_failed code=' . $exception->getMessage());
            VNSEEA_PushDeliveryDebugLog(
                'push_device_release_error',
                array_merge($debug_context, array('error' => $exception->getMessage()))
            );
            return array('ok' => false, 'error_code' => 'push_device_release_failed');
        }
    }
}

if (!function_exists('VNSEEA_DeactivateUserPushInstallations')) {
    function VNSEEA_DeactivateUserPushInstallations($user_id)
    {
        global $sqlConnect;

        $user_id = (int)$user_id;
        if ($user_id < 1) {
            return false;
        }
        $now = time();
        $installations = mysqli_query(
            $sqlConnect,
            "SELECT `id` FROM " . T_PUSH_INSTALLATIONS . " WHERE `user_id`={$user_id}"
        );
        if ($installations === false) {
            return false;
        }
        $ids = array();
        while ($row = mysqli_fetch_assoc($installations)) {
            $ids[] = (int)$row['id'];
        }
        if (!empty($ids)) {
            $id_list = implode(',', $ids);
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_TOKENS .
                " SET `active`=0,`updated_at`={$now},`deactivated_at`={$now} WHERE `installation_id` IN ({$id_list})"
            );
        }
        return (bool)mysqli_query(
            $sqlConnect,
            "UPDATE " . T_PUSH_INSTALLATIONS .
            " SET `active`=0,`updated_at`={$now},`released_at`={$now} WHERE `user_id`={$user_id}"
        );
    }
}

if (!function_exists('VNSEEA_DeactivatePushProvider')) {
    function VNSEEA_DeactivatePushProvider($user_id, $input)
    {
        global $sqlConnect;

        $user_id = (int)$user_id;
        $provider = isset($input['provider']) ? (string)$input['provider'] : '';
        $validated = VNSEEA_ValidatePushInstallationInput(array(
            'installation_id' => isset($input['installation_id']) ? $input['installation_id'] : '',
            'device_secret' => isset($input['device_secret']) ? $input['device_secret'] : ''
        ), false);
        if ($user_id < 1 || empty($validated['ok']) || !in_array($provider, array('onesignal', 'apns_voip'), true)) {
            return array('ok' => false, 'error_code' => 'invalid_push_provider_release');
        }

        $installation_key = mysqli_real_escape_string($sqlConnect, $validated['installation_id']);
        $provider_sql = mysqli_real_escape_string($sqlConnect, $provider);
        $secret_hash = VNSEEA_PushDeviceSecretHash($validated['device_secret']);
        $result = mysqli_query(
            $sqlConnect,
            "SELECT `id`, `user_id`, `device_secret_hash` FROM " . T_PUSH_INSTALLATIONS .
            " WHERE `installation_id`='{$installation_key}' LIMIT 1"
        );
        $installation = $result ? mysqli_fetch_assoc($result) : null;
        if (empty($installation)) {
            return array('ok' => true, 'idempotent_replay' => true);
        }
        if ((int)$installation['user_id'] !== $user_id ||
            !hash_equals((string)$installation['device_secret_hash'], $secret_hash)) {
            return array('ok' => false, 'error_code' => 'installation_secret_mismatch');
        }
        $now = time();
        $updated = mysqli_query(
            $sqlConnect,
            "UPDATE " . T_PUSH_TOKENS .
            " SET `active`=0,`updated_at`={$now},`deactivated_at`={$now}" .
            " WHERE `installation_id`=" . (int)$installation['id'] . " AND `provider`='{$provider_sql}'"
        );
        return $updated
            ? array('ok' => true)
            : array('ok' => false, 'error_code' => 'push_provider_release_failed');
    }
}

if (!function_exists('VNSEEA_ShouldUseLegacyPushFallback')) {
    function VNSEEA_ShouldUseLegacyPushFallback($has_provider_registration, $active_target_count)
    {
        return empty($has_provider_registration) && (int)$active_target_count === 0;
    }
}

if (!function_exists('VNSEEA_GetUserPushTargets')) {
    function VNSEEA_GetUserPushTargets($user_id, $provider = 'onesignal')
    {
        global $sqlConnect;

        $user_id = (int)$user_id;
        if ($user_id < 1 || !in_array($provider, array('onesignal', 'apns_voip'), true)) {
            return array();
        }

        $provider_sql = mysqli_real_escape_string($sqlConnect, $provider);
        $targets = array();
        $has_provider_registration = false;
        $provider_registration_query = @mysqli_query(
            $sqlConnect,
            "SELECT COUNT(*) AS `total` FROM " . T_PUSH_TOKENS . " AS token_row" .
            " INNER JOIN " . T_PUSH_INSTALLATIONS . " AS installation" .
            " ON installation.`id`=token_row.`installation_id`" .
            " WHERE installation.`user_id`={$user_id}" .
            " AND token_row.`provider`='{$provider_sql}'"
        );
        if ($provider_registration_query) {
            $provider_registration_count = mysqli_fetch_assoc($provider_registration_query);
            $has_provider_registration = !empty($provider_registration_count['total']);
        }
        $token_query = @mysqli_query(
            $sqlConnect,
            "SELECT token_row.`id` AS `push_token_id`, token_row.`token`, token_row.`token_hash`," .
            " token_row.`apns_environment`, installation.`id` AS `installation_row_id`, installation.`platform`" .
            " FROM " . T_PUSH_TOKENS . " AS token_row" .
            " INNER JOIN " . T_PUSH_INSTALLATIONS . " AS installation ON installation.`id`=token_row.`installation_id`" .
            " WHERE installation.`user_id`={$user_id} AND installation.`active`=1" .
            " AND token_row.`active`=1 AND token_row.`provider`='{$provider_sql}'"
        );
        if ($token_query) {
            while ($token = mysqli_fetch_assoc($token_query)) {
                $targets[] = array(
                    'installation_id' => (int)$token['installation_row_id'],
                    'push_token_id' => (int)$token['push_token_id'],
                    'provider' => $provider,
                    'token' => (string)$token['token'],
                    'token_hash' => (string)$token['token_hash'],
                    'platform' => (string)$token['platform'],
                    'apns_environment' => !empty($token['apns_environment']) ? (string)$token['apns_environment'] : null,
                    'legacy' => false
                );
            }
        }

        // Provider state is scoped independently. A VoIP registration must not
        // suppress the legacy OneSignal token while OneSignal is still syncing.
        if (!VNSEEA_ShouldUseLegacyPushFallback($has_provider_registration, count($targets))) {
            return $targets;
        }

        $legacy_query = mysqli_query(
            $sqlConnect,
            "SELECT `android_n_device_id`,`ios_n_device_id`,`android_m_device_id`,`ios_m_device_id`,`ios_voip_token`" .
            " FROM " . T_USERS . " WHERE `user_id`={$user_id} LIMIT 1"
        );
        $legacy = $legacy_query ? mysqli_fetch_assoc($legacy_query) : array();
        $seen = array();
        if ($provider === 'onesignal') {
            foreach (array(
                array('field' => 'android_n_device_id', 'platform' => 'android'),
                array('field' => 'android_m_device_id', 'platform' => 'android'),
                array('field' => 'ios_n_device_id', 'platform' => 'ios'),
                array('field' => 'ios_m_device_id', 'platform' => 'ios')
            ) as $legacy_field) {
                $token = !empty($legacy[$legacy_field['field']]) ? trim((string)$legacy[$legacy_field['field']]) : '';
                $token_hash = hash('sha256', $token);
                if ($token === '' || isset($seen[$token_hash])) {
                    continue;
                }
                $seen[$token_hash] = true;
                $targets[] = array(
                    'installation_id' => null,
                    'push_token_id' => null,
                    'provider' => 'onesignal',
                    'token' => $token,
                    'token_hash' => $token_hash,
                    'platform' => $legacy_field['platform'],
                    'apns_environment' => null,
                    'legacy' => true
                );
            }
        } elseif (!empty($legacy['ios_voip_token'])) {
            $environment = function_exists('Wo_ApiVoipApnsEnvironment')
                ? Wo_ApiVoipApnsEnvironment()
                : (!empty(getenv('APNS_VOIP_ENVIRONMENT')) ? getenv('APNS_VOIP_ENVIRONMENT') : 'production');
            $targets[] = array(
                'installation_id' => null,
                'push_token_id' => null,
                'provider' => 'apns_voip',
                'token' => (string)$legacy['ios_voip_token'],
                'token_hash' => hash('sha256', (string)$legacy['ios_voip_token']),
                'platform' => 'ios',
                'apns_environment' => $environment === 'sandbox' ? 'sandbox' : 'production',
                'legacy' => true
            );
        }
        return $targets;
    }
}

if (!function_exists('VNSEEA_IsConversationMuted')) {
    function VNSEEA_IsConversationMuted($recipient_id, $conversation_type, $conversation_id)
    {
        global $sqlConnect;

        $recipient_id = (int)$recipient_id;
        $conversation_id = (int)$conversation_id;
        if ($recipient_id < 1 || $conversation_id < 1 || !in_array($conversation_type, array('user', 'page', 'group'), true)) {
            return false;
        }
        $mute_scope = array(
            'user_id' => $recipient_id,
            'chat_id' => $conversation_id
        );
        $type_sql = mysqli_real_escape_string($sqlConnect, $conversation_type);
        $query = mysqli_query(
            $sqlConnect,
            "SELECT `notify` FROM " . T_MUTE .
            " WHERE `user_id`=" . $mute_scope['user_id'] .
            " AND `type`='{$type_sql}' AND `chat_id`=" . $mute_scope['chat_id'] .
            " AND IFNULL(`message_id`,0)=0 LIMIT 1"
        );
        $mute = $query ? mysqli_fetch_assoc($query) : null;
        return !empty($mute) && isset($mute['notify']) && $mute['notify'] === 'no';
    }
}

if (!function_exists('VNSEEA_NormalizeMessagePushText')) {
    function VNSEEA_NormalizeMessagePushText($text)
    {
        $text = html_entity_decode((string)$text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace_callback('/\[a\](.*?)\[\/a\]/i', function ($matches) {
            return urldecode($matches[1]);
        }, $text);
        $text = preg_replace('/@\[(\d+)\]/', '@user', $text);
        $text = preg_replace('/#\[(\d+)\]/', '#', $text);
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($text)));
        if (function_exists('mb_substr')) {
            return mb_substr($text, 0, 140, 'UTF-8');
        }
        return substr($text, 0, 140);
    }
}

if (!function_exists('VNSEEA_MessagePushDescriptor')) {
    function VNSEEA_MessagePushDescriptor($message, $language = 'vi')
    {
        $is_vi = strpos(strtolower((string)$language), 'vi') === 0 ||
            strtolower((string)$language) === 'vietnamese';
        $type_two = !empty($message['type_two']) ? strtolower((string)$message['type_two']) : '';
        $media = !empty($message['media']) ? (string)$message['media'] : '';
        $sticker = !empty($message['stickers']) ? (string)$message['stickers'] : '';
        $text = VNSEEA_NormalizeMessagePushText(isset($message['text']) ? $message['text'] : '');
        $extension = strtolower(pathinfo(parse_url($media, PHP_URL_PATH), PATHINFO_EXTENSION));
        $sticker_extension = strtolower(pathinfo(parse_url($sticker, PHP_URL_PATH), PATHINFO_EXTENSION));

        if ($type_two === 'message_pin_event') {
            return array('type' => 'pin', 'text' => $is_vi ? 'Đã ghim một tin nhắn' : 'Pinned a message');
        }
        if ($type_two === 'story_reply' || !empty($message['story_id'])) {
            return array('type' => 'story', 'text' => $is_vi ? 'Đã trả lời tin của bạn' : 'Replied to your story');
        }
        if ($type_two === 'market_order_request' || !empty($message['market_order_hash'])) {
            return array('type' => 'order', 'text' => $is_vi ? 'Yêu cầu mua mới' : 'New order request');
        }
        if ($type_two === 'product_inquiry' || !empty($message['product_id'])) {
            return array('type' => 'product', 'text' => $is_vi ? 'Hỏi về một sản phẩm' : 'Asked about a product');
        }
        if (!empty($message['lat']) && !empty($message['lng'])) {
            return array('type' => 'location', 'text' => $is_vi ? 'Đã chia sẻ một vị trí' : 'Shared a location');
        }
        if (strpos($type_two, 'call') !== false) {
            return array('type' => 'call_event', 'text' => $is_vi ? 'Hoạt động cuộc gọi' : 'Call activity');
        }
        if ($sticker_extension === 'gif') {
            return array('type' => 'gif', 'text' => $is_vi ? 'Đã gửi một ảnh GIF' : 'Sent a GIF');
        }
        if ($sticker !== '' || $type_two === 'sticker') {
            return array('type' => 'sticker', 'text' => $is_vi ? 'Đã gửi một nhãn dán' : 'Sent a sticker');
        }
        if ($type_two === 'audio' || in_array($extension, array('m4a', 'aac', 'mp3', 'wav', 'ogg'), true)) {
            return array('type' => 'audio', 'text' => $is_vi ? 'Đã gửi một tin nhắn thoại' : 'Sent a voice message');
        }
        if (in_array($extension, array('jpg', 'jpeg', 'png', 'webp', 'heic'), true)) {
            return array('type' => 'image', 'text' => $is_vi ? 'Đã gửi một ảnh' : 'Sent a photo');
        }
        if ($extension === 'gif') {
            return array('type' => 'gif', 'text' => $is_vi ? 'Đã gửi một ảnh GIF' : 'Sent a GIF');
        }
        if (in_array($extension, array('mp4', 'mov', 'm4v', 'webm'), true)) {
            return array('type' => 'video', 'text' => $is_vi ? 'Đã gửi một video' : 'Sent a video');
        }
        if ($media !== '') {
            return array('type' => 'file', 'text' => $is_vi ? 'Đã gửi một tệp' : 'Sent a file');
        }
        if (preg_match('~(?:vnseea://post/|https?://[^\s]+/post/)\d+~i', $text)) {
            return array('type' => 'shared_post', 'text' => $is_vi ? 'Đã chia sẻ một bài viết' : 'Shared a post');
        }
        if (preg_match('~https?://|www\.~i', $text)) {
            return array('type' => 'link', 'text' => $is_vi ? 'Đã gửi một liên kết' : 'Sent a link');
        }
        return array(
            'type' => 'text',
            'text' => $text !== '' ? $text : ($is_vi ? 'Tin nhắn mới' : 'New message')
        );
    }
}

if (!function_exists('VNSEEA_MessageConversationContext')) {
    function VNSEEA_MessageConversationContext($message, $recipient_id)
    {
        global $sqlConnect;

        $recipient_id = (int)$recipient_id;
        if (!empty($message['group_id'])) {
            return array('type' => 'group', 'id' => (int)$message['group_id']);
        }
        $type = !empty($message['page_id']) ? 'page' : 'user';
        $sender_id = (int)$message['from_id'];
        $page_filter = $type === 'page'
            ? " AND `page_id`=" . (int)$message['page_id']
            : " AND IFNULL(`page_id`,0)=0";
        $chat_query = mysqli_query(
            $sqlConnect,
            "SELECT `id` FROM " . T_U_CHATS .
            " WHERE `user_id`={$recipient_id} AND `conversation_user_id`={$sender_id}{$page_filter}" .
            " ORDER BY `id` DESC LIMIT 1"
        );
        $chat = $chat_query ? mysqli_fetch_assoc($chat_query) : null;
        return array('type' => $type, 'id' => !empty($chat['id']) ? (int)$chat['id'] : 0);
    }
}

if (!function_exists('VNSEEA_MessagePushRecipients')) {
    function VNSEEA_MessagePushRecipients($message)
    {
        global $sqlConnect;

        $sender_id = (int)$message['from_id'];
        if (empty($message['group_id'])) {
            $recipient_id = (int)$message['to_id'];
            return $recipient_id > 0 && $recipient_id !== $sender_id ? array($recipient_id) : array();
        }

        $group_id = (int)$message['group_id'];
        $recipient_ids = array();
        $owner_query = mysqli_query(
            $sqlConnect,
            "SELECT `user_id` FROM " . T_GROUP_CHAT . " WHERE `group_id`={$group_id} LIMIT 1"
        );
        $owner = $owner_query ? mysqli_fetch_assoc($owner_query) : null;
        if (!empty($owner['user_id']) && (int)$owner['user_id'] !== $sender_id) {
            $recipient_ids[(int)$owner['user_id']] = true;
        }
        $members_query = mysqli_query(
            $sqlConnect,
            "SELECT `user_id` FROM " . T_GROUP_CHAT_USERS .
            " WHERE `group_id`={$group_id} AND `active`=1"
        );
        if ($members_query) {
            while ($member = mysqli_fetch_assoc($members_query)) {
                $member_id = (int)$member['user_id'];
                if ($member_id > 0 && $member_id !== $sender_id) {
                    $recipient_ids[$member_id] = true;
                }
            }
        }
        return array_keys($recipient_ids);
    }
}

if (!function_exists('VNSEEA_QueuePushDelivery')) {
    function VNSEEA_QueuePushDelivery($recipient_id, $target, $delivery_kind, $source_type, $source_id, $payload, $batch_uuid)
    {
        global $sqlConnect;

        $recipient_id = (int)$recipient_id;
        $source_id = (int)$source_id;
        if ($recipient_id < 1 || empty($target['token']) || empty($target['provider'])) {
            return false;
        }
        $token_hash = !empty($target['token_hash'])
            ? (string)$target['token_hash']
            : hash('sha256', (string)$target['token']);
        $dedupe_key = hash('sha256', $source_type . ':' . $source_id . ':' . $delivery_kind . ':' . $recipient_id . ':' . $target['provider'] . ':' . $token_hash);
        $idempotency_key = VNSEEA_PushUuidV4();
        $now = time();
        $expires_at = $now + 86400;
        $payload_json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $dedupe_sql = mysqli_real_escape_string($sqlConnect, $dedupe_key);
        $batch_sql = mysqli_real_escape_string($sqlConnect, $batch_uuid);
        $idempotency_sql = mysqli_real_escape_string($sqlConnect, $idempotency_key);
        $platform = !empty($target['platform']) && $target['platform'] === 'ios' ? 'ios' : 'android';
        $platform_sql = mysqli_real_escape_string($sqlConnect, $platform);
        $provider_sql = mysqli_real_escape_string($sqlConnect, $target['provider']);
        $token_sql = mysqli_real_escape_string($sqlConnect, $target['token']);
        $token_hash_sql = mysqli_real_escape_string($sqlConnect, $token_hash);
        $kind_sql = mysqli_real_escape_string($sqlConnect, $delivery_kind);
        $source_type_sql = mysqli_real_escape_string($sqlConnect, $source_type);
        $payload_sql = mysqli_real_escape_string($sqlConnect, $payload_json);
        $environment_sql = empty($target['apns_environment'])
            ? 'NULL'
            : "'" . mysqli_real_escape_string($sqlConnect, $target['apns_environment']) . "'";
        $installation_sql = empty($target['installation_id']) ? 'NULL' : (int)$target['installation_id'];
        $push_token_sql = empty($target['push_token_id']) ? 'NULL' : (int)$target['push_token_id'];

        $query = mysqli_query(
            $sqlConnect,
            "INSERT IGNORE INTO " . T_PUSH_DELIVERIES .
            " (`dedupe_key`,`batch_uuid`,`idempotency_key`,`recipient_user_id`,`installation_id`,`push_token_id`,`platform`,`provider`,`token`,`token_hash`," .
            "`apns_environment`,`delivery_kind`,`source_type`,`source_id`,`payload`,`status`,`attempt_count`,`next_attempt_at`," .
            "`lease_until`,`expires_at`,`created_at`,`updated_at`)" .
            " VALUES ('{$dedupe_sql}','{$batch_sql}','{$idempotency_sql}',{$recipient_id},{$installation_sql},{$push_token_sql},'{$platform_sql}','{$provider_sql}'," .
            "'{$token_sql}','{$token_hash_sql}',{$environment_sql},'{$kind_sql}','{$source_type_sql}',{$source_id},'{$payload_sql}'," .
            "'pending',0,{$now},NULL,{$expires_at},{$now},{$now})"
        );
        return $query !== false;
    }
}

if (!function_exists('VNSEEA_SchedulePushDeliveryDispatch')) {
    function VNSEEA_SchedulePushDeliveryDispatch()
    {
        static $scheduled = false;
        if ($scheduled) {
            return;
        }
        $scheduled = true;
        register_shutdown_function(function () {
            VNSEEA_ProcessPushDeliveryQueue(50);
        });
    }
}

if (!function_exists('VNSEEA_EnqueueMessagePush')) {
    function VNSEEA_EnqueueMessagePush($message_id)
    {
        global $sqlConnect;

        $message_id = (int)$message_id;
        if ($message_id < 1) {
            return false;
        }
        $message_query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_MESSAGES . " WHERE `id`={$message_id} LIMIT 1"
        );
        $message = $message_query ? mysqli_fetch_assoc($message_query) : null;
        if (empty($message)) {
            return false;
        }

        $sender = Wo_UserData((int)$message['from_id']);
        $recipients = VNSEEA_MessagePushRecipients($message);
        $batch_uuid = VNSEEA_PushUuidV4();
        $queued = false;
        foreach ($recipients as $recipient_id) {
            $conversation = VNSEEA_MessageConversationContext($message, $recipient_id);
            if (VNSEEA_IsConversationMuted($recipient_id, $conversation['type'], $conversation['id'])) {
                continue;
            }
            $recipient = Wo_UserData($recipient_id);
            $descriptor = VNSEEA_MessagePushDescriptor(
                $message,
                !empty($recipient['language']) ? $recipient['language'] : 'vi'
            );
            $payload = array(
                'push_kind' => 'message',
                'payload_kind' => 'message',
                'notification_type' => 'message',
                'type' => $conversation['type'],
                'message_id' => (string)$message_id,
                'message_type' => $descriptor['type'],
                'sender_id' => (string)$message['from_id'],
                'sender_name' => !empty($sender['name']) ? $sender['name'] : '',
                'sender_avatar' => !empty($sender['avatar']) ? $sender['avatar'] : '',
                'recipient_id' => (string)$recipient_id,
                'conversation_type' => $conversation['type'],
                'conversation_id' => (string)$conversation['id'],
                'user_id' => $conversation['type'] === 'user'
                    ? (string)$message['from_id']
                    : '',
                'page_id' => $conversation['type'] === 'page'
                    ? (string)$message['page_id']
                    : '',
                'group_id' => $conversation['type'] === 'group'
                    ? (string)$message['group_id']
                    : '',
                'title' => !empty($sender['name']) ? $sender['name'] : 'VNSEEA',
                'body' => $descriptor['text']
            );
            $targets = VNSEEA_GetUserPushTargets($recipient_id, 'onesignal');
            if (empty($targets)) {
                VNSEEA_PushDeliveryDebugLog('push_targets_missing', array(
                    'recipient_user_id' => (int)$recipient_id,
                    'provider' => 'onesignal',
                    'delivery_kind' => 'message',
                    'source_type' => 'message',
                    'source_id' => $message_id
                ));
            }
            foreach ($targets as $target) {
                $queued = VNSEEA_QueuePushDelivery(
                    $recipient_id,
                    $target,
                    'message',
                    'message',
                    $message_id,
                    $payload,
                    $batch_uuid
                ) || $queued;
            }
        }
        if ($queued) {
            VNSEEA_SchedulePushDeliveryDispatch();
        }
        return $queued;
    }
}

if (!function_exists('VNSEEA_NotificationPushText')) {
    function VNSEEA_NotificationPushText($notification, $language)
    {
        $is_vi = strpos(strtolower((string)$language), 'vi') === 0 ||
            strtolower((string)$language) === 'vietnamese';
        $text = VNSEEA_NormalizeMessagePushText(isset($notification['text']) ? $notification['text'] : '');
        if ($text !== '') {
            return $text;
        }
        $type = !empty($notification['type']) ? $notification['type'] : '';
        $vi = array(
            'following' => 'Đã theo dõi bạn',
            'friends_request' => 'Đã gửi cho bạn một lời mời kết bạn',
            'accepted_request' => 'Đã chấp nhận lời mời kết bạn',
            'reaction' => 'Đã bày tỏ cảm xúc với nội dung của bạn',
            'liked_post' => 'Đã thích bài viết của bạn',
            'comment' => 'Đã bình luận về bài viết của bạn',
            'comment_reply' => 'Đã trả lời bình luận của bạn',
            'share_post' => 'Đã chia sẻ bài viết của bạn'
        );
        $en = array(
            'following' => 'Started following you',
            'friends_request' => 'Sent you a friend request',
            'accepted_request' => 'Accepted your friend request',
            'reaction' => 'Reacted to your content',
            'liked_post' => 'Liked your post',
            'comment' => 'Commented on your post',
            'comment_reply' => 'Replied to your comment',
            'share_post' => 'Shared your post'
        );
        $copy = $is_vi ? $vi : $en;
        return isset($copy[$type]) ? $copy[$type] : ($is_vi ? 'Bạn có thông báo mới' : 'You have a new notification');
    }
}

if (!function_exists('VNSEEA_EnqueueNotificationPush')) {
    function VNSEEA_EnqueueNotificationPush($notification_id)
    {
        global $sqlConnect;

        $notification_id = (int)$notification_id;
        if ($notification_id < 1) {
            return false;
        }
        $query = mysqli_query(
            $sqlConnect,
            "SELECT * FROM " . T_NOTIFICATION . " WHERE `id`={$notification_id} LIMIT 1"
        );
        $notification = $query ? mysqli_fetch_assoc($query) : null;
        if (empty($notification) || !empty($notification['seen'])) {
            return false;
        }
        $recipient_id = (int)$notification['recipient_id'];
        $recipient = Wo_UserData($recipient_id);
        $notifier = Wo_UserData((int)$notification['notifier_id']);
        $payload = array(
            'type' => !empty($notification['type']) ? $notification['type'] : 'notification',
            'notification_id' => (string)$notification_id,
            'recipient_id' => (string)$recipient_id,
            'notifier_id' => (string)$notification['notifier_id'],
            'post_id' => !empty($notification['post_id']) ? (string)$notification['post_id'] : '',
            'comment_id' => !empty($notification['comment_id']) ? (string)$notification['comment_id'] : '',
            'reply_id' => !empty($notification['reply_id']) ? (string)$notification['reply_id'] : '',
            'story_id' => !empty($notification['story_id']) ? (string)$notification['story_id'] : '',
            'title' => !empty($notifier['name']) ? $notifier['name'] : 'VNSEEA',
            'body' => VNSEEA_NotificationPushText(
                $notification,
                !empty($recipient['language']) ? $recipient['language'] : 'vi'
            )
        );
        $batch_uuid = VNSEEA_PushUuidV4();
        $queued = false;
        $targets = VNSEEA_GetUserPushTargets($recipient_id, 'onesignal');
        if (empty($targets)) {
            VNSEEA_PushDeliveryDebugLog('push_targets_missing', array(
                'recipient_user_id' => $recipient_id,
                'provider' => 'onesignal',
                'delivery_kind' => 'social',
                'source_type' => 'notification',
                'source_id' => $notification_id
            ));
        }
        foreach ($targets as $target) {
            $queued = VNSEEA_QueuePushDelivery(
                $recipient_id,
                $target,
                'social',
                'notification',
                $notification_id,
                $payload,
                $batch_uuid
            ) || $queued;
        }
        if ($queued) {
            VNSEEA_SchedulePushDeliveryDispatch();
        }
        return $queued;
    }
}

if (!function_exists('VNSEEA_OneSignalConfigForPlatform')) {
    function VNSEEA_OneSignalConfigForPlatform($platform)
    {
        global $wo;

        if ($platform === 'ios') {
            return array(
                'app_id' => !empty($wo['config']['ios_n_push_id'])
                    ? $wo['config']['ios_n_push_id']
                    : (!empty($wo['config']['ios_m_push_id']) ? $wo['config']['ios_m_push_id'] : ''),
                'api_key' => !empty($wo['config']['ios_n_push_key'])
                    ? $wo['config']['ios_n_push_key']
                    : (!empty($wo['config']['ios_m_push_key']) ? $wo['config']['ios_m_push_key'] : '')
            );
        }
        return array(
            'app_id' => !empty($wo['config']['android_n_push_id'])
                ? $wo['config']['android_n_push_id']
                : (!empty($wo['config']['android_m_push_id']) ? $wo['config']['android_m_push_id'] : ''),
            'api_key' => !empty($wo['config']['android_n_push_key'])
                ? $wo['config']['android_n_push_key']
                : (!empty($wo['config']['android_m_push_key']) ? $wo['config']['android_m_push_key'] : '')
        );
    }
}

if (!function_exists('VNSEEA_OneSignalResponseHasRecipient')) {
    function VNSEEA_OneSignalResponseHasRecipient($http_status, $decoded)
    {
        if ((int)$http_status < 200 || (int)$http_status >= 300 ||
            !is_array($decoded) || empty($decoded['id'])) {
            return false;
        }
        return !array_key_exists('recipients', $decoded) || (int)$decoded['recipients'] > 0;
    }
}

if (!function_exists('VNSEEA_SendOneSignalDelivery')) {
    function VNSEEA_SendOneSignalDelivery($delivery, $payload)
    {
        $platform = !empty($delivery['platform']) ? $delivery['platform'] : 'android';
        $config = VNSEEA_OneSignalConfigForPlatform($platform);
        $debug_context = array(
            'delivery_id' => !empty($delivery['id']) ? (int)$delivery['id'] : 0,
            'recipient_user_id' => !empty($delivery['recipient_user_id'])
                ? (int)$delivery['recipient_user_id']
                : 0,
            'platform' => $platform,
            'delivery_kind' => !empty($delivery['delivery_kind'])
                ? (string)$delivery['delivery_kind']
                : '',
            'source_type' => !empty($delivery['source_type'])
                ? (string)$delivery['source_type']
                : '',
            'source_id' => !empty($delivery['source_id'])
                ? (int)$delivery['source_id']
                : 0,
            'token_suffix' => !empty($delivery['token'])
                ? substr((string)$delivery['token'], -8)
                : '',
            'app_id_suffix' => !empty($config['app_id'])
                ? substr((string)$config['app_id'], -8)
                : '',
            'app_id_present' => !empty($config['app_id']) ? 1 : 0,
            'api_key_present' => !empty($config['api_key']) ? 1 : 0
        );
        if (empty($config['app_id']) || empty($config['api_key'])) {
            VNSEEA_PushDeliveryDebugLog(
                'onesignal_delivery_response',
                array_merge($debug_context, array(
                    'accepted' => 0,
                    'http_status' => 0,
                    'error' => 'onesignal_not_configured'
                ))
            );
            return array('accepted' => false, 'terminal' => true, 'error' => 'onesignal_not_configured');
        }

        $request = array(
            'app_id' => $config['app_id'],
            'include_subscription_ids' => array((string)$delivery['token']),
            'idempotency_key' => !empty($delivery['idempotency_key'])
                ? (string)$delivery['idempotency_key']
                : VNSEEA_PushUuidV4(),
            'headings' => array(
                'en' => !empty($payload['title']) ? $payload['title'] : 'VNSEEA',
                'vi' => !empty($payload['title']) ? $payload['title'] : 'VNSEEA'
            ),
            'contents' => array(
                'en' => !empty($payload['body']) ? $payload['body'] : 'New notification',
                'vi' => !empty($payload['body']) ? $payload['body'] : 'Bạn có thông báo mới'
            ),
            'data' => $payload
        );
        if ($platform === 'android') {
            $request['existing_android_channel_id'] = 'vnseea_notifications_sound_v1';
            $request['android_sound'] = 'app_notification_sound';
        } else {
            $request['ios_sound'] = 'app_notification_sound.mp3';
        }

        VNSEEA_PushDeliveryDebugLog('onesignal_delivery_attempt', $debug_context);
        $ch = curl_init('https://api.onesignal.com/notifications');
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json; charset=utf-8',
            'Authorization: Key ' . $config['api_key']
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $http_status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode((string)$response, true);
        $recipient_count = is_array($decoded) && array_key_exists('recipients', $decoded)
            ? (int)$decoded['recipients']
            : null;
        $accepted = VNSEEA_OneSignalResponseHasRecipient($http_status, $decoded);
        VNSEEA_PushDeliveryDebugLog(
            'onesignal_delivery_response',
            array_merge($debug_context, array(
                'accepted' => $accepted ? 1 : 0,
                'http_status' => $http_status,
                'recipient_count' => $recipient_count,
                'curl_error' => $curl_error,
                'provider_id_suffix' => !empty($decoded['id'])
                    ? substr((string)$decoded['id'], -8)
                    : '',
                'response_preview' => substr((string)$response, 0, 500)
            ))
        );
        if ($accepted) {
            return array(
                'accepted' => true,
                'terminal' => false,
                'provider_id' => (string)$decoded['id'],
                'http_status' => $http_status
            );
        }
        $no_valid_subscriptions =
            $http_status >= 200 && $http_status < 300 &&
            (empty($decoded['id']) || ($recipient_count !== null && $recipient_count < 1));
        $error_text = trim($curl_error . ' ' . (is_string($response) ? $response : ''));
        $invalid_token = in_array($http_status, array(400, 404, 410), true) &&
            preg_match('/subscription|player|token|not a valid/i', $error_text);
        $transient = $curl_error !== '' || $http_status === 429 || $http_status >= 500 || $http_status === 0;
        return array(
            'accepted' => false,
            'terminal' => $no_valid_subscriptions || $invalid_token || !$transient,
            'invalid_token' => (bool)($invalid_token || $no_valid_subscriptions),
            'error' => $no_valid_subscriptions
                ? 'onesignal_no_valid_subscriptions'
                : ($error_text !== '' ? substr($error_text, 0, 255) : 'onesignal_rejected'),
            'http_status' => $http_status
        );
    }
}

if (!function_exists('VNSEEA_PushDeliverySourceIsActive')) {
    function VNSEEA_PushDeliverySourceIsActive($delivery)
    {
        global $sqlConnect;

        $source_id = (int)$delivery['source_id'];
        if ($delivery['source_type'] === 'message') {
            $payload = json_decode((string)$delivery['payload'], true);
            $payload = is_array($payload) ? $payload : array();
            $query = mysqli_query(
                $sqlConnect,
                "SELECT `id`,`to_id`,`seen`,`group_id`,`time` FROM " . T_MESSAGES . " WHERE `id`={$source_id} LIMIT 1"
            );
            $message = $query ? mysqli_fetch_assoc($query) : null;
            if (empty($message)) {
                return false;
            }
            $recipient_id = (int)$delivery['recipient_user_id'];
            $conversation_type = !empty($payload['conversation_type'])
                ? (string)$payload['conversation_type']
                : (!empty($message['group_id']) ? 'group' : 'user');
            $conversation_id = !empty($payload['conversation_id'])
                ? (int)$payload['conversation_id']
                : (!empty($message['group_id']) ? (int)$message['group_id'] : 0);
            if (!empty($message['group_id'])) {
                $group_id = (int)$message['group_id'];
                $owner_query = mysqli_query(
                    $sqlConnect,
                    "SELECT `user_id` FROM " . T_GROUP_CHAT . " WHERE `group_id`={$group_id} LIMIT 1"
                );
                $owner = $owner_query ? mysqli_fetch_assoc($owner_query) : null;
                $is_owner = !empty($owner['user_id']) && (int)$owner['user_id'] === $recipient_id;
                $member_query = mysqli_query(
                    $sqlConnect,
                    "SELECT member.`id`,member.`active`,member.`last_seen` FROM " . T_GROUP_CHAT_USERS . " AS member" .
                    " WHERE member.`group_id`={$group_id} AND member.`user_id`={$recipient_id} LIMIT 1"
                );
                $member = $member_query ? mysqli_fetch_assoc($member_query) : null;
                if (!$is_owner && (empty($member) || (int)$member['active'] !== 1)) {
                    return false;
                }
                if (!empty($member) &&
                    (int)$member['last_seen'] >= (int)$message['time']) {
                    return false;
                }
                $conversation_type = 'group';
                $conversation_id = $group_id;
            } elseif ((int)$message['to_id'] !== $recipient_id) {
                return false;
            } elseif (!empty($message['seen'])) {
                return false;
            }
            if ($conversation_id > 0 &&
                VNSEEA_IsConversationMuted($recipient_id, $conversation_type, $conversation_id)) {
                return false;
            }
            return true;
        }
        if ($delivery['source_type'] === 'notification') {
            $query = mysqli_query(
                $sqlConnect,
                "SELECT `id`,`seen` FROM " . T_NOTIFICATION . " WHERE `id`={$source_id} LIMIT 1"
            );
            $notification = $query ? mysqli_fetch_assoc($query) : null;
            return !empty($notification) && empty($notification['seen']);
        }
        return true;
    }
}

if (!function_exists('VNSEEA_PushDeliveryTargetIsActive')) {
    function VNSEEA_PushDeliveryTargetIsActive($delivery)
    {
        global $sqlConnect;

        if (empty($delivery['installation_id'])) {
            return true;
        }
        $installation_id = (int)$delivery['installation_id'];
        $push_token_id = (int)$delivery['push_token_id'];
        $recipient_id = (int)$delivery['recipient_user_id'];
        $token_hash_sql = mysqli_real_escape_string($sqlConnect, (string)$delivery['token_hash']);
        $query = mysqli_query(
            $sqlConnect,
            "SELECT token_row.`id` FROM " . T_PUSH_INSTALLATIONS . " AS installation" .
            " INNER JOIN " . T_PUSH_TOKENS . " AS token_row ON token_row.`installation_id`=installation.`id`" .
            " WHERE installation.`id`={$installation_id} AND installation.`user_id`={$recipient_id}" .
            " AND installation.`active`=1 AND token_row.`id`={$push_token_id} AND token_row.`active`=1" .
            " AND token_row.`token_hash`='{$token_hash_sql}' LIMIT 1"
        );
        return $query && mysqli_num_rows($query) === 1;
    }
}

if (!function_exists('VNSEEA_MarkPushSourceAccepted')) {
    function VNSEEA_MarkPushSourceAccepted($delivery, $provider_id)
    {
        global $sqlConnect;

        $source_id = (int)$delivery['source_id'];
        $provider_id_sql = mysqli_real_escape_string($sqlConnect, (string)$provider_id);
        if ($delivery['source_type'] === 'message') {
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_MESSAGES .
                " SET `sent_push`=1,`notification_id`='{$provider_id_sql}' WHERE `id`={$source_id}"
            );
        } elseif ($delivery['source_type'] === 'notification') {
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_NOTIFICATION . " SET `sent_push`=1 WHERE `id`={$source_id}"
            );
        }
    }
}

if (!function_exists('VNSEEA_DeactivateRejectedPushToken')) {
    function VNSEEA_DeactivateRejectedPushToken($delivery)
    {
        global $sqlConnect;

        if (!empty($delivery['push_token_id'])) {
            $now = time();
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_TOKENS .
                " SET `active`=0,`updated_at`={$now},`deactivated_at`={$now}" .
                " WHERE `id`=" . (int)$delivery['push_token_id']
            );
        }
    }
}

if (!function_exists('VNSEEA_ProcessPushDelivery')) {
    function VNSEEA_ProcessPushDelivery($delivery)
    {
        global $sqlConnect;

        $delivery_id = (int)$delivery['id'];
        $now = time();
        if (!VNSEEA_PushDeliveryTargetIsActive($delivery) ||
            !VNSEEA_PushDeliverySourceIsActive($delivery)) {
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_DELIVERIES .
                " SET `status`='cancelled',`lease_until`=NULL,`updated_at`={$now},`last_error`='target_or_source_inactive'" .
                " WHERE `id`={$delivery_id}"
            );
            return false;
        }
        $payload = json_decode((string)$delivery['payload'], true);
        $result = $delivery['provider'] === 'onesignal'
            ? VNSEEA_SendOneSignalDelivery($delivery, is_array($payload) ? $payload : array())
            : array('accepted' => false, 'terminal' => true, 'error' => 'unsupported_delivery_provider');
        $attempt_count = (int)$delivery['attempt_count'] + 1;

        if (!empty($result['accepted'])) {
            $provider_id = !empty($result['provider_id']) ? (string)$result['provider_id'] : '';
            $provider_id_sql = mysqli_real_escape_string($sqlConnect, $provider_id);
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_DELIVERIES .
                " SET `status`='sent',`attempt_count`={$attempt_count},`lease_until`=NULL,`updated_at`={$now}," .
                "`sent_at`={$now},`provider_message_id`='{$provider_id_sql}',`last_error`=NULL WHERE `id`={$delivery_id}"
            );
            VNSEEA_MarkPushSourceAccepted($delivery, $provider_id);
            return true;
        }

        $error = !empty($result['error']) ? substr((string)$result['error'], 0, 255) : 'provider_rejected';
        $error_sql = mysqli_real_escape_string($sqlConnect, $error);
        if (!empty($result['invalid_token'])) {
            VNSEEA_DeactivateRejectedPushToken($delivery);
        }
        $retry_delays = array(60, 300, 900, 3600);
        $terminal = !empty($result['terminal']) ||
            $attempt_count >= 5 ||
            (int)$delivery['expires_at'] <= $now;
        if ($terminal) {
            mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_DELIVERIES .
                " SET `status`='dead',`attempt_count`={$attempt_count},`lease_until`=NULL,`updated_at`={$now}," .
                "`last_error`='{$error_sql}' WHERE `id`={$delivery_id}"
            );
            return false;
        }

        $delay_index = min($attempt_count - 1, count($retry_delays) - 1);
        $next_attempt = $now + $retry_delays[$delay_index];
        mysqli_query(
            $sqlConnect,
            "UPDATE " . T_PUSH_DELIVERIES .
            " SET `status`='retry',`attempt_count`={$attempt_count},`next_attempt_at`={$next_attempt}," .
            "`lease_until`=NULL,`updated_at`={$now},`last_error`='{$error_sql}' WHERE `id`={$delivery_id}"
        );
        return false;
    }
}

if (!function_exists('VNSEEA_ProcessPushDeliveryQueue')) {
    function VNSEEA_ProcessPushDeliveryQueue($limit = 100)
    {
        global $sqlConnect;

        $limit = max(1, min(200, (int)$limit));
        $now = time();
        $expired = mysqli_query(
            $sqlConnect,
            "UPDATE " . T_PUSH_DELIVERIES .
            " SET `status`='dead',`updated_at`={$now},`last_error`='delivery_expired',`lease_until`=NULL" .
            " WHERE `status` IN ('pending','retry','processing') AND `expires_at`<={$now}"
        );
        if ($expired === false) {
            return 0;
        }
        $query = mysqli_query(
            $sqlConnect,
            "SELECT delivery.* FROM " . T_PUSH_DELIVERIES . " AS delivery" .
            " WHERE delivery.`status` IN ('pending','retry','processing')" .
            " AND delivery.`next_attempt_at`<={$now}" .
            " AND (delivery.`lease_until` IS NULL OR delivery.`lease_until`<{$now})" .
            " AND delivery.`expires_at`>{$now}" .
            " ORDER BY delivery.`id` ASC LIMIT {$limit}"
        );
        if (!$query) {
            return 0;
        }

        $processed = 0;
        while ($delivery = mysqli_fetch_assoc($query)) {
            $delivery_id = (int)$delivery['id'];
            $lease_until = $now + 60;
            $leased = mysqli_query(
                $sqlConnect,
                "UPDATE " . T_PUSH_DELIVERIES .
                " SET `status`='processing',`lease_until`={$lease_until},`updated_at`={$now}" .
                " WHERE `id`={$delivery_id} AND `status` IN ('pending','retry','processing')" .
                " AND (`lease_until` IS NULL OR `lease_until`<{$now})"
            );
            if (!$leased || mysqli_affected_rows($sqlConnect) !== 1) {
                continue;
            }
            $delivery['status'] = 'processing';
            $delivery['lease_until'] = $lease_until;
            VNSEEA_ProcessPushDelivery($delivery);
            $processed++;
        }
        return $processed;
    }
}

if (!function_exists('VNSEEA_SendApnsVoipTarget')) {
    function VNSEEA_SendApnsVoipTarget($target, $notification_data, $display_name, $call_type, $context)
    {
        if (!function_exists('Wo_ApiVoipConfigValue') ||
            Wo_ApiVoipConfigValue('ios_voip_enabled', '0') !== '1' ||
            empty($target['token'])) {
            return array('accepted' => false, 'terminal' => true, 'error' => 'voip_not_configured');
        }

        $team_id = Wo_ApiVoipConfigValue('ios_voip_team_id');
        $key_id = Wo_ApiVoipConfigValue('ios_voip_key_id');
        $bundle_id = Wo_ApiVoipConfigValue('ios_voip_bundle_id');
        $key_path = Wo_ApiVoipConfigValue('ios_voip_private_key_path');
        if ($team_id === '' || $key_id === '' || $bundle_id === '' || $key_path === '' ||
            !class_exists('\\Firebase\\JWT\\JWT') || !file_exists($key_path)) {
            return array('accepted' => false, 'terminal' => true, 'error' => 'voip_credentials_missing');
        }
        $private_key = file_get_contents($key_path);
        if (empty($private_key)) {
            return array('accepted' => false, 'terminal' => true, 'error' => 'voip_private_key_unreadable');
        }

        $jwt = \Firebase\JWT\JWT::encode(array(
            'iss' => $team_id,
            'iat' => time()
        ), $private_key, 'ES256', $key_id);
        $body_prefix = $context === 'group' ? 'Group ' : '';
        $payload = array_merge($notification_data, array(
            'aps' => array(
                'alert' => array(
                    'title' => $display_name,
                    'body' => $body_prefix . ($call_type === 'video' ? 'Video call' : 'Audio call')
                ),
                'sound' => 'default',
                'content-available' => 1
            )
        ));
        $environment = !empty($target['apns_environment']) && $target['apns_environment'] === 'sandbox'
            ? 'sandbox'
            : 'production';
        $endpoint = $environment === 'sandbox'
            ? 'https://api.sandbox.push.apple.com/3/device/'
            : 'https://api.push.apple.com/3/device/';
        $response_headers = array();
        $ch = curl_init($endpoint . rawurlencode($target['token']));
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'authorization: bearer ' . $jwt,
            'apns-topic: ' . $bundle_id . '.voip',
            'apns-push-type: voip',
            'apns-priority: 10',
            'apns-expiration: ' . (time() + 45),
            'content-type: application/json'
        ));
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($curl, $header) use (&$response_headers) {
            $length = strlen($header);
            $parts = explode(':', $header, 2);
            if (count($parts) === 2) {
                $response_headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return $length;
        });
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = !empty($response) ? json_decode($response, true) : array();
        $reason = !empty($decoded['reason']) ? (string)$decoded['reason'] : $curl_error;
        $provider_id = !empty($response_headers['apns-id']) ? (string)$response_headers['apns-id'] : '';
        if ($status >= 200 && $status < 300) {
            return array(
                'accepted' => true,
                'terminal' => false,
                'provider_id' => $provider_id
            );
        }
        $invalid = ($status === 410 && in_array($reason, array('Unregistered', 'ExpiredToken'), true)) ||
            ($status === 400 && in_array($reason, array('BadDeviceToken', 'DeviceTokenNotForTopic'), true));
        if ($invalid) {
            VNSEEA_DeactivateRejectedPushToken(array(
                'push_token_id' => !empty($target['push_token_id']) ? $target['push_token_id'] : 0
            ));
        }
        return array(
            'accepted' => false,
            'terminal' => $invalid || ($status >= 400 && $status < 500 && $status !== 429),
            'invalid_token' => $invalid,
            'error' => $reason !== '' ? $reason : 'apns_rejected',
            'http_status' => $status
        );
    }
}

if (!function_exists('VNSEEA_SendImmediateCallPush')) {
    function VNSEEA_SendImmediateCallPush($recipient_id, $notification_data, $display_name, $call_type, $context = 'direct', $allow_voip = true)
    {
        $recipient_id = (int)$recipient_id;
        $call_type = $call_type === 'audio' ? 'audio' : 'video';
        $onesignal_targets = VNSEEA_GetUserPushTargets($recipient_id, 'onesignal');
        $onesignal_state = empty($onesignal_targets) ? 'unavailable' : 'failed';
        foreach ($onesignal_targets as $target) {
            $delivery = array_merge($target, array(
                'batch_uuid' => VNSEEA_PushUuidV4()
            ));
            $payload = array_merge($notification_data, array(
                'title' => $display_name !== '' ? $display_name : 'VNSEEA',
                'body' => $context === 'group'
                    ? ($call_type === 'video' ? 'Cuộc gọi nhóm video đến' : 'Cuộc gọi nhóm thoại đến')
                    : ($call_type === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến')
            ));
            $result = VNSEEA_SendOneSignalDelivery($delivery, $payload);
            if (!empty($result['accepted'])) {
                $onesignal_state = 'accepted';
            }
            if (!empty($result['invalid_token'])) {
                VNSEEA_DeactivateRejectedPushToken($target);
            }
        }

        $voip_targets = $allow_voip
            ? VNSEEA_GetUserPushTargets($recipient_id, 'apns_voip')
            : array();
        $voip_state = empty($voip_targets) ? 'unavailable' : 'failed';
        foreach ($voip_targets as $target) {
            $result = VNSEEA_SendApnsVoipTarget(
                $target,
                $notification_data,
                $display_name,
                $call_type,
                $context
            );
            if (!empty($result['accepted'])) {
                $voip_state = 'accepted';
            }
        }

        return array(
            'onesignal' => $onesignal_state,
            'voip' => $voip_state
        );
    }
}

if (!function_exists('VNSEEA_SendImmediateVoipEvent')) {
    function VNSEEA_SendImmediateVoipEvent($recipient_id, $notification_data, $display_name, $call_type, $context = 'direct')
    {
        $targets = VNSEEA_GetUserPushTargets((int)$recipient_id, 'apns_voip');
        $state = empty($targets) ? 'unavailable' : 'failed';
        foreach ($targets as $target) {
            $result = VNSEEA_SendApnsVoipTarget(
                $target,
                $notification_data,
                $display_name,
                $call_type,
                $context
            );
            if (!empty($result['accepted'])) {
                $state = 'accepted';
            }
        }
        return $state;
    }
}

if (!function_exists('VNSEEA_BuildCallDeliveryState')) {
    function VNSEEA_BuildCallDeliveryState($realtime_accepted, $push_channels)
    {
        $realtime_state = 'unavailable';
        if ($realtime_accepted === true || $realtime_accepted === 'accepted') {
            $realtime_state = 'accepted';
        } elseif ($realtime_accepted === false || $realtime_accepted === 'failed') {
            $realtime_state = 'failed';
        }
        $channels = array(
            'realtime' => $realtime_state,
            'onesignal' => !empty($push_channels['onesignal']) ? $push_channels['onesignal'] : 'unavailable',
            'voip' => !empty($push_channels['voip']) ? $push_channels['voip'] : 'unavailable'
        );
        $accepted = 0;
        $failed = 0;
        foreach (array('realtime', 'onesignal', 'voip') as $channel) {
            if ($channels[$channel] === 'accepted') {
                $accepted++;
            } elseif ($channels[$channel] === 'failed') {
                $failed++;
            }
        }
        $state = 'failed';
        if ($accepted > 0 && $failed > 0) {
            $state = 'partial';
        } elseif ($accepted > 0) {
            $state = 'accepted';
        }
        return array(
            'state' => $state,
            'channels' => $channels
        );
    }
}
