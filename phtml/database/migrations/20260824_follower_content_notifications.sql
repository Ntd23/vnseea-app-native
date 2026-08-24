CREATE TABLE IF NOT EXISTS `Wo_ContentNotificationJobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `content_type` ENUM('post','story') NOT NULL,
  `content_id` BIGINT UNSIGNED NOT NULL,
  `author_id` BIGINT UNSIGNED NOT NULL,
  `cursor_follow_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('queued','processing','retry','done','dead') NOT NULL DEFAULT 'queued',
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` BIGINT UNSIGNED NOT NULL,
  `lease_until` BIGINT UNSIGNED NULL,
  `last_error` VARCHAR(255) NULL,
  `created_at` BIGINT UNSIGNED NOT NULL,
  `updated_at` BIGINT UNSIGNED NOT NULL,
  `completed_at` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_target` (`content_type`, `content_id`),
  KEY `fanout_queue` (`status`, `next_attempt_at`, `lease_until`),
  KEY `author_content` (`author_id`, `content_type`, `content_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Wo_ContentNotificationMigrationState` (
  `migration_key` VARCHAR(100) NOT NULL,
  `completed_at` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`migration_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;
SET @followers_default_enabled_v1_done := (
  SELECT COUNT(*)
  FROM `Wo_ContentNotificationMigrationState`
  WHERE `migration_key` = 'followers_default_enabled_v1'
);
UPDATE `Wo_Followers`
SET `notify` = 1
WHERE @followers_default_enabled_v1_done = 0
  AND `active` = 1
  AND (`notify` IS NULL OR `notify` <> 1);
INSERT INTO `Wo_ContentNotificationMigrationState` (`migration_key`, `completed_at`)
SELECT 'followers_default_enabled_v1', UNIX_TIMESTAMP()
WHERE @followers_default_enabled_v1_done = 0;
COMMIT;
