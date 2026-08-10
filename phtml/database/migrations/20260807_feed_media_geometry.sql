-- English description: Persists canonical media dimensions so feed rows can reserve stable space before media loads.

SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Posts'
      AND COLUMN_NAME = 'media_width'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Posts` ADD COLUMN `media_width` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `postFile`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Posts'
      AND COLUMN_NAME = 'media_height'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Posts` ADD COLUMN `media_height` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `media_width`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Albums_Media'
      AND COLUMN_NAME = 'media_width'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Albums_Media` ADD COLUMN `media_width` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `image`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Albums_Media'
      AND COLUMN_NAME = 'media_height'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Albums_Media` ADD COLUMN `media_height` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `media_width`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;
