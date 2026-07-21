CREATE TABLE IF NOT EXISTS `Wo_MessagePins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `pinned_by` BIGINT UNSIGNED NOT NULL,
  `pinned_at` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `message_id` (`message_id`),
  KEY `pinned_by` (`pinned_by`),
  KEY `pinned_at` (`pinned_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `Wo_MessagePins` (`message_id`, `pinned_by`, `pinned_at`)
SELECT
  legacy.`message_id`,
  CAST(
    SUBSTRING_INDEX(
      GROUP_CONCAT(legacy.`user_id` ORDER BY legacy.`time` DESC, legacy.`id` DESC),
      ',',
      1
    ) AS UNSIGNED
  ) AS `pinned_by`,
  MAX(legacy.`time`) AS `pinned_at`
FROM `Wo_Mute` AS legacy
INNER JOIN `Wo_Messages` AS message ON message.`id` = legacy.`message_id`
WHERE legacy.`pin` = 'yes'
  AND legacy.`message_id` > 0
  AND (message.`group_id` > 0 OR (message.`group_id` = 0 AND message.`page_id` = 0))
GROUP BY legacy.`message_id`;
