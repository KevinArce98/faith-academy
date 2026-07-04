-- CreateTable
CREATE TABLE "EnrollmentPayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "receiptUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentPayment_studentId_idx" ON "EnrollmentPayment"("studentId");

-- CreateIndex
CREATE INDEX "EnrollmentPayment_status_idx" ON "EnrollmentPayment"("status");

-- CreateIndex
CREATE INDEX "EnrollmentPayment_studentId_status_idx" ON "EnrollmentPayment"("studentId", "status");

-- AddForeignKey
ALTER TABLE "EnrollmentPayment" ADD CONSTRAINT "EnrollmentPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
