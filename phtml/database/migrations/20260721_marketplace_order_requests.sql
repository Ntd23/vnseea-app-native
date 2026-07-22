SET @vnseea_schema = DATABASE();

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_UserOrders'
      AND COLUMN_NAME = 'order_flow'
  ),
  'SELECT 1',
  "ALTER TABLE `Wo_UserOrders` ADD COLUMN `order_flow` VARCHAR(16) NOT NULL DEFAULT 'prepaid' AFTER `status`"
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_UserOrders'
      AND COLUMN_NAME = 'stock_reserved'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_UserOrders` ADD COLUMN `stock_reserved` TINYINT(1) NOT NULL DEFAULT 1 AFTER `order_flow`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Messages'
      AND COLUMN_NAME = 'market_order_hash'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Messages` ADD COLUMN `market_order_hash` VARCHAR(64) NULL AFTER `product_id`'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

SET @vnseea_sql = IF(
  EXISTS(
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @vnseea_schema
      AND TABLE_NAME = 'Wo_Messages'
      AND INDEX_NAME = 'idx_market_order_hash'
  ),
  'SELECT 1',
  'ALTER TABLE `Wo_Messages` ADD INDEX `idx_market_order_hash` (`market_order_hash`)'
);
PREPARE vnseea_stmt FROM @vnseea_sql;
EXECUTE vnseea_stmt;
DEALLOCATE PREPARE vnseea_stmt;

UPDATE `Wo_UserOrders`
SET `order_flow` = 'prepaid'
WHERE `order_flow` IS NULL OR `order_flow` = '';

UPDATE `Wo_UserOrders`
SET `stock_reserved` = 1
WHERE `stock_reserved` IS NULL;
