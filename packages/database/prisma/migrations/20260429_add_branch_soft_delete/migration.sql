-- AlterTable
ALTER TABLE "branch" ADD COLUMN     "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "branch" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- DropForeignKey
ALTER TABLE "organization_member" DROP CONSTRAINT "organization_member_branch_id_fkey";

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
