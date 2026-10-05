
-- AlterEnum
ALTER TYPE "AnimalActivityType" ADD VALUE 'VITALS_RECORDED';

-- AlterTable
ALTER TABLE "animals" DROP COLUMN "weight_kg",
ADD COLUMN     "current_weight_grams" INTEGER;

-- CreateTable
CREATE TABLE "vitals_logs" (
    "id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_grams" INTEGER,
    "temperature_c" DOUBLE PRECISION,
    "body_condition_score" INTEGER,
    "notes" TEXT,
    "animal_id" TEXT NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vitals_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vitals_logs_animal_id_recorded_at_idx" ON "vitals_logs"("animal_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "vitals_logs" ADD CONSTRAINT "vitals_logs_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals_logs" ADD CONSTRAINT "vitals_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
