CREATE TABLE IF NOT EXISTS `Wo_GroupChatHistoryClears` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `cleared_message_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `cleared_at` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_group_user` (`group_id`, `user_id`),
  KEY `user_id` (`user_id`),
  KEY `cleared_message_id` (`cleared_message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
