<?php
if (!defined('SEPAY_CORE')) {
    define('SEPAY_CORE', true);                             // ✅ đủ 2 tham số
}
function Wo_SepayPaymentHasMatchedTransaction($paymentId, $sqlConnect)
{
    $paymentId = (int)$paymentId;
    if ($paymentId <= 0) {
        return false;
    }

    $q = mysqli_query(
        $sqlConnect,
        "SELECT sepay_id FROM " . SEPAY_TRANSACTION . "
            WHERE matched_payment_id={$paymentId}
            LIMIT 1"
    );

    return ($q && mysqli_num_rows($q) > 0);
}

function Wo_SepayMarkMatchedTransaction($paymentId, $userId, $orderCode, $amount, $sqlConnect)
{
    $paymentId = (int)$paymentId;
    $userId = (int)$userId;
    $amount = (int)$amount;
    $orderCodeSql = mysqli_real_escape_string($sqlConnect, strtoupper((string)$orderCode));

    mysqli_query(
        $sqlConnect,
        "UPDATE " . SEPAY_TRANSACTION . "
            SET matched_payment_id={$paymentId},
                matched_user_id={$userId}
            WHERE UPPER(reference_code)=UPPER('{$orderCodeSql}')
                AND transfer_amount={$amount}
                AND (matched_payment_id IS NULL OR matched_payment_id=0 OR matched_payment_id={$paymentId})"
    );
}

function Wo_SepayCreditWallet($payment, $sqlConnect)
{
    $paymentId = (int)($payment['id'] ?? 0);
    $userId = (int)($payment['customer_id'] ?? 0);
    $amount = (int)($payment['amount'] ?? 0);
    $orderCode = (string)($payment['order_code'] ?? '');

    if ($paymentId <= 0 || $userId <= 0 || $amount <= 0 || $orderCode === '') {
        return false;
    }

    if (Wo_SepayPaymentHasMatchedTransaction($paymentId, $sqlConnect)) {
        if (function_exists('cache')) {
            cache($userId, 'users', 'delete');
        }
        return true;
    }

    $orderCodeSql = mysqli_real_escape_string($sqlConnect, strtoupper($orderCode));
    $incoming = mysqli_query(
        $sqlConnect,
        "SELECT sepay_id FROM " . SEPAY_TRANSACTION . "
            WHERE UPPER(reference_code)=UPPER('{$orderCodeSql}')
                AND transfer_amount={$amount}
                AND (matched_payment_id IS NULL OR matched_payment_id=0 OR matched_payment_id={$paymentId})
            LIMIT 1"
    );

    if (!$incoming || mysqli_num_rows($incoming) === 0) {
        return false;
    }

    $ok = mysqli_query(
        $sqlConnect,
        "UPDATE " . T_USERS . " SET wallet = wallet + {$amount}
            WHERE user_id={$userId}"
    );

    if (!$ok) {
        return false;
    }

    $notesSql = mysqli_real_escape_string($sqlConnect, 'sepay:' . $orderCode);
    mysqli_query(
        $sqlConnect,
        "INSERT INTO " . T_PAYMENT_TRANSACTIONS . " (`userid`, `kind`, `amount`, `notes`)
            VALUES ({$userId}, 'WALLET', {$amount}, '{$notesSql}')"
    );

    Wo_SepayMarkMatchedTransaction($paymentId, $userId, $orderCode, $amount, $sqlConnect);

    if (function_exists('cache')) {
        cache($userId, 'users', 'delete');
    }

    return true;
}

