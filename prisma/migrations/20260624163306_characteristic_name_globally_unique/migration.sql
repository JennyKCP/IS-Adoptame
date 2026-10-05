
-- DropIndex
DROP INDEX "characteristics_name_category_key";

-- CreateIndex
CREATE UNIQUE INDEX "characteristics_name_key" ON "characteristics"("name");
