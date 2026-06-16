<?php
require_once __DIR__ .  '/../assets/includes/sepay_core.php';
if (!function_exists('Wo_SepayRequestToken')) {
    function Wo_SepayRequestToken()
    {
        $authHeader = (string)(
            $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? $_SERVER['Authorization']
            ?? ''
        );

        if ($authHeader !== '') {
            if (preg_match('/^\s*ApiKey\s+(.+)\s*$/i', $authHeader, $m)) {
                return trim($m[1]);
            }
            if (preg_match('/^\s*Apikey\s+(.+)\s*$/i', $authHeader, $m)) {
                return trim($m[1]);
            }
            if (preg_match('/^\s*Bearer\s+(.+)\s*$/i', $authHeader, $m)) {
                return trim($m[1]);
            }
        }

        return (string)(
            $_GET['token']
            ?? $_POST['token']
            ?? $_SERVER['HTTP_X_SEPAY_TOKEN']
            ?? $_SERVER['HTTP_X_WEBHOOK_TOKEN']
            ?? ''
        );
    }
}
if (!function_exists('Wo_SepayMaskSecret')) {
    function Wo_SepayMaskSecret($value)
    {
        $value = (string)$value;
        if ($value === '') {
            return '';
        }

        return strlen($value) <= 6 ? '***' : substr($value, 0, 3) . '***' . substr($value, -3);
    }
}
if ($f == 'sepay') {
    header('Content-Type: application/json; charset=utf-8');
    $enabled       = in_array((string)($wo['config']['sepay'] ?? '0'), array('1', 'yes', 'true', 'on'), true);
    $mode          = $wo['config']['sepay_mode'] ?? 'live';
    $bankCode      = $wo['config']['sepay_bank_code'] ?? '';
    // var_dump($bankCode);
    $bankAcc       = $wo['config']['sepay_bank_acc'] ?? '';
    $webhookToken  = $wo['config']['sepay_webhook_token'] ?? '';
    $descPrefix    = $wo['config']['sepay_desc_prefix'] ?? 'SE';
    $webhookUrl    = rtrim($wo['config']['site_url'], '/') . '/requests.php?f=sepay&s=webhook';

    $bankCode = strtoupper(trim($wo['config']['sepay_bank_code']));
    // Nếu site bật CSRF:
    if (!empty($wo['config']['csrf_system']) && $s !== 'webhook') {
        if (empty($hash_id) || $hash_id != $wo['user']['session_hash']) {
            echo json_encode(['status' => 403, 'message' => 'Bad CSRF']);
            exit();
        }
    }
    if ($s == 'make_qr') {
        if (empty($wo['loggedin'])) {
            echo json_encode(['status' => 403, 'message' => 'Unauthorized']);
            exit;
        }
        $amount = (int)($_GET['amount'] ?? $_POST['amount'] ?? 0);
        $out = Wo_SepayCreateOrderQr((int)$wo['user']['user_id'], $amount, $wo, $sqlConnect);
        if (!empty($out['error'])) {
            echo json_encode(['status' => $out['code'] ?? 500, 'message' => $out['error']]);
            exit;
        }
        echo json_encode(['status' => 200] + $out);
        exit;
    }

    // ... phía trên giữ nguyên
    // NHỚ: chỉ bỏ qua CSRF cho webhook. Các endpoint khác (kể cả check) vẫn kiểm CSRF như bạn đã làm.
    if ($s === 'webhook') {
        // 1) Xác thực token
        $rawWebhookBody = file_get_contents('php://input');
        $webhookQuery = $_GET;
        if (isset($webhookQuery['token'])) {
            $webhookQuery['token'] = Wo_SepayMaskSecret($webhookQuery['token']);
        }
        $webhookHeaders = function_exists('getallheaders') ? getallheaders() : [];
        foreach (array('Authorization', 'authorization', 'X-SePay-Token', 'X-Webhook-Token') as $secretHeader) {
            if (isset($webhookHeaders[$secretHeader])) {
                $webhookHeaders[$secretHeader] = Wo_SepayMaskSecret($webhookHeaders[$secretHeader]);
            }
        }
        @file_put_contents(__DIR__ . '/logs/sepay_webhook.log', print_r([
            'time' => date('c'),
            'method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'uri' => $_SERVER['REQUEST_URI'] ?? '',
            'query' => $webhookQuery,
            'headers' => $webhookHeaders,
            'raw' => $rawWebhookBody,
            'post' => $_POST,
            'remote' => $_SERVER['REMOTE_ADDR'] ?? '',
        ], true) . "\n----\n", FILE_APPEND);

        $requestToken = Wo_SepayRequestToken();
        $resp = Wo_SepayReturnWebhook($wo, $sqlConnect, $requestToken, $rawWebhookBody);
        @file_put_contents(__DIR__ . '/logs/sepay_webhook_result.log', '[' . date('c') . '] ' . json_encode([
            'http' => $resp['http'] ?? 200,
            'body' => $resp['body'] ?? 'ok',
            'has_token' => $requestToken !== '',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND);
        http_response_code($resp['http'] ?? 200);

        echo $resp['body'] ?? 'ok';
        exit;
    }

    // /requests.php?f=sepay&s=check&order_code=SEABC123&hash_id=...
    if ($s === 'check') {
        // Trả JSON + tránh cache
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

        // Yêu cầu đăng nhập
        if (empty($wo['loggedin'])) {
            echo json_encode(['status' => 403, 'message' => 'Unauthorized']);
            exit;
        }
        $order_code = trim((string)($_GET['order_code'] ?? $_POST['order_code'] ?? ''));
        if ($order_code === '') {
            echo json_encode(['status' => 400, 'message' => 'Missing order_code']);
            exit;
        }
        $out = Wo_SepayCheck($order_code, (int)$wo['user']['user_id'], $sqlConnect);
        if (!empty($out['error'])) {
            echo json_encode(['status' => $out['code'] ?? 500, 'message' => $out['error']]);
            exit;
        }
        echo json_encode(['status' => 200] + $out);
        exit;
    }
}