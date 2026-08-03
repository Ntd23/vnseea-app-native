SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Messages'
      AND COLUMN_NAME = 'media_group_id'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Messages` ADD COLUMN `media_group_id` VARCHAR(64) NULL AFTER `mediaFileName`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;
