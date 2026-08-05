<?php

$wo = array(
    'currencies' => array(
        0 => array('text' => 'USD', 'symbol' => '$'),
        11 => array('text' => 'VND', 'symbol' => '₫'),
    ),
    'config' => array(
        'currency' => 'USD',
        'currency_symbol_array' => array(
            'USD' => '$',
            'VND' => '₫',
        ),
    ),
);

require_once dirname(__DIR__) . '/assets/includes/functions_three.php';

function assert_same($expected, $actual, $message)
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . PHP_EOL);
        fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
        fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
}

$job = VNSEEA_HydrateJobCurrency(array('currency' => '11'));
assert_same('VND', $job['currency_code'], 'Numeric job currency must resolve to its configured code.');
assert_same('₫', $job['currency_symbol'], 'Numeric job currency must resolve to its configured symbol.');

$job = VNSEEA_HydrateJobCurrency(array('currency' => 'USD'));
assert_same('USD', $job['currency_code'], 'Currency codes must remain stable.');
assert_same('$', $job['currency_symbol'], 'Currency codes must resolve their configured symbol.');

echo "job-currency-contract: ok\n";
