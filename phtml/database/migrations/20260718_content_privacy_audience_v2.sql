SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @vnseea_schema AND TABLE_NAME = 'Wo_Posts' AND COLUMN_NAME = 'is_anonymous'
    ),
    'SELECT 1',
    'ALTER TABLE `Wo_Posts` ADD COLUMN `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0 AFTER `postPrivacy`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

UPDATE `Wo_Posts` SET `is_anonymous` = 0 WHERE `is_anonymous` IS NULL;
ALTER TABLE `Wo_Posts` MODIFY COLUMN `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `Wo_Posts`
SET `postPrivacy` = '0', `is_anonymous` = 1
WHERE `postPrivacy` = '4';

UPDATE `Wo_Posts`
SET `postPrivacy` = '3'
WHERE `is_reel` = 1 AND `postPrivacy` = '2';

SET @vnseea_sql = IF(
    EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @vnseea_schema AND TABLE_NAME = 'Wo_UserStory' AND COLUMN_NAME = 'privacy'
    ),
    'SELECT 1',
    'ALTER TABLE `Wo_UserStory` ADD COLUMN `privacy` TINYINT(1) NOT NULL DEFAULT 2 AFTER `user_id`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

UPDATE `Wo_UserStory` SET `privacy` = 2 WHERE `privacy` IS NULL;
ALTER TABLE `Wo_UserStory` MODIFY COLUMN `privacy` TINYINT(1) NOT NULL DEFAULT 2;
