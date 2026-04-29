-- Create AssetType enum
CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'MOTORCYCLE', 'BOAT', 'JET_SKI', 'TRUCK', 'OTHER');

-- Migrate asset_type column from String to enum (best-effort mapping; unknown values become OTHER)
ALTER TABLE "customer_asset" ADD COLUMN "asset_type_new" "AssetType";
UPDATE "customer_asset" SET "asset_type_new" = CASE UPPER(REPLACE("asset_type", ' ', '_'))
  WHEN 'VEHICLE'    THEN 'VEHICLE'::"AssetType"
  WHEN 'CAR'        THEN 'VEHICLE'::"AssetType"
  WHEN 'MOTORCYCLE' THEN 'MOTORCYCLE'::"AssetType"
  WHEN 'BOAT'       THEN 'BOAT'::"AssetType"
  WHEN 'JET_SKI'    THEN 'JET_SKI'::"AssetType"
  WHEN 'TRUCK'      THEN 'TRUCK'::"AssetType"
  ELSE 'OTHER'::"AssetType"
END;
ALTER TABLE "customer_asset" DROP COLUMN "asset_type";
ALTER TABLE "customer_asset" RENAME COLUMN "asset_type_new" TO "asset_type";
ALTER TABLE "customer_asset" ALTER COLUMN "asset_type" SET NOT NULL;

-- Add new columns
ALTER TABLE "customer_asset" ADD COLUMN "custom_asset_type" VARCHAR(50);
ALTER TABLE "customer_asset" ADD COLUMN "country" VARCHAR(2);
ALTER TABLE "customer_asset" ADD COLUMN "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "customer_asset" ADD COLUMN "deleted_at" TIMESTAMP(3);