function Wo_SepayCreateOrderQr($userId, $amount, $wo, $sqlConnect)
{
    $amount = max(1000, (int)$amount);
    if ($amount <= 0) return ['error' => 'Invalid amount'];
    $enabled = (isset($wo['config']['sepay']) && in_array((string)$wo['config']['sepay'], array('1', 'yes', 'true', 'on'), true));
    if (!$enabled) return ['error' => 'SePay is disabled by admin'];
    $bankAcc = trim($wo['config']['sepay_bank_acc'] ?? '');
    $bankCode = trim($wo['config']['sepay_bank_code'] ?? '');
    if (!$bankAcc || !$bankCode) return ['error' => 'SePay not configured (bank_code/account).'];
    $descPrefix = (string)($wo['config']['sepay_desc_prefix'] ?? 'SE');
    $order_code = ($wo['config']['sepay_desc_prefix'] ?? 'SE') . substr(sha1(uniqid('', true)), 0, 6);
    $accountName = trim((string)($wo['config']['sepay_account_name'] ?? ''));
    $order_code = mysqli_real_escape_string($sqlConnect, $order_code);
    $bankCodeSql = mysqli_real_escape_string($sqlConnect, $bankCode);
    $bankAccSql = mysqli_real_escape_string($sqlConnect, $bankAcc);
    $accountNameSql = mysqli_real_escape_string($sqlConnect, $accountName);
    $dup = mysqli_query($sqlConnect, "SELECT id FROM " . PAYMENT . " WHERE order_code='{$order_code}' AND method='sepay' LIMIT 1");
    if ($dup && mysqli_num_rows($dup) > 0) {
        $order_code = ($wo['config']['sepay_desc_prefix'] ?? 'SE') . substr(sha1(uniqid('', true)), 0, 6);
        $order_code = mysqli_real_escape_string($sqlConnect, $order_code);
    }
    $sql = mysqli_query($sqlConnect, "INSERT INTO " . PAYMENT . " (`order_code`,`customer_id`,`amount`,`bank_code`,`account_number`,`account_name`,`method`,`status`,`created_at`)
          VALUES
    ('{$order_code}',{$userId},{$amount},'{$bankCodeSql}','{$bankAccSql}','{$accountNameSql}','sepay','pending',NOW())");
    // $sqlLog = mysqli_query($sqlConnect, "INSERT INTO " . SEPAY_TRANSACTION . " (`sepay_id`,`bank_code`,`account_number`,`transfer_type`,`transfer_amount`,`content`,``");
    if (!$sql) {
        return ['error' => 'DB error: ' . mysqli_error($sqlConnect)];
    }
    $payment_id = (int)mysqli_insert_id($sqlConnect);
    $qrBankCode = strtoupper($bankCode);
    if (in_array($qrBankCode, array('MB', 'MBBANK', 'MB BANK'), true)) {
        $qrBankCode = 'MB';
    }

    $qr_url = 'https://qr.sepay.vn/img?' . http_build_query([
        'bank'   => $qrBankCode,
        'acc'    => $bankAcc,
        'amount' => $amount,
        'des'    => $order_code,
        'template' => 'compact'
    ]);
    return [
        'payment_id' => $payment_id,
        'order_code' => $order_code,
        'amount'     => (int)$amount,
        'bank_code'  => $bankCode,
        'account_number' => $bankAcc,
        'account_name' => $accountName,
        'qr_url'     => $qr_url,
    ];
}
function Wo_SepayCheck(string $order_code_raw, int $userId, $sqlConnect)
{
    $order_code_sql = Wo_Secure(trim($order_code_raw));
    $q = mysqli_query($sqlConnect, "SELECT  * FROM " . PAYMENT . " WHERE
     order_code='{$order_code_sql}' AND method='sepay' LIMIT 1");
    if (!$q || !mysqli_num_rows($q)) return ['error' => 'Not found', 'code' => 404];

    $p = mysqli_fetch_assoc($q);                  // $row: array<string,mixed>|null

    if ((int)$p['customer_id'] !== (int)$userId) return ['error' => 'Forbidden', 'code' => 403];
    if (strtolower((string)$p['status']) !== 'paid') {
        $order_code_upper_sql = mysqli_real_escape_string($sqlConnect, strtoupper((string)$p['order_code']));
        $amount = (int)$p['amount'];
        $tq = mysqli_query(
            $sqlConnect,
            "SELECT sepay_id
                FROM " . SEPAY_TRANSACTION . "
                WHERE UPPER(reference_code)=UPPER('{$order_code_upper_sql}')
                    AND transfer_amount={$amount}
                    AND (matched_payment_id IS NULL OR matched_payment_id=0 OR matched_payment_id=" . (int)$p['id'] . ")
                ORDER BY created_at DESC
                LIMIT 1"
        );
        if ($tq && mysqli_num_rows($tq) > 0) {
            mysqli_begin_transaction($sqlConnect);
            $ok1 = mysqli_query(
                $sqlConnect,
                "UPDATE " . PAYMENT . " SET status='paid', updated_at=NOW()
                    WHERE id=" . (int)$p['id'] . " AND status='pending'"
            );
            if ($ok1 && mysqli_affected_rows($sqlConnect) === 1) {
                $ok2 = Wo_SepayCreditWallet($p, $sqlConnect);
                if ($ok2) {
                    mysqli_commit($sqlConnect);
                    $p['status'] = 'paid';
                    $p['updated_at'] = date('Y-m-d H:i:s');
                } else {
                    mysqli_rollback($sqlConnect);
                }
            } else {
                mysqli_rollback($sqlConnect);
            }
        }
    }
    else if (Wo_SepayPaymentHasMatchedTransaction((int)$p['id'], $sqlConnect)) {
        if (function_exists('cache')) {
            cache((int)$p['customer_id'], 'users', 'delete');
        }
    }
    else {
        mysqli_begin_transaction($sqlConnect);
        if (Wo_SepayCreditWallet($p, $sqlConnect)) {
            mysqli_commit($sqlConnect);
        }
        else {
            mysqli_rollback($sqlConnect);
        }
    }
    return [
        'order_code'  => $p['order_code'],
        'amount'      => (int)$p['amount'],
        'status'      => $p['status'],
        'paid'        => (strtolower($p['status']) === 'paid'),
        'updated_at'  => $p['updated_at'],
        'server_time' => date('c'),
    ];
}
function Wo_SepayReturnWebhook($wo, $sqlConnect, $givenToken)
{
    if ($givenToken !== ($wo['config']['sepay_webhook_token'] ?? '')) {
        return ['http' => 403, 'body' => 'invalid token'];
    }
    $raw = file_get_contents('php://input');
    $is_json = stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false;
    $data = $is_json ? (json_decode($raw, true) ?: []) : ($_POST ?: []);
    $descPrefix = (string)($wo['config']['sepay_desc_prefix'] ?? 'SE');
    $content = (string)($data['order_code'] ?? $data['description'] ?? $data['content'] ?? $data['note'] ?? $data['code'] ?? '');
    $order_code = '';
    if (preg_match('/\b' . preg_quote($descPrefix, '/') . '[A-Fa-f0-9]{6}\b/i', $content, $m)) {
        $order_code = strtoupper($m[0]);
    }
    $amount = (int)($data['amount'] ?? $data['money'] ?? $data['transactionAmount'] ?? $data['transferAmount'] ?? 0);
    $direction = strtoupper((string)($data['type'] ?? $data['direction'] ?? $data['transferType'] ?? 'IN'));
    if (!$order_code || $amount <= 0 || !in_array($direction, ['IN', 'CREDIT'])) {
        return ['http' => 200, 'body' => 'ignore'];
    }
    $toAcc = strtoupper((string)($data['account_number'] ?? $data['accountNumber'] ?? $data['toAccount'] ?? ''));
    $cfgAcc = strtoupper(trim($wo['config']['sepay_bank_acc'] ?? ''));
    if ($toAcc && $cfgAcc && $toAcc !== $cfgAcc) {
        return ['http' => 200, 'body' => 'ignore bank'];
    }
    $sepayId       = (string)($data['id'] ?? $data['sepay_id'] ?? $data['transaction_id'] ?? '');
    if ($sepayId === '') { // fallback để vẫn idempotent khi provider ko trả id
        $sepayId = 'hash_' . substr(sha1($raw ?: ($content . $amount . $toAcc)), 0, 24);
    }
    $bankCode      = strtoupper((string)($data['bankCode'] ?? $data['bank_code'] ?? $data['gateway'] ?? $data['toBank'] ?? $wo['config']['sepay_bank_code'] ?? ''));

    $accountNumber = (string)($data['account_number'] ?? $data['accountNumber'] ?? $data['toAccount'] ?? $wo['config']['sepay_bank_acc'] ?? '');
    $transferType  = $direction; // đã chuẩn hoá ở trên
    $transferAmt   = (int)$amount;
    $referenceCode = $order_code;

    // Chuẩn hoá thời gian giao dịch (nếu có)
    $txAtRaw = (string)($data['transactionDate'] ?? $data['trans_date'] ?? $data['tx_at'] ?? $data['time'] ?? '');
    $txAt    = $txAtRaw ? date('Y-m-d H:i:s', strtotime($txAtRaw)) : null;

    // Escape an toàn
    $sepayId_sql       = mysqli_real_escape_string($sqlConnect, $sepayId);
    $bankCode_sql      = mysqli_real_escape_string($sqlConnect, $bankCode);
    $accountNumber_sql = mysqli_real_escape_string($sqlConnect, $accountNumber);
    $transferType_sql  = mysqli_real_escape_string($sqlConnect, $transferType);
    $content_sql       = mysqli_real_escape_string($sqlConnect, $content);
    $reference_sql     = mysqli_real_escape_string($sqlConnect, $referenceCode);
    $txAt_sql          = $txAt ? ("'" . mysqli_real_escape_string($sqlConnect, $txAt) . "'") : "NULL";
    $raw_json_sql      = mysqli_real_escape_string($sqlConnect, $is_json ? json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $raw);

    // UPSERT: lần đầu INSERT, nếu webhook gọi lại thì UPDATE các trường
    $upsertLogSql = "
    INSERT INTO " . SEPAY_TRANSACTION . "
        (sepay_id, bank_code, account_number, transfer_type, transfer_amount, content, reference_code, tx_at, raw_payload, created_at)
    VALUES
        ('{$sepayId_sql}','{$bankCode_sql}','{$accountNumber_sql}','{$transferType_sql}',{$transferAmt},'{$content_sql}','{$reference_sql}',{$txAt_sql},'{$raw_json_sql}', NOW())
    ON DUPLICATE KEY UPDATE
        bank_code=VALUES(bank_code),
        account_number=VALUES(account_number),
        transfer_type=VALUES(transfer_type),
        transfer_amount=VALUES(transfer_amount),
        content=VALUES(content),
        reference_code=VALUES(reference_code),
        tx_at=VALUES(tx_at),
        raw_payload=VALUES(raw_payload)";
    mysqli_query($sqlConnect, $upsertLogSql);

    $order_code_sql = Wo_Secure($order_code);
    $q = mysqli_query(
        $sqlConnect,
        "SELECT id, customer_id, amount, status
            FROM " . PAYMENT . "
            WHERE UPPER(order_code)=UPPER('{$order_code_sql}') AND method='sepay'
            LIMIT 1"
    );

    if (!$q || !mysqli_num_rows($q)) return ['http' => 200, 'body' => 'not found'];
    $p = mysqli_fetch_assoc($q);
    if (strtolower($p['status']) === 'paid') {
        if (!Wo_SepayPaymentHasMatchedTransaction((int)$p['id'], $sqlConnect)) {
            mysqli_begin_transaction($sqlConnect);
            if (Wo_SepayCreditWallet($p, $sqlConnect)) {
                mysqli_commit($sqlConnect);
                return ['http' => 200, 'body' => 'repaired'];
            }
            mysqli_rollback($sqlConnect);
            return ['http' => 500, 'body' => 'user update fail'];
        }

        if (function_exists('cache')) {
            cache((int)$p['customer_id'], 'users', 'delete');
        }
        return ['http' => 200, 'body' => 'already'];
    }
    if ((int)$p['amount'] !== (int)$amount) return ['http' => 200, 'body' => 'amount mismatch'];
    mysqli_begin_transaction($sqlConnect);
    $ok1 = mysqli_query(
        $sqlConnect,
        "UPDATE " . PAYMENT . " SET status='paid', updated_at=NOW()
            WHERE id=" . (int)$p['id'] . " AND status='pending'"
    );
    if (!$ok1 || mysqli_affected_rows($sqlConnect) !== 1) {
        mysqli_rollback($sqlConnect);
        return ['http' => 200, 'body' => 'no update'];
    }

    $ok2 = Wo_SepayCreditWallet($p, $sqlConnect);
    if (!$ok2) {
        mysqli_rollback($sqlConnect);
        return ['http' => 500, 'body' => 'user update fail'];
    }
    mysqli_commit($sqlConnect);
    Wo_RegisterNotification([
        'notifier_id'  => (int)$p['customer_id'],
        'recipient_id' => (int)$p['customer_id'],
        'type'         => 'wallet_topup',
        'text'         => 'Nạp ví thành công: ' . Wo_GetCurrency($wo['config']['currency']) . $p['amount'] . ' (' . $order_code . ')',
    ]);
    return ['http' => 200, 'body' => 'ok'];
}
