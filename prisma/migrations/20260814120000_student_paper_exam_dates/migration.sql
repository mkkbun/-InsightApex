-- CreateTable
CREATE TABLE "StudentPaperExamDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPaperExamDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentPaperExamDate_userId_idx" ON "StudentPaperExamDate"("userId");

-- CreateIndex
CREATE INDEX "StudentPaperExamDate_paperId_idx" ON "StudentPaperExamDate"("paperId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPaperExamDate_userId_paperId_key" ON "StudentPaperExamDate"("userId", "paperId");

-- AddForeignKey
ALTER TABLE "StudentPaperExamDate" ADD CONSTRAINT "StudentPaperExamDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPaperExamDate" ADD CONSTRAINT "StudentPaperExamDate_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
