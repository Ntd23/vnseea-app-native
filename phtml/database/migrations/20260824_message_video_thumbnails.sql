-- English description: Persists canonical video posters for direct and group chat messages.

SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Messages'
      AND COLUMN_NAME = 'media_thumb'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Messages` ADD COLUMN `media_thumb` VARCHAR(255) NULL AFTER `media`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;
