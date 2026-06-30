-- AlterTable
ALTER TABLE "Class" DROP COLUMN "schedule";

-- CreateTable
CREATE TABLE "ClassSlot" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ClassSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSlot_classId_idx" ON "ClassSlot"("classId");

-- AddForeignKey
ALTER TABLE "ClassSlot" ADD CONSTRAINT "ClassSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
