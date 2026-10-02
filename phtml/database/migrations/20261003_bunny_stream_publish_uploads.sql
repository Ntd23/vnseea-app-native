-- English description: Lets Bunny Stream uploads back posts, reels and stories that stay unpublished until their video is encoded.

ALTER TABLE `Wo_VnseeaMediaUploads`
  MODIFY `status` ENUM('created','uploaded','ready','failed','deleted') NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS `post_id` INT UNSIGNED NULL DEFAULT NULL AFTER `message_id`,
  ADD COLUMN IF NOT EXISTS `story_id` INT UNSIGNED NULL DEFAULT NULL AFTER `post_id`,
  ADD COLUMN IF NOT EXISTS `publish_state` VARCHAR(16) NOT NULL DEFAULT '' AFTER `story_id`,
  ADD COLUMN IF NOT EXISTS `publish_payload` MEDIUMTEXT NULL AFTER `publish_state`,
  ADD COLUMN IF NOT EXISTS `published_at` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `publish_payload`,
  ADD INDEX IF NOT EXISTS `post_id` (`post_id`),
  ADD INDEX IF NOT EXISTS `story_id` (`story_id`),
  ADD INDEX IF NOT EXISTS `publish_state` (`publish_state`, `updated_at`);
