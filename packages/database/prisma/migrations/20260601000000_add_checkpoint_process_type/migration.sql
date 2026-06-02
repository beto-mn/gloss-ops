-- AlterEnum
ALTER TYPE "CheckpointType" ADD VALUE 'PROCESS';

-- AlterTable: add process_type column
ALTER TABLE "asset_checkpoint" ADD COLUMN "process_type" TEXT;

-- DropIndex: remove global unique (RECEPTION/DELIVERY uniqueness now enforced in service layer)
DROP INDEX "asset_checkpoint_work_order_id_type_key";

-- CreateIndex: regular index for query performance
CREATE INDEX "asset_checkpoint_work_order_id_type_idx" ON "asset_checkpoint"("work_order_id", "type");

-- Partial unique indexes to enforce one RECEPTION and one DELIVERY per work order
CREATE UNIQUE INDEX "asset_checkpoint_reception_unique" ON "asset_checkpoint"("work_order_id") WHERE "type" = 'RECEPTION';
CREATE UNIQUE INDEX "asset_checkpoint_delivery_unique" ON "asset_checkpoint"("work_order_id") WHERE "type" = 'DELIVERY';
