<?php
// English description: Verifies chat media sent together persist one album id without breaking sends before the migration.

$root = dirname(__DIR__);

function media_group_assert($condition, $message)
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

require_once $root . '/assets/includes/vnseea_message_media.php';

media_group_assert(
    VNSEEA_NormalizeMessageMediaGroupId(' media-1727750000000-a1b2c3 ') === 'media-1727750000000-a1b2c3',
    'client album ids must be accepted after trimming'
);
foreach (array('', "media'); DROP TABLE Wo_Messages; --", 'media group', str_repeat('a', 65), array('x')) as $invalid) {
    media_group_assert(
        VNSEEA_NormalizeMessageMediaGroupId($invalid) === '',
        'unexpected album ids must be dropped'
    );
}
media_group_assert(
    VNSEEA_MessageMediaGroupColumnAvailable() === false,
    'without a database connection the column must be treated as missing'
);

$migration = file_get_contents($root . '/database/migrations/20261001_message_media_groups.sql');
media_group_assert(strpos($migration, "COLUMN_NAME = 'media_group_id'") !== false, 'migration must be idempotent');
media_group_assert(
    strpos($migration, 'ADD COLUMN `media_group_id` VARCHAR(64) NULL') !== false,
    'migration must add a nullable album id column'
);

$write = "\$message_data['media_group_id'] = \$media_group_id;";
foreach (array('send-message.php', 'group_chat.php') as $endpoint_name) {
    $endpoint = file_get_contents($root . '/api/v2/endpoints/' . $endpoint_name);
    $write_at = strpos($endpoint, $write);
    media_group_assert($write_at !== false, "{$endpoint_name} must store the album id");
    $guard = substr($endpoint, max(0, $write_at - 400), 400);
    media_group_assert(
        strpos($guard, 'VNSEEA_NormalizeMessageMediaGroupId(') !== false,
        "{$endpoint_name} must normalize the album id"
    );
    media_group_assert(
        strpos($guard, 'VNSEEA_MessageMediaGroupColumnAvailable()') !== false,
        "{$endpoint_name} must not write the album id before the migration runs"
    );
    media_group_assert(
        strpos($guard, '!empty($mediaFilename)') !== false,
        "{$endpoint_name} must only group messages that carry media"
    );
    media_group_assert(
        preg_match('/Wo_RegisterMessage(Group)?\(\$message_data\)/', $endpoint, $match, 0, $write_at) === 1,
        "{$endpoint_name} must set the album id before saving the message"
    );
}

fwrite(STDOUT, "message media group contract: ok\n");
