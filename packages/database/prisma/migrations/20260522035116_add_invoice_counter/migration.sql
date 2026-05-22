-- CreateTable
CREATE TABLE "invoice_counter" (
    "branch_id" UUID NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counter_pkey" PRIMARY KEY ("branch_id")
);

-- AddForeignKey
ALTER TABLE "invoice_counter" ADD CONSTRAINT "invoice_counter_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
