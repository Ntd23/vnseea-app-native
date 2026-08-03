CREATE TABLE IF NOT EXISTS `Wo_LiveKitEndpointLeases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scope_type` ENUM('direct_call','direct_audio','direct_video','group_call','live') NOT NULL,
  `scope_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('caller','receiver','participant','host') NOT NULL,
  `endpoint_id` VARCHAR(96) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `claimed_at` BIGINT UNSIGNED NOT NULL,
  `updated_at` BIGINT UNSIGNED NOT NULL,
  `released_at` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `scope_user_role` (`scope_type`, `scope_id`, `user_id`, `role`),
  KEY `endpoint_active` (`endpoint_id`, `active`),
  KEY `scope_active` (`scope_type`, `scope_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `Wo_LiveKitEndpointLeases`
  MODIFY COLUMN `scope_type` ENUM('direct_call','direct_audio','direct_video','group_call','live') NOT NULL;
