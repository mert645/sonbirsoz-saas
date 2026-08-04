-- NewsletterSubscriber: token'lı abonelik iptali + son gönderim takibi
ALTER TABLE "newsletter_subscribers" ADD COLUMN "unsubscribeToken" TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN "lastSentAt" TIMESTAMP(3);

-- Mevcut aboneler için token backfill (cuid benzeri rastgele değer)
UPDATE "newsletter_subscribers"
SET "unsubscribeToken" = 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24)
WHERE "unsubscribeToken" IS NULL;

ALTER TABLE "newsletter_subscribers" ALTER COLUMN "unsubscribeToken" SET NOT NULL;

CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribeToken_key"
  ON "newsletter_subscribers"("unsubscribeToken");
