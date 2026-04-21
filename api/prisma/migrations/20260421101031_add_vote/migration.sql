-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "vkAttachments" TEXT;

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "vkId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_participantId_vkId_key" ON "Vote"("participantId", "vkId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
