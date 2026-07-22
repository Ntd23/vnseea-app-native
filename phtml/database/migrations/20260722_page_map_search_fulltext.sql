-- Optional acceleration for map Page typeahead.
--
-- The API detects this exact index name at runtime. Installations that do not
-- support InnoDB FULLTEXT can skip this migration; map discovery will continue
-- using its legacy LIKE query without changing the response contract.

SET @vnseea_schema = DATABASE();

SET @vnseea_pages_table_ready = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @vnseea_schema
    AND TABLE_NAME = 'Wo_Pages'
    AND COLUMN_NAME IN ('page_name', 'page_title', 'address')
);

SET @vnseea_page_search_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @vnseea_schema
    AND TABLE_NAME = 'Wo_Pages'
    AND INDEX_NAME = 'idx_pages_map_search_fulltext'
);

SET @vnseea_sql = IF(
  @vnseea_pages_table_ready = 3 AND @vnseea_page_search_index_exists = 0,
  'ALTER TABLE `Wo_Pages` ADD FULLTEXT INDEX `idx_pages_map_search_fulltext` (`page_name`, `page_title`, `address`)',
  'SELECT 1'
);

PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;
