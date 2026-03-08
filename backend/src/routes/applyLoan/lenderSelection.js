import express from 'express';
import Lender from '../../models/Lender.js';
import LoanApplication from '../../models/LoanApplication.js';

const router = express.Router();


// ─────────────────────────────────────────
// Route — Get Eligible and Ineligible Lenders
// POST /api/apply-loan/lender-selection/match
// Takes ntcScore, riskTier, loanAmount
// Goes through all active lenders in DB
// Splits into eligible and ineligible
// ─────────────────────────────────────────
router.post('/match', async (req, res) => {

  const { ntcScore, riskTier, loanAmount } = req.body;

  if (!ntcScore || !riskTier || !loanAmount) {
    return res.status(400).json({
      success: false,
      message: 'ntcScore, riskTier and loanAmount are required'
    });
  }

  try {

    // Find current draft application
    const application = await LoanApplication.findOne({
      userId: req.user.id,
      status: 'draft'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    // Fetch all active lenders from DB
    const allLenders = await Lender.find({ status: 'active' });

    const eligibleLenders = [];
    const ineligibleLenders = [];

    for (const lender of allLenders) {

      const reasons = [];

      // Check 1 — NTC score
      if (ntcScore < lender.ntcPolicy.minimumNtcScore) {
        reasons.push(
          `Minimum score required is ${lender.ntcPolicy.minimumNtcScore}. Your score is ${ntcScore}.`
        );
      }

      // Check 2 — Risk tier
      if (!lender.ntcPolicy.acceptedRiskTiers.includes(riskTier)) {
        reasons.push(
          `Your risk tier ${riskTier} is not accepted by this lender.`
        );
      }

      // Check 3 — Loan amount minimum
      if (loanAmount < lender.loanOffering.minLoanAmount) {
        reasons.push(
          `Minimum loan amount for this lender is ${lender.loanOffering.minLoanAmount} rupees.`
        );
      }

      // Check 4 — Loan amount maximum
      if (loanAmount > lender.loanOffering.maxLoanAmount) {
        reasons.push(
          `Maximum loan amount for this lender is ${lender.loanOffering.maxLoanAmount} rupees.`
        );
      }

      if (reasons.length === 0) {

        // Borrower is eligible
        // Calculate personalised interest rate for this borrower
        // Higher NTC score = rate closer to minimum
        // Lower NTC score = rate closer to maximum
        const maxPossibleScore = 850;
        const scoreRange = maxPossibleScore - lender.ntcPolicy.minimumNtcScore;
        const borrowerScoreAboveMin = ntcScore - lender.ntcPolicy.minimumNtcScore;
        const scoreRatio = borrowerScoreAboveMin / scoreRange;
        const rateRange = lender.loanOffering.interestRateRange.max - lender.loanOffering.interestRateRange.min;
        const offeredRate = lender.loanOffering.interestRateRange.max - (scoreRatio * rateRange);
        const finalRate = Math.round(offeredRate * 10) / 10;

        // Calculate EMI at offered rate
        const P = loanAmount;
        const r = finalRate / 12 / 100;
        const n = lender.loanOffering.tenureRange.maxMonths;
        const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

        eligibleLenders.push({
          lenderId: lender.lenderId,
          name: lender.name,
          logo: lender.logo,
          tagline: lender.tagline,
          offeredInterestRate: finalRate,
          processingFeePercentage: lender.loanOffering.processingFeePercentage,
          processingFeeAmount: Math.round(loanAmount * lender.loanOffering.processingFeePercentage / 100),
          tenureRange: lender.loanOffering.tenureRange,
          estimatedEmi: emi,
          averageDisbursalHours: lender.disbursal.averageDisbursalHours,
          rating: lender.reputation.rating,
          eligible: true
        });

      } else {

        // Borrower is not eligible
        ineligibleLenders.push({
          lenderId: lender.lenderId,
          name: lender.name,
          logo: lender.logo,
          tagline: lender.tagline,
          rating: lender.reputation.rating,
          eligible: false,
          ineligibilityReasons: reasons
        });

      }
    }

    // Sort eligible lenders by offered rate lowest first
    // Best deal shown at top
    eligibleLenders.sort((a, b) => a.offeredInterestRate - b.offeredInterestRate);

    return res.status(200).json({
      success: true,
      data: {
        totalLenders: allLenders.length,
        eligibleCount: eligibleLenders.length,
        ineligibleCount: ineligibleLenders.length,
        eligibleLenders,
        ineligibleLenders
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


export default router;