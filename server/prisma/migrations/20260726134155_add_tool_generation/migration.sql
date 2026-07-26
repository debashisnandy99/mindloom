-- CreateEnum
CREATE TYPE "ToolKind" AS ENUM ('MINDMAP', 'QUIZ', 'CONCEPT_TABLE', 'FLASHCARDS', 'SUMMARY', 'TIMELINE');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('IDLE', 'QUEUED', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "ToolGeneration" (
    "id" TEXT NOT NULL,
    "kind" "ToolKind" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'IDLE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "generatedMs" INTEGER NOT NULL DEFAULT 0,
    "notebookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolGeneration_notebookId_idx" ON "ToolGeneration"("notebookId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolGeneration_notebookId_kind_key" ON "ToolGeneration"("notebookId", "kind");

-- AddForeignKey
ALTER TABLE "ToolGeneration" ADD CONSTRAINT "ToolGeneration_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
