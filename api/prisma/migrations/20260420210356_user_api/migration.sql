/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `guestsCount` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "updatedAt",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "guestsCount",
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "fio" TEXT,
ADD COLUMN     "passengers" TEXT,
ADD COLUMN     "plate" TEXT,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "participantId" INTEGER NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
