-- Composite indexes for the App conversation-list and feed batch read models.
-- Every statement is idempotent by index name. Run during a low-traffic window:
-- ALTER TABLE can still consume I/O even when MariaDB uses an online algorithm.

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_UsersChat' AND index_name = 'vnseea_user_page_time');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_UsersChat` ADD KEY `vnseea_user_page_time` (`user_id`,`page_id`,`time`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Messages' AND index_name = 'vnseea_direct_out_latest');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Messages` ADD KEY `vnseea_direct_out_latest` (`page_id`,`from_id`,`to_id`,`deleted_one`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Messages' AND index_name = 'vnseea_direct_in_latest');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Messages` ADD KEY `vnseea_direct_in_latest` (`page_id`,`to_id`,`from_id`,`deleted_two`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Messages' AND index_name = 'vnseea_direct_unread');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Messages` ADD KEY `vnseea_direct_unread` (`to_id`,`page_id`,`seen`,`deleted_two`,`from_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Messages' AND index_name = 'vnseea_page_out_latest');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Messages` ADD KEY `vnseea_page_out_latest` (`page_id`,`from_id`,`to_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Messages' AND index_name = 'vnseea_page_in_latest');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Messages` ADD KEY `vnseea_page_in_latest` (`page_id`,`to_id`,`from_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_GroupChatUsers' AND index_name = 'vnseea_group_active_members');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_GroupChatUsers` ADD KEY `vnseea_group_active_members` (`group_id`,`active`,`user_id`,`last_seen`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_GroupChat' AND index_name = 'vnseea_owner_chat_time');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_GroupChat` ADD KEY `vnseea_owner_chat_time` (`user_id`,`time`,`group_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_GroupChatUsers' AND index_name = 'vnseea_user_active_groups');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_GroupChatUsers` ADD KEY `vnseea_user_active_groups` (`user_id`,`active`,`group_id`,`last_seen`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Reactions' AND index_name = 'vnseea_post_reaction_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Reactions` ADD KEY `vnseea_post_reaction_user` (`post_id`,`reaction`,`user_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Reactions' AND index_name = 'vnseea_message_reaction_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Reactions` ADD KEY `vnseea_message_reaction_user` (`message_id`,`reaction`,`user_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Followers' AND index_name = 'vnseea_follower_active_following');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Followers` ADD KEY `vnseea_follower_active_following` (`follower_id`,`active`,`following_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Followers' AND index_name = 'vnseea_following_active_follower');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Followers` ADD KEY `vnseea_following_active_follower` (`following_id`,`active`,`follower_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Albums_Media' AND index_name = 'vnseea_parent_post_media');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Albums_Media` ADD KEY `vnseea_parent_post_media` (`parent_id`,`post_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Votes' AND index_name = 'vnseea_post_option_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Votes` ADD KEY `vnseea_post_option_user` (`post_id`,`option_id`,`user_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Posts' AND index_name = 'vnseea_profile_media_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Posts` ADD KEY `vnseea_profile_media_post` (`user_id`,`postType`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_ProductReview' AND index_name = 'vnseea_product_rating');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_ProductReview` ADD KEY `vnseea_product_rating` (`product_id`,`star`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Job_Apply' AND index_name = 'vnseea_job_apply_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Job_Apply` ADD KEY `vnseea_job_apply_user` (`job_id`,`user_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Live_Sub_Users' AND index_name = 'vnseea_live_recent_viewers');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Live_Sub_Users` ADD KEY `vnseea_live_recent_viewers` (`post_id`,`time`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Mute' AND index_name = 'vnseea_mute_conversation');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Mute` ADD KEY `vnseea_mute_conversation` (`user_id`,`type`,`chat_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Mute' AND index_name = 'vnseea_message_flags');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Mute` ADD KEY `vnseea_message_flags` (`user_id`,`message_id`,`pin`,`fav`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Posts' AND index_name = 'vnseea_product_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Posts` ADD KEY `vnseea_product_post` (`product_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Posts' AND index_name = 'vnseea_job_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Posts` ADD KEY `vnseea_job_post` (`job_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Posts' AND index_name = 'vnseea_offer_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Posts` ADD KEY `vnseea_offer_post` (`offer_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Posts' AND index_name = 'vnseea_share_source');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Posts` ADD KEY `vnseea_share_source` (`post_id`,`postShare`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Likes' AND index_name = 'vnseea_post_like_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Likes` ADD KEY `vnseea_post_like_user` (`post_id`,`user_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Wonders' AND index_name = 'vnseea_post_wonder_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Wonders` ADD KEY `vnseea_post_wonder_user` (`post_id`,`user_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_SavedPosts' AND index_name = 'vnseea_saved_user_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_SavedPosts` ADD KEY `vnseea_saved_user_post` (`user_id`,`post_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Reports' AND index_name = 'vnseea_report_user_post');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Reports` ADD KEY `vnseea_report_user_post` (`user_id`,`post_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Reports' AND index_name = 'vnseea_report_user_group');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Reports` ADD KEY `vnseea_report_user_group` (`user_id`,`group_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_PinnedPosts' AND index_name = 'vnseea_pinned_post_active');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_PinnedPosts` ADD KEY `vnseea_pinned_post_active` (`post_id`,`active`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Pages_Likes' AND index_name = 'vnseea_page_like_user_active');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Pages_Likes` ADD KEY `vnseea_page_like_user_active` (`user_id`,`active`,`page_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_PageAdmins' AND index_name = 'vnseea_page_admin_user');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_PageAdmins` ADD KEY `vnseea_page_admin_user` (`user_id`,`page_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Group_Members' AND index_name = 'vnseea_group_member_active');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Group_Members` ADD KEY `vnseea_group_member_active` (`group_id`,`active`,`user_id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Blocks' AND index_name = 'vnseea_blocker_blocked');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Blocks` ADD KEY `vnseea_blocker_blocked` (`blocker`,`blocked`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_Blocks' AND index_name = 'vnseea_blocked_blocker');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_Blocks` ADD KEY `vnseea_blocked_blocker` (`blocked`,`blocker`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_UserCard' AND index_name = 'vnseea_cart_user_product');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_UserCard` ADD KEY `vnseea_cart_user_product` (`user_id`,`product_id`,`id`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_index := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Wo_MonetizationSubscription' AND index_name = 'vnseea_paid_subscription_lookup');
SET @sql := IF(@has_index = 0, 'ALTER TABLE `Wo_MonetizationSubscription` ADD KEY `vnseea_paid_subscription_lookup` (`user_id`,`status`,`monetization_id`,`last_payment_date`)', 'SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;
