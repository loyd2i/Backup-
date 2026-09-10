-- AlterTable
ALTER TABLE "OnelibCollection" ADD COLUMN "distributionFeeAmount" REAL;
ALTER TABLE "OnelibCollection" ADD COLUMN "distributionFeePaidAt" DATETIME;
ALTER TABLE "OnelibCollection" ADD COLUMN "distributionFeeStripeId" TEXT;

-- AlterTable
ALTER TABLE "OnelibRelease" ADD COLUMN "distributionFeeAmount" REAL;
ALTER TABLE "OnelibRelease" ADD COLUMN "distributionFeePaidAt" DATETIME;
ALTER TABLE "OnelibRelease" ADD COLUMN "distributionFeeStripeId" TEXT;
