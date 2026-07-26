-- AlterTable
ALTER TABLE "QueryToSource" ADD COLUMN     "chunkIndex" INTEGER,
ADD COLUMN     "contentUrl" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "pageNumber" INTEGER,
ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "startSeconds" INTEGER,
ADD COLUMN     "timestamp" TEXT;
