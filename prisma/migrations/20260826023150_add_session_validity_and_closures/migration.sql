-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "class_closures" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "class_closures_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "class_closures" ADD CONSTRAINT "class_closures_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
