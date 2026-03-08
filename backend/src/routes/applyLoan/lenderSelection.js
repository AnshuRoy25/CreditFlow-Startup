import express from 'express';
import Lender from '../../models/Lender.js';
import LoanApplication from '../../models/LoanApplication.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();


// ─────────────────────────────────────────
// Route 1 — Get Eligible and Ineligible Lenders
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

        // Calculate personalised interest rate for this borrower
        // Higher NTC score = rate closer to minimum
        // Lower NTC score = rate closer to maximum
        const maxPossibleScore  = 850;
        const scoreRange        = maxPossibleScore - lender.ntcPolicy.minimumNtcScore;
        const borrowerAboveMin  = ntcScore - lender.ntcPolicy.minimumNtcScore;
        const scoreRatio        = borrowerAboveMin / scoreRange;
        const rateRange         = lender.loanOffering.interestRateRange.max - lender.loanOffering.interestRateRange.min;
        const offeredRate       = lender.loanOffering.interestRateRange.max - (scoreRatio * rateRange);
        const finalRate         = Math.round(offeredRate * 10) / 10;

        // Calculate EMI at offered rate for max tenure
        const P   = loanAmount;
        const r   = finalRate / 12 / 100;
        const n   = lender.loanOffering.tenureRange.maxMonths;
        const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));

        const processingFeeAmount = Math.round(loanAmount * lender.loanOffering.processingFeePercentage / 100);

        eligibleLenders.push({
          lenderId:                lender.lenderId,
          lenderObjectId:          lender._id,        // needed for select route
          name:                    lender.name,
          logo:                    lender.logo,
          tagline:                 lender.tagline,
          offeredInterestRate:     finalRate,
          processingFeePercentage: lender.loanOffering.processingFeePercentage,
          processingFeeAmount,
          tenureRange:             lender.loanOffering.tenureRange,
          estimatedEmi:            emi,
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

    // Sort eligible lenders by offered rate lowest first
    eligibleLenders.sort((a, b) => a.offeredInterestRate - b.offeredInterestRate);

    return res.status(200).json({
      success: true,
      data: {
        totalLenders:      allLenders.length,
        eligibleCount:     eligibleLenders.length,
        ineligibleCount:   ineligibleLenders.length,
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


// ─────────────────────────────────────────
// Route 2 — Select a Lender and Submit Application
// POST /api/apply-loan/lender-selection/select
// Called when user picks a lender and clicks Submit
// Saves lender selection snapshot and marks application as submitted
// ─────────────────────────────────────────
router.post('/select', async (req, res) => {

  const {
    lenderObjectId,
    lenderId,
    selectedTenureMonths,
    offeredInterestRate,
    processingFeePercentage,
    processingFeeAmount,
    estimatedEmi
  } = req.body;

  if (
    !lenderObjectId        ||
    !lenderId              ||
    !selectedTenureMonths  ||
    !offeredInterestRate   ||
    !processingFeePercentage ||
    !processingFeeAmount   ||
    !estimatedEmi
  ) {
    return res.status(400).json({
      success: false,
      message: 'All lender selection fields are required'
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

    // Verify lender actually exists and is still active
    const lender = await Lender.findById(lenderObjectId);

    if (!lender || lender.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Selected lender is no longer available. Please go back and select again.'
      });
    }

    // Save the lender selection snapshot
    // We store both the ObjectId (for populate) and lenderCode string (for display)
    application.lenderSelection = {
      lenderId:                lenderObjectId,
      lenderCode:              lenderId,
      name:                    lender.name,
      offeredInterestRate:     Number(offeredInterestRate),
      processingFeePercentage: Number(processingFeePercentage),
      processingFeeAmount:     Number(processingFeeAmount),
      estimatedEmi:            Number(estimatedEmi),
      selectedTenureMonths:    Number(selectedTenureMonths),
      selectedAt:              new Date(),
      lenderStatus:            'pending',
      approvedLoanAmount:      null,
      lenderRemarks:           null,
      lenderRespondedAt:       null
    };

    // Move application to submitted state
    application.currentStep = 'submitted';
    application.status      = 'submitted';

    await application.save();

    // Notify the user that their application has been submitted
    await createNotification(
      req.user.id,
      'Application Submitted',
      `Your loan application ${application.applicationId} has been submitted to ${lender.name}. You will hear back within ${lender.disbursal.averageDisbursalHours} hours.`,
      'application',
      application.applicationId
    );

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId:      application.applicationId,
        status:             application.status,
        lenderName:         lender.name,
        selectedTenureMonths,
        offeredInterestRate,
        estimatedEmi,
        processingFeeAmount,
        averageDisbursalHours: lender.disbursal.averageDisbursalHours
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