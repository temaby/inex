-- 1. Create the new table
CREATE TABLE IF NOT EXISTS `budget_category_map` (
  `budget_fk` int NOT NULL,
  `category_fk` int NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`budget_fk`,`category_fk`),
  KEY `budget_category_map__category__FK` (`category_fk`),
  CONSTRAINT `budget_category_map__budget__FK` FOREIGN KEY (`budget_fk`) REFERENCES `budget` (`budget_pk`) ON DELETE CASCADE,
  CONSTRAINT `budget_category_map__category__FK` FOREIGN KEY (`category_fk`) REFERENCES `category` (`category_pk`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrate existing data
INSERT INTO `budget_category_map` (`budget_fk`, `category_fk`, `created`, `updated`, `created_by`, `updated_by`)
SELECT `budget_fk`, `category_pk`, NOW(), NOW(), `user_fk`, `user_fk`
FROM `category`
WHERE `budget_fk` IS NOT NULL;

-- 3. Drop the old column (Execute only after verifying data migration)
-- ALTER TABLE `category` DROP FOREIGN KEY `FK_category_budget_budget_fk`; -- Check actual constraint name
-- ALTER TABLE `category` DROP COLUMN `budget_fk`;
