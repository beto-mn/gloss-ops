-- AlterTable
ALTER TABLE "customer_asset" ALTER COLUMN "custom_asset_type" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "service" ADD COLUMN     "default_inventory_id" UUID,
ADD COLUMN     "default_quantity" DECIMAL(10,3);

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_default_inventory_id_fkey" FOREIGN KEY ("default_inventory_id") REFERENCES "inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
