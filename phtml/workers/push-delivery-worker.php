#!/usr/bin/env php
<?php

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "push delivery worker is CLI-only\n");
    exit(1);
}

$root = dirname(__DIR__);
chdir($root);
$_SERVER['HTTP_HOST'] = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
$_SERVER['REQUEST_URI'] = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$_SERVER['SERVER_PORT'] = isset($_SERVER['SERVER_PORT']) ? $_SERVER['SERVER_PORT'] : '443';
$_SERVER['HTTPS'] = isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'on';
require_once $root . '/assets/init.php';

if (!function_exists('VNSEEA_ProcessPushDeliveryQueue')) {
    fwrite(STDERR, "push delivery runtime is unavailable\n");
    exit(1);
}

$options = getopt('', array('once', 'batch::', 'idle-ms::', 'max-memory-mb::'));
$run_once = array_key_exists('once', $options);
$batch_size = isset($options['batch']) ? (int)$options['batch'] : 50;
$idle_ms = isset($options['idle-ms']) ? (int)$options['idle-ms'] : 500;
$max_memory_mb = isset($options['max-memory-mb']) ? (int)$options['max-memory-mb'] : 192;
$batch_size = max(1, min(200, $batch_size));
$idle_ms = max(100, min(5000, $idle_ms));
$max_memory_bytes = max(64, $max_memory_mb) * 1024 * 1024;
$running = true;

if (function_exists('cli_set_process_title')) {
    cli_set_process_title('vnseea-push-delivery-worker');
}
if (function_exists('pcntl_async_signals') && function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    pcntl_signal(SIGTERM, function () use (&$running) {
        $running = false;
    });
    pcntl_signal(SIGINT, function () use (&$running) {
        $running = false;
    });
}

do {
    if (!mysqli_ping($sqlConnect)) {
        fwrite(STDERR, "push delivery database connection was lost\n");
        exit(2);
    }

    $fanout_processed = function_exists('VNSEEA_ProcessFollowerContentNotificationQueue')
        ? VNSEEA_ProcessFollowerContentNotificationQueue(2, 50)
        : 0;
    $processed = VNSEEA_ProcessPushDeliveryQueue($batch_size);
    if ($run_once) {
        break;
    }
    if (memory_get_usage(true) >= $max_memory_bytes) {
        fwrite(STDERR, "push delivery worker reached its memory recycle limit\n");
        exit(0);
    }
    if ($processed < 1 && $fanout_processed < 1) {
        usleep($idle_ms * 1000);
    } else {
        usleep(50000);
    }
} while ($running);

exit(0);
