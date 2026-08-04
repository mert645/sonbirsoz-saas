-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('APPROVED', 'REJECTED', 'REVIEW');

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "commentId" TEXT,
    "contentType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "scores" JSONB NOT NULL,
    "maxCategory" TEXT,
    "maxScore" DOUBLE PRECISION,
    "reason" TEXT,
    "model" TEXT,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_logs_decision_createdAt_idx" ON "moderation_logs"("decision", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "moderation_logs_articleId_idx" ON "moderation_logs"("articleId");

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

