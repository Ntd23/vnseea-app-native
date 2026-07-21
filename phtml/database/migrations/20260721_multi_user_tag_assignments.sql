-- Keep one row for every exact assignment before changing the unique key.
DELETE duplicate_assignment
FROM `user_tag_assignments` AS duplicate_assignment
INNER JOIN `user_tag_assignments` AS keeper
  ON keeper.`owner_id` = duplicate_assignment.`owner_id`
 AND keeper.`target_user_id` = duplicate_assignment.`target_user_id`
 AND keeper.`tag_id` = duplicate_assignment.`tag_id`
 AND keeper.`id` > duplicate_assignment.`id`;

SET @old_pair_index := COALESCE((
  SELECT grouped_indexes.`index_name`
  FROM (
    SELECT
      `index_name`,
      `non_unique`,
      GROUP_CONCAT(`column_name` ORDER BY `seq_in_index` SEPARATOR ',') AS `columns_list`
    FROM `information_schema`.`statistics`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'user_tag_assignments'
    GROUP BY `index_name`, `non_unique`
  ) AS grouped_indexes
  WHERE grouped_indexes.`non_unique` = 0
    AND grouped_indexes.`index_name` <> 'PRIMARY'
    AND grouped_indexes.`columns_list` = 'owner_id,target_user_id'
  LIMIT 1
), '');

SET @drop_pair_index_sql := IF(
  @old_pair_index = '',
  'SELECT 1',
  CONCAT('ALTER TABLE `user_tag_assignments` DROP INDEX `', REPLACE(@old_pair_index, '`', '``'), '`')
);
PREPARE drop_pair_index_statement FROM @drop_pair_index_sql;
EXECUTE drop_pair_index_statement;
DEALLOCATE PREPARE drop_pair_index_statement;

SET @has_triple_index := (
  SELECT COUNT(*)
  FROM (
    SELECT
      `index_name`,
      `non_unique`,
      GROUP_CONCAT(`column_name` ORDER BY `seq_in_index` SEPARATOR ',') AS `columns_list`
    FROM `information_schema`.`statistics`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'user_tag_assignments'
    GROUP BY `index_name`, `non_unique`
  ) AS grouped_indexes
  WHERE grouped_indexes.`non_unique` = 0
    AND grouped_indexes.`columns_list` = 'owner_id,target_user_id,tag_id'
);

SET @add_triple_index_sql := IF(
  @has_triple_index > 0,
  'SELECT 1',
  'ALTER TABLE `user_tag_assignments` ADD UNIQUE KEY `uniq_owner_target_tag` (`owner_id`,`target_user_id`,`tag_id`)'
);
PREPARE add_triple_index_statement FROM @add_triple_index_sql;
EXECUTE add_triple_index_statement;
DEALLOCATE PREPARE add_triple_index_statement;
