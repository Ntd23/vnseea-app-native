-- English description: Tracks Bunny Stream uploads from ticket issue to encoding result and the message they belong to.

CREATE TABLE IF NOT EXISTS `Wo_VnseeaMediaUploads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `purpose` VARCHAR(16) NOT NULL,
  `library_kind` VARCHAR(16) NOT NULL,
  `video_guid` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL DEFAULT '',
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('created','uploaded','ready','failed') NOT NULL DEFAULT 'created',
  `message_id` INT UNSIGNED NULL DEFAULT NULL,
  `last_checked_at` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` INT UNSIGNED NOT NULL,
  `updated_at` INT UNSIGNED NOT NULL,
  `expires_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `video_guid` (`video_guid`),
  KEY `user_unattached` (`user_id`, `message_id`, `status`),
  KEY `message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
