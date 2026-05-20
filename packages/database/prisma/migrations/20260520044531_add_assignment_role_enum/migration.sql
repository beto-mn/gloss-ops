/*
  Warnings:

  - The `role` column on the `work_order_assignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('LEAD', 'ASSISTANT');

-- AlterTable
ALTER TABLE "work_order_assignment" DROP COLUMN "role",
ADD COLUMN     "role" "AssignmentRole" NOT NULL DEFAULT 'ASSISTANT';
