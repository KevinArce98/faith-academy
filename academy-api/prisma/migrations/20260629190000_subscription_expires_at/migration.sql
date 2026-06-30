-- AlterTable
ALTER TABLE "MonthlySubscription" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MonthlySubscription_studentId_isPaid_expiresAt_idx" ON "MonthlySubscription"("studentId", "isPaid", "expiresAt");

-- Backfill: las mensualidades ya pagadas vencen 1 mes después de su fecha de pago
-- (o del período si no se registró paidAt), para no bloquear a los alumnos vigentes.
UPDATE "MonthlySubscription"
SET "expiresAt" = COALESCE("paidAt", "period") + INTERVAL '1 month'
WHERE "isPaid" = true AND "expiresAt" IS NULL;
