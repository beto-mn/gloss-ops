-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
