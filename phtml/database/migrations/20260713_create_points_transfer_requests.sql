CREATE TABLE IF NOT EXISTS `Wo_Points_Transfer_Requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sender_id` INT UNSIGNED NOT NULL,
  `request_id` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `recipient_id` INT UNSIGNED NOT NULL,
  `points` BIGINT UNSIGNED NOT NULL,
  `note` VARCHAR(255) NOT NULL DEFAULT '',
  `status` VARCHAR(20) NOT NULL DEFAULT 'processing',
  `sender_points_after` BIGINT UNSIGNED DEFAULT NULL,
  `recipient_points_after` BIGINT UNSIGNED DEFAULT NULL,
  `sender_transaction_id` BIGINT UNSIGNED DEFAULT NULL,
  `recipient_transaction_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  `completed_at` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sender_request` (`sender_id`, `request_id`),
  KEY `idx_points_transfer_recipient` (`recipient_id`, `created_at`),
  KEY `idx_points_transfer_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
