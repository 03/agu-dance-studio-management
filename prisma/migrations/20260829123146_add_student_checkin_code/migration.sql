-- AlterTable
-- gen_random_uuid() is evaluated per row, so every existing student gets
-- its own distinct value — no duplicate risk despite the unique constraint
-- added right after.
ALTER TABLE "students" ADD COLUMN     "checkInCode" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "students_checkInCode_key" ON "students"("checkInCode");
