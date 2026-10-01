<?php
// English description: Receives Bunny Stream encoding webhooks, verifies their signature and records whether chat videos can play.

header('Content-Type: application/json; charset=utf-8');
if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false));
    exit();
}
$raw_body = (string) file_get_contents('php://input');
if (strlen($raw_body) > 65536) {
    http_response_code(413);
    echo json_encode(array('ok' => false));
    exit();
}
$signature = isset($_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE']) ? (string) $_SERVER['HTTP_X_BUNNYSTREAM_SIGNATURE'] : '';
$status = VNSEEA_BunnyHandleWebhook($raw_body, $signature);
http_response_code($status);
echo json_encode(array('ok' => $status === 200));
exit();
