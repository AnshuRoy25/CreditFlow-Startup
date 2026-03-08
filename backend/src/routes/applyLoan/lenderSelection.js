// routes/applyLoan/lenderSelection.js

import express from 'express';
import Lender from '../../models/Lender.js';
import LoanApplication from '../../models/LoanApplication.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();


// ─────────────────────────────────────────────────────────
// Route 1 — Get Eligible and Ineligible Lenders
// POST /api/apply-loan/lender-selection/match
// Takes ntcScore, riskTier, loanAmount from req.body
// Returns eligible and ineligible lenders
// ─────────────────────────────────────────────────────────
router.post('/match', async (req, res) => {

  const { ntcScore, riskTier, loanAmount } = req.body;

  if (!ntcScore || !riskTier || !loanAmount) {
    return res.status(400).json({
      success: false,
      message: 'ntcScore, riskTier and loanAmount are required'
    });
  }

  try {

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

    const allLenders = await Lender.find({ status: 'active' });

    const eligibleLenders   = [];
    const ineligibleLenders = [];

    for (const lender of allLenders) {

      const reasons = [];

      // Check 1 — NTC score minimum
      if (ntcScore < lender.ntcPolicy.minimumNtcScore) {
        reasons.push(
          `Minimum score required is ${lender.ntcPolicy.minimumNtcScore}. Your score is ${ntcScore}.`
        );
      }

      // Check 2 — Risk tier accepted
      if (!lender.ntcPolicy.acceptedRiskTiers.includes(riskTier)) {
        reasons.push(
          `Your risk tier ${riskTier} is not accepted by this lender.`
        );
      }

      // Check 3 — Loan amount minimum
      if (loanAmount < lender.loanOffering.minLoanAmount) {
        reasons.push(
          `Minimum loan amount for this lender is ₹${lender.loanOffering.minLoanAmount}.`
        );
      }

      // Check 4 — Loan amount maximum
      if (loanAmount > lender.loanOffering.maxLoanAmount) {
        reasons.push(
          `Maximum loan amount for this lender is ₹${lender.loanOffering.maxLoanAmount}.`
        );
      }

      if (reasons.length === 0) {

        // Calculate personalised interest rate
        // Higher NTC score → rate closer to minimum
        // Lower NTC score → rate closer to maximum
        const maxPossibleScore = 850;
        const scoreRange       = maxPossibleScore - lender.ntcPolicy.minimumNtcScore;
        const borrowerAboveMin = ntcScore - lender.ntcPolicy.minimumNtcScore;
        const scoreRatio       = borrowerAboveMin / scoreRange;
        const rateRange        = lender.loanOffering.interestRateRange.max - lender.loanOffering.interestRateRange.min;
        const offeredRate      = lender.loanOffering.interestRateRange.max - (scoreRatio * rateRange);
        const finalRate        = Math.round(offeredRate * 10) / 10;

        // Calculate indicative EMI at offered rate for max tenure
        // This is shown to the user to compare lenders — not confirmed by lender
        const P   = loanAmount;
        const r   = finalRate / 12 / 100;
        const n   = lender.loanOffering.tenureRange.maxMonths;
        const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

        const processingFeeAmount = Math.round(loanAmount * lender.loanOffering.processingFeePercentage / 100);

        eligibleLenders.push({
          lenderId:                lender.lenderId,       // "LND001" string
          lenderObjectId:          lender._id,            // ObjectId — needed in /select
          name:                    lender.name,
          logo:                    lender.logo,
          tagline:                 lender.tagline,
          offeredInterestRate:     finalRate,             // indicative — CreditFlow's estimate
          processingFeePercentage: lender.loanOffering.processingFeePercentage,
          processingFeeAmount,                            // indicative
          tenureRange:             lender.loanOffering.tenureRange,
          estimatedEmi:            emi,                   // indicative
          averageDisbursalHours:   lender.disbursal.averageDisbursalHours,
          rating:                  lender.reputation.rating,
          eligible:                true
        });

      } else {

        ineligibleLenders.push({
          lenderId:             lender.lenderId,
          name:                 lender.name,
          logo:                 lender.logo,
          tagline:              lender.tagline,
          rating:               lender.reputation.rating,
          eligible:             false,
          ineligibilityReasons: reasons
        });

      }
    }

    // Sort eligible lenders — lowest rate first
    eligibleLenders.sort((a, b) => a.offeredInterestRate - b.offeredInterestRate);

    return res.status(200).json({
      success: true,
      data: {
        totalLenders:    allLenders.length,
        eligibleCount:   eligibleLenders.length,
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


// Route 2 — Select a Lender
// POST /api/apply-loan/lender-selection/select
// Saves who the user picked. Status stays draft.
// currentStep moves to confirmation — nothing submitted yet.
router.post('/select', async (req, res) => {

  const { lenderObjectId, lenderId } = req.body;

  if (!lenderObjectId || !lenderId) {
    return res.status(400).json({
      success: false,
      message: 'lenderObjectId and lenderId are required'
    });
  }

  try {

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

    const lender = await Lender.findById(lenderObjectId);

    if (!lender || lender.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Selected lender is no longer available. Please go back and select again.'
      });
    }

    application.lenderSelection = {
      lenderId:     lenderObjectId,
      lenderCode:   lenderId,
      name:         lender.name,
      selectedAt:   new Date(),
      lenderStatus: 'pending'
    };

    // Status stays draft — user hasn't confirmed yet
    application.currentStep = 'confirmation';

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Lender selected. Proceed to confirmation.',
      data: {
        applicationId: application.applicationId,
        nextStep:      'confirmation'
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