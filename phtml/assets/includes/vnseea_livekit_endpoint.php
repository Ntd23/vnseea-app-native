<?php
// Canonical endpoint ownership for LiveKit sessions shared by App and Web.

if (!function_exists('VNSEEA_NormalizeClientEndpointId')) {
    function VNSEEA_NormalizeClientEndpointId($value)
    {
        $value = trim((string) $value);
        if ($value === '' || strlen($value) > 96 || !preg_match('/^[A-Za-z0-9._:-]{8,96}$/', $value)) {
            return '';
        }
        return $value;
    }
}

if (!function_exists('VNSEEA_GetRequestEndpointId')) {
    function VNSEEA_GetRequestEndpointId($user_id = 0, $request = null)
    {
        $request = is_array($request) ? $request : $_POST;
        $candidates = array(
            isset($request['client_endpoint_id']) ? $request['client_endpoint_id'] : '',
            isset($_GET['client_endpoint_id']) ? $_GET['client_endpoint_id'] : '',
            isset($_SERVER['HTTP_X_VNSEEA_ENDPOINT_ID']) ? $_SERVER['HTTP_X_VNSEEA_ENDPOINT_ID'] : '',
        );
        foreach ($candidates as $candidate) {
            $normalized = VNSEEA_NormalizeClientEndpointId($candidate);
            if ($normalized !== '') {
                return $normalized;
            }
        }

        // Compatibility for one release: legacy clients still get a stable
        // endpoint scoped to their login/session instead of sharing user_id.
        $token = '';
        foreach (array('access_token', 's') as $key) {
            if (!empty($request[$key])) {
                $token = (string) $request[$key];
                break;
            }
            if (!empty($_GET[$key])) {
                $token = (string) $_GET[$key];
                break;
            }
        }
        if ($token === '' && session_status() === PHP_SESSION_ACTIVE) {
            $token = session_id();
        }
        $seed = (string) intval($user_id) . '|' . ($token !== '' ? $token : 'legacy');
        return 'legacy_' . substr(hash('sha256', $seed), 0, 40);
    }
}

if (!function_exists('VNSEEA_IsValidLiveKitEndpointScope')) {
    function VNSEEA_IsValidLiveKitEndpointScope($scope_type, $role)
    {
        $roles = array(
            'direct_call' => array('caller', 'receiver'),
            'direct_audio' => array('caller', 'receiver'),
            'direct_video' => array('caller', 'receiver'),
            'group_call' => array('participant'),
            'live' => array('host'),
        );
        return isset($roles[$scope_type]) && in_array($role, $roles[$scope_type], true);
    }
}

if (!function_exists('VNSEEA_DirectCallEndpointScope')) {
    function VNSEEA_DirectCallEndpointScope($call_type)
    {
        return $call_type === 'audio' ? 'direct_audio' : 'direct_video';
    }
}

if (!function_exists('VNSEEA_GetLiveKitEndpointLease')) {
    function VNSEEA_GetLiveKitEndpointLease($scope_type, $scope_id, $user_id, $role)
    {
        global $sqlConnect;
        $scope_id = intval($scope_id);
        $user_id = intval($user_id);
        if ($scope_id < 1 || $user_id < 1 || !VNSEEA_IsValidLiveKitEndpointScope($scope_type, $role)) {
            return null;
        }
        $scope_sql = mysqli_real_escape_string($sqlConnect, $scope_type);
        $role_sql = mysqli_real_escape_string($sqlConnect, $role);
        $query = @mysqli_query(
            $sqlConnect,
            "SELECT `endpoint_id`,`active`,`claimed_at`,`updated_at`,`released_at` FROM " . T_LIVEKIT_ENDPOINT_LEASES .
            " WHERE `scope_type`='{$scope_sql}' AND `scope_id`={$scope_id} AND `user_id`={$user_id}" .
            " AND `role`='{$role_sql}' LIMIT 1"
        );
        return $query ? mysqli_fetch_assoc($query) : null;
    }
}

