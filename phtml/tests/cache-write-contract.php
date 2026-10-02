<?php

require_once dirname(__DIR__) . '/assets/includes/cache.php';

function assert_cache_contract($condition, $message)
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$originalDirectory = getcwd();
$testDirectory = sys_get_temp_dir() . '/vnseea-cache-contract-' . bin2hex(random_bytes(6));
mkdir($testDirectory);

try {
    chdir($testDirectory);
    mkdir('cache');
    $cache = new Cache();

    assert_cache_contract($cache->write('test.tmp', array('version' => 1)), 'first write failed');
    assert_cache_contract($cache->write('test.tmp', array('version' => 2)), 'second write failed');
    assert_cache_contract($cache->read('test.tmp') === array('version' => 2), 'second write must replace the first');
    assert_cache_contract(file_get_contents('cache/test.tmp') === serialize(array('version' => 2)), 'cache contains appended data');

    file_put_contents('cache/test.tmp', serialize(array('version' => 1)) . serialize(array('version' => 2)));
    $warning = false;
    set_error_handler(function () use (&$warning) {
        $warning = true;
        return true;
    });
    try {
        $corruptValue = $cache->read('test.tmp');
    } finally {
        restore_error_handler();
    }
    assert_cache_contract($corruptValue === null && !$warning, 'corrupt cache must be a silent miss');

    assert_cache_contract($cache->write('false.tmp', false), 'false value write failed');
    assert_cache_contract($cache->read('false.tmp') === false, 'serialized false must remain valid');
    assert_cache_contract($cache->write('missing/test.tmp', true) === false, 'missing cache directory must fail');
    assert_cache_contract(glob('cache/.cache-*') === array(), 'temporary cache file was not removed');
} finally {
    chdir($originalDirectory);
    @unlink($testDirectory . '/cache/test.tmp');
    @unlink($testDirectory . '/cache/false.tmp');
    @rmdir($testDirectory . '/cache');
    @rmdir($testDirectory);
}

echo "cache write contract: OK\n";
