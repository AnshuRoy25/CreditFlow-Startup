// routes/applyLoan/applicationTrack.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';
import Lender from '../../models/Lender.js';

const router = express.Router();



// ─────────────────────────────────────────────────────────
// Route 1 — Get Application Track Details
// GET /api/apply-loan/application-track/details
// Called every time user lands on application tracker page
// Handles all post-submission states
// ─────────────────────────────────────────────────────────
router.get('/details', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      currentStep: 'application-track'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found.'
      });
    }

    const lender = await Lender.findById(application.lenderSelection.lenderId);
    const ls     = application.lenderSelection;

    // ── Build timeline based on current status ───────────
    const timeline = [
      {
        step:      'Application Submitted',
        completed: true
      },
      {
        step:      'Lender Decision',
        completed: ['approved', 'rejected', 'offer-review', 'pre-disbursement', 'disbursed'].includes(application.status)
      },
      {
        step:      'Offer Accepted & eSigned',
        completed: ['pre-disbursement', 'disbursed'].includes(application.status)
      },
      {
        step:      'Loan Disbursed',
        completed: application.status === 'disbursed'
      }
    ];

    // ── Base response data ────────────────────────────────
    const responseData = {
      applicationId: application.applicationId,
      status:        application.status,
      timeline,
      loanSummary: {
        lenderName:   ls.name,
        loanAmount:   application.loanDetails.loanAmount,
        purpose:      application.loanDetails.purpose,
        preferredEmi: application.loanDetails.calculatedEmi
      }
    };

    // ── Status specific data ──────────────────────────────

    if (application.status === 'submitted') {

      responseData.message          = 'Your application is under review. Please check back shortly.';
      responseData.averageDisbursalHours = lender?.disbursal?.averageDisbursalHours || null;

    } else if (application.status === 'approved' || application.status === 'offer-review') {

      responseData.message     = 'Your loan has been approved. Please review and accept the offer.';
      responseData.offer = {
        approvedLoanAmount: ls.approvedLoanAmount,
        approvedRate:       ls.approvedRate,
        approvedTenure:     ls.approvedTenure,
        approvedEmi:        ls.approvedEmi,
        lenderRemarks:      ls.lenderRemarks,
        respondedAt:        ls.lenderRespondedAt
      };
      responseData.nextAction = 'offer-review';

    } else if (application.status === 'rejected') {

      const cooldownDaysRemaining = application.cooldownEndsAt
        ? Math.ceil((application.cooldownEndsAt - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      responseData.message             = 'Unfortunately your application was not approved this time.';
      responseData.lenderRemarks       = ls.lenderRemarks;
      responseData.cooldownEndsAt      = application.cooldownEndsAt;
      responseData.cooldownDaysRemaining = cooldownDaysRemaining;
      responseData.nextAction          = 'dashboard';

    } else if (application.status === 'pre-disbursement') {

      responseData.message = 'Your loan agreement has been signed. Disbursement is in progress.';
      responseData.disbursalInfo = {
        averageDisbursalHours: lender?.disbursal?.averageDisbursalHours || null,
        disbursalMode:         lender?.disbursal?.disbursalMode || null
      };

    } else if (application.status === 'disbursed') {

      responseData.message = 'Your loan has been disbursed successfully.';
      responseData.disbursalInfo = {
        disbursedAt:   application.updatedAt,
        disbursalMode: lender?.disbursal?.disbursalMode || null
      };
      responseData.approvedOffer = {
        approvedLoanAmount: ls.approvedLoanAmount,
        approvedRate:       ls.approvedRate,
        approvedTenure:     ls.approvedTenure,
        approvedEmi:        ls.approvedEmi
      };

    }

    return res.status(200).json({
      success: true,
      data:    responseData
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