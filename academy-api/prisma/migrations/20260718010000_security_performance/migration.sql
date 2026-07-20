ALTER TABLE "EmailToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "MembershipOrder_status_startsAt_idx" ON "MembershipOrder"("status", "startsAt");
CREATE INDEX "MembershipOrder_status_planId_idx" ON "MembershipOrder"("status", "planId");
