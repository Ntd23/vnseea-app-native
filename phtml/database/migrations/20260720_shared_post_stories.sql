SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @vnseea_schema
          AND TABLE_NAME = 'Wo_UserStory'
          AND COLUMN_NAME = 'story_type'
    ),
    'SELECT 1',
    "ALTER TABLE `Wo_UserStory` ADD COLUMN `story_type` VARCHAR(20) NOT NULL DEFAULT 'media' AFTER `privacy`"
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @vnseea_schema
          AND TABLE_NAME = 'Wo_UserStory'
          AND COLUMN_NAME = 'source_post_id'
    ),
    'SELECT 1',
    'ALTER TABLE `Wo_UserStory` ADD COLUMN `source_post_id` BIGINT UNSIGNED NULL AFTER `story_type`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @vnseea_schema
          AND TABLE_NAME = 'Wo_UserStory'
          AND INDEX_NAME = 'idx_story_source_post'
    ),
    'SELECT 1',
    'ALTER TABLE `Wo_UserStory` ADD INDEX `idx_story_source_post` (`source_post_id`)'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

UPDATE `Wo_UserStory`
SET `story_type` = 'media'
WHERE `story_type` IS NULL OR `story_type` = '';
