-- 1. Add new values to AssetType enum
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'ATV_UTV';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'AIRCRAFT';

-- 2. Cast Brand.category from brand_category → AssetType (same values, trivial cast)
ALTER TABLE "brand"
  ALTER COLUMN "category" TYPE "AssetType"
  USING category::text::"AssetType";

-- 3. Drop the now-redundant enum
DROP TYPE IF EXISTS "brand_category";

-- 4. Fill existing NULLs with a placeholder before adding NOT NULL constraint
UPDATE "customer_asset" SET "model"      = 'N/A' WHERE "model"      IS NULL;
UPDATE "customer_asset" SET "identifier" = 'N/A' WHERE "identifier" IS NULL;

-- 5. Make model and identifier NOT NULL
--    (brandId stays nullable — enforced at DTO level, not DB level)
ALTER TABLE "customer_asset" ALTER COLUMN "model"      SET NOT NULL;
ALTER TABLE "customer_asset" ALTER COLUMN "identifier" SET NOT NULL;
