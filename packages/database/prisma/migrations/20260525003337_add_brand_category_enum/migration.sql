-- CreateEnum
CREATE TYPE "brand_category" AS ENUM ('VEHICLE', 'MOTORCYCLE', 'TRUCK', 'BOAT', 'JET_SKI', 'AIRCRAFT', 'OTHER');

-- AlterTable: cast existing string values to the new enum
ALTER TABLE "brand"
  ALTER COLUMN "category" TYPE "brand_category"
  USING (
    CASE "category"
      WHEN 'vehicle'    THEN 'VEHICLE'::"brand_category"
      WHEN 'motorcycle' THEN 'MOTORCYCLE'::"brand_category"
      WHEN 'truck'      THEN 'TRUCK'::"brand_category"
      WHEN 'boat'       THEN 'BOAT'::"brand_category"
      WHEN 'jet_ski'    THEN 'JET_SKI'::"brand_category"
      WHEN 'aircraft'   THEN 'AIRCRAFT'::"brand_category"
      ELSE                   'OTHER'::"brand_category"
    END
  );
