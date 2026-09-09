CREATE TABLE IF NOT EXISTS `Wo_LiveKitCallProgress` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `call_context` VARCHAR(16) NOT NULL,
  `call_id` BIGINT UNSIGNED NOT NULL,
  `call_type` VARCHAR(10) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `endpoint_id` VARCHAR(128) NOT NULL,
  `progress_state` VARCHAR(24) NOT NULL,
  `progress_rank` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at_ms` BIGINT UNSIGNED NOT NULL,
  `updated_at_ms` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `call_endpoint` (`call_context`, `call_id`, `user_id`, `endpoint_id`),
  KEY `call_progress` (`call_context`, `call_id`, `progress_rank`, `updated_at_ms`),
  KEY `progress_cleanup` (`updated_at_ms`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
