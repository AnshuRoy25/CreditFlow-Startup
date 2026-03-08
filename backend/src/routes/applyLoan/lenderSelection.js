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

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'draft',
      currentStep: 'report-generated'
    }).populate('reportId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or report not yet generated.'
      });
    }

    if (!application.reportId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found. Please generate your report first.'
      });
    }

    const ntcScore  = application.reportId.ntcScore;
    const riskTier  = application.reportId.riskTier;
    const loanAmount = application.loanDetails.loanAmount;

    const allLenders = await Lender.find({ status: 'active' });

    const eligibleLenders   = [];
    const ineligibleLenders = [];

    for (const lender of allLenders) {

      const reasons = [];

      if (ntcScore < lender.ntcPolicy.minimumNtcScore) {
        reasons.push(
          `Minimum score required is ${lender.ntcPolicy.minimumNtcScore}. Your score is ${ntcScore}.`
        );
      }

      if (!lender.ntcPolicy.acceptedRiskTiers.includes(riskTier)) {
        reasons.push(
          `Your risk tier ${riskTier} is not accepted by this lender.`
        );
      }

      if (loanAmount < lender.loanOffering.minLoanAmount) {
        reasons.push(
          `Minimum loan amount for this lender is ₹${lender.loanOffering.minLoanAmount}.`
        );
      }

      if (loanAmount > lender.loanOffering.maxLoanAmount) {
        reasons.push(
          `Maximum loan amount for this lender is ₹${lender.loanOffering.maxLoanAmount}.`
        );
      }

      if (reasons.length === 0) {

        eligibleLenders.push({
          lenderId:                lender.lenderId,
          lenderObjectId:          lender._id,
          name:                    lender.name,
          logo:                    lender.logo,
          tagline:                 lender.tagline,
          interestRateRange:       lender.loanOffering.interestRateRange,
          tenureRange:             lender.loanOffering.tenureRange,
          loanAmountRange: {
            min: lender.loanOffering.minLoanAmount,
            max: lender.loanOffering.maxLoanAmount
          },
          processingFeePercentage: lender.loanOffering.processingFeePercentage,
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

    eligibleLenders.sort((a, b) => b.rating - a.rating);

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