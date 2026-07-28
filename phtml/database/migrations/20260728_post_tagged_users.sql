CREATE TABLE IF NOT EXISTS `Wo_PostTaggedUsers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tagged_by` BIGINT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_post_tagged_user` (`post_id`, `user_id`),
  KEY `idx_tagged_user_post` (`user_id`, `post_id`),
  KEY `idx_post_tagged_by` (`tagged_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
