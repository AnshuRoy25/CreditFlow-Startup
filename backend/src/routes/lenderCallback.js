// routes/lenderCallback.js
// ─────────────────────────────────────────────────────────
// Called by the lender (or test lender server) when they
// make a decision on a submitted application.
// Shared secret in header to prevent unauthorized calls.
// ─────────────────────────────────────────────────────────

import express from 'express';
import LoanApplication from '../models/LoanApplication.js';
import createNotification from '../helpers/createNotification.js';

const router = express.Router();

// POST /api/lender-callback/decision
router.post('/decision', async (req, res) => {

  // Verify shared secret
  const secret = req.headers['x-lender-secret'];
  if (!secret || secret !== process.env.LENDER_CALLBACK_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const {
    applicationId,
    decision,         // 'approved' or 'rejected'
    approvedAmount,   // only if approved
    approvedRate,     // only if approved
    approvedTenure,   // only if approved
    approvedEmi,      // only if approved
    processingFee,    // only if approved
    remarks           // optional
  } = req.body;

  if (!applicationId || !decision) {
    return res.status(400).json({
      success: false,
      message: 'applicationId and decision are required'
    });
  }

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: 'decision must be approved or rejected'
    });
  }

  if (decision === 'approved') {
    if (!approvedAmount || !approvedRate || !approvedTenure || !approvedEmi) {
      return res.status(400).json({
        success: false,
        message: 'approvedAmount, approvedRate, approvedTenure and approvedEmi are required for approval'
      });
    }
  }

  try {

    const application = await LoanApplication.findOne({
      applicationId,
      status: 'submitted'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or not in submitted state'
      });
    }

    if (decision === 'approved') {

      application.lenderSelection.lenderStatus      = 'approved';
      application.lenderSelection.approvedLoanAmount = Number(approvedAmount);
      application.lenderSelection.approvedRate       = Number(approvedRate);
      application.lenderSelection.approvedTenure     = Number(approvedTenure);
      application.lenderSelection.approvedEmi        = Number(approvedEmi);
      application.lenderSelection.processingFeeAmount = processingFee ? Number(processingFee) : application.lenderSelection.processingFeeAmount;
      application.lenderSelection.lenderRemarks      = remarks || null;
      application.lenderSelection.lenderRespondedAt  = new Date();

      application.status      = 'approved';
      application.currentStep = 'offer-review'; // user must review and accept

      await application.save();

      await createNotification(
        application.userId,
        'Your Loan Offer is Ready!',
        `Great news! ${application.lenderSelection.name} has approved your loan. Open the app to review your offer and accept.`,
        'application',
        applicationId
      );

    } else {

      application.lenderSelection.lenderStatus     = 'rejected';
      application.lenderSelection.lenderRemarks    = remarks || null;
      application.lenderSelection.lenderRespondedAt = new Date();

      application.status      = 'rejected';
      application.currentStep = 'rejected';

      // 30 day cooldown on rejection
      application.cooldownEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      application.terminalState  = 'rejected';

      await application.save();

      await createNotification(
        application.userId,
        'Application Update',
        `${application.lenderSelection.name} was unable to approve your application at this time. ${remarks ? remarks : 'You may apply again after 30 days.'}`,
        'application',
        applicationId
      );

    }

    return res.status(200).json({
      success: true,
      message: `Application marked as ${decision}`,
      data: {
        applicationId,
        status: application.status,
        currentStep: application.currentStep
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
});

export default router;