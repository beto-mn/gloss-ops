-- CreateIndex
CREATE UNIQUE INDEX "service_organization_id_name_key" ON "service"("organization_id", "name");
