CREATE TABLE IF NOT EXISTS `Wo_PushInstallations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `installation_id` VARCHAR(80) NOT NULL,
  `device_secret_hash` CHAR(64) NOT NULL,
  `platform` ENUM('ios','android') NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` BIGINT UNSIGNED NOT NULL,
  `updated_at` BIGINT UNSIGNED NOT NULL,
  `released_at` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `installation_key` (`installation_id`),
  KEY `user_active` (`user_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Wo_PushTokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `installation_id` BIGINT UNSIGNED NOT NULL,
  `provider` ENUM('onesignal','apns_voip') NOT NULL,
  `token` TEXT NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `apns_environment` ENUM('sandbox','production') NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` BIGINT UNSIGNED NOT NULL,
  `updated_at` BIGINT UNSIGNED NOT NULL,
  `deactivated_at` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `installation_provider` (`installation_id`, `provider`),
  UNIQUE KEY `provider_token` (`provider`, `token_hash`),
  KEY `active_provider` (`active`, `provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Wo_PushDeliveries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dedupe_key` VARCHAR(191) NOT NULL,
  `batch_uuid` CHAR(36) NOT NULL,
  `idempotency_key` CHAR(36) NOT NULL,
  `recipient_user_id` BIGINT UNSIGNED NOT NULL,
  `installation_id` BIGINT UNSIGNED NULL,
  `push_token_id` BIGINT UNSIGNED NULL,
  `platform` ENUM('ios','android') NOT NULL,
  `provider` ENUM('onesignal','apns_voip') NOT NULL,
  `token` TEXT NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `apns_environment` ENUM('sandbox','production') NULL,
  `delivery_kind` VARCHAR(32) NOT NULL,
  `source_type` VARCHAR(32) NOT NULL,
  `source_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `payload` LONGTEXT NOT NULL,
  `status` ENUM('pending','processing','retry','sent','dead','cancelled') NOT NULL DEFAULT 'pending',
  `attempt_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` BIGINT UNSIGNED NOT NULL,
  `lease_until` BIGINT UNSIGNED NULL,
  `expires_at` BIGINT UNSIGNED NOT NULL,
  `provider_message_id` VARCHAR(191) NULL,
  `last_error` VARCHAR(255) NULL,
  `created_at` BIGINT UNSIGNED NOT NULL,
  `updated_at` BIGINT UNSIGNED NOT NULL,
  `sent_at` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dedupe_key` (`dedupe_key`),
  KEY `delivery_queue` (`status`, `next_attempt_at`, `lease_until`),
  KEY `recipient_source` (`recipient_user_id`, `source_type`, `source_id`),
  KEY `token_status` (`push_token_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_delivery_idempotency_key := (
  SELECT COUNT(*)
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_PushDeliveries'
    AND `column_name` = 'idempotency_key'
);
SET @add_delivery_idempotency_key := IF(
  @has_delivery_idempotency_key = 0,
  'ALTER TABLE `Wo_PushDeliveries` ADD COLUMN `idempotency_key` CHAR(36) NULL AFTER `batch_uuid`',
  'SELECT 1'
);
PREPARE delivery_idempotency_key_statement FROM @add_delivery_idempotency_key;
EXECUTE delivery_idempotency_key_statement;
DEALLOCATE PREPARE delivery_idempotency_key_statement;
UPDATE `Wo_PushDeliveries`
SET `idempotency_key` = UUID()
WHERE `idempotency_key` IS NULL OR `idempotency_key` = '';
ALTER TABLE `Wo_PushDeliveries`
  MODIFY COLUMN `idempotency_key` CHAR(36) NOT NULL;

SET @has_delivery_platform := (
  SELECT COUNT(*)
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_PushDeliveries'
    AND `column_name` = 'platform'
);
SET @add_delivery_platform := IF(
  @has_delivery_platform = 0,
  'ALTER TABLE `Wo_PushDeliveries` ADD COLUMN `platform` ENUM(''ios'',''android'') NOT NULL DEFAULT ''android'' AFTER `push_token_id`',
  'SELECT 1'
);
PREPARE delivery_platform_statement FROM @add_delivery_platform;
EXECUTE delivery_platform_statement;
DEALLOCATE PREPARE delivery_platform_statement;

-- Wo_Mute also contains message-specific favorites. Only rows with
-- message_id=0 represent conversation settings and may be deduplicated.
UPDATE `Wo_Mute`
SET `message_id` = 0
WHERE `message_id` IS NULL;

DELETE duplicate_mute
FROM `Wo_Mute` AS duplicate_mute
INNER JOIN `Wo_Mute` AS keeper
 ON keeper.`user_id` = duplicate_mute.`user_id`
 AND keeper.`type` = duplicate_mute.`type`
 AND keeper.`chat_id` = duplicate_mute.`chat_id`
 AND IFNULL(keeper.`message_id`, 0) = 0
 AND IFNULL(duplicate_mute.`message_id`, 0) = 0
 AND keeper.`id` > duplicate_mute.`id`;

SET @has_push_mute_user_id := (
  SELECT COUNT(*)
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_Mute'
    AND `column_name` = 'push_mute_user_id'
);
SET @add_push_mute_user_id := IF(
  @has_push_mute_user_id = 0,
  'ALTER TABLE `Wo_Mute` ADD COLUMN `push_mute_user_id` BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN IFNULL(`message_id`, 0) = 0 THEN `user_id` ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE push_mute_user_id_statement FROM @add_push_mute_user_id;
EXECUTE push_mute_user_id_statement;
DEALLOCATE PREPARE push_mute_user_id_statement;

SET @has_push_mute_type := (
  SELECT COUNT(*)
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_Mute'
    AND `column_name` = 'push_mute_type'
);
SET @add_push_mute_type := IF(
  @has_push_mute_type = 0,
  'ALTER TABLE `Wo_Mute` ADD COLUMN `push_mute_type` VARCHAR(16) GENERATED ALWAYS AS (CASE WHEN IFNULL(`message_id`, 0) = 0 THEN `type` ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE push_mute_type_statement FROM @add_push_mute_type;
EXECUTE push_mute_type_statement;
DEALLOCATE PREPARE push_mute_type_statement;

SET @has_push_mute_chat_id := (
  SELECT COUNT(*)
  FROM `information_schema`.`columns`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_Mute'
    AND `column_name` = 'push_mute_chat_id'
);
SET @add_push_mute_chat_id := IF(
  @has_push_mute_chat_id = 0,
  'ALTER TABLE `Wo_Mute` ADD COLUMN `push_mute_chat_id` BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN IFNULL(`message_id`, 0) = 0 THEN `chat_id` ELSE NULL END) STORED',
  'SELECT 1'
);
PREPARE push_mute_chat_id_statement FROM @add_push_mute_chat_id;
EXECUTE push_mute_chat_id_statement;
DEALLOCATE PREPARE push_mute_chat_id_statement;

SET @has_user_type_chat := (
  SELECT COUNT(*)
  FROM `information_schema`.`statistics`
  WHERE `table_schema` = DATABASE()
    AND `table_name` = 'Wo_Mute'
    AND `index_name` = 'user_type_chat'
);
SET @add_user_type_chat := IF(
  @has_user_type_chat = 0,
  'ALTER TABLE `Wo_Mute` ADD UNIQUE KEY `user_type_chat` (`push_mute_user_id`, `push_mute_type`, `push_mute_chat_id`)',
  'SELECT 1'
);
PREPARE user_type_chat_statement FROM @add_user_type_chat;
EXECUTE user_type_chat_statement;
DEALLOCATE PREPARE user_type_chat_statement;
