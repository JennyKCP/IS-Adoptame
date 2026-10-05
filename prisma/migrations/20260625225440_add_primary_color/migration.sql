
-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "primary_color_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_primary_color_id_fkey" FOREIGN KEY ("primary_color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