if (!function_exists('VNSEEA_ClaimLiveKitEndpoint')) {
    function VNSEEA_ClaimLiveKitEndpoint($scope_type, $scope_id, $user_id, $role, $endpoint_id)
    {
        global $sqlConnect;
        $scope_id = intval($scope_id);
        $user_id = intval($user_id);
        $endpoint_id = VNSEEA_NormalizeClientEndpointId($endpoint_id);
        if ($scope_id < 1 || $user_id < 1 || $endpoint_id === '' || !VNSEEA_IsValidLiveKitEndpointScope($scope_type, $role)) {
            return array('ok' => false, 'error_code' => 'invalid_client_endpoint');
        }

        $scope_sql = mysqli_real_escape_string($sqlConnect, $scope_type);
        $role_sql = mysqli_real_escape_string($sqlConnect, $role);
        $endpoint_sql = mysqli_real_escape_string($sqlConnect, $endpoint_id);
        $now = time();
        @mysqli_query(
            $sqlConnect,
            "INSERT IGNORE INTO " . T_LIVEKIT_ENDPOINT_LEASES .
            " (`scope_type`,`scope_id`,`user_id`,`role`,`endpoint_id`,`active`,`claimed_at`,`updated_at`,`released_at`)" .
            " VALUES ('{$scope_sql}',{$scope_id},{$user_id},'{$role_sql}','{$endpoint_sql}',1,{$now},{$now},NULL)"
        );
        @mysqli_query(
            $sqlConnect,
            "UPDATE " . T_LIVEKIT_ENDPOINT_LEASES .
            " SET `claimed_at`=IF(`active`=0,{$now},`claimed_at`),`endpoint_id`='{$endpoint_sql}',`active`=1," .
            " `updated_at`={$now},`released_at`=NULL" .
            " WHERE `scope_type`='{$scope_sql}' AND `scope_id`={$scope_id} AND `user_id`={$user_id}" .
            " AND `role`='{$role_sql}' AND (`active`=0 OR `endpoint_id`='{$endpoint_sql}')"
        );

        $lease = VNSEEA_GetLiveKitEndpointLease($scope_type, $scope_id, $user_id, $role);
        $accepted = !empty($lease) && intval($lease['active']) === 1 && hash_equals((string) $lease['endpoint_id'], $endpoint_id);
        return array(
            'ok' => $accepted,
            'endpoint_id' => $accepted ? $endpoint_id : '',
            'error_code' => $accepted ? '' : 'endpoint_already_claimed',
        );
    }
}

if (!function_exists('VNSEEA_IsLiveKitEndpointOwner')) {
    function VNSEEA_IsLiveKitEndpointOwner($scope_type, $scope_id, $user_id, $role, $endpoint_id)
    {
        $endpoint_id = VNSEEA_NormalizeClientEndpointId($endpoint_id);
        $lease = VNSEEA_GetLiveKitEndpointLease($scope_type, $scope_id, $user_id, $role);
        return $endpoint_id !== '' && !empty($lease) && intval($lease['active']) === 1 && hash_equals((string) $lease['endpoint_id'], $endpoint_id);
    }
}

if (!function_exists('VNSEEA_ReleaseLiveKitEndpoint')) {
    function VNSEEA_ReleaseLiveKitEndpoint($scope_type, $scope_id, $user_id = 0, $role = '', $endpoint_id = '')
    {
        global $sqlConnect;
        $scope_id = intval($scope_id);
        if ($scope_id < 1 || !in_array($scope_type, array('direct_call', 'direct_audio', 'direct_video', 'group_call', 'live'), true)) {
            return false;
        }
        $scope_sql = mysqli_real_escape_string($sqlConnect, $scope_type);
        $where = "`scope_type`='{$scope_sql}' AND `scope_id`={$scope_id} AND `active`=1";
        if (intval($user_id) > 0) {
            $where .= ' AND `user_id`=' . intval($user_id);
        }
        if ($role !== '') {
            $role_sql = mysqli_real_escape_string($sqlConnect, $role);
            $where .= " AND `role`='{$role_sql}'";
        }
        $endpoint_id = VNSEEA_NormalizeClientEndpointId($endpoint_id);
        if ($endpoint_id !== '') {
            $endpoint_sql = mysqli_real_escape_string($sqlConnect, $endpoint_id);
            $where .= " AND `endpoint_id`='{$endpoint_sql}'";
        }
        $now = time();
        return @mysqli_query(
            $sqlConnect,
            "UPDATE " . T_LIVEKIT_ENDPOINT_LEASES . " SET `active`=0,`updated_at`={$now},`released_at`={$now} WHERE {$where}"
        ) !== false;
    }
}

if (!function_exists('VNSEEA_BuildLiveKitParticipantIdentity')) {
    function VNSEEA_BuildLiveKitParticipantIdentity($prefix, $user_id, $scope_id, $endpoint_id)
    {
        $prefix = preg_replace('/[^a-z0-9_-]+/i', '_', (string) $prefix);
        $endpoint_id = VNSEEA_NormalizeClientEndpointId($endpoint_id);
        return trim($prefix, '_') . '_' . intval($user_id) . '_' . substr(hash('sha256', intval($scope_id) . '|' . $endpoint_id), 0, 16);
    }
}
